/**
 * Society-Specific 3D Digital Twin Type Definitions (Phase 23)
 * =============================================================
 * Defines the complete data model for procedural, cadastral, and
 * AI-generated 3D digital twins. Every society possesses its own
 * distinct scene configuration with strict data isolation.
 */

export type DigitalTwinGenerationStatus =
  | 'QUEUED'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'READY'
  | 'GENERATED'
  | 'CONFIGURED'
  | 'SOURCE_IMAGE_REQUIRED'
  | 'PENDING';

export type DigitalTwinSourceImageType =
  | 'MASTER_PLAN'
  | 'SATELLITE_AERIAL'
  | 'ARCHITECTURAL_LAYOUT'
  | 'DRONE_AERIAL'
  | 'SITE_PHOTO'
  | 'CONFIGURED_DATA';

export type GenerationProvider =
  | 'HUGGING_FACE'
  | 'PROCEDURAL_AI'
  | 'CADASTRE_SURVEY'
  | 'EXTERNAL_GPU';

export type DigitalTwinGenerationProvider = GenerationProvider;
export type DigitalTwinStatus = DigitalTwinGenerationStatus;

export type BuildingFacadeType = 'A' | 'B' | 'C' | 'D' | 'COMMERCIAL' | 'VILLA';

export interface SocietyBuilding3DDef {
  id: string;
  societyId?: string;
  name: string;
  code: string;
  /** Ground position [x, z] in Three.js coordinates (meters) */
  position: [number, number];
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  depth?: number;
  height?: number;
  floorCount?: number;
  buildingType?: string;
  source?: string;
  confidence?: number;
  /** Y-axis rotation in radians */
  rotation: number;
  /** Number of physical floors */
  floors: number;
  /** Floor-to-floor height in meters (standard: 3.1m) */
  floorHeight?: number;
  /** Footprint dimensions [width, depth] in meters */
  footprint: [number, number];
  /** Building height in meters (floors * floorHeight) */
  heightMeters: number;
  /** Architectural facade style archetype */
  type: BuildingFacadeType;
  typeLabel?: string;
  /** Verification status from cadastral / municipal registry */
  status: 'VERIFIED' | 'PENDING' | 'UNDER_REVIEW' | 'ACTIVE' | 'DISPUTED';
  dataStatus?: 'verified' | 'illustrative' | 'real-database' | 'government-verified' | 'DEMO';
  /** Optional custom facade color override derived from image analysis */
  facadeColor?: string;
  accentColor?: string;
  /** Associated cadastral property records */
  propertyIds?: string[];
  totalUnits?: number;
}

export interface SocietyRoadSegmentDef {
  id: string;
  societyId?: string;
  /** Center position [x, z] in meters */
  position: [number, number];
  /** Size [width, length] in meters */
  size: [number, number];
  rotation?: number;
  label?: string;
}

export interface SocietyRingRoadDef {
  outerHalf: [number, number];
  innerHalf: [number, number];
  radius: number;
}

export interface SocietyRoadDef {
  ringRoad?: SocietyRingRoadDef;
  segments: SocietyRoadSegmentDef[];
  sidewalks?: SocietyRoadSegmentDef[];
  widths?: {
    primary: number;
    secondary: number;
    local: number;
    path: number;
  };
}

export interface SocietyParkDef {
  id: string;
  societyId?: string;
  name?: string;
  /** Center position [x, z] in meters */
  position: [number, number];
  /** Size [width, depth] in meters */
  size: [number, number];
  shape?: 'rounded-rect' | 'circle' | 'polygon';
  radius?: number;
  hasBenches?: boolean;
  hasTrees?: boolean;
}

export interface SocietyParkingDef {
  id: string;
  societyId?: string;
  name?: string;
  /** Center position [x, z] in meters */
  position: [number, number];
  /** Size [width, depth] in meters */
  size: [number, number];
  baysPerRow: number;
  accessLanes?: SocietyRoadSegmentDef[];
}

export interface SocietyAmenityDef {
  id: string;
  societyId?: string;
  name: string;
  type: 'CLUBHOUSE' | 'COMMUNITY_CENTER' | 'SPORTS_ARENA' | 'PAVILION' | 'COMMERCIAL_BLOCK';
  /** Center position [x, z] in meters */
  position: [number, number];
  size: [number, number, number]; // [width, height, depth]
  radius?: number;
  glassRoof?: boolean;
}

export interface SocietyWaterBodyDef {
  id: string;
  societyId?: string;
  name?: string;
  type: 'LAKE' | 'SWIMMING_POOL' | 'POND' | 'FOUNTAIN';
  /** Center position [x, z] in meters */
  position: [number, number];
  /** Radius or size [width, depth] */
  size?: [number, number];
  radii?: number[];
  shape?: 'organic' | 'rectangle' | 'circle';
}

export interface SocietyEntranceDef {
  id: string;
  societyId?: string;
  name?: string;
  position: [number, number]; // [x, z]
  width: number;
  height: number;
  hasSecurityBooth?: boolean;
  hasSignage?: boolean;
}

export interface SocietyTreeDef {
  id?: string;
  societyId?: string;
  x: number;
  z: number;
  kind?: 'canopy' | 'palm' | 'ornamental' | 'broad' | 'accent' | 'pine';
  scale?: number;
}

export interface SocietyStreetLightDef {
  id?: string;
  societyId?: string;
  x: number;
  z: number;
  rotation?: number;
  intensity?: number;
}

export interface SocietyCarDef {
  id?: string;
  societyId?: string;
  x: number;
  z: number;
  rotation?: number;
  color?: string;
}

export interface SocietySiteBoundaryDef {
  half: [number, number];
  radius: number;
  y?: number;
  polygon?: Array<[number, number]>;
}

export interface SocietyDigitalTwin {
  id?: string;
  societyId: string;
  societyName: string;
  sourceImage: string | null;
  sourceImageUrl?: string | null;
  sourceImageType: DigitalTwinSourceImageType;
  sourceImageVersion?: string;
  generatedModelUrl?: string | null;
  generatedPreviewUrl?: string | null;
  generationProvider?: GenerationProvider;
  generationStatus: DigitalTwinGenerationStatus;
  generationError?: string | null;
  generatedAt: string | null;
  updatedAt?: string | null;
  /** Confidence score between 0.0 and 1.0, or null if uncalculated */
  confidence: number | null;
  analysisNotes?: string;
  isAiAnalyzed: boolean;
  dataStatus?: 'DEMO' | 'VERIFIED';
  isOfficialUlpin?: false;
  sourceType?: 'AI_GENERATED_VISUALIZATION' | 'ILLUSTRATIVE' | 'CADASTRE_SURVEY';
  /** Physical site scale dimensions in meters */
  siteDimensions: {
    widthMeters: number;
    depthMeters: number;
  };
  siteBoundary: SocietySiteBoundaryDef;
  /** Dynamic arrays — renderer must handle any length (0, 1, 2, 3, 5, etc.) */
  buildings: SocietyBuilding3DDef[];
  roads: SocietyRoadDef;
  parks: SocietyParkDef[];
  parkingAreas: SocietyParkingDef[];
  amenities: SocietyAmenityDef[];
  waterBodies: SocietyWaterBodyDef[];
  entrances: SocietyEntranceDef[];
  trees: SocietyTreeDef[];
  streetLights?: SocietyStreetLightDef[];
  cars?: SocietyCarDef[];
}
