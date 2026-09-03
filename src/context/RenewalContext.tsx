'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  PropertyRenewalRecord,
  RenewalStatistics,
  CurrentPropertySubmission,
  RenewalCaseStatus,
} from '@/types/renewal';
import { INITIAL_RENEWAL_RECORDS } from '@/data/mockRenewals';
import {
  calculateBuildingAge,
  calculateNextReviewDate,
  determineRenewalStatus,
  detectPropertyChanges,
} from '@/lib/renewals/renewalCalculator';
import { saveFirestoreDocument } from '@/lib/firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CreateRenewalPayload {
  propertyId: string;
  buildingId: string;
  buildingName: string;
  societyName: string;
  ulpin: string;
  address: string;
  constructionDate: string;
  lastVerificationDate: string;
  reviewIntervalYears?: number;
  currentSubmission: CurrentPropertySubmission;
  photos: string[];
  documents?: { id: string; name: string; url: string; type: string; uploadedAt: string }[];
  remarks: string;
}

interface RenewalContextType {
  renewalRecords: PropertyRenewalRecord[];
  renewalStats: RenewalStatistics;
  getRecordByBuildingId: (buildingId: string) => PropertyRenewalRecord | undefined;
  getRecordByPropertyId: (propertyId: string) => PropertyRenewalRecord | undefined;
  createRenewalReport: (payload: CreateRenewalPayload) => Promise<PropertyRenewalRecord>;
  reviewRenewalCase: (
    renewalId: string,
    decision: RenewalCaseStatus,
    officerRemarks: string
  ) => Promise<void>;
  refreshRenewals: () => void;
}

const RenewalContext = createContext<RenewalContextType | undefined>(undefined);

const STORAGE_KEY = 'bhu_verify_property_renewals';

