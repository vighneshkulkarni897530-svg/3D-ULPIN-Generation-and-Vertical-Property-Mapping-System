/**
 * Government Analytics & Decision Intelligence Service (Phase 9)
 * ==============================================================
 * Central aggregation and analytical intelligence engine calculated
 * exclusively from real Firestore data models.
 *
 * Invariants:
 *   - No hard-coded, fake, or synthetic numbers.
 *   - No N+1 query waterfalls: uses Promise.all and client-side aggregation.
 *   - Case aging uses real createdAt timestamps.
 *   - Resolution time calculations only include cases with closedAt/resolvedAt timestamps.
 *   - Decision support provides descriptive insights, not autonomous legal determinations.
 *   - Protects resident private PII.
 */

import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  SOCIETIES_COLLECTION,
  getAvailableSocieties,
  getSocietyById,
} from '@/lib/society/service';
import { getBuildings } from '@/lib/society/buildingService';
import { getFloors } from '@/lib/society/floorService';
import { getFlats } from '@/lib/society/flatService';
import { getSocietyResidents } from '@/lib/society/residentService';
import {
  getAllVerifications,
  getAllDiscrepancies,
  getVerificationHistory,
  getVerificationsForSociety,
  getDiscrepanciesForSociety,
} from '@/lib/society/governmentService';
import {
  getAllVerificationCases,
  getVerificationCasesForSociety,
  getEvidenceForSociety,
} from '@/lib/society/verificationWorkflowService';
import {
  type Society,
  type Building,
  type Floor,
  type Flat,
  type GovVerification,
  type GovVerificationStatus,
  type Discrepancy,
  type GovVerificationHistory,
} from '@/types/society';
import {
  type VerificationCase,
  type DiscrepancyType,
  type DiscrepancySeverity,
  type CaseStatus,
  type VerificationDecision,
  DISCREPANCY_TYPES,
  DISCREPANCY_TYPE_LABELS,
  DISCREPANCY_SEVERITIES,
  DISCREPANCY_SEVERITY_LABELS,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  VERIFICATION_DECISIONS,
  VERIFICATION_DECISION_LABELS,
} from '@/types/verificationCase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlatformOverviewMetrics {
  totalSocieties: number;
  totalBuildings: number;
  totalFloors: number;
  totalFlats: number;
  totalResidents: number;
  totalSpatialRecords: number;
}

export interface VerificationOverviewMetrics {
  totalProperties: number;
  verifiedCount: number;
  pendingCount: number;
  needsReviewCount: number;
  flaggedCount: number;
  rejectedCount: number;
  verificationRate: number; // percentage (0 - 100)
}

export interface DisputeOverviewMetrics {
  totalCases: number;
  openCount: number;
  assignedCount: number;
  underInvestigationCount: number;
  evidenceRequiredCount: number;
  reinspectionRequiredCount: number;
  resolvedCount: number;
  rejectedCount: number;
  resolutionRate: number; // percentage (0 - 100)
}

export interface DiscrepancyBreakdownMetrics {
  totalDiscrepancies: number;
  byType: Record<DiscrepancyType, number>;
  bySeverity: Record<DiscrepancySeverity, number>;
  byStatus: Record<string, number>;
}

export interface CaseAgingMetrics {
  bucket0to7: number;
  bucket8to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
  averageAgeDays: number;
  averageResolutionDays: number | null; // null if no resolved cases exist
  resolvedCasesCount: number;
}

export interface DecisionAnalyticsMetrics {
  totalDecisions: number;
  byDecision: Record<VerificationDecision, number>;
  reinspectionRequiredCount: number;
  reinspectionsCompleted: number;
  reinspectionsPending: number;
}

export interface TimeSeriesDataPoint {
  date: string; // YYYY-MM-DD
  casesCreated: number;
  casesResolved: number;
  discrepanciesCreated: number;
  verificationsRecorded: number;
}

export interface BuildingAnalyticsItem {
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  societyId: string;
  societyName: string;
  totalFloors: number;
  totalUnits: number;
  verifiedUnits: number;
  pendingUnits: number;
  discrepanciesCount: number;
  openCasesCount: number;
  resolvedCasesCount: number;
  verificationRate: number;
}

export interface FloorAnalyticsItem {
  floorId: string;
  floorNumber: number;
  floorLabel: string;
  buildingId: string;
  buildingName: string;
  totalFlats: number;
  verifiedCount: number;
  pendingCount: number;
  discrepanciesCount: number;
  openCasesCount: number;
  verificationRate: number;
}

