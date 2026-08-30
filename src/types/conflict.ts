/**
 * Spatial Conflict Data Types
 * =============================
 * Types for detecting and tracking spatial conflicts between parcels,
 * buildings, and property units.
 */
import type { Geometry } from './gis';

/** Category of spatial conflict. */
export type ConflictType =
  | 'Boundary Overlap'
  | 'Missing Boundary'
  | 'Invalid Geometry'
  | 'Outside Parent Parcel'
  | 'Duplicate Spatial ID';

/** Severity level of a spatial conflict. */
export type ConflictSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

/** Lifecycle status of a spatial conflict. */
export type ConflictStatus = 'Pending Review' | 'Under Investigation' | 'Resolved';

/**
 * A spatial conflict detected during GIS analysis.
 *
 * Conflicts link back to the parcels / buildings / property units that
 * are involved so that the UI can drill down from a conflict card to the
 * affected entities.
 */
export interface SpatialConflict {
  id: string;
  conflictNumber: string; // e.g. CON-2025-001
  type: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  /** Parcel involved in the conflict (if applicable). */
  parcelId?: string;
  /** Building involved in the conflict (if applicable). */
  buildingId?: string;
  /** All property unit IDs affected by this conflict. */
  affectedPropertyIds: string[];
  /** Human-readable description of the conflict. */
  description: string;
  /** ISO timestamp when the conflict was first detected. */
  detectedAt: string;
  /** ISO timestamp when the conflict was resolved (null if open). */
  resolvedAt?: string;
  /** Name / ID of the agent who resolved the conflict. */
  resolvedBy?: string;
  /** Notes added when the conflict was resolved. */
  resolutionNotes?: string;
  /**
   * Centralized workflow metadata: timestamp of the most recent review action
   * (field review, data correction, etc.). Maintained by GISContext only.
   */
  lastActionAt?: string;
  /** Field-review request recorded by the centralized field-review workflow. */
  fieldReview?: { requestedBy: string; requestedAt: string; notes: string };
  /** Demo data-correction request recorded by the correction workflow. */
  correctionRequest?: { category: string; notes: string; requestedBy: string; requestedAt: string };
  /** Geometry of the conflict area (for 2D / 3D visualisation). */
  geometry: Geometry;
}
