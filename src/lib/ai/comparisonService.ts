/**
 * Database Cross-Comparison & AI Findings Engine (Phase 11)
 * ==========================================================
 * Cross-references extracted document OCR and blueprint vision data against
 * live Firestore cadastral records (Societies, Buildings, Floors, Flats, Spatial Records).
 * Generates structured AI Findings and recommended discrepancy items.
 */

import {
  type DocumentOcrResult,
  type BlueprintAnalysisResult,
  type DatabaseComparisonResult,
  type ComparisonFieldResult,
  type AIFinding,
} from '@/types/aiAnalysis';
import { type Society, type Building, type Floor, type Flat } from '@/types/society';

export interface ComparisonTargetRecords {
  society?: Society | null;
  building?: Building | null;
  floor?: Floor | null;
  flat?: Flat | null;
  baseUlpin?: string | null;
  verticalUlpin?: string | null;
}

/**
 * Compares OCR and Blueprint data against target database records.
 */
export function performDatabaseComparison(
  ocrResult: DocumentOcrResult,
  blueprintResult: BlueprintAnalysisResult | null,
  records: ComparisonTargetRecords,
): {
  comparison: DatabaseComparisonResult;
  findings: AIFinding[];
} {
  const fields: ComparisonFieldResult[] = [];
  const findings: AIFinding[] = [];

  const fieldsOcr = ocrResult.fields;

  // 1. Building Name & Block Comparison
  if (fieldsOcr.buildingName.isDetected && records.building) {
    const docVal = String(fieldsOcr.buildingName.normalizedValue || '').trim().toLowerCase();
    const dbVal = records.building.name.trim().toLowerCase();
    const dbCode = (records.building.code || '').trim().toLowerCase();

    const isMatch = docVal.includes(dbVal) || dbVal.includes(docVal) || docVal.includes(dbCode);

    fields.push({
      fieldKey: 'buildingName',
      label: 'Building / Tower Name',
      documentValue: String(fieldsOcr.buildingName.normalizedValue),
      databaseValue: records.building.name,
      status: isMatch ? 'MATCH' : 'POSSIBLE_MISMATCH',
      confidence: fieldsOcr.buildingName.confidence,
      notes: isMatch
        ? 'Document building reference matches society cadastral record.'
        : `Document references "${fieldsOcr.buildingName.normalizedValue}" whereas database record is "${records.building.name}".`,
    });

    if (!isMatch) {
      findings.push({
        id: `finding-${Date.now()}-bldg`,
        category: 'BUILDING_STRUCTURE_MISMATCH',
        severity: 'HIGH',
        source: 'OCR_ANALYSIS',
        title: 'Building / Tower Name Mismatch',
        description: `Document specifies "${fieldsOcr.buildingName.normalizedValue}" which does not match registered building "${records.building.name}".`,
        confidence: 0.91,
        requiresOfficerReview: true,
        discrepancySuggested: true,
        recommendedAction: 'Verify structural tower sanction drawings against deed description.',
      });
    }
  } else {
    fields.push({
      fieldKey: 'buildingName',
      label: 'Building / Tower Name',
      documentValue: fieldsOcr.buildingName.isDetected ? String(fieldsOcr.buildingName.normalizedValue) : null,
      databaseValue: records.building?.name || null,
      status: 'INSUFFICIENT_DATA',
      confidence: 0,
      notes: 'Building reference not fully detected or unlinked in database.',
    });
  }

  // 2. Floor Number Comparison
  if (fieldsOcr.floorNumber.isDetected && records.floor) {
    const docFloor = Number(fieldsOcr.floorNumber.normalizedValue);
    const dbFloor = records.floor.floorNumber;

    const isMatch = !isNaN(docFloor) && docFloor === dbFloor;

    fields.push({
      fieldKey: 'floorNumber',
      label: 'Floor Level',
      documentValue: fieldsOcr.floorNumber.normalizedValue,
      databaseValue: records.floor.floorNumber,
      status: isMatch ? 'MATCH' : 'POSSIBLE_MISMATCH',
      confidence: fieldsOcr.floorNumber.confidence,
      notes: isMatch
        ? 'Floor level perfectly matches cadastral hierarchy.'
        : `Deed floor (${docFloor}) differs from linked database floor (${dbFloor}).`,
    });

    if (!isMatch) {
      findings.push({
        id: `finding-${Date.now()}-flr`,
        category: 'FLOOR_STRUCTURE_MISMATCH',
        severity: 'HIGH',
        source: 'OCR_ANALYSIS',
        title: 'Floor Level Hierarchy Discrepancy',
        description: `Deed indicates Floor ${docFloor}, but database entity resides on Floor ${dbFloor}.`,
        confidence: 0.93,
        requiresOfficerReview: true,
        discrepancySuggested: true,
        recommendedAction: 'Audit vertical floor elevation mapping and floor sanction approval.',
      });
    }
  } else {
    fields.push({
      fieldKey: 'floorNumber',
      label: 'Floor Level',
      documentValue: fieldsOcr.floorNumber.isDetected ? String(fieldsOcr.floorNumber.normalizedValue) : null,
      databaseValue: records.floor ? records.floor.floorNumber : null,
      status: 'INSUFFICIENT_DATA',
      confidence: 0,
      notes: 'Floor number could not be cross-verified.',
    });
  }

  // 3. Flat / Unit Number Comparison
  if (fieldsOcr.flatNumber.isDetected && records.flat) {
    const docFlat = String(fieldsOcr.flatNumber.normalizedValue || '').trim().toLowerCase();
    const dbFlat = records.flat.flatNumber.trim().toLowerCase();

    const isMatch = docFlat === dbFlat || docFlat.endsWith(dbFlat) || dbFlat.endsWith(docFlat);

    fields.push({
      fieldKey: 'flatNumber',
      label: 'Flat / Unit Number',
      documentValue: String(fieldsOcr.flatNumber.normalizedValue),
      databaseValue: records.flat.flatNumber,
      status: isMatch ? 'MATCH' : 'POSSIBLE_MISMATCH',
      confidence: fieldsOcr.flatNumber.confidence,
      notes: isMatch
        ? 'Flat unit identifier matches cadastral database.'
        : `Document unit (${fieldsOcr.flatNumber.normalizedValue}) does not match registered flat (${records.flat.flatNumber}).`,
    });

    if (!isMatch) {
      findings.push({
        id: `finding-${Date.now()}-flat`,
        category: 'UNIT_RECORD_MISMATCH',
        severity: 'CRITICAL',
        source: 'OCR_ANALYSIS',
        title: 'Unit Number Discrepancy',
        description: `Title document refers to unit "${fieldsOcr.flatNumber.normalizedValue}", but cadastral selection is "${records.flat.flatNumber}".`,
        confidence: 0.95,
        requiresOfficerReview: true,
        discrepancySuggested: true,
        recommendedAction: 'Re-verify resident title deed against society unit allotment roll.',
      });
    }
  } else {
    fields.push({
      fieldKey: 'flatNumber',
      label: 'Flat / Unit Number',
      documentValue: fieldsOcr.flatNumber.isDetected ? String(fieldsOcr.flatNumber.normalizedValue) : null,
      databaseValue: records.flat ? records.flat.flatNumber : null,
      status: 'INSUFFICIENT_DATA',
      confidence: 0,
      notes: 'Flat unit number was not detected in document text.',
    });
  }

  // 4. Carpet Area Comparison (with 5% tolerance)
  if (fieldsOcr.carpetAreaSqFt.isDetected && records.flat && records.flat.area) {
    const docArea = Number(fieldsOcr.carpetAreaSqFt.normalizedValue);
    const dbArea = Number(records.flat.area);

    if (!isNaN(docArea) && !isNaN(dbArea) && dbArea > 0) {
      const diffPercent = Math.abs(docArea - dbArea) / dbArea;
      const isMatch = diffPercent <= 0.05; // 5% tolerance

      fields.push({
        fieldKey: 'carpetArea',
        label: 'Carpet Area (Sq Ft)',
        documentValue: `${docArea} sq ft`,
        databaseValue: `${dbArea} sq ft`,
        status: isMatch ? 'MATCH' : 'POSSIBLE_MISMATCH',
        confidence: fieldsOcr.carpetAreaSqFt.confidence,
        notes: isMatch
          ? `Area matches within tolerance (${(diffPercent * 100).toFixed(1)}% variance).`
          : `Significant area discrepancy: Document=${docArea} sq ft vs DB=${dbArea} sq ft (${(diffPercent * 100).toFixed(1)}% difference).`,
      });

      if (!isMatch) {
        findings.push({
          id: `finding-${Date.now()}-area`,
          category: 'UNIT_RECORD_MISMATCH',
          severity: diffPercent > 0.15 ? 'HIGH' : 'MEDIUM',
          source: 'OCR_ANALYSIS',
          title: 'Carpet Area Dimension Variance',
          description: `Document states carpet area of ${docArea} sq ft, whereas cadastral record lists ${dbArea} sq ft (${(diffPercent * 100).toFixed(1)}% difference).`,
          confidence: 0.92,
          requiresOfficerReview: true,
          discrepancySuggested: true,
          recommendedAction: 'Conduct physical laser meter or DGPS spatial survey to confirm carpet area.',
        });
      }
    }
  } else {
    fields.push({
      fieldKey: 'carpetArea',
      label: 'Carpet Area (Sq Ft)',
      documentValue: fieldsOcr.carpetAreaSqFt.isDetected ? `${fieldsOcr.carpetAreaSqFt.normalizedValue} sq ft` : null,
      databaseValue: records.flat?.area ? `${records.flat.area} sq ft` : null,
      status: 'INSUFFICIENT_DATA',
      confidence: 0,
      notes: 'Area could not be cross-referenced (missing in document or database).',
    });
  }

  // 5. Blueprint Layout Consistency Check
  if (blueprintResult && blueprintResult.detectedUnitCount && records.floor) {
    const bpUnits = blueprintResult.detectedUnitCount;
    const dbUnits = records.floor.plannedFlatCount || 0;

    if (dbUnits > 0) {
      const isMatch = bpUnits === dbUnits;
      fields.push({
        fieldKey: 'blueprintUnits',
        label: 'Floor Unit Count (Blueprint vs DB)',
        documentValue: `${bpUnits} units detected`,
        databaseValue: `${dbUnits} units registered`,
        status: isMatch ? 'MATCH' : 'POSSIBLE_MISMATCH',
        confidence: blueprintResult.confidence,
        notes: isMatch
          ? 'Blueprint floor layout matches registered unit count.'
          : `Blueprint detects ${bpUnits} units on floor, but database has ${dbUnits} registered units.`,
      });

      if (!isMatch) {
        findings.push({
          id: `finding-${Date.now()}-bp`,
          category: 'UNAUTHORIZED_STRUCTURE',
          severity: 'HIGH',
          source: 'BLUEPRINT_VISION',
          title: 'Floor Subdivision / Unit Count Mismatch',
          description: `Sanctioned architectural drawing indicates ${bpUnits} units on this floor, whereas municipal database registers ${dbUnits} units.`,
          confidence: 0.86,
          requiresOfficerReview: true,
          discrepancySuggested: true,
          recommendedAction: 'Inspect floor for unauthorized flat division or merged units.',
        });
      }
    }
  }

  // Calculate overall metrics
  const matchCount = fields.filter((f) => f.status === 'MATCH').length;
  const mismatchCount = fields.filter((f) => f.status === 'POSSIBLE_MISMATCH').length;
  const insufficientDataCount = fields.filter((f) => f.status === 'INSUFFICIENT_DATA').length;
  const evaluatedCount = matchCount + mismatchCount;

  const overallMatchScore = evaluatedCount > 0 ? matchCount / evaluatedCount : 1.0;

  const comparison: DatabaseComparisonResult = {
    targetEntity: {
      societyName: records.society?.name,
      buildingName: records.building?.name,
      floorNumber: records.floor?.floorNumber,
      flatNumber: records.flat?.flatNumber,
      ulpin: records.verticalUlpin || records.baseUlpin || undefined,
    },
    fields,
    overallMatchScore,
    mismatchCount,
    insufficientDataCount,
    matchCount,
  };

  return { comparison, findings };
}
