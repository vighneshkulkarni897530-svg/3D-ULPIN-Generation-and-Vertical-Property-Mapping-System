/**
 * Citizen Notification Types (Phase 10)
 * =====================================
 * Standardized in-app notification schema for citizen services and workflow telemetry.
 */

export type NotificationType =
  | 'VERIFICATION_SUBMITTED'
  | 'VERIFICATION_UPDATED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REQUIRES_CORRECTION'
  | 'VERIFICATION_REINSPECTION'
  | 'VERIFICATION_REJECTED'
  | 'DISPUTE_CREATED'
  | 'CASE_CREATED'
  | 'CASE_ASSIGNED'
  | 'EVIDENCE_ADDED'
  | 'CASE_STATUS_CHANGED'
  | 'GOVERNMENT_DECISION'
  | 'CASE_RESOLVED'
  | 'CASE_REJECTED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'DOCUMENT_ANALYSIS_COMPLETED'
  | 'ANALYSIS_REVIEW_REQUIRED'
  | 'GENERAL_SYSTEM';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface CitizenNotification {
  id: string;
  notificationId: string;
  recipientUid: string;
  societyId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: 'property' | 'flat' | 'building' | 'society' | 'case' | 'discrepancy' | 'resident';
  relatedEntityId?: string;
  relatedCaseId?: string;
  relatedPropertyId?: string;
  severity: NotificationSeverity;
  read: boolean;
  linkUrl?: string;
  createdAt: Date;
  createdBy?: string;
}

export interface CitizenNotificationDocument {
  notificationId: string;
  recipientUid: string;
  societyId?: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedCaseId?: string;
  relatedPropertyId?: string;
  severity: string;
  read: boolean;
  linkUrl?: string;
  createdAt: unknown;
  createdBy?: string;
}

export interface CreateCitizenNotificationInput {
  recipientUid: string;
  societyId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: 'property' | 'flat' | 'building' | 'society' | 'case' | 'discrepancy' | 'resident';
  relatedEntityId?: string;
  relatedCaseId?: string;
  relatedPropertyId?: string;
  severity?: NotificationSeverity;
  linkUrl?: string;
  createdBy?: string;
}
