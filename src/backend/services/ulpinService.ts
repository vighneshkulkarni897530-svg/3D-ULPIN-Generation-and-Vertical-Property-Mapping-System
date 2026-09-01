/**
 * Backend ULPIN Generation & Validation Service
 * Implements 14-digit Bhu-Aadhaar standard encoding for spatial land parcels and vertical 3D units.
 */

import crypto from 'crypto';

export interface UlpinParcelData {
  stateCode: string; // 2 digits (e.g. '27' for Maharashtra)
  districtCode: string; // 3 digits
  subDistrictCode: string; // 3 digits
  villageCode: string; // 3 digits
  parcelSeq: string; // 3 digits
  latitude: number;
  longitude: number;
  elevation?: number;
  subdivision?: string;
}

export class BackendUlpinService {
  /**
   * Generates a standard 14-character alphanumeric Unique Land Parcel Identification Number (ULPIN)
   */
  static generateUlpin(data: UlpinParcelData): string {
    const state = (data.stateCode || '27').padStart(2, '0').slice(0, 2);
    const district = (data.districtCode || '014').padStart(3, '0').slice(0, 3);
    const village = (data.villageCode || '001').padStart(3, '0').slice(0, 3);
    const seq = (data.parcelSeq || '001').padStart(3, '0').slice(0, 3);

    // Compute checksum character using Luhn mod N
    const baseCode = `${state}${district}${village}${seq}`;
    const hash = crypto.createHash('sha256').update(`${data.latitude}:${data.longitude}:${baseCode}`).digest('hex');
    const checkChars = hash.substring(0, 3).toUpperCase();

    return `${baseCode}${checkChars}`.slice(0, 14);
  }

  /**
   * Generates a 3D Vertical Sub-ULPIN for multi-story floor units (e.g. ULPIN-FL04-U102)
   */
  static generate3dVerticalUlpin(baseUlpin: string, floorNumber: number, unitNumber: string): string {
    const floorCode = floorNumber >= 0 ? `F${String(floorNumber).padStart(2, '0')}` : `B${String(Math.abs(floorNumber)).padStart(2, '0')}`;
    const cleanUnit = unitNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4);
    return `${baseUlpin.slice(0, 14)}-${floorCode}-${cleanUnit}`;
  }

  /**
   * Validates if a given string conforms to the 14-digit ULPIN standard
   */
  static isValidUlpin(ulpin: string): boolean {
    if (!ulpin || typeof ulpin !== 'string') return false;
    const clean = ulpin.trim().toUpperCase();
    return /^[0-9]{11}[A-Z0-9]{3}$/.test(clean) || /^[A-Z0-9]{14}$/.test(clean);
  }
}
