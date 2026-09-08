/**
 * POST /api/digital-twin/reset (Phase 23)
 * =======================================
 * Resets a society's customized 3D Digital Twin back to unconfigured state.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { resolveSocietyByAnyId } from '@/lib/society/society3DUlpinRegistry';
import { resetSocietyDigitalTwin } from '@/lib/digital-twin/digitalTwinRegistry';

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

    const { societyId, role, userRole, userSocietyId } = body;

    if (!societyId || typeof societyId !== 'string' || societyId.trim().length === 0) {
      return NextResponse.json(
        { error: 'societyId is required.' },
        { status: 400 }
      );
    }

    // Server-side RBAC validation
    const clientRole = (req.headers.get('x-user-role') || userRole || role || '').toUpperCase();
    const callerSociety = req.headers.get('x-user-society') || userSocietyId || '';

    if (clientRole === 'CITIZEN' || clientRole === 'RESIDENT') {
      return NextResponse.json(
        { error: 'Citizen role is read-only. Resetting digital twins requires Admin privileges.' },
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
          { error: 'Society Admins can only reset digital twins for their assigned society.' },
          { status: 403 }
        );
      }
    }

    resetSocietyDigitalTwin(societyId);

    return NextResponse.json({
      success: true,
      societyId,
      status: 'SOURCE_IMAGE_REQUIRED',
      message: `Digital twin for society ${societyId} has been reset.`,
    });
  } catch (err: any) {
    console.error('[API /api/digital-twin/reset] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to reset digital twin.' },
      { status: 500 }
    );
  }
}
