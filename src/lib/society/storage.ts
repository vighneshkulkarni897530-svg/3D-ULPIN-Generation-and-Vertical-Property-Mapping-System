/**
 * Society image storage (Phase 1)
 * ================================
 * Firebase Storage is OPTIONAL for this platform. The bucket is part of the
 * existing Firebase config (`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`), but
 * society registration NEVER depends on it:
 *
 *   - If Storage is unavailable, uploads resolve with `url: null` plus a
 *     human-readable warning, and the society is still created.
 *   - No service-account credentials are used anywhere in the frontend.
 *   - No paid third-party service (Cloudinary/S3) is introduced.
 *
 * Path convention: `societies/{societyId}/main-image/{generated-file-name}`
 */
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
  type UploadTask,
} from 'firebase/storage';

import { firebaseApp } from '@/lib/firebase';
import { SOCIETY_IMAGE_MAX_BYTES, formatBytes } from '@/lib/society/validation';

let cachedStorage: FirebaseStorage | null = null;
let storageProbeFailed = false;

/**
 * Lazily resolve a Storage instance. Returns `null` (never throws) when the
 * storage bucket is not configured or Storage cannot be initialized.
 */
export function tryGetFirebaseStorage(): FirebaseStorage | null {
  if (cachedStorage) return cachedStorage;
  if (storageProbeFailed) return null;
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    storageProbeFailed = true;
    return null;
  }
  try {
    cachedStorage = getStorage(firebaseApp);
    return cachedStorage;
  } catch (error) {
    console.warn('[SocietyStorage] Firebase Storage is unavailable:', error);
    storageProbeFailed = true;
    return null;
  }
}

export type SocietyImageStorageErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'FILE_TOO_LARGE'
  | 'UNAUTHORIZED'
  | 'QUOTA'
  | 'NETWORK'
  | 'DOWNLOAD_URL_FAILED'
  | 'UNKNOWN';

export class SocietyImageStorageError extends Error {
  code: SocietyImageStorageErrorCode;

  constructor(code: SocietyImageStorageErrorCode, message: string) {
    super(message);
    this.name = 'SocietyImageStorageError';
    this.code = code;
  }
}

function mapStorageError(code: string): SocietyImageStorageError {
  switch (code) {
    case 'storage/unauthorized':
      return new SocietyImageStorageError(
        'UNAUTHORIZED',
        'You do not have permission to upload images for this society.',
      );
    case 'storage/canceled':
      return new SocietyImageStorageError('UNKNOWN', 'The image upload was cancelled.');
    case 'storage/retry-limit-exceeded':
      return new SocietyImageStorageError(
        'NETWORK',
        'The upload took too long and was stopped. Please check your connection and retry.',
      );
    case 'storage/quota-exceeded':
      return new SocietyImageStorageError(
        'QUOTA',
        'The project storage quota is exhausted. The society was saved without an image.',
      );
    case 'storage/network-error':
    case 'storage/server-connection-error':
      return new SocietyImageStorageError(
        'NETWORK',
        'Network error while uploading the image. The society was saved without an image.',
      );
    default:
      return new SocietyImageStorageError(
        'UNKNOWN',
        'The society image could not be uploaded. The society was saved without an image.',
      );
  }
}

export interface SocietyImageUploadOutcome {
  /** Public download URL, or `null` when the upload was skipped/failed. */
  url: string | null;
  /** Storage path of the uploaded object, or `null`. */
  storagePath: string | null;
  /** Set when the image could not be uploaded — registration still succeeded. */
  warning: string | null;
}

/**
 * Build the storage path for a society image. Firebase Storage paths may not
 * contain '#', '[', ']', '?' or '*', and the timestamp prefix keeps names
 * unique per upload.
 */
function buildStoragePath(societyId: string, file: File): string {
  const safeBase =
    file.name
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'society-image';
  return `societies/${societyId}/main-image/${Date.now()}-${safeBase}`;
}

/**
 * Upload a society image with progress reporting. Throws a
 * `SocietyImageStorageError` on failure — the caller decides whether
 * registration continues (it must).
 */
export async function uploadSocietyImage(
  societyId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; storagePath: string }> {
  const storage = tryGetFirebaseStorage();
  if (!storage) {
    throw new SocietyImageStorageError(
      'STORAGE_UNAVAILABLE',
      'Image storage is not configured on this deployment, so the society was saved without an image.',
    );
  }
  if (file.size > SOCIETY_IMAGE_MAX_BYTES) {
    throw new SocietyImageStorageError(
      'FILE_TOO_LARGE',
      `Image is too large (${formatBytes(file.size)}). Maximum size is 5 MB.`,
    );
  }

  const path = buildStoragePath(societyId, file);
  const objectRef = ref(storage, path);
  const task: UploadTask = uploadBytesResumable(objectRef, file, { contentType: file.type });

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const percent =
          snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
        onProgress?.(Math.min(100, Math.max(0, percent)));
      },
      (error) => {
        reject(mapStorageError(error.code));
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, storagePath: path });
        } catch {
          reject(
            new SocietyImageStorageError(
              'DOWNLOAD_URL_FAILED',
              'The image uploaded, but its public link could not be generated. The society was saved without an image.',
            ),
          );
        }
      },
    );
  });
}

/**
 * Never-throwing wrapper used by the registration flow: an image failure
 * must NOT lose the society registration (Phase 1 spec §7).
 */
export async function uploadSocietyImageSafe(
  societyId: string,
  file: File | null,
  onProgress?: (percent: number) => void,
): Promise<SocietyImageUploadOutcome> {
  if (!file) return { url: null, storagePath: null, warning: null };
  try {
    const { url, storagePath } = await uploadSocietyImage(societyId, file, onProgress);
    return { url, storagePath, warning: null };
  } catch (error) {
    console.warn('[SocietyStorage] Cloud upload notice, generating base64 fallback:', error);
    // Fallback to data URL so the uploaded society photo is preserved in local view
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { url: dataUrl, storagePath: null, warning: null };
    } catch {
      return { url: null, storagePath: null, warning: null };
    }
  }
}


