'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  LandParcel,
  Building,
  Floor,
  PropertyUnit,
  PropertyVerificationStatus,
  DemoSpatialIdentifier,
} from '@/types/gis';
import type { VerificationRecord, VerificationMethod } from '@/types/verification';
import type { SpatialConflict, ConflictStatus } from '@/types/conflict';
import type { ActivityRecord } from '@/types/activity';
import { MOCK_PARCELS } from '@/data/parcels';
import { MOCK_BUILDINGS } from '@/data/buildings';
import { MOCK_FLOORS } from '@/data/floors';
import { MOCK_PROPERTIES } from '@/data/properties';
import { MOCK_VERIFICATIONS } from '@/data/verifications';
import { MOCK_CONFLICTS } from '@/data/conflicts';
import { MOCK_ACTIVITIES } from '@/data/activities';
import { MOCK_DEMO_SPATIAL_IDS } from '@/data/demoSpatialIds';
import { reportAudit } from '@/lib/auth/client';

// ── Context shape ───────────────────────────────────────────────────────────

/**
 * Optional measurement evidence captured by the verification UI and attached
 * to the resulting VerificationRecord. Every field is optional so existing
 * callers of the verification actions keep working unchanged.
 */
export interface VerificationActionDetails {
  gpsMatched?: boolean;
  boundaryMatched?: boolean;
  method?: VerificationMethod;
  confidenceScore?: number;
  /** Demo evidence reference (session-only photo label for the MVP). */
  photoUrl?: string;
}

export interface GISContextType {
  // ── Data ──
  parcels: LandParcel[];
  buildings: Building[];
  floors: Floor[];
  properties: PropertyUnit[];
  verifications: VerificationRecord[];
  conflicts: SpatialConflict[];
  activities: ActivityRecord[];
  demoSpatialIds: DemoSpatialIdentifier[];

  // ── Selection state ──
  selectedParcelId: string | null;
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  selectedPropertyId: string | null;

  // ── Selection actions ──
  selectParcel: (parcelId: string | null) => void;
  selectBuilding: (buildingId: string | null) => void;
  selectFloor: (floorId: string | null) => void;
  selectProperty: (propertyId: string | null) => void;
  clearSelection: () => void;

  // ── Verification actions ──
  verifyProperty: (propertyId: string, verifiedBy: string, notes: string, details?: VerificationActionDetails) => void;
  rejectProperty: (propertyId: string, verifiedBy: string, notes: string) => void;
  requestReinspection: (propertyId: string, verifiedBy: string, reason: string) => void;
  /** Moves a unit into the 'Field Verification' work state (field officer queue). */
  sendToFieldVerification: (propertyId: string, requestedBy: string, reason: string) => void;

  // ── Conflict actions ──
  resolveConflict: (conflictId: string, resolvedBy: string, notes: string) => void;
  /** Sends a conflict for field review (routes into the Phase 4 field workflow). */
  sendConflictToFieldReview: (conflictId: string, requestedBy: string, notes: string) => void;
  /** Records a demo data-correction request against a conflict. */
  requestConflictCorrection: (conflictId: string, requestedBy: string, category: string, notes: string) => void;
  /** Timestamp of the last demo spatial-validation run (null = never run). */
  lastValidationAt: string | null;
  recordSpatialValidation: (runAt: string) => void;

  // ── Activity actions ──
  addActivity: (activity: Omit<ActivityRecord, 'id'>) => void;
}

const GISContext = createContext<GISContextType | undefined>(undefined);

// ── ID helpers ──────────────────────────────────────────────────────────────

let verificationCounter = 100;
function nextVerificationId(): string {
  verificationCounter += 1;
  return `VER-${String(verificationCounter).padStart(3, '0')}`;
}

