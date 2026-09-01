import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function saveFirestoreDocument(path: string, id: string, data: Record<string, unknown>) {
  const ref = doc(db, path, id);
  await setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  return ref;
}

export async function updateFirestoreDocument(path: string, id: string, data: Record<string, unknown>) {
  const ref = doc(db, path, id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  return ref;
}

export async function getFirestoreDocument<T>(path: string, id: string): Promise<T | null> {
  const snapshot = await getDoc(doc(db, path, id));
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

export async function listFirestoreDocuments<T>(path: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, path));
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() } as T));
}
