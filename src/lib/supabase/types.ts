/**
 * Supabase Database Types (Phase 13)
 * ==================================
 * TypeScript definitions mirroring the PostgreSQL schema defined in
 * `supabase/migrations/`. These types bridge the database rows to the
 * existing application types in `@/types/*` so repositories can map
 * between the two without duplication.
 *
 * Generated from the migration files — kept in sync manually with
 * `supabase/migrations/*.sql`.
 */

// ── Users (Phase 13 legacy mirror table — text IDs, e.g. usr-cit-101) ────────

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN';
  account_status: 'ACTIVE' | 'DISABLED';
  phone: string | null;
  aadhaar_or_gov_id: string | null;
  avatar_url: string | null;
  department: string | null;
  designation: string | null;
  jurisdiction_district: string | null;
  badge_number: string | null;
  created_at: string;
  updated_at: string;
}

// ── Profiles (Phase 14 — application profile keyed to auth.users.id) ─────────

/**
 * Row of the `public.profiles` table (migration 016). The `id` is the Supabase
 * Auth user's UUID (foreign key to auth.users). Passwords are NEVER stored
 * here — credentials are managed exclusively by Supabase Auth.
 */
export interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  aadhaar_or_gov_id: string | null;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN';
  account_status: 'ACTIVE' | 'DISABLED';
  avatar_url: string | null;
  department: string | null;
  designation: string | null;
  jurisdiction_district: string | null;
  badge_number: string | null;
  created_at: string;
  updated_at: string;
}


// ── Parcels ──────────────────────────────────────────────────────────────────

export interface DbParcel {
  id: string;
  parcel_number: string;
  location: string;
  district: string;
  state: string;
  area: number;
  geometry: unknown; // GeoJSON Geometry (PostGIS geometry)
  centroid_lat: number;
  centroid_lng: number;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISPUTED';
  created_at: string;
  updated_at: string;
}

// ── Buildings ────────────────────────────────────────────────────────────────

export interface DbBuilding {
  id: string;
  building_code: string;
  name: string;
  parcel_id: string;
  address: string;
  latitude: number;
  longitude: number;
  height: number | null;
  total_floors: number | null;
  built_up_area: number | null;
  year_built: number | null;
  geometry: unknown; // GeoJSON Geometry (PostGIS geometry)
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_CONSTRUCTION';
  created_at: string;
  updated_at: string;
}

// ── Floors ───────────────────────────────────────────────────────────────────

export interface DbFloor {
  id: string;
  building_id: string;
  floor_number: number;
  name: string;
  elevation: number;
  area: number;
  total_units: number;
  created_at: string;
  updated_at: string;
}

// ── Property Units (GIS vertical units) ──────────────────────────────────────

export interface DbPropertyUnit {
  id: string;
  property_id: string;
  building_id: string;
  floor_id: string;
  parcel_id: string;
  unit_number: string;
  demo_spatial_id: string;
  official_ulpin_reference: string | null;
  property_type: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'AGRICULTURAL' | 'MIXED_USE' | 'GOVERNMENT';
  area: number;
  latitude: number;
  longitude: number;
  elevation: number;
  geometry: unknown;
  owner_reference_name: string;
  verification_status: 'Pending' | 'Under Review' | 'Field Verification' | 'Verified' | 'Rejected' | 'Reinspection Required';
  data_source: 'SURVEY_RECORD' | 'DRONE_SCAN' | 'AI_EXTRACTION' | 'MANUAL_INPUT';
  confidence: number;
  generated_at: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
  demo_spatial_id_metadata: Record<string, unknown> | null;
  official_ulpin_metadata: Record<string, unknown> | null;
}

// ── Demo Spatial Identifiers ─────────────────────────────────────────────────

export interface DbDemoSpatialId {
  id: string;
  property_unit_id: string;
  demo_id: string;
  algorithm: string;
  confidence: number;
  is_official: boolean;
  generated_at: string;
  note: string;
}

// ── Property Items (legacy PropertyItem system) ──────────────────────────────

