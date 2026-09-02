/**
 * Citizen Notification Service (Phase 10)
 * =======================================
 * Manages in-app notifications in Firestore collection `notifications/{notificationId}`.
 * Strictly adheres to ownership: citizens can only query and mark their own notifications.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import {
  type CitizenNotification,
  type CitizenNotificationDocument,
  type CreateCitizenNotificationInput,
} from '@/types/citizenNotification';

export const NOTIFICATIONS_COLLECTION = 'notifications';

export function notificationsCollectionRef() {
  return collection(db, NOTIFICATIONS_COLLECTION);
}

export function notificationDocRef(notificationId: string) {
  return doc(db, NOTIFICATIONS_COLLECTION, notificationId);
}

function parseFirestoreDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function mapNotificationDoc(docId: string, data: DocumentData): CitizenNotification {
  const d = data as CitizenNotificationDocument;
  return {
    id: docId,
    notificationId: d.notificationId || docId,
    recipientUid: d.recipientUid,
    societyId: d.societyId,
    type: (d.type as CitizenNotification['type']) || 'GENERAL_SYSTEM',
    title: d.title || 'System Notification',
    message: d.message || '',
    relatedEntityType: d.relatedEntityType as CitizenNotification['relatedEntityType'],
    relatedEntityId: d.relatedEntityId,
    relatedCaseId: d.relatedCaseId,
    relatedPropertyId: d.relatedPropertyId,
    severity: (d.severity as CitizenNotification['severity']) || 'INFO',
    read: Boolean(d.read),
    linkUrl: d.linkUrl,
    createdAt: parseFirestoreDate(d.createdAt),
    createdBy: d.createdBy,
  };
}

/**
 * Creates an in-app notification in Firestore.
 * Idempotent if notificationId is supplied in options.
 */
export async function createNotification(
  input: CreateCitizenNotificationInput,
  customNotificationId?: string,
): Promise<string> {
  const notificationId =
    customNotificationId ||
    `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const ref = notificationDocRef(notificationId);

  const payload: CitizenNotificationDocument = {
    notificationId,
    recipientUid: input.recipientUid,
    societyId: input.societyId || '',
    type: input.type,
    title: input.title,
    message: input.message,
    relatedEntityType: input.relatedEntityType || '',
    relatedEntityId: input.relatedEntityId || '',
    relatedCaseId: input.relatedCaseId || '',
    relatedPropertyId: input.relatedPropertyId || '',
    severity: input.severity || 'INFO',
    read: false,
    linkUrl: input.linkUrl || '',
    createdAt: serverTimestamp(),
    createdBy: input.createdBy || (auth.currentUser?.uid || 'system'),
  };

  await setDoc(ref, payload, { merge: true });
  return notificationId;
}

/**
 * Gets all notifications addressed to the current signed-in citizen.
 */
export async function getMyNotifications(limitCount = 50): Promise<CitizenNotification[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const q = query(
    notificationsCollectionRef(),
    where('recipientUid', '==', currentUser.uid),
    limit(limitCount),
  );

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => mapNotificationDoc(d.id, d.data()));

  // Sort descending by timestamp in memory (avoids composite index requirement)
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Gets unread notification count for the current signed-in citizen.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const currentUser = auth.currentUser;
  if (!currentUser) return 0;

  const q = query(
    notificationsCollectionRef(),
    where('recipientUid', '==', currentUser.uid),
    where('read', '==', false),
    limit(100),
  );

  const snap = await getDocs(q);
  return snap.size;
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const ref = notificationDocRef(notificationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.recipientUid !== currentUser.uid) {
    throw new Error('Unauthorized: cannot modify another user notification.');
  }

  await updateDoc(ref, { read: true });
}

/**
 * Marks all notifications for the current user as read using batched write.
 */
export async function markAllMyNotificationsAsRead(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const q = query(
    notificationsCollectionRef(),
    where('recipientUid', '==', currentUser.uid),
    where('read', '==', false),
    limit(100),
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true });
  });

  await batch.commit();
}

/**
 * Subscribes in real-time to the current citizen's notifications.
 */
export function subscribeToMyNotifications(
  onUpdate: (notifications: CitizenNotification[]) => void,
  limitCount = 30,
): Unsubscribe {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    notificationsCollectionRef(),
    where('recipientUid', '==', currentUser.uid),
    limit(limitCount),
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => mapNotificationDoc(d.id, d.data()));
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onUpdate(items);
    },
    (err) => {
      console.warn('Notifications real-time listener failed, falling back:', err);
      onUpdate([]);
    },
  );
}
