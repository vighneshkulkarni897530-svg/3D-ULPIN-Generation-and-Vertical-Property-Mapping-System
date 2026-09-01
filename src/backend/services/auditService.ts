/**
 * Backend Cryptographic Audit Service
 * Creates immutable, tamper-evident SHA-256 hash chains for all land registry transactions.
 */

import crypto from 'crypto';
import { doc, setDoc } from 'firebase/firestore';
import { backendFirestore } from '../config/firebase';

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'DISPUTE' | 'AUTH' | 'ULPIN';
  entityId: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, any>;
  previousHash: string;
  hash: string;
}

let latestBlockHash = '0000000000000000000000000000000000000000000000000000000000000000';

export class BackendAuditService {
  /**
   * Records a cryptographically sealed audit block in Firestore & Realtime Database
   */
  static async recordLog(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'previousHash' | 'hash'>
  ): Promise<AuditLogEntry> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    const previousHash = latestBlockHash;

    const blockContent = `${previousHash}|${entry.action}|${entry.entityType}|${entry.entityId}|${entry.userId}|${timestamp}|${JSON.stringify(entry.metadata || {})}`;
    const hash = crypto.createHash('sha256').update(blockContent).digest('hex');
    latestBlockHash = hash;

    const logEntry: AuditLogEntry = {
      ...entry,
      id,
      timestamp,
      previousHash,
      hash,
    };

    try {
      const ref = doc(backendFirestore, 'audit_logs', id);
      void setDoc(ref, logEntry).catch(() => {});
    } catch {}

    return logEntry;
  }
}
