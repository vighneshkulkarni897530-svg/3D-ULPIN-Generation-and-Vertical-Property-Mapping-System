# System Architecture Documentation
## 3D ULPIN Generation and Vertical Property Mapping System (BHU-VERIFY)

---

## 1. High-Level Architectural Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       USER LAYER                                       │
│    Citizen / Resident          Society Administrator        Government Verification    │
│    (Mobile / Laptop)              (Society Admin)                   Officer            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (Next.js 16 App Router)                      │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │   Citizen Portal      │  │  Government Cadastre │  │   Spatial & Visualization   │  │
│  │ • /resident/dashboard │  │ • /government/*      │  │ • /map (Leaflet 2D GIS)     │  │
│  │ • /resident/property  │  │ • Verification Cases │  │ • 3D Digital Twin (R3F)     │  │
│  │ • /resident/cases     │  │ • AI Analysis View   │  │ • Floor Explorer & Slicing  │  │
│  │ • /resident/notifs    │  │ • Analytics & Aging  │  │ • Solar & Laser Measurement │  │
│  └───────────────────────┘  └──────────────────────┘  └─────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ App Shell, ProtectedRoute, GlobalSearch, ReportModal, Toaster & Root Error/404   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       STATE MANAGEMENT & CONTEXT LAYER (React 19)                      │
│   • AuthContext (Sessions & RBAC)                 • GISContext (Parcels, Towers, DB)   │
│   • PropertyContext (Unit & Residency)            • WorkflowContext (Tasks & Steps)    │
│   • DigitalTwinInspectionContext (HUD & Slicing)                                       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           DOMAIN & BUSINESS LOGIC SERVICES                             │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │   Society & Cadastre  │  │  Disputes & Cases    │  │   AI Document & Blueprint   │  │
│  │ • societyService.ts   │  │ • workflowService.ts │  │ • ocrService.ts             │  │
│  │ • buildingService.ts  │  │ • governmentService  │  │ • blueprintService.ts       │  │
│  │ • floorService.ts     │  │ • citizenService.ts  │  │ • comparisonService.ts      │  │
│  │ • flatService.ts      │  │ • notificationService│  │ • documentService.ts        │  │
│  │ • ulpinGenerator.ts   │  │ • reportService.ts   │  │ • analyticsService.ts       │  │
│  └───────────────────────┘  └──────────────────────┘  └─────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE & SECURITY BOUNDARY                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Firebase Authentication (RBAC: CITIZEN, SOCIETY_ADMIN, OFFICER, ADMIN)           │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Cloud Firestore (16 Strictly Governed Collections with Least-Privilege Rules)    │  │
│  │ • societies, societyMembers, buildings, floors, flats, residents                 │  │
│  │ • verifications, verificationHistory, verificationCases, verificationNotes       │  │
│  │ • discrepancies, evidence, notifications, propertyDocuments, documentAnalyses    │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Firebase Storage (Size-Capped & MIME-Validated Buckets)                          │  │
│  │ • societies/{id}/main-image (5 MB)       • verification-evidence/{id} (15 MB)    │  │
│  │ • analysis-documents/{id} (25 MB)                                                │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Cadastral Hierarchy & Spatial Identity Engine
- **Hierarchical Parent-Child Invariant**: Society $\rightarrow$ Building $\rightarrow$ Floor $\rightarrow$ Flat. Every record validates against its parent document.
- **Vertical Spatial Identifier Computation**:
  $$\text{Spatial ID} = \text{Base ULPIN} + \text{Building Code} + \text{Floor Level } (Z) + \text{Unit Number}$$
  Computed using base parcel centroids (WGS-84) and vertical elevation offsets ($Z$).

### 2.2 2D GIS & 3D Digital Twin Rendering Subsystems
- **2D GIS Layer**: Built on Leaflet. Dynamically imported (`ssr: false`) to guarantee zero SSR hydration mismatches. Renders WGS-84 vector polygons and building footprints.
- **3D Digital Twin Engine**: Built on Three.js, React Three Fiber, and `@react-three/drei`. Utilizes instanced rendering for vegetation, streetlights, bollards, and vehicles to achieve 60 FPS performance on standard hardware. Protected by layer-level `SceneErrorBoundary` components.

### 2.3 Assistive AI Verification Engine
- **OCR Text Extraction**: Pluggable regex and optical pattern parser extracting key title deed attributes.
- **Blueprint Computer Vision**: Structural drawing parser analyzing floor plans, corridor positions, and unit distributions.
- **Database Comparison Engine**: Computes field-level matching (`MATCH`, `POSSIBLE_MISMATCH`, `INSUFFICIENT_DATA`) without making autonomous legal decisions.

### 2.4 Verification Workflow & Case Dossier Subsystem
- **Dispute Lifecycle**: `OPEN` $\rightarrow$ `UNDER_INVESTIGATION` $\rightarrow$ `REINSPECTION_REQUIRED` $\rightarrow$ `RESOLVED` / `REJECTED`.
- **Confidentiality Hardening**: Investigation remarks are stored in `verificationNotes` and subcollection `verificationCases/{caseId}/notes`, strictly restricted to `isGovernmentOfficer()` in Firestore rules.
- **Append-Only Audit Log**: Every assignment, status change, and officer decision is immutably logged.

---

## 3. Security & Data Protection Invariants

1. **Least Privilege**: Users only access records matching their authenticated UID or assigned role.
2. **Citizen Privacy**: Public GIS and 3D scenes strictly exclude resident phone numbers, email addresses, and personal identification.
3. **Data Honesty**: System clearly distinguishes verified data, user-provided data, imported data, and illustrative demo data. Demo spatial identifiers are explicitly marked as prototype vertical IDs.
4. **Resilience**: Comprehensive root error boundary (`src/app/error.tsx`), loading skeleton (`src/app/loading.tsx`), and 404 handler (`src/app/not-found.tsx`).
