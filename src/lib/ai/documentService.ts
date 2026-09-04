/**
 * AI Document & Analysis Management Service (Phase 11)
 * =====================================================
 * Handles document upload to Firebase Storage, metadata persistence,
 * OCR & blueprint analysis execution, database comparison, and Firestore updates.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type WithFieldValue,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getStorage,
} from 'firebase/storage';

import { auth, db, firebaseApp } from '@/lib/firebase';
import { getActiveSessionUid, getActiveSessionUser } from '@/lib/auth/clientSession';
import {
  type PropertyDocument,
  type PropertyDocumentDocument,
  type DocumentAnalysis,
  type DocumentAnalysisDocument,
  type PropertyDocumentType,
  type OfficerReviewStatus,
  type AnalysisStatus,
  MANDATORY_AI_DISCLAIMER,
} from '@/types/aiAnalysis';
import { performDocumentOcr } from './ocrService';
import { analyzeBlueprintFile } from './blueprintService';
import { performDatabaseComparison, type ComparisonTargetRecords } from './comparisonService';
import { createPropertyDiscrepancy } from '@/lib/society/verificationWorkflowService';
import { createNotification } from '@/lib/citizen/notificationService';
import { SocietyServiceError, normalizeFirestoreError } from '@/lib/society/service';

const storage = getStorage(firebaseApp);

export const PROPERTY_DOCUMENTS_COLLECTION = 'propertyDocuments';
export const DOCUMENT_ANALYSES_COLLECTION = 'documentAnalyses';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeDoc(id: string, data: DocumentData): PropertyDocument {
  const r = data as Record<string, unknown>;
  return {
    id,
    societyId: typeof r.societyId === 'string' ? r.societyId : '',
    buildingId: typeof r.buildingId === 'string' ? r.buildingId : null,
    floorId: typeof r.floorId === 'string' ? r.floorId : null,
    flatId: typeof r.flatId === 'string' ? r.flatId : null,
    propertyId: typeof r.propertyId === 'string' ? r.propertyId : null,
    caseId: typeof r.caseId === 'string' ? r.caseId : null,
    documentType: (r.documentType as PropertyDocumentType) || 'OTHER',
    fileName: typeof r.fileName === 'string' ? r.fileName : 'document',
    fileSize: typeof r.fileSize === 'number' ? r.fileSize : 0,
    mimeType: typeof r.mimeType === 'string' ? r.mimeType : 'application/pdf',
    storagePath: typeof r.storagePath === 'string' ? r.storagePath : '',
    downloadUrl: typeof r.downloadUrl === 'string' ? r.downloadUrl : '',
    uploadedBy: typeof r.uploadedBy === 'string' ? r.uploadedBy : '',
    uploadedByName: typeof r.uploadedByName === 'string' ? r.uploadedByName : 'User',
    uploadedByRole: (r.uploadedByRole as PropertyDocument['uploadedByRole']) || 'resident',
    analysisId: typeof r.analysisId === 'string' ? r.analysisId : null,
    status: (r.status as AnalysisStatus) || 'UPLOADED',
    createdAt: toDate(r.createdAt) || new Date(),
    updatedAt: toDate(r.updatedAt) || new Date(),
  };
}

function normalizeAnalysis(id: string, data: DocumentData): DocumentAnalysis {
  const r = data as Record<string, unknown>;
  return {
    id,
    documentId: typeof r.documentId === 'string' ? r.documentId : '',
    societyId: typeof r.societyId === 'string' ? r.societyId : '',
    buildingId: typeof r.buildingId === 'string' ? r.buildingId : null,
    floorId: typeof r.floorId === 'string' ? r.floorId : null,
    flatId: typeof r.flatId === 'string' ? r.flatId : null,
    propertyId: typeof r.propertyId === 'string' ? r.propertyId : null,
    caseId: typeof r.caseId === 'string' ? r.caseId : null,
    status: (r.status as AnalysisStatus) || 'COMPLETED',
    ocrResult: (r.ocrResult as DocumentAnalysis['ocrResult']) || null,
    blueprintResult: (r.blueprintResult as DocumentAnalysis['blueprintResult']) || null,
    comparisonResult: (r.comparisonResult as DocumentAnalysis['comparisonResult']) || null,
    findings: Array.isArray(r.findings) ? (r.findings as DocumentAnalysis['findings']) : [],
    overallConfidence: typeof r.overallConfidence === 'number' ? r.overallConfidence : 0.85,
    officerReviewStatus: (r.officerReviewStatus as OfficerReviewStatus) || 'PENDING',
    reviewedBy: typeof r.reviewedBy === 'string' ? r.reviewedBy : null,
    reviewedByName: typeof r.reviewedByName === 'string' ? r.reviewedByName : null,
    reviewedAt: toDate(r.reviewedAt),
    officerNotes: typeof r.officerNotes === 'string' ? r.officerNotes : null,
    convertedDiscrepancyId: typeof r.convertedDiscrepancyId === 'string' ? r.convertedDiscrepancyId : null,
    convertedCaseId: typeof r.convertedCaseId === 'string' ? r.convertedCaseId : null,
    disclaimer: typeof r.disclaimer === 'string' ? r.disclaimer : MANDATORY_AI_DISCLAIMER,
    uploadedBy: typeof r.uploadedBy === 'string' ? r.uploadedBy : '',
    createdAt: toDate(r.createdAt) || new Date(),
    updatedAt: toDate(r.updatedAt) || new Date(),
    completedAt: toDate(r.completedAt),
  };
}

export interface UploadAndAnalyzeInput {
  file: File;
  documentType: PropertyDocumentType;
  societyId: string;
  buildingId?: string | null;
  floorId?: string | null;
  flatId?: string | null;
  propertyId?: string | null;
  caseId?: string | null;
  targetRecords: ComparisonTargetRecords;
}

/**
 * Uploads a document/blueprint, triggers OCR & blueprint analysis, compares against live DB,
 * and saves master records in Firestore.
 */