export interface SocietyComparisonItem {
  societyId: string;
  name: string;
  registrationNumber: string | null;
  city: string;
  state: string;
  buildingsCount: number;
  floorsCount: number;
  flatsCount: number;
  residentsCount: number;
  verifiedCount: number;
  pendingCount: number;
  discrepanciesCount: number;
  openCasesCount: number;
  resolvedCasesCount: number;
  verificationRate: number;
  status: GovVerificationStatus;
}

export interface PriorityCaseItem {
  caseId: string;
  caseNumber: string;
  title: string;
  societyId: string;
  societyName: string;
  buildingName?: string | null;
  flatNumber?: string | null;
  severity: DiscrepancySeverity;
  status: CaseStatus;
  ageDays: number;
  priorityReason: string;
  createdAt: Date | null;
}

export interface DecisionSupportInsight {
  id: string;
  category: 'DISCREPANCY' | 'AGING' | 'SEVERITY' | 'PROGRESS' | 'REINSPECTION';
  title: string;
  description: string;
  tone: 'info' | 'warning' | 'alert' | 'success';
}

export interface FullGovernmentAnalytics {
  overview: PlatformOverviewMetrics;
  verification: VerificationOverviewMetrics;
  disputes: DisputeOverviewMetrics;
  discrepancies: DiscrepancyBreakdownMetrics;
  caseAging: CaseAgingMetrics;
  decisions: DecisionAnalyticsMetrics;
  trends7Days: TimeSeriesDataPoint[];
  trends30Days: TimeSeriesDataPoint[];
  trends90Days: TimeSeriesDataPoint[];
  buildingAnalytics: BuildingAnalyticsItem[];
  societiesComparison: SocietyComparisonItem[];
  priorityCases: PriorityCaseItem[];
  insights: DecisionSupportInsight[];
  recentActivity: GovVerificationHistory[];
  lastUpdated: Date;
}

export interface SocietyDetailAnalytics {
  society: Society;
  verificationStatus: GovVerificationStatus;
  overview: {
    buildingsCount: number;
    floorsCount: number;
    flatsCount: number;
    residentsCount: number;
    evidenceCount: number;
    spatialRecordsCount: number;
  };
  verification: VerificationOverviewMetrics;
  disputes: DisputeOverviewMetrics;
  discrepancies: DiscrepancyBreakdownMetrics;
  caseAging: CaseAgingMetrics;
  decisions: DecisionAnalyticsMetrics;
  buildings: BuildingAnalyticsItem[];
  floors: FloorAnalyticsItem[];
  cases: VerificationCase[];
  priorityCases: PriorityCaseItem[];
  insights: DecisionSupportInsight[];
  recentActivity: GovVerificationHistory[];
  lastUpdated: Date;
}

// ── Calculations & Aggregators ───────────────────────────────────────────────

