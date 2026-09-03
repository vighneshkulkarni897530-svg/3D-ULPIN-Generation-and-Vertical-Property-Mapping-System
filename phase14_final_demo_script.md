# Final 5–7 Minute SIH Demonstration Script
## 3D ULPIN Generation and Vertical Property Mapping System (BHU-VERIFY)

---

## Demonstration Setup (Before Going on Stage)
- **Browser Window**: Full screen Chrome / Edge ($1920 \times 1080$).
- **URL**: `http://localhost:3000`
- **Demo Credentials Ready**:
  - Citizen: `rajesh.sharma@example.com` / `Bhu-Verify#2024`
  - Government Officer: `ananya.iyer@rev.gov.in` / `Bhu-Verify#2024`
  - Cadastre Admin: `admin.cadastre@gov.in` / `Bhu-Verify#2024`

---

## Detailed Demo Cue Table

| Time | Presenter Action | Screen / Route | Key Visuals to Highlight | Exact Narration |
| :--- | :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | Display Landing Page | `/` | Hero section, 2D to 3D vertical paradigm diagram, clean government styling. | *"Good morning Respected Jury. Today we present BHU-VERIFY: India's 3D ULPIN Generation and Vertical Property Mapping System. As our cities expand into high-rise apartments, traditional 2D land records cannot distinguish between vertically stacked units above the same ground parcel. BHU-VERIFY introduces full Z-axis elevation mapping, interactive 3D digital twins, and assistive AI verification."* |
| **0:30 – 1:15** | Click **"Sign In"** $\rightarrow$ Click **"Citizen Demo"** $\rightarrow$ Sign in $\rightarrow$ Click **"My Property"** | `/resident/dashboard` $\rightarrow$ `/resident/property` | Citizen dashboard, claimed property card, vertical elevation badge ($Z=12.0\text{m}$), Demo Spatial ID. | *"We begin as citizen Rajesh Sharma. On his property portal, he sees his vertical spatial identity: a unique mathematical extension of the base parcel ULPIN incorporating his specific building, floor elevation of 12 meters, and flat number."* |
| **1:15 – 2:00** | Click **"Open in 2D GIS"** in property portal | `/map` | Leaflet 2D GIS, WGS-84 coordinate bounds, parcel outline, building centroids. | *"With one click, Rajesh launches the 2D GIS Cadastre. The system highlights his land parcel in Pune, rendering WGS-84 survey boundaries and building footprints with zero hydration delay."* |
| **2:00 – 3:00** | Click **"3D View"** on Tower B | `/properties/PROP-001/digital-twin` | Three.js 3D Township Twin, Tower B selection, Floor 4 slicing, Explode view, Solar simulation slider, 3D laser measurement. | *"Now, we step into the 3D Digital Twin. Built with Three.js and instanced WebGL rendering, it runs at a flawless 60 FPS. We can orbit the township, select Tower B, isolate Floor 4, explode all floor plates, simulate solar shadow movement across the day, and perform 3D vertex measurements."* |
| **3:00 – 3:45** | Click **"File Grievance / Dispute"** in sidebar | `/disputes/new` | Dispute form, category: `Carpet Area Variance`, description: *"Deed carpet area is 1120 sq ft, but municipal registry shows 1040 sq ft."* $\rightarrow$ Submit. | *"Notice a potential variance? Rajesh files a spatial grievance directly against his unit. The system creates an official verification case dossier with an append-only audit trail."* |
| **3:45 – 4:45** | Sign Out $\rightarrow$ Click **"Govt Officer Demo"** $\rightarrow$ Sign In $\rightarrow$ Open **"Verification Cases"** | `/government/dashboard` $\rightarrow$ `/government/cases/[caseId]` | Government verification command dashboard, dispute queue, case aging metrics, evidence files, confidential investigation remarks. | *"We now switch roles to Government Verification Officer Ananya Iyer. Her dashboard aggregates society verification rates, case aging, and active disputes. She opens Rajesh’s case dossier to inspect evidence and confidential notes that are strictly hidden from public view."* |
| **4:45 – 5:30** | Click **"AI Document Analysis"** $\rightarrow$ Select `Greenfield Heights` / `Tower B` / `Floor 4` / `Flat 402` $\rightarrow$ Click **"Load Sample Deed"** $\rightarrow$ Click **"Analyze & Cross-Reference"** | `/government/ai-analysis` | 12-section AI workspace, OCR extraction fields with confidence scores, Blueprint vision findings, Live DB cross-verification table (`MATCH` / `POSSIBLE_MISMATCH`), Risk matrix. | *"Here is our core innovation: AI-Assisted Document & Blueprint Analysis. The optical engine extracts deed attributes and blueprint drawings, automatically cross-checking them against live Firestore records in seconds. Crucially, AI is assistive only: it flags variances for human officer review and never makes autonomous legal decisions."* |
| **5:30 – 6:15** | Click **"Accept & Verify Findings"** $\rightarrow$ Enter officer remarks $\rightarrow$ Click **"Make Official Determination"** $\rightarrow$ Select `VERIFIED` | `/government/cases/[caseId]` | Decision dialog, case status updates to `RESOLVED`, append-only audit log entry. | *"Officer Iyer confirms the structural drawings match, accepts the finding, and issues an official VERIFIED determination. Every step is permanently recorded in the immutable audit log."* |
| **6:15 – 7:00** | Sign Out $\rightarrow$ Sign In as Citizen $\rightarrow$ Open **"Notifications"** $\rightarrow$ Open **"My Property"** $\rightarrow$ Click **"Cadastral Dossier Report"** | `/resident/notifications` $\rightarrow$ `/resident/property` $\rightarrow$ `ReportModal` | In-app real-time notification alert, verified property badge, Print-to-PDF report modal with 2D/3D coordinates and statutory disclaimers. | *"Instantly, citizen Rajesh receives an in-app alert. He downloads a verified Cadastral Dossier Report with 2D coordinates, 3D vertical elevation, and statutory disclaimers ready for municipal submission. BHU-VERIFY delivers a complete, secure, production-ready solution for India's vertical land future. Thank you."* |

---

## 3. Presenter Fail-Safe Tips
- **If Wi-Fi drops**: Local in-memory mock datasets and client caching will keep the demo running seamlessly.
- **If the judge asks for technical proof**: Mention our clean `npx tsc --noEmit` (0 errors) and 56 statically generated routes in `npm run build`.
