/**
 * Backend Firestore Database Service
 * Provides typed operations for Firestore collections: users, parcels, disputes, audits.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { backendFirestore } from '../config/firebase';

export class BackendFirestoreService {
  /**
   * Set or merge a document in a collection
   */
  static async set(collectionName: string, docId: string, data: DocumentData): Promise<void> {
    const docRef = doc(backendFirestore, collectionName, docId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  }

  /**
   * Update specific fields in a document
   */
  static async update(collectionName: string, docId: string, data: DocumentData): Promise<void> {
    const docRef = doc(backendFirestore, collectionName, docId);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
  }

  /**
   * Get a single document by ID
   */
  static async get<T = any>(collectionName: string, docId: string): Promise<T | null> {
    const docRef = doc(backendFirestore, collectionName, docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as T) : null;
  }

  /**
   * Delete a document by ID
   */
  static async delete(collectionName: string, docId: string): Promise<void> {
    const docRef = doc(backendFirestore, collectionName, docId);
    await deleteDoc(docRef);
  }

  /**
   * List all documents in a collection
   */
  static async list<T = any>(collectionName: string): Promise<T[]> {
    const colRef = collection(backendFirestore, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  }

  /**
   * Query documents matching a field
   */
  static async queryByField<T = any>(
    collectionName: string,
    field: string,
    value: any
  ): Promise<T[]> {
    const colRef = collection(backendFirestore, collectionName);
    const q = query(colRef, where(field, '==', value));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  }
}
