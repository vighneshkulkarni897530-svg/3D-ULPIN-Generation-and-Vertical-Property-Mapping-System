/**
 * GET /api/digital-twin/status (Phase 23)
 * ========================================
 * Server-only API route to query the generation status and active
 * version of a society's 3D Digital Twin.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSocietyDigitalTwin } from '@/lib/digital-twin/digitalTwinRegistry';
import { resolveSocietyByAnyId } from '@/lib/society/society3DUlpinRegistry';

export async function GET(req: NextRequest) {
  try {
    const societyId =
      req.nextUrl.searchParams.get('societyId') || req.nextUrl.searchParams.get('society');

    if (!societyId || societyId.trim().length === 0) {
      return NextResponse.json(
        { error: 'societyId query parameter is required.' },
        { status: 400 }
      );
    }

    const societyRecord = resolveSocietyByAnyId(societyId);
    const digitalTwin = getSocietyDigitalTwin(societyId);

    if (!digitalTwin) {
      return NextResponse.json({
        societyId,
        societyName: societyRecord?.societyName || 'Unconfigured Society',
        status: 'SOURCE_IMAGE_REQUIRED',
        generationStatus: 'SOURCE_IMAGE_REQUIRED',
        sourceImageVersion: 'v0',
        generatedModelUrl: null,
        digitalTwin: null,
        totalBuildings: 0,
        message: 'No 3D Digital Twin configured for this society. Upload a site image to generate.',
      });
    }

    return NextResponse.json({
      societyId: digitalTwin.societyId,
      societyName: digitalTwin.societyName,
      status: digitalTwin.generationStatus || 'READY',
      generationStatus: digitalTwin.generationStatus || 'READY',
      sourceImageVersion: digitalTwin.sourceImageVersion || 'v1',
      sourceImageType: digitalTwin.sourceImageType,
      generatedModelUrl: digitalTwin.generatedModelUrl,
      generatedPreviewUrl: digitalTwin.generatedPreviewUrl,
      generationProvider: digitalTwin.generationProvider || 'PROCEDURAL_AI',
      digitalTwin,
      totalBuildings: digitalTwin.buildings.length,
      confidence: digitalTwin.confidence,
      generatedAt: digitalTwin.generatedAt,
      isAiAnalyzed: digitalTwin.isAiAnalyzed,
      isOfficialUlpin: false,
      dataStatus: 'DEMO',
      sourceType: 'AI_GENERATED_VISUALIZATION',
      notice: '3D visualization generated from uploaded society/site imagery and property data.',
    });
  } catch (error: any) {
    console.error('[API /api/digital-twin/status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve digital twin status.' },
      { status: 500 }
    );
  }
}