export interface DbPropertyItem {
  id: string;
  ulpin: string;
  property_id: string;
  title: string;
  property_type: string;
  primary_owner_name: string;
  co_owners: string[] | null;
  owner_contact_masked: string;
  owner_aadhaar_masked: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  boundary_coordinates: unknown;
  adjacent_parcels: unknown | null;
  verification_status: string;
  market_valuation_inr: number;
  government_valuation_inr: number;
  featured_image_url: string;
  aerial_image_url: string | null;
  has_active_dispute: boolean;
  land_details: unknown;
  building: unknown | null;
  documents: unknown;
  verification_history: unknown;
  assigned_officer: unknown | null;
  created_at: string;
  updated_at: string;
}

// ── Verifications ────────────────────────────────────────────────────────────

export interface DbVerification {
  id: string;
  property_id: string;
  previous_status: string;
  new_status: string;
  verified_by: string;
  verified_by_role: 'OFFICER' | 'CITIZEN' | 'SYSTEM' | 'AI_AGENT';
  verification_date: string;
  notes: string;
  photo_url: string | null;
  gps_matched: boolean;
  boundary_matched: boolean;
  confidence_score: number;
  method: 'RTK_GNSS' | 'DRONE_SCAN' | 'TOTAL_STATION' | 'VISUAL_INSPECTION' | 'AI_EXTRACTION';
    source: 'OFFICER' | 'CITIZEN' | 'SYSTEM' | 'AI_AGENT';
  created_at: string;
}

// ── Conflicts ────────────────────────────────────────────────────────────────

export interface DbConflict {
  id: string;
  conflict_number: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending Review' | 'Under Investigation' | 'Resolved';
  parcel_id: string | null;
  building_id: string | null;
  affected_property_ids: string[];
  description: string;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  last_action_at: string | null;
  field_review: unknown | null;
  correction_request: unknown | null;
  geometry: unknown;
  created_at: string;
  updated_at: string;
}

// ── Workflow Tasks ───────────────────────────────────────────────────────────

export interface DbWorkflowTask {
  id: string;
  title: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  created_by: string;
  created_by_name: string;
  due_date: string | null;
  completed_at: string | null;
  history: unknown;
  created_at: string;
  updated_at: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface DbNotification {
  id: string;
  user_id: string | null;
  recipient_role: 'CITIZEN' | 'OFFICER' | 'ADMIN' | 'ALL';
  title: string;
  message: string;
  type: 'VERIFICATION' | 'DISPUTE' | 'FIELD_INSPECTION' | 'SYSTEM' | 'SECURITY' | 'TASK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  is_read: boolean;
  link_url: string | null;
  created_at: string;
}

// ── Audit Logs ───────────────────────────────────────────────────────────────

export interface DbAuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_value: string | null;
  new_value: string | null;
  details: string | null;
  ip_address_masked: string;
  created_at: string;
}

// ── Disputes ─────────────────────────────────────────────────────────────────

export interface DbDispute {
  id: string;
  dispute_ticket_number: string;
  property_id: string;
  ulpin: string;
  property_title: string;
  property_address: string;
  raised_by_user_id: string;
  raised_by_user_name: string;
  raised_by_user_contact: string;
  category: string;
  title: string;
  description: string;
  claimed_coordinates: unknown | null;
  evidences: unknown;
  status: string;
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  created_at: string;
  updated_at: string;
  hearing_date: string | null;
  officer_inspection_notes: string | null;
  resolution_summary: string | null;
}

// ── Field Verification Requests ──────────────────────────────────────────────

export interface DbFieldVerificationRequest {
  id: string;
  request_number: string;
  property_id: string;
  ulpin: string;
  property_title: string;
  property_address: string;
  requested_by_user_id: string;
  requested_by_user_name: string;
  survey_type: string;
  urgency: string;
  preferred_date: string;
  reason: string;
  evidences: unknown;
  status: string;
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  inspection_report_url: string | null;
  officer_findings: string | null;
  created_at: string;
}

// ── Activities (unified activity feed) ────────────────────────────────────────

export interface DbActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  user: string;
  user_role: string;
  status: string;
  metadata: unknown | null;
  created_at: string;
}