export async function uploadAndAnalyzeDocument(
  input: UploadAndAnalyzeInput,
): Promise<{ document: PropertyDocument; analysis: DocumentAnalysis }> {
  const sessionUser = getActiveSessionUser();
  const uid = auth.currentUser?.uid || sessionUser?.id || getActiveSessionUid();
  if (!uid) {
    throw new SocietyServiceError('AUTH_EXPIRED', 'Must be signed in to upload and analyze documents.');
  }
  const userName =
    auth.currentUser?.displayName ||
    sessionUser?.name ||
    auth.currentUser?.email?.split('@')[0] ||
    sessionUser?.email?.split('@')[0] ||
    'User';

  const { file } = input;

  // Validation
  if (file.size > MAX_FILE_SIZE) {
    throw new SocietyServiceError('UNKNOWN', `File size exceeds 25 MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg|webp)$/i)) {
    throw new SocietyServiceError('UNKNOWN', 'Invalid document format. Please upload PDF, PNG, JPG, or WEBP.');
  }

  const now = serverTimestamp();
  const docRef = doc(collection(db, PROPERTY_DOCUMENTS_COLLECTION));
  const analysisRef = doc(collection(db, DOCUMENT_ANALYSES_COLLECTION));

  const documentId = docRef.id;
  const analysisId = analysisRef.id;

  const sanitized = sanitizeFileName(file.name);
  const storagePath = `analysis-documents/${input.societyId}/${documentId}/${sanitized}`;
  const fileRef = ref(storage, storagePath);

  try {
    // 1. Upload to Firebase Storage
    let downloadUrl = '';
    try {
      const uploadTask = await uploadBytesResumable(fileRef, file, {
        contentType: file.type || 'application/pdf',
        customMetadata: {
          societyId: input.societyId,
          documentId,
          analysisId,
          uploadedBy: uid,
        },
      });
      downloadUrl = await getDownloadURL(uploadTask.ref);
    } catch {
      // Fallback for offline/mock environments
      downloadUrl = `/mock-documents/${sanitized}`;
    }

    // 2. Perform OCR Extraction
    const targetHints = {
      societyName: input.targetRecords.society?.name,
      buildingName: input.targetRecords.building?.name,
      flatNumber: input.targetRecords.flat?.flatNumber,
      areaSqFt: input.targetRecords.flat?.area ? Number(input.targetRecords.flat.area) : undefined,
    };

    const ocrResult = await performDocumentOcr(file, targetHints);

    // 3. Perform Blueprint Vision if blueprint or image/drawing
    let blueprintResult = null;
    if (
      input.documentType === 'FLOOR_BLUEPRINT' ||
      input.documentType === 'BUILDING_SANCTION_PLAN' ||
      ocrResult.detectedDocumentType === 'FLOOR_BLUEPRINT' ||
      ocrResult.detectedDocumentType === 'BUILDING_SANCTION_PLAN'
    ) {
      blueprintResult = await analyzeBlueprintFile(file, {
        buildingName: input.targetRecords.building?.name,
        floorNumber: input.targetRecords.floor?.floorNumber,
        plannedFlatCount: input.targetRecords.floor?.plannedFlatCount,
        carpetAreaSqFt: input.targetRecords.flat?.area ? Number(input.targetRecords.flat.area) : undefined,
      });
    }

    // 4. Perform Database Comparison
    const { comparison, findings } = performDatabaseComparison(
      ocrResult,
      blueprintResult,
      input.targetRecords,
    );

    const hasMismatches = comparison.mismatchCount > 0;
    const finalStatus: AnalysisStatus = hasMismatches ? 'REVIEW_REQUIRED' : 'COMPLETED';

    // 5. Persist Property Document
    const documentData: WithFieldValue<PropertyDocumentDocument> = {
      societyId: input.societyId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      flatId: input.flatId ?? null,
      propertyId: input.propertyId ?? null,
      caseId: input.caseId ?? null,
      documentType: input.documentType,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/pdf',
      storagePath,
      downloadUrl,
      uploadedBy: uid,
      uploadedByName: userName,
      uploadedByRole: 'government-officer',
      analysisId,
      status: finalStatus,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, documentData);

    // 6. Persist Document Analysis
    const analysisData: WithFieldValue<DocumentAnalysisDocument> = {
      documentId,
      societyId: input.societyId,
      buildingId: input.buildingId ?? null,
      floorId: input.floorId ?? null,
      flatId: input.flatId ?? null,
      propertyId: input.propertyId ?? null,
      caseId: input.caseId ?? null,
      status: finalStatus,
      ocrResult,
      blueprintResult,
      comparisonResult: comparison,
      findings,
      overallConfidence: ocrResult.overallConfidence,
      officerReviewStatus: 'PENDING',
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      officerNotes: null,
      convertedDiscrepancyId: null,
      convertedCaseId: null,
      disclaimer: MANDATORY_AI_DISCLAIMER,
      uploadedBy: uid,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    };

    await setDoc(analysisRef, analysisData);

    // Notify User
    if (uid) {
      createNotification({
        recipientUid: uid,
        societyId: input.societyId,
        type: 'GENERAL_SYSTEM',
        title: `Document Analysis Completed: ${file.name}`,
        message: hasMismatches
          ? `Analysis detected ${comparison.mismatchCount} potential mismatch(es) requiring officer review.`
          : 'Document OCR and structural blueprint cross-check completed successfully.',
        relatedEntityType: 'property',
        relatedEntityId: input.flatId || input.societyId,
        severity: hasMismatches ? 'WARNING' : 'SUCCESS',
        linkUrl: `/government/ai-analysis?analysisId=${analysisId}`,
      }).catch((e) => console.warn('AI notification warning:', e));
    }

    return {
      document: normalizeDoc(documentId, documentData),
      analysis: normalizeAnalysis(analysisId, analysisData),
    };
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Retrieves a document analysis record by ID.
 */
export async function getDocumentAnalysisById(analysisId: string): Promise<DocumentAnalysis | null> {
  try {
    const snap = await getDoc(doc(db, DOCUMENT_ANALYSES_COLLECTION, analysisId));
    if (!snap.exists()) return null;
    return normalizeAnalysis(snap.id, snap.data());
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Retrieves recent analyses for a society.
 */
export async function getAnalysesForSociety(societyId: string, limitCount = 30): Promise<DocumentAnalysis[]> {
  try {
    const q = query(
      collection(db, DOCUMENT_ANALYSES_COLLECTION),
      where('societyId', '==', societyId),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeAnalysis(d.id, d.data()));
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Updates officer review status on an analysis.
 */
export async function updateOfficerReviewStatus(
  analysisId: string,
  reviewStatus: OfficerReviewStatus,
  officerNotes?: string,
): Promise<void> {
  const sessionUser = getActiveSessionUser();
  const uid = auth.currentUser?.uid || sessionUser?.id || getActiveSessionUid();
  if (!uid) throw new SocietyServiceError('AUTH_EXPIRED', 'Must be signed in as an officer.');

  try {
    const now = serverTimestamp();
    const officerName =
      auth.currentUser?.displayName ||
      sessionUser?.name ||
      auth.currentUser?.email?.split('@')[0] ||
      sessionUser?.email?.split('@')[0] ||
      'Government Officer';

    await updateDoc(doc(db, DOCUMENT_ANALYSES_COLLECTION, analysisId), {
      officerReviewStatus: reviewStatus,
      reviewedBy: uid,
      reviewedByName: officerName,
      reviewedAt: now,
      officerNotes: officerNotes?.trim() || null,
      updatedAt: now,
    });
  } catch (error) {
    throw normalizeFirestoreError(error);
  }
}

/**
 * Converts a detected AI finding into a formal Government Discrepancy.
 */
export async function convertFindingToDiscrepancy(
  analysis: DocumentAnalysis,
  findingIndex: number,
  officerJustification: string,
): Promise<{ discrepancyId: string; caseId?: string }> {
  const finding = analysis.findings[findingIndex];
  if (!finding) throw new SocietyServiceError('NOT_FOUND', 'AI finding not found in analysis.');

  const created = await createPropertyDiscrepancy({
    societyId: analysis.societyId,
    buildingId: analysis.buildingId,
    floorId: analysis.floorId,
    flatId: analysis.flatId,
    propertyId: analysis.propertyId,
    type: finding.category,
    title: finding.title,
    description: `[AI-ASSISTED DOCUMENT FINDING]\nSource: ${finding.source} (Confidence: ${(finding.confidence * 100).toFixed(0)}%)\nFinding: ${finding.description}\nOfficer Justification: ${officerJustification.trim()}`,
    severity: finding.severity,
    openVerificationCase: true,
  });

  await updateDoc(doc(db, DOCUMENT_ANALYSES_COLLECTION, analysis.id), {
    officerReviewStatus: 'CONVERTED_TO_DISCREPANCY' as OfficerReviewStatus,
    convertedDiscrepancyId: created.discrepancyId,
    convertedCaseId: created.caseId || null,
    updatedAt: serverTimestamp(),
  });

  return created;
}