let activityCounter = 100;
function nextActivityId(): string {
  activityCounter += 1;
  return `ACT-${String(activityCounter).padStart(3, '0')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Provider ────────────────────────────────────────────────────────────────

export const GISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Data state ──
  const [parcels] = useState<LandParcel[]>(MOCK_PARCELS);
  const [buildings] = useState<Building[]>(MOCK_BUILDINGS);
  const [floors] = useState<Floor[]>(MOCK_FLOORS);
  const [properties, setProperties] = useState<PropertyUnit[]>(MOCK_PROPERTIES);
  const [verifications, setVerifications] = useState<VerificationRecord[]>(MOCK_VERIFICATIONS);
  const [conflicts, setConflicts] = useState<SpatialConflict[]>(MOCK_CONFLICTS);
  const [activities, setActivities] = useState<ActivityRecord[]>(MOCK_ACTIVITIES);
  const [demoSpatialIds] = useState<DemoSpatialIdentifier[]>(MOCK_DEMO_SPATIAL_IDS);

  // ── Selection state ──
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // ── Selection actions ──
  const selectParcel = useCallback((parcelId: string | null) => {
    setSelectedParcelId(parcelId);
    // cascading clear: selecting a parcel invalidates child selections
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setSelectedPropertyId(null);
  }, []);

  const selectBuilding = useCallback((buildingId: string | null) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId(null);
    setSelectedPropertyId(null);
    if (buildingId) {
      const building = MOCK_BUILDINGS.find((b) => b.id === buildingId);
      if (building) setSelectedParcelId(building.parcelId);
    }
  }, []);

  const selectFloor = useCallback((floorId: string | null) => {
    setSelectedFloorId(floorId);
    setSelectedPropertyId(null);
    if (floorId) {
      const floor = MOCK_FLOORS.find((f) => f.id === floorId);
      if (floor) {
        setSelectedBuildingId(floor.buildingId);
        const building = MOCK_BUILDINGS.find((b) => b.id === floor.buildingId);
        if (building) setSelectedParcelId(building.parcelId);
      }
    }
  }, []);

  const selectProperty = useCallback((propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      const property = properties.find((p) => p.id === propertyId);
      if (property) {
        setSelectedFloorId(property.floorId);
        setSelectedBuildingId(property.buildingId);
        setSelectedParcelId(property.parcelId);
      }
    }
  }, [properties]);

  const clearSelection = useCallback(() => {
    setSelectedParcelId(null);
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setSelectedPropertyId(null);
  }, []);

  // ── Activity helper ──
  const addActivity = useCallback((activity: Omit<ActivityRecord, 'id'>) => {
    const record: ActivityRecord = { ...activity, id: nextActivityId() };
    setActivities((prev) => [record, ...prev]);
  }, []);

  // ── Verification helpers ──
  const appendVerification = useCallback((record: VerificationRecord) => {
    setVerifications((prev) => [record, ...prev]);
  }, []);

  const updatePropertyStatus = useCallback(
    (propertyId: string, newStatus: PropertyVerificationStatus) => {
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId
            ? { ...p, verificationStatus: newStatus, lastUpdated: nowIso() }
            : p,
        ),
      );
    },
    [],
  );

  // ── Verification actions ──
  const verifyProperty = useCallback(
    (propertyId: string, verifiedBy: string, notes: string, details?: VerificationActionDetails) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return;
      const record: VerificationRecord = {
        id: nextVerificationId(),
        propertyId,
        previousStatus: property.verificationStatus,
        newStatus: 'Verified',
        verifiedBy,
        verifiedByRole: 'OFFICER',
        verificationDate: nowIso(),
        notes,
        gpsMatched: details?.gpsMatched ?? true,
        boundaryMatched: details?.boundaryMatched ?? true,
        confidenceScore:
          details?.confidenceScore ?? Math.round(property.demoSpatialIdMetadata.confidence * 100),
        method: details?.method ?? 'RTK_GNSS',
        source: 'OFFICER',
        ...(details?.photoUrl ? { photoUrl: details.photoUrl } : {}),
      };
      appendVerification(record);
      updatePropertyStatus(propertyId, 'Verified');
      addActivity({
        type: 'PROPERTY_VERIFICATION',
        title: 'Property Verified',
        description: `${propertyId} verified by ${verifiedBy}. Demo spatial ID ${property.demoSpatialId} recorded.`,
        entityType: 'PROPERTY',
        entityId: propertyId,
        timestamp: nowIso(),
        user: verifiedBy,
        userRole: 'OFFICER',
        status: 'COMPLETED',
        metadata: { method: record.method, confidence: record.confidenceScore },
      });
      // Phase 10: audit trail — actor/timestamp are stamped server-side; never blocks the action.
      reportAudit({
        action: 'VERIFICATION_UPDATED',
        entityType: 'VERIFICATION',
        entityId: propertyId,
        previousValue: record.previousStatus,
        newValue: record.newStatus,
        details: `Verified by ${verifiedBy}`,
      });
    },
    [properties, appendVerification, updatePropertyStatus, addActivity],
  );

  const rejectProperty = useCallback(
    (propertyId: string, verifiedBy: string, notes: string) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return;
      const record: VerificationRecord = {
        id: nextVerificationId(),
        propertyId,
        previousStatus: property.verificationStatus,
        newStatus: 'Rejected',
        verifiedBy,
        verifiedByRole: 'OFFICER',
        verificationDate: nowIso(),
        notes,
        gpsMatched: true,
        boundaryMatched: true,
        confidenceScore: 40,
        method: 'VISUAL_INSPECTION',
        source: 'OFFICER',
      };
      appendVerification(record);
      updatePropertyStatus(propertyId, 'Rejected');
      addActivity({
        type: 'PROPERTY_VERIFICATION',
        title: 'Property Rejected',
        description: `${propertyId} rejected by ${verifiedBy}. ${notes}`,
        entityType: 'PROPERTY',
        entityId: propertyId,
        timestamp: nowIso(),
        user: verifiedBy,
        userRole: 'OFFICER',
        status: 'COMPLETED',
        metadata: { method: 'VISUAL_INSPECTION', confidence: 40 },
      });
      // Phase 10: audit trail (server-stamped actor; fire-and-forget).
      reportAudit({
        action: 'VERIFICATION_UPDATED',
        entityType: 'VERIFICATION',
        entityId: propertyId,
        previousValue: record.previousStatus,
        newValue: record.newStatus,
        details: `Rejected by ${verifiedBy}`,
      });
    },
    [properties, appendVerification, updatePropertyStatus, addActivity],
  );

  const requestReinspection = useCallback(
    (propertyId: string, verifiedBy: string, reason: string) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return;
      const record: VerificationRecord = {
        id: nextVerificationId(),
        propertyId,
        previousStatus: property.verificationStatus,
        newStatus: 'Reinspection Required',
        verifiedBy,
        verifiedByRole: 'OFFICER',
        verificationDate: nowIso(),
        notes: reason,
        gpsMatched: false,
        boundaryMatched: false,
        confidenceScore: 55,
        method: 'VISUAL_INSPECTION',
        source: 'OFFICER',
      };
      appendVerification(record);
      updatePropertyStatus(propertyId, 'Reinspection Required');
      addActivity({
        type: 'PROPERTY_VERIFICATION',
        title: 'Reinspection Requested',
        description: `${propertyId} marked for reinspection by ${verifiedBy}. Reason: ${reason}`,
        entityType: 'PROPERTY',
        entityId: propertyId,
        timestamp: nowIso(),
        user: verifiedBy,
        userRole: 'OFFICER',
        status: 'PENDING',
        metadata: { method: 'VISUAL_INSPECTION', confidence: 55 },
      });
      // Phase 10: audit trail (server-stamped actor; fire-and-forget).
      reportAudit({
        action: 'VERIFICATION_UPDATED',
        entityType: 'VERIFICATION',
        entityId: propertyId,
        previousValue: record.previousStatus,
        newValue: record.newStatus,
        details: `Reinspection requested by ${verifiedBy}`,
      });
    },
    [properties, appendVerification, updatePropertyStatus, addActivity],
  );

  const sendToFieldVerification = useCallback(
    (propertyId: string, requestedBy: string, reason: string) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return;
      const record: VerificationRecord = {
        id: nextVerificationId(),
        propertyId,
        previousStatus: property.verificationStatus,
        newStatus: 'Field Verification',
        verifiedBy: requestedBy,
        verifiedByRole: 'OFFICER',
        verificationDate: nowIso(),
        notes: reason,
        gpsMatched: false,
        boundaryMatched: false,
        confidenceScore: 50,
        method: 'VISUAL_INSPECTION',
        source: 'OFFICER',
      };
      appendVerification(record);
      updatePropertyStatus(propertyId, 'Field Verification');
      addActivity({
        type: 'PROPERTY_VERIFICATION',
        title: 'Field Verification Requested',
        description: `${propertyId} moved to field verification by ${requestedBy}. ${reason}`,
        entityType: 'PROPERTY',
        entityId: propertyId,
        timestamp: nowIso(),
        user: requestedBy,
        userRole: 'OFFICER',
        status: 'PENDING',
        metadata: { method: 'VISUAL_INSPECTION', fieldQueue: true },
      });
      // Phase 10: audit trail (server-stamped actor; fire-and-forget).
      reportAudit({
        action: 'FIELD_VERIFICATION_REQUESTED',
        entityType: 'FIELD_VERIFICATION',
        entityId: propertyId,
        previousValue: record.previousStatus,
        newValue: record.newStatus,
        details: `Field verification requested by ${requestedBy}`,
      });
    },
    [properties, appendVerification, updatePropertyStatus, addActivity],
  );

  // ── Conflict actions ──
  const resolveConflict = useCallback(
    (conflictId: string, resolvedBy: string, notes: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: 'Resolved' as ConflictStatus,
                resolvedAt: nowIso(),
                resolvedBy,
                resolutionNotes: notes,
              }
            : c,
        ),
      );
      addActivity({
        type: 'CONFLICT_RESOLUTION',
        title: 'Conflict Resolved',
        description: `Spatial conflict ${conflictId} resolved by ${resolvedBy}. ${notes}`,
        entityType: 'CONFLICT',
        entityId: conflictId,
        timestamp: nowIso(),
        user: resolvedBy,
        userRole: 'OFFICER',
        status: 'COMPLETED',
        metadata: { resolvedBy, notes },
      });
      // Phase 10: audit trail (server-stamped actor; fire-and-forget).
      reportAudit({
        action: 'CONFLICT_UPDATED',
        entityType: 'CONFLICT',
        entityId: conflictId,
        newValue: 'Resolved',
        details: `Resolved by ${resolvedBy}`,
      });
    },
    [addActivity],
  );

  /** Moves a conflict to 'Under Investigation' and records the field-review request centrally. */
  const sendConflictToFieldReview = useCallback(
    (conflictId: string, requestedBy: string, notes: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: 'Under Investigation' as ConflictStatus,
                lastActionAt: nowIso(),
                fieldReview: { requestedBy, requestedAt: nowIso(), notes },
              }
            : c,
        ),
      );
      addActivity({
        type: 'CONFLICT_FIELD_REVIEW',
        title: 'Field Review Requested',
        description: `Conflict ${conflictId} was sent for field verification by ${requestedBy}. ${notes}`,
        entityType: 'CONFLICT',
        entityId: conflictId,
        timestamp: nowIso(),
        user: requestedBy,
        userRole: 'OFFICER',
        status: 'PENDING',
        metadata: { requestedBy, notes },
      });
      // Phase 10: audit trail (server-stamped actor; fire-and-forget).
      reportAudit({
        action: 'CONFLICT_UPDATED',
        entityType: 'CONFLICT',
        entityId: conflictId,
        newValue: 'Under Investigation (field review)',
        details: `Field review requested by ${requestedBy}`,
      });
    },
    [addActivity],
  );

  /** Records a demo data-correction request on a conflict (stays 'Under Investigation'). */
  const requestConflictCorrection = useCallback(
    (conflictId: string, requestedBy: string, category: string, notes: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: 'Under Investigation' as ConflictStatus,
                lastActionAt: nowIso(),
                correctionRequest: { category, notes, requestedBy, requestedAt: nowIso() },
              }
            : c,
        ),
      );
      addActivity({
        type: 'CONFLICT_CORRECTION',
        title: 'Data Correction Requested',
        description: `${category} requested for conflict ${conflictId} by ${requestedBy}. ${notes}`,
        entityType: 'CONFLICT',
        entityId: conflictId,
        timestamp: nowIso(),
        user: requestedBy,
        userRole: 'OFFICER',
        status: 'PENDING',
        metadata: { category, notes },
      });
      // Phase 10: audit trail (server-stamped actor; fire-and-forget).
      reportAudit({
        action: 'CONFLICT_UPDATED',
        entityType: 'CONFLICT',
        entityId: conflictId,
        newValue: 'Under Investigation (correction requested)',
        details: `${category} correction requested by ${requestedBy}`,
      });
    },
    [addActivity],
  );

  /** Stores the latest demo spatial-validation run timestamp for status display. */
  const [lastValidationAt, setLastValidationAt] = useState<string | null>(null);
  const recordSpatialValidation = useCallback((runAt: string) => {
    setLastValidationAt(runAt);
  }, []);


  return (
    <GISContext.Provider
      value={{
        parcels,
        buildings,
        floors,
        properties,
        verifications,
        conflicts,
        activities,
        demoSpatialIds,
        selectedParcelId,
        selectedBuildingId,
        selectedFloorId,
        selectedPropertyId,
        selectParcel,
        selectBuilding,
        selectFloor,
        selectProperty,
        clearSelection,
        verifyProperty,
        rejectProperty,
        requestReinspection,
        sendToFieldVerification,
        resolveConflict,
        sendConflictToFieldReview,
        requestConflictCorrection,
        lastValidationAt,
        recordSpatialValidation,
        addActivity,
      }}
    >
      {children}
    </GISContext.Provider>
  );
};

// ── Hook ────────────────────────────────────────────────────────────────────

export const useGIS = (): GISContextType => {
  const context = useContext(GISContext);
  if (!context) {
    throw new Error('useGIS must be used within a GISProvider');
  }
  return context;
};