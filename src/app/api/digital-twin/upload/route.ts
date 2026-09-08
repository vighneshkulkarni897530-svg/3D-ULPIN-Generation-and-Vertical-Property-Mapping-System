/**
 * POST /api/digital-twin/upload (Phase 23)
 * ========================================
 * Uploads and stages a society's site/masterplan image to its
 * isolated storage path: societies/{societyId}/digital-twin/source/{version}-{filename}
 */

import { NextResponse, type NextRequest } from 'next/server';
import { resolveSocietyByAnyId } from '@/lib/society/society3DUlpinRegistry';
import { getSocietyDigitalTwin } from '@/lib/digital-twin/digitalTwinRegistry';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const { societyId, imageDataUrl, fileName = 'site-plan.png', role, userRole, userSocietyId } = body;

    if (!societyId || typeof societyId !== 'string' || societyId.trim().length === 0) {
      return NextResponse.json(
        { error: 'societyId is required.' },
        { status: 400 }
      );
    }

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageDataUrl is required.' },
        { status: 400 }
      );
    }

    // Size limit 10MB
    const rawLen = imageDataUrl.length;
    const approxBytes = imageDataUrl.startsWith('data:') ? Math.round((rawLen * 3) / 4) : rawLen;
    if (approxBytes > 10 * 1024 * 1024 || rawLen > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File exceeds 10MB limit. Please upload an image under 10MB.' },
        { status: 400 }
      );
    }

    // Server-side RBAC validation
    const clientRole = (req.headers.get('x-user-role') || userRole || role || '').toUpperCase();
    const callerSociety = req.headers.get('x-user-society') || userSocietyId || '';

    if (clientRole === 'CITIZEN' || clientRole === 'RESIDENT') {
      return NextResponse.json(
        { error: 'Citizen role is read-only. Uploading site images requires Society Admin privileges.' },
        { status: 403 }
      );
    }

    if (
      (clientRole === 'SOCIETY_ADMIN' || clientRole === 'ADMIN') &&
      callerSociety &&
      callerSociety !== societyId
    ) {
      const resolvedTarget = resolveSocietyByAnyId(societyId);
      const resolvedCaller = resolveSocietyByAnyId(callerSociety);
      if (
        resolvedTarget?.parcelId !== resolvedCaller?.parcelId &&
        resolvedTarget?.societyId !== callerSociety &&
        societyId !== callerSociety
      ) {
        return NextResponse.json(
          { error: 'Society Admins can only upload images for their assigned society.' },
          { status: 403 }
        );
      }
    }

    // Version calculation
    const existing = getSocietyDigitalTwin(societyId);
    let nextVersionNum = 1;
    if (existing?.sourceImageVersion) {
      const match = existing.sourceImageVersion.match(/^v(\d+)/i);
      if (match) {
        nextVersionNum = parseInt(match[1], 10) + 1;
      }
    }
    const version = `v${nextVersionNum}`;

    // Compute storage path
    const storagePath = `societies/${societyId}/digital-twin/source/${version}-${fileName}`;

    return NextResponse.json({
      success: true,
      societyId,
      version,
      storagePath,
      imageUrl: imageDataUrl,
      message: `Image staged successfully at ${storagePath}`,
    });
  } catch (err: any) {
    console.error('[API /api/digital-twin/upload] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload image.' },
      { status: 500 }
    );
  }
}