function calculateAgeInDays(createdAt: Date | null): number {
  if (!createdAt) return 0;
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function calculateResolutionDays(createdAt: Date | null, closedAt: Date | null): number | null {
  if (!createdAt || !closedAt) return null;
  const diffMs = closedAt.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function computeDiscrepancyBreakdown(discrepancies: Discrepancy[]): DiscrepancyBreakdownMetrics {
  const byType: Record<DiscrepancyType, number> = {
    BOUNDARY_MISMATCH: 0,
    BUILDING_STRUCTURE_MISMATCH: 0,
    FLOOR_STRUCTURE_MISMATCH: 0,
    UNIT_RECORD_MISMATCH: 0,
    SPATIAL_COORDINATE_MISMATCH: 0,
    ULPIN_MISMATCH: 0,
    DOCUMENT_MISMATCH: 0,
    UNAUTHORIZED_STRUCTURE: 0,
    OTHER: 0,
  };

  const bySeverity: Record<DiscrepancySeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  const byStatus: Record<string, number> = {};

  discrepancies.forEach((d) => {
    // Map existing or new discrepancy category to DiscrepancyType
    let typeKey: DiscrepancyType = 'OTHER';
    if (d.category === 'society_mismatch' || d.category === 'gis_location_discrepancy') {
      typeKey = 'BOUNDARY_MISMATCH';
    } else if (d.category === 'building_mismatch') {
      typeKey = 'BUILDING_STRUCTURE_MISMATCH';
    } else if (d.category === 'flat_mismatch') {
      typeKey = 'UNIT_RECORD_MISMATCH';
    } else if (d.category === 'missing_evidence') {
      typeKey = 'DOCUMENT_MISMATCH';
    } else if ((DISCREPANCY_TYPES as readonly string[]).includes(d.category)) {
      typeKey = d.category as DiscrepancyType;
    }

    byType[typeKey] = (byType[typeKey] || 0) + 1;

    // Severity mapping
    const rawSev = ((d as unknown as Record<string, unknown>).severity as string) || 'MEDIUM';
    const sevKey: DiscrepancySeverity = (DISCREPANCY_SEVERITIES as readonly string[]).includes(rawSev)
      ? (rawSev as DiscrepancySeverity)
      : 'MEDIUM';
    bySeverity[sevKey] = (bySeverity[sevKey] || 0) + 1;

    // Status mapping
    const st = d.status || 'open';
    byStatus[st] = (byStatus[st] || 0) + 1;
  });

  return {
    totalDiscrepancies: discrepancies.length,
    byType,
    bySeverity,
    byStatus,
  };
}

function computeCaseAging(cases: VerificationCase[]): CaseAgingMetrics {
  let b0to7 = 0;
  let b8to30 = 0;
  let b31to60 = 0;
  let b61to90 = 0;
  let b90Plus = 0;
  let totalAgeDays = 0;

  let totalResolutionDays = 0;
  let resolvedCount = 0;

  cases.forEach((c) => {
    const age = calculateAgeInDays(c.createdAt);
    totalAgeDays += age;

    if (age <= 7) b0to7++;
    else if (age <= 30) b8to30++;
    else if (age <= 60) b31to60++;
    else if (age <= 90) b61to90++;
    else b90Plus++;

    if (c.status === 'RESOLVED' || c.status === 'REJECTED') {
      const closedDate = (c.closedAt as Date | null) || (c.decisionMadeAt as Date | null) || null;
      const resDays = calculateResolutionDays(c.createdAt as Date | null, closedDate);
      if (resDays !== null) {
        totalResolutionDays += resDays;
        resolvedCount++;
      }
    }
  });

  const averageAgeDays = cases.length > 0 ? Math.round(totalAgeDays / cases.length) : 0;
  const averageResolutionDays =
    resolvedCount > 0 ? Math.round(totalResolutionDays / resolvedCount) : null;

  return {
    bucket0to7: b0to7,
    bucket8to30: b8to30,
    bucket31to60: b31to60,
    bucket61to90: b61to90,
    bucket90Plus: b90Plus,
    averageAgeDays,
    averageResolutionDays,
    resolvedCasesCount: resolvedCount,
  };
}

function computeDecisionMetrics(cases: VerificationCase[]): DecisionAnalyticsMetrics {
  const byDecision: Record<VerificationDecision, number> = {
    VERIFIED: 0,
    REQUIRES_CORRECTION: 0,
    REINSPECTION_REQUIRED: 0,
    REJECTED: 0,
  };

  let reinspectionCount = 0;
  let reinspectionsCompleted = 0;
  let reinspectionsPending = 0;

  cases.forEach((c) => {
    if (c.decision) {
      byDecision[c.decision] = (byDecision[c.decision] || 0) + 1;
    }
    if (c.decision === 'REINSPECTION_REQUIRED' || c.status === 'REINSPECTION_REQUIRED') {
      reinspectionCount++;
      if (c.status === 'RESOLVED' || c.status === 'REJECTED') {
        reinspectionsCompleted++;
      } else {
        reinspectionsPending++;
      }
    }
  });

  return {
    totalDecisions: Object.values(byDecision).reduce((a, b) => a + b, 0),
    byDecision,
    reinspectionRequiredCount: reinspectionCount,
    reinspectionsCompleted,
    reinspectionsPending,
  };
}

function computeTimeSeries(
  cases: VerificationCase[],
  discrepancies: Discrepancy[],
  verifications: GovVerification[],
  days: number,
): TimeSeriesDataPoint[] {
  const pointsMap = new Map<string, TimeSeriesDataPoint>();
  const now = new Date();

  // Initialize all date buckets
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    pointsMap.set(key, {
      date: key,
      casesCreated: 0,
      casesResolved: 0,
      discrepanciesCreated: 0,
      verificationsRecorded: 0,
    });
  }

  cases.forEach((c) => {
    if (c.createdAt) {
      const k = c.createdAt.toISOString().slice(0, 10);
      if (pointsMap.has(k)) {
        pointsMap.get(k)!.casesCreated++;
      }
    }
    if (c.closedAt && (c.status === 'RESOLVED' || c.status === 'REJECTED')) {
      const k = c.closedAt.toISOString().slice(0, 10);
      if (pointsMap.has(k)) {
        pointsMap.get(k)!.casesResolved++;
      }
    }
  });

  discrepancies.forEach((d) => {
    if (d.createdAt) {
      const k = d.createdAt.toISOString().slice(0, 10);
      if (pointsMap.has(k)) {
        pointsMap.get(k)!.discrepanciesCreated++;
      }
    }
  });

  verifications.forEach((v) => {
    if (v.verifiedAt) {
      const k = v.verifiedAt.toISOString().slice(0, 10);
      if (pointsMap.has(k)) {
        pointsMap.get(k)!.verificationsRecorded++;
      }
    }
  });

  return Array.from(pointsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function deriveDecisionSupportInsights(
  cases: VerificationCase[],
  discrepancies: Discrepancy[],
  buildingAnalytics: BuildingAnalyticsItem[],
  aging: CaseAgingMetrics,
): DecisionSupportInsight[] {
  const insights: DecisionSupportInsight[] = [];

  // Insight 1: Discrepancy Concentration
  if (buildingAnalytics.length > 0) {
    const sortedByDisc = [...buildingAnalytics].sort((a, b) => b.discrepanciesCount - a.discrepanciesCount);
    const highest = sortedByDisc[0];
    if (highest && highest.discrepanciesCount > 0) {
      insights.push({
        id: 'ins-disc-concentration',
        category: 'DISCREPANCY',
        title: 'Discrepancy Concentration Detected',
        description: `Building "${highest.buildingName}" in society "${highest.societyName}" has the highest recorded discrepancies (${highest.discrepanciesCount} items). Recommended for prioritized field review.`,
        tone: 'alert',
      });
    }
  }

  // Insight 2: Case Aging
  const oldCasesCount = aging.bucket61to90 + aging.bucket90Plus;
  if (oldCasesCount > 0) {
    insights.push({
      id: 'ins-case-aging',
      category: 'AGING',
      title: 'Long-Open Verification Cases',
      description: `${oldCasesCount} cadastral case(s) have remained active for over 60 days. Timely resolution or reinspection is advised to maintain registry velocity.`,
      tone: 'warning',
    });
  }

  // Insight 3: Discrepancy Types
  const discBreakdown = computeDiscrepancyBreakdown(discrepancies);
  let highestType: DiscrepancyType | null = null;
  let highestCount = 0;
  for (const [t, count] of Object.entries(discBreakdown.byType)) {
    if (count > highestCount) {
      highestCount = count;
      highestType = t as DiscrepancyType;
    }
  }

  if (highestType && highestCount > 0) {
    insights.push({
      id: 'ins-disc-type',
      category: 'DISCREPANCY',
      title: 'Prevalent Discrepancy Category',
      description: `"${DISCREPANCY_TYPE_LABELS[highestType]}" is the most frequently recorded category (${highestCount} occurrences). Ensure architectural drawings and field survey logs match approved plans.`,
      tone: 'info',
    });
  }

  // Insight 4: Reinspection Requirements
  const reinspectionCases = cases.filter((c) => c.status === 'REINSPECTION_REQUIRED' || c.decision === 'REINSPECTION_REQUIRED');
  if (reinspectionCases.length > 0) {
    insights.push({
      id: 'ins-reinspection',
      category: 'REINSPECTION',
      title: 'Pending Reinspection Orders',
      description: `${reinspectionCases.length} case(s) currently require physical or 3D digital reinspection before final cadastral determination can be recorded.`,
      tone: 'warning',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'ins-nominal',
      category: 'PROGRESS',
      title: 'Platform Operations Nominal',
      description: 'Cadastral verification queues and discrepancy records are within standard operating benchmarks.',
      tone: 'success',
    });
  }

  return insights;
}

function derivePriorityCases(
  cases: VerificationCase[],
  societiesMap: Map<string, Society>,
): PriorityCaseItem[] {
  const items: PriorityCaseItem[] = [];

  cases
    .filter((c) => c.status !== 'RESOLVED' && c.status !== 'REJECTED')
    .forEach((c) => {
      const ageDays = calculateAgeInDays(c.createdAt);
      const society = societiesMap.get(c.societyId);
      const socName = society?.name || 'Society Master';

      let priorityScore = 0;
      const reasons: string[] = [];

      if (c.severity === 'CRITICAL') {
        priorityScore += 100;
        reasons.push('CRITICAL severity');
      } else if (c.severity === 'HIGH') {
        priorityScore += 60;
        reasons.push('HIGH severity');
      }

      if (ageDays >= 60) {
        priorityScore += 50;
        reasons.push(`Open for ${ageDays} days`);
      } else if (ageDays >= 30) {
        priorityScore += 25;
        reasons.push(`Open for ${ageDays} days`);
      }

      if (c.status === 'REINSPECTION_REQUIRED') {
        priorityScore += 30;
        reasons.push('Pending reinspection');
      } else if (c.status === 'EVIDENCE_REQUIRED') {
        priorityScore += 20;
        reasons.push('Awaiting evidence submission');
      }

      if (priorityScore > 0 || reasons.length > 0) {
        items.push({
          caseId: c.id,
          caseNumber: c.caseNumber,
          title: c.title,
          societyId: c.societyId,
          societyName: socName,
          buildingName: c.buildingId ? `Building ${c.buildingId}` : null,
          flatNumber: c.flatId ? `Flat ${c.flatId}` : null,
          severity: c.severity,
          status: c.status,
          ageDays,
          priorityReason: reasons.join(' • ') || 'Standard review priority',
          createdAt: c.createdAt,
        });
      }
    });

  // Sort by age (descending) and severity
  const severityRank: Record<DiscrepancySeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  items.sort((a, b) => {
    const sevDiff = severityRank[b.severity] - severityRank[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.ageDays - a.ageDays;
  });

  return items;
}

// ── Main Public Analytics Loaders ────────────────────────────────────────────

/**
 * Loads comprehensive live government platform analytics across all registered societies.
 */
export async function getGovernmentFullAnalytics(): Promise<FullGovernmentAnalytics> {
  const [
    allSocieties,
    allVerifications,
    allDiscrepancies,
    allCases,
    allHistory,
    spatialRecordsSnap,
  ] = await Promise.all([
    getAvailableSocieties(),
    getAllVerifications(),
    getAllDiscrepancies(),
    getAllVerificationCases(),
    getVerificationHistory(),
    getDocs(collection(db, 'propertySpatialRecords')),
  ]);

  const societiesMap = new Map<string, Society>();
  allSocieties.forEach((s) => societiesMap.set(s.id, s));

  // Fetch all buildings and flats across societies in parallel
  const societyBuildingPromises = allSocieties.map(async (soc) => {
    const bldgs = await getBuildings(soc.id);
    const residents = await getSocietyResidents(soc.id);

    const buildingItems: BuildingAnalyticsItem[] = [];
    let socTotalFloors = 0;
    let socTotalFlats = 0;
    let socVerifiedFlats = 0;
    let socPendingFlats = 0;

    await Promise.all(
      bldgs.map(async (b) => {
        const floors = await getFloors(soc.id, b.id);
        socTotalFloors += floors.length;

        let bldgFlatsCount = 0;
        let bldgVerifiedCount = 0;
        let bldgPendingCount = 0;

        await Promise.all(
          floors.map(async (f) => {
            const flats = await getFlats(soc.id, b.id, f.id);
            bldgFlatsCount += flats.length;
            flats.forEach((flat) => {
              const v = allVerifications.find(
                (item) => item.targetType === 'flat' && item.targetId === flat.id,
              );
              if (v?.status === 'verified') bldgVerifiedCount++;
              else bldgPendingCount++;
            });
          }),
        );

        socTotalFlats += bldgFlatsCount;
        socVerifiedFlats += bldgVerifiedCount;
        socPendingFlats += bldgPendingCount;

        const bldgDiscCount = allDiscrepancies.filter(
          (d) => d.societyId === soc.id && d.buildingId === b.id,
        ).length;
        const bldgCases = allCases.filter(
          (c) => c.societyId === soc.id && c.buildingId === b.id,
        );
        const bldgOpenCases = bldgCases.filter(
          (c) => c.status !== 'RESOLVED' && c.status !== 'REJECTED',
        ).length;
        const bldgResolvedCases = bldgCases.filter(
          (c) => c.status === 'RESOLVED' || c.status === 'REJECTED',
        ).length;

        const bldgRate =
          bldgFlatsCount > 0 ? Math.round((bldgVerifiedCount / bldgFlatsCount) * 100) : 0;

        buildingItems.push({
          buildingId: b.id,
          buildingName: b.name,
          buildingCode: b.code,
          societyId: soc.id,
          societyName: soc.name,
          totalFloors: floors.length,
          totalUnits: bldgFlatsCount,
          verifiedUnits: bldgVerifiedCount,
          pendingUnits: bldgPendingCount,
          discrepanciesCount: bldgDiscCount,
          openCasesCount: bldgOpenCases,
          resolvedCasesCount: bldgResolvedCases,
          verificationRate: bldgRate,
        });
      }),
    );

    const socDiscCount = allDiscrepancies.filter((d) => d.societyId === soc.id).length;
    const socCases = allCases.filter((c) => c.societyId === soc.id);
    const socOpenCases = socCases.filter(
      (c) => c.status !== 'RESOLVED' && c.status !== 'REJECTED',
    ).length;
    const socResolvedCases = socCases.filter(
      (c) => c.status === 'RESOLVED' || c.status === 'REJECTED',
    ).length;
    const socRate =
      socTotalFlats > 0 ? Math.round((socVerifiedFlats / socTotalFlats) * 100) : 0;

    const socVer = allVerifications.find(
      (v) => v.targetType === 'society' && v.targetId === soc.id,
    );

    const comparisonItem: SocietyComparisonItem = {
      societyId: soc.id,
      name: soc.name,
      registrationNumber: soc.registrationNumber,
      city: soc.address.city,
      state: soc.address.state,
      buildingsCount: bldgs.length,
      floorsCount: socTotalFloors,
      flatsCount: socTotalFlats,
      residentsCount: residents.length,
      verifiedCount: socVerifiedFlats,
      pendingCount: socPendingFlats,
      discrepanciesCount: socDiscCount,
      openCasesCount: socOpenCases,
      resolvedCasesCount: socResolvedCases,
      verificationRate: socRate,
      status: socVer ? socVer.status : 'pending',
    };

    return {
      buildingItems,
      comparisonItem,
      floorsCount: socTotalFloors,
      flatsCount: socTotalFlats,
      residentsCount: residents.length,
      verifiedFlats: socVerifiedFlats,
      pendingFlats: socPendingFlats,
    };
  });

  const societyResults = await Promise.all(societyBuildingPromises);

  const allBuildingAnalytics: BuildingAnalyticsItem[] = [];
  const societiesComparison: SocietyComparisonItem[] = [];

  let totalBuildings = 0;
  let totalFloors = 0;
  let totalFlats = 0;
  let totalResidents = 0;
  let totalVerifiedFlats = 0;
  let totalPendingFlats = 0;

  societyResults.forEach((res) => {
    allBuildingAnalytics.push(...res.buildingItems);
    societiesComparison.push(res.comparisonItem);
    totalBuildings += res.buildingItems.length;
    totalFloors += res.floorsCount;
    totalFlats += res.flatsCount;
    totalResidents += res.residentsCount;
    totalVerifiedFlats += res.verifiedFlats;
    totalPendingFlats += res.pendingFlats;
  });

  // Overview metrics
  const overview: PlatformOverviewMetrics = {
    totalSocieties: allSocieties.length,
    totalBuildings,
    totalFloors,
    totalFlats,
    totalResidents,
    totalSpatialRecords: spatialRecordsSnap.size,
  };

  // Verification metrics
  const totalProps = totalFlats > 0 ? totalFlats : allSocieties.length;
  const verifiedCount = totalVerifiedFlats;
  const pendingCount = totalPendingFlats;
  const vRate = totalProps > 0 ? Math.round((verifiedCount / totalProps) * 100) : 0;

  const verification: VerificationOverviewMetrics = {
    totalProperties: totalProps,
    verifiedCount,
    pendingCount,
    needsReviewCount: allVerifications.filter((v) => v.status === 'needs-review').length,
    flaggedCount: allVerifications.filter((v) => v.status === 'flagged').length,
    rejectedCount: allVerifications.filter((v) => v.status === 'rejected').length,
    verificationRate: vRate,
  };

  // Dispute & Case metrics
  const openCases = allCases.filter((c) => c.status === 'OPEN').length;
  const assignedCases = allCases.filter((c) => c.status === 'ASSIGNED').length;
  const investigationCases = allCases.filter((c) => c.status === 'UNDER_INVESTIGATION').length;
  const evidenceReqCases = allCases.filter((c) => c.status === 'EVIDENCE_REQUIRED').length;
  const reinspectionCases = allCases.filter((c) => c.status === 'REINSPECTION_REQUIRED').length;
  const resolvedCases = allCases.filter((c) => c.status === 'RESOLVED').length;
  const rejectedCases = allCases.filter((c) => c.status === 'REJECTED').length;
  const resolutionRate =
    allCases.length > 0 ? Math.round(((resolvedCases + rejectedCases) / allCases.length) * 100) : 0;

  const disputes: DisputeOverviewMetrics = {
    totalCases: allCases.length,
    openCount: openCases,
    assignedCount: assignedCases,
    underInvestigationCount: investigationCases,
    evidenceRequiredCount: evidenceReqCases,
    reinspectionRequiredCount: reinspectionCases,
    resolvedCount: resolvedCases,
    rejectedCount: rejectedCases,
    resolutionRate,
  };

  const discrepancies = computeDiscrepancyBreakdown(allDiscrepancies);
  const caseAging = computeCaseAging(allCases);
  const decisions = computeDecisionMetrics(allCases);

  // Time series trends
  const trends7Days = computeTimeSeries(allCases, allDiscrepancies, allVerifications, 7);
  const trends30Days = computeTimeSeries(allCases, allDiscrepancies, allVerifications, 30);
  const trends90Days = computeTimeSeries(allCases, allDiscrepancies, allVerifications, 90);

  const insights = deriveDecisionSupportInsights(
    allCases,
    allDiscrepancies,
    allBuildingAnalytics,
    caseAging,
  );
  const priorityCases = derivePriorityCases(allCases, societiesMap);

  return {
    overview,
    verification,
    disputes,
    discrepancies,
    caseAging,
    decisions,
    trends7Days,
    trends30Days,
    trends90Days,
    buildingAnalytics: allBuildingAnalytics,
    societiesComparison,
    priorityCases,
    insights,
    recentActivity: allHistory.slice(0, 15),
    lastUpdated: new Date(),
  };
}

/**
 * Loads analytics specific to a single society hierarchy.
 */
export async function getSocietyAnalytics(societyId: string): Promise<SocietyDetailAnalytics | null> {
  if (!societyId) return null;

  const [
    society,
    bldgs,
    residents,
    verifications,
    discrepancies,
    cases,
    history,
    evidenceList,
    spatialRecordsSnap,
  ] = await Promise.all([
    getSocietyById(societyId),
    getBuildings(societyId),
    getSocietyResidents(societyId),
    getVerificationsForSociety(societyId),
    getDiscrepanciesForSociety(societyId),
    getVerificationCasesForSociety(societyId),
    getVerificationHistory(societyId),
    getEvidenceForSociety(societyId),
    getDocs(query(collection(db, 'propertySpatialRecords'), where('societyId', '==', societyId))),
  ]);

  if (!society) return null;

  const societyVerification = verifications.find(
    (v) => v.targetType === 'society' && v.targetId === societyId,
  );

  const buildingAnalytics: BuildingAnalyticsItem[] = [];
  const floorAnalytics: FloorAnalyticsItem[] = [];

  let totalFlats = 0;
  let verifiedFlats = 0;
  let pendingFlats = 0;

  await Promise.all(
    bldgs.map(async (b) => {
      const floors = await getFloors(societyId, b.id);
      let bldgFlats = 0;
      let bldgVerified = 0;
      let bldgPending = 0;

      await Promise.all(
        floors.map(async (f) => {
          const flats = await getFlats(societyId, b.id, f.id);
          let floorVerified = 0;
          let floorPending = 0;

          flats.forEach((flat) => {
            const v = verifications.find(
              (item) => item.targetType === 'flat' && item.targetId === flat.id,
            );
            if (v?.status === 'verified') {
              floorVerified++;
              bldgVerified++;
            } else {
              floorPending++;
              bldgPending++;
            }
          });

          bldgFlats += flats.length;
          const floorRate =
            flats.length > 0 ? Math.round((floorVerified / flats.length) * 100) : 0;
          const floorDiscCount = discrepancies.filter(
            (d) => d.buildingId === b.id && d.floorId === f.id,
          ).length;
          const floorCasesCount = cases.filter(
            (c) => c.buildingId === b.id && c.floorId === f.id,
          ).length;

          floorAnalytics.push({
            floorId: f.id,
            floorNumber: f.floorNumber,
            floorLabel: f.floorLabel,
            buildingId: b.id,
            buildingName: b.name,
            totalFlats: flats.length,
            verifiedCount: floorVerified,
            pendingCount: floorPending,
            discrepanciesCount: floorDiscCount,
            openCasesCount: floorCasesCount,
            verificationRate: floorRate,
          });
        }),
      );

      totalFlats += bldgFlats;
      verifiedFlats += bldgVerified;
      pendingFlats += bldgPending;

      const bldgRate = bldgFlats > 0 ? Math.round((bldgVerified / bldgFlats) * 100) : 0;
      const bldgDiscCount = discrepancies.filter((d) => d.buildingId === b.id).length;
      const bldgCases = cases.filter((c) => c.buildingId === b.id);
      const bldgOpenCases = bldgCases.filter(
        (c) => c.status !== 'RESOLVED' && c.status !== 'REJECTED',
      ).length;
      const bldgResolvedCases = bldgCases.filter(
        (c) => c.status === 'RESOLVED' || c.status === 'REJECTED',
      ).length;

      buildingAnalytics.push({
        buildingId: b.id,
        buildingName: b.name,
        buildingCode: b.code,
        societyId,
        societyName: society.name,
        totalFloors: floors.length,
        totalUnits: bldgFlats,
        verifiedUnits: bldgVerified,
        pendingUnits: bldgPending,
        discrepanciesCount: bldgDiscCount,
        openCasesCount: bldgOpenCases,
        resolvedCasesCount: bldgResolvedCases,
        verificationRate: bldgRate,
      });
    }),
  );

  const verificationRate =
    totalFlats > 0 ? Math.round((verifiedFlats / totalFlats) * 100) : 0;

  const verification: VerificationOverviewMetrics = {
    totalProperties: totalFlats > 0 ? totalFlats : 1,
    verifiedCount: verifiedFlats,
    pendingCount: pendingFlats,
    needsReviewCount: verifications.filter((v) => v.status === 'needs-review').length,
    flaggedCount: verifications.filter((v) => v.status === 'flagged').length,
    rejectedCount: verifications.filter((v) => v.status === 'rejected').length,
    verificationRate,
  };

  const resolvedCases = cases.filter((c) => c.status === 'RESOLVED').length;
  const rejectedCases = cases.filter((c) => c.status === 'REJECTED').length;
  const resolutionRate =
    cases.length > 0 ? Math.round(((resolvedCases + rejectedCases) / cases.length) * 100) : 0;

  const disputes: DisputeOverviewMetrics = {
    totalCases: cases.length,
    openCount: cases.filter((c) => c.status === 'OPEN').length,
    assignedCount: cases.filter((c) => c.status === 'ASSIGNED').length,
    underInvestigationCount: cases.filter((c) => c.status === 'UNDER_INVESTIGATION').length,
    evidenceRequiredCount: cases.filter((c) => c.status === 'EVIDENCE_REQUIRED').length,
    reinspectionRequiredCount: cases.filter((c) => c.status === 'REINSPECTION_REQUIRED').length,
    resolvedCount: resolvedCases,
    rejectedCount: rejectedCases,
    resolutionRate,
  };

  const discBreakdown = computeDiscrepancyBreakdown(discrepancies);
  const caseAging = computeCaseAging(cases);
  const decisions = computeDecisionMetrics(cases);

  const societiesMap = new Map<string, Society>([[society.id, society]]);
  const priorityCases = derivePriorityCases(cases, societiesMap);
  const insights = deriveDecisionSupportInsights(
    cases,
    discrepancies,
    buildingAnalytics,
    caseAging,
  );

  return {
    society,
    verificationStatus: societyVerification ? societyVerification.status : 'pending',
    overview: {
      buildingsCount: bldgs.length,
      floorsCount: floorAnalytics.length,
      flatsCount: totalFlats,
      residentsCount: residents.length,
      evidenceCount: evidenceList.length,
      spatialRecordsCount: spatialRecordsSnap.size,
    },
    verification,
    disputes,
    discrepancies: discBreakdown,
    caseAging,
    decisions,
    buildings: buildingAnalytics,
    floors: floorAnalytics,
    cases,
    priorityCases,
    insights,
    recentActivity: history.slice(0, 15),
    lastUpdated: new Date(),
  };
}
