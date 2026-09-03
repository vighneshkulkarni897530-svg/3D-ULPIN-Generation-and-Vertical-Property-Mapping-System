/**
 * Demo Property Renewal Records & Pre-configured Buildings
 * =========================================================
 * Implements the 3 required demo buildings:
 *   - BUILDING A: Construction 2022 | Age: 4 yrs | Status: ✓ UP TO DATE
 *   - BUILDING B: Construction 2017 | Age: 9 yrs | Status: 🔔 DUE SOON (~6 mos to milestone)
 *   - BUILDING C: Construction 2013 | Age: 13 yrs | Status: ⚠️ RENEWAL REQUIRED (Overdue)
 * Plus Green Valley Residency (Digital Twin building).
 */

import type { PropertyRenewalRecord } from '@/types/renewal';
import { calculateBuildingAge, calculateNextReviewDate, determineRenewalStatus } from '@/lib/renewals/renewalCalculator';

export const INITIAL_RENEWAL_RECORDS: PropertyRenewalRecord[] = [
  // ── BUILDING A: Green View Residency (B-102) ──
  {
    renewalId: 'REN-BLDG-A-2022',
    propertyId: 'PROP-2026-10482',
    societyId: 'SOC-PUN-001',
    societyName: 'Green View Co-operative Housing Society',
    buildingId: 'B-102',
    buildingName: 'Building A — Green View Residency',
    ulpin: 'ULPIN-27-PUN-0102-VERT',
    address: 'Plot 42/B, North Main Road, Shivaji Nagar, Pune, Maharashtra 411005',
    constructionDate: '2022-02-18',
    completionDate: '2022-03-15',
    lastVerificationDate: '2022-03-15',
    lastReportDate: '2022-03-15',
    reviewIntervalYears: 10,
    nextReviewDate: '2032-03-15',
    calculatedAgeYears: calculateBuildingAge('2022-02-18'),
    renewalStatus: 'UP_TO_DATE',
    caseStatus: 'VERIFIED',
    previousRecord: {
      constructionYear: 2022,
      floors: 5,
      units: 20,
      builtUpAreaSqFt: 35200,
      condition: 'EXCELLENT',
    },
    changesDetected: false,
    changeNotes: [],
    documents: [
      {
        id: 'doc-occ-102',
        name: 'Occupancy_Certificate_PMC_2022.pdf',
        url: '#',
        type: 'Occupancy Certificate',
        uploadedAt: '2022-03-15T10:30:00Z',
      },
    ],
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    ],
    remarks: 'Pristine structural condition. First periodic verification scheduled for 2032.',
    createdAt: '2022-03-15T10:30:00Z',
    updatedAt: '2022-03-15T10:30:00Z',
  },

  // ── BUILDING B: Shree Krishna Arcade (B-104) ──
  {
    renewalId: 'REN-BLDG-B-2017',
    propertyId: 'prop-pune-002',
    societyId: 'SOC-PUN-002',
    societyName: 'Shree Krishna Commercial Association',
    buildingId: 'B-104',
    buildingName: 'Building B — Shree Krishna Arcade',
    ulpin: 'ULPIN-27-PUN-0104-VERT',
    address: 'Plot 88/A, Koregaon Park, Lane 27, Pune, Maharashtra 411001',
    constructionDate: '2017-09-10',
    completionDate: '2017-10-01',
    lastVerificationDate: '2017-10-01',
    lastReportDate: '2017-10-01',
    reviewIntervalYears: 10,
    // Setting next review date ~6 months ahead to trigger DUE_SOON reminder
    nextReviewDate: '2027-03-10',
    calculatedAgeYears: calculateBuildingAge('2017-09-10'),
    renewalStatus: 'DUE_SOON',
    caseStatus: 'PENDING_REVIEW',
    previousRecord: {
      constructionYear: 2017,
      floors: 5,
      units: 20,
      builtUpAreaSqFt: 27800,
      condition: 'GOOD',
    },
    currentSubmission: {
      floors: 5,
      units: 20,
      builtUpAreaSqFt: 27800,
      condition: 'GOOD',
      renovationDetails: 'External facade painting and waterproofing performed in 2024.',
      structuralAlterations: false,
    },
    changesDetected: false,
    changeNotes: [],
    documents: [
      {
        id: 'doc-eng-104',
        name: 'Structural_Stability_Inspection_2026.pdf',
        url: '#',
        type: 'Chartered Engineer Report',
        uploadedAt: '2026-08-20T11:00:00Z',
      },
    ],
    photos: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    ],
    remarks: 'Approaching 10-year milestone in approximately 6 months. Renewal report prepared by society secretary.',
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },

  // ── BUILDING C: Tech Tower (B-306) ──
  {
    renewalId: 'REN-BLDG-C-2013',
    propertyId: 'prop-pune-003',
    societyId: 'SOC-PUN-003',
    societyName: 'Tech Park Commercial Co-op',
    buildingId: 'B-306',
    buildingName: 'Building C — Tech Tower',
    ulpin: 'ULPIN-27-PUN-0306-VERT',
    address: 'Survey 48/A, Baner-Pashan Link Road, Pune, Maharashtra 411045',
    constructionDate: '2013-05-20',
    completionDate: '2013-06-15',
    lastVerificationDate: '2013-06-15',
    lastReportDate: '2013-06-15',
    reviewIntervalYears: 10,
    // Crossed review milestone in 2023 -> OVERDUE
    nextReviewDate: '2023-06-15',
    calculatedAgeYears: calculateBuildingAge('2013-05-20'),
    renewalStatus: 'OVERDUE',
    caseStatus: 'UNDER_VERIFICATION',
    previousRecord: {
      constructionYear: 2013,
      floors: 5,
      units: 20,
      builtUpAreaSqFt: 40000,
      condition: 'FAIR',
    },
    currentSubmission: {
      floors: 6,
      units: 24,
      builtUpAreaSqFt: 46500,
      condition: 'REQUIRES_MAINTENANCE',
      renovationDetails: 'Additional rooftop floor added under commercial IT expansion provision.',
      structuralAlterations: true,
      structuralNotes: 'Rooftop cafeteria & terrace office enclosure constructed in 2021.',
    },
    changesDetected: true,
    changeNotes: [
      'Vertical floor count altered: Previously recorded as 5 floors, current submission declares 6 floors.',
      'Property unit count altered: Previously recorded as 20 units, current submission declares 24 units.',
      'Built-up area variance detected: 40000 sq.ft vs 46500 sq.ft.',
      'Structural alterations declared: Rooftop cafeteria & terrace office enclosure.',
    ],
    documents: [
      {
        id: 'doc-arch-306',
        name: 'As_Built_Architectural_Drawings_2026.pdf',
        url: '#',
        type: 'As-Built Plan',
        uploadedAt: '2026-08-15T09:00:00Z',
      },
      {
        id: 'doc-eng-306',
        name: 'Structural_Audit_Report_2026.pdf',
        url: '#',
        type: 'Structural Audit',
        uploadedAt: '2026-08-15T09:15:00Z',
      },
    ],
    photos: [
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    ],
    remarks: 'Periodic verification overdue by 3 years. Building age: 13 years. Floor count and unit count altered — officer review required.',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-25T14:30:00Z',
  },

  // ── Digital Twin Building: Green Valley Residency ──
  {
    renewalId: 'REN-GV-2016',
    propertyId: 'prop-hyd-002',
    societyId: 'SOC-GV-01',
    societyName: 'Green Valley Residency Co-op',
    buildingId: 'TWIN-GV-01',
    buildingName: 'Green Valley Residency (Tower B)',
    ulpin: 'ULPIN-27-4589-1023',
    address: 'Baner-Pashan Link Road, Pune, Maharashtra 411045',
    constructionDate: '2016-08-15',
    completionDate: '2016-11-20',
    lastVerificationDate: '2024-09-10',
    lastReportDate: '2024-09-10',
    reviewIntervalYears: 10,
    nextReviewDate: '2034-09-10',
    calculatedAgeYears: calculateBuildingAge('2016-08-15'),
    renewalStatus: 'UP_TO_DATE',
    caseStatus: 'VERIFIED',
    previousRecord: {
      constructionYear: 2016,
      floors: 12,
      units: 48,
      builtUpAreaSqFt: 18500,
      condition: 'EXCELLENT',
    },
    changesDetected: false,
    changeNotes: [],
    documents: [
      {
        id: 'doc-gv-2024',
        name: 'PMC_Cadastral_Recertification_2024.pdf',
        url: '#',
        type: 'Municipal Re-verification',
        uploadedAt: '2024-09-10T15:00:00Z',
      },
    ],
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    ],
    remarks: 'Re-verification completed successfully in Sep 2024. Next periodic verification due September 2034.',
    createdAt: '2024-09-10T15:00:00Z',
    updatedAt: '2024-09-10T15:00:00Z',
  },
];