export const RenewalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [renewalRecords, setRenewalRecords] = useState<PropertyRenewalRecord[]>(INITIAL_RENEWAL_RECORDS);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Hydrate from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: PropertyRenewalRecord[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-calculate age and milestone status live
          const updated = parsed.map((rec) => {
            const age = calculateBuildingAge(rec.constructionDate);
            const status = determineRenewalStatus(rec.nextReviewDate);
            return {
              ...rec,
              calculatedAgeYears: age,
              renewalStatus: status,
            };
          });
          setRenewalRecords(updated);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const persistRecords = useCallback((records: PropertyRenewalRecord[]) => {
    setRenewalRecords(records);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // quota
    }
  }, []);

  // Compute live KPI stats
  const renewalStats = useMemo<RenewalStatistics>(() => {
    return {
      totalProperties: renewalRecords.length,
      upToDate: renewalRecords.filter((r) => r.renewalStatus === 'UP_TO_DATE').length,
      dueSoon: renewalRecords.filter((r) => r.renewalStatus === 'DUE_SOON').length,
      due: renewalRecords.filter((r) => r.renewalStatus === 'DUE').length,
      overdue: renewalRecords.filter((r) => r.renewalStatus === 'OVERDUE').length,
      pendingReview: renewalRecords.filter(
        (r) => r.caseStatus === 'PENDING_REVIEW' || r.caseStatus === 'UNDER_VERIFICATION'
      ).length,
    };
  }, [renewalRecords]);

  const getRecordByBuildingId = useCallback(
    (buildingId: string) => {
      return renewalRecords.find(
        (r) => r.buildingId.toLowerCase() === buildingId.toLowerCase()
      );
    },
    [renewalRecords]
  );

  const getRecordByPropertyId = useCallback(
    (propertyId: string) => {
      const found = renewalRecords.find(
        (r) =>
          r.propertyId.toLowerCase() === propertyId.toLowerCase() ||
          r.buildingId.toLowerCase() === propertyId.toLowerCase()
      );
      if (found) return found;

      // Fallback synthesis so any property in the registry can use Periodic Verification
      const constrDate = '2019-06-15';
      const lastVer = '2019-07-01';
      const nextRev = calculateNextReviewDate(lastVer, 10);
      return {
        renewalId: `REN-${propertyId}`,
        propertyId,
        societyId: 'SOC-GEN',
        societyName: 'Municipal Cadastral Zone',
        buildingId: propertyId,
        buildingName: `Property Record ${propertyId}`,
        ulpin: `ULPIN-MH-${propertyId.toUpperCase()}-DEMO`,
        address: 'Pune Urban Division, Maharashtra',
        constructionDate: constrDate,
        lastVerificationDate: lastVer,
        reviewIntervalYears: 10,
        nextReviewDate: nextRev,
        calculatedAgeYears: calculateBuildingAge(constrDate),
        renewalStatus: determineRenewalStatus(nextRev),
        caseStatus: 'VERIFIED',
        previousRecord: {
          constructionYear: 2019,
          floors: 5,
          units: 20,
          condition: 'GOOD',
        },
        changesDetected: false,
        changeNotes: [],
        documents: [],
        photos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
        remarks: 'Cadastral property record.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as PropertyRenewalRecord;
    },
    [renewalRecords]
  );

  const createRenewalReport = useCallback(
    async (payload: CreateRenewalPayload): Promise<PropertyRenewalRecord> => {
      const existing = renewalRecords.find(
        (r) =>
          r.propertyId.toLowerCase() === payload.propertyId.toLowerCase() ||
          r.buildingId.toLowerCase() === payload.buildingId.toLowerCase()
      );

      const previousRecord = existing?.previousRecord || {
        constructionYear: new Date(payload.constructionDate).getFullYear() || 2020,
        floors: payload.currentSubmission.floors,
        units: payload.currentSubmission.units,
        builtUpAreaSqFt: payload.currentSubmission.builtUpAreaSqFt,
        condition: 'GOOD',
      };

      const diff = detectPropertyChanges(previousRecord, payload.currentSubmission);
      const interval = payload.reviewIntervalYears || existing?.reviewIntervalYears || 10;
      const nextReview = calculateNextReviewDate(payload.lastVerificationDate, interval);
      const status = determineRenewalStatus(nextReview);

      const newRecord: PropertyRenewalRecord = {
        renewalId: existing?.renewalId || `REN-${Date.now().toString(36).toUpperCase()}`,
        propertyId: payload.propertyId,
        societyId: existing?.societyId || 'SOC-DEFAULT',
        societyName: payload.societyName,
        buildingId: payload.buildingId,
        buildingName: payload.buildingName,
        ulpin: payload.ulpin,
        address: payload.address,
        constructionDate: payload.constructionDate,
        lastVerificationDate: payload.lastVerificationDate,
        reviewIntervalYears: interval,
        nextReviewDate: nextReview,
        calculatedAgeYears: calculateBuildingAge(payload.constructionDate),
        renewalStatus: status,
        caseStatus: 'PENDING_REVIEW',
        previousRecord,
        currentSubmission: payload.currentSubmission,
        changesDetected: diff.hasChanges,
        changeNotes: diff.changeNotes,
        documents: payload.documents || [],
        photos: payload.photos || [],
        remarks: payload.remarks,
        submittedBy: {
          name: currentUser?.name || 'Verified Citizen',
          role: currentUser?.role || 'CITIZEN',
          userId: currentUser?.id || 'usr-cit-101',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = existing
        ? renewalRecords.map((r) => (r.renewalId === existing.renewalId ? newRecord : r))
        : [newRecord, ...renewalRecords];

      persistRecords(updated);

      // Async Firestore backup
      try {
        await saveFirestoreDocument('propertyRenewals', newRecord.renewalId, newRecord as any);
      } catch {
        // offline fallback
      }

      toast({
        title: 'Renewal Report Submitted',
        description: `Periodic verification report for ${payload.buildingName} has been queued for official review.`,
        variant: 'success',
      });

      return newRecord;
    },
    [renewalRecords, currentUser, persistRecords, toast]
  );

  const reviewRenewalCase = useCallback(
    async (
      renewalId: string,
      decision: RenewalCaseStatus,
      officerRemarks: string
    ): Promise<void> => {
      const target = renewalRecords.find((r) => r.renewalId === renewalId);
      if (!target) return;

      const isApproved = decision === 'VERIFIED';
      const todayIso = new Date().toISOString().split('T')[0];

      // If approved, update lastVerificationDate to today and recalculate next review date (+10 years)
      const newLastVerificationDate = isApproved ? todayIso : target.lastVerificationDate;
      const newNextReviewDate = isApproved
        ? calculateNextReviewDate(todayIso, target.reviewIntervalYears)
        : target.nextReviewDate;
      const newRenewalStatus = isApproved ? 'UP_TO_DATE' : target.renewalStatus;

      const updatedRecord: PropertyRenewalRecord = {
        ...target,
        lastVerificationDate: newLastVerificationDate,
        nextReviewDate: newNextReviewDate,
        renewalStatus: newRenewalStatus,
        caseStatus: decision,
        officerRemarks,
        verifiedBy: {
          name: currentUser?.name || 'Revenue Officer',
          role: currentUser?.role || 'OFFICER',
          userId: currentUser?.id || 'off-001',
        },
        updatedAt: new Date().toISOString(),
      };

      const updatedList = renewalRecords.map((r) =>
        r.renewalId === renewalId ? updatedRecord : r
      );

      persistRecords(updatedList);

      try {
        await saveFirestoreDocument('propertyRenewals', renewalId, updatedRecord as any);
      } catch {
        // offline fallback
      }

      toast({
        title: isApproved ? 'Periodic Verification Approved' : 'Review Updated',
        description: isApproved
          ? `Periodic review sealed for ${target.buildingName}. Next review rescheduled to ${newNextReviewDate}.`
          : `Case status set to ${decision}.`,
        variant: isApproved ? 'success' : 'default',
      });
    },
    [renewalRecords, currentUser, persistRecords, toast]
  );

  const refreshRenewals = useCallback(() => {
    setRenewalRecords([...INITIAL_RENEWAL_RECORDS]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <RenewalContext.Provider
      value={{
        renewalRecords,
        renewalStats,
        getRecordByBuildingId,
        getRecordByPropertyId,
        createRenewalReport,
        reviewRenewalCase,
        refreshRenewals,
      }}
    >
      {children}
    </RenewalContext.Provider>
  );
};

export function useRenewals(): RenewalContextType {
  const context = useContext(RenewalContext);
  if (!context) {
    throw new Error('useRenewals must be used within a RenewalProvider');
  }
  return context;
}
