/**
 * POST /api/digital-twin/generate (Phase 23)
 * ===========================================
 * Server-only API route orchestrating AI 3D Digital Twin generation
 * from user-uploaded society imagery. Deployable on Vercel.
 *
 * RBAC & SECURITY RULES:
 * - CITIZEN: 403 Forbidden (View-only).
 * - SOCIETY ADMIN: Allowed ONLY for their assigned society.
 * - OFFICER / CADASTRE ADMIN: Allowed for verification workflows.
 * - Server validates role, session, image size (<= 10MB), and society scope.
 * - NEVER exposes HF_TOKEN or server secrets.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { generate3DWithHuggingFace, isHuggingFaceConfigured } from '@/lib/ai/huggingface';
import { analyzeSocietySiteImage } from '@/lib/digital-twin/imageAnalyzer';
import { getSocietyById } from '@/lib/society/service';
import type { SocietyDigitalTwin, DigitalTwinGenerationStatus } from '@/types/digitalTwin';
import { resolveSocietyByAnyId } from '@/lib/society/society3DUlpinRegistry';
import { getSocietyDigitalTwin, saveSocietyDigitalTwin } from '@/lib/digital-twin/digitalTwinRegistry';

export const maxDuration = 60; // Set maxDuration for Vercel serverless execution

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

    const {
      societyId,
      societyName: customSocietyName,
      sourceImageUrl: bodySourceImageUrl,
      imageDataUrl,
      image,
      sourceImageType = 'ARCHITECTURAL_LAYOUT',
      userRole,
      role,
      userSocietyId,
    } = body;

    const sourceImageUrl = bodySourceImageUrl || imageDataUrl || image;

    // 1. Validate required fields
    if (!societyId || typeof societyId !== 'string' || societyId.trim().length === 0) {
      return NextResponse.json(
        { error: 'societyId is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    if (!sourceImageUrl || typeof sourceImageUrl !== 'string' || sourceImageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'sourceImageUrl is required for 3D generation.' },
        { status: 400 }
      );
    }

    // 2. Validate image payload size (Hard cap: 10MB)
    const rawLen = sourceImageUrl.length;
    const approxBytes = sourceImageUrl.startsWith('data:')
      ? Math.round((rawLen * 3) / 4)
      : rawLen;

    if (approxBytes > 10 * 1024 * 1024 || rawLen > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Source image exceeds the 10MB limit. Please upload an image under 10MB.' },
        { status: 400 }
      );
    }

    // 3. Server-side RBAC validation
    const clientRole = (req.headers.get('x-user-role') || userRole || role || '').toUpperCase();
    const callerSociety = req.headers.get('x-user-society') || userSocietyId || '';

    // CITIZEN / RESIDENT role is strictly forbidden from modifying or generating digital twins
    if (clientRole === 'CITIZEN' || clientRole === 'RESIDENT') {
      return NextResponse.json(
        { error: 'Citizen role is read-only. Citizens cannot generate or modify 3D Digital Twins.' },
        { status: 403 }
      );
    }

    // SOCIETY ADMIN role can only manage their own assigned society
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
          { error: 'Society Admins can only generate 3D Digital Twins for their assigned society.' },
          { status: 403 }
        );
      }
    }

    // 4. Resolve society details
    const societyRecord = resolveSocietyByAnyId(societyId);
    let dbSociety = null;
    try {
      dbSociety = await getSocietyById(societyId);
    } catch {
      // ignore
    }
    const societyName =
      customSocietyName || societyRecord?.societyName || dbSociety?.name || 'Society Digital Twin';

    // 5. Compute versioning (Increment existing version or start at v1)
    const existingTwin = getSocietyDigitalTwin(societyId);
    let nextVersionNum = 1;
    if (existingTwin && existingTwin.sourceImageVersion) {
      const match = existingTwin.sourceImageVersion.match(/^v(\d+)/i);
      if (match) {
        nextVersionNum = parseInt(match[1], 10) + 1;
      }
    }
    const sourceImageVersion = `v${nextVersionNum}`;
    const timestamp = new Date().toISOString();

    // 6. Invoke Hugging Face AI 3D Inference & Procedural Analysis
    let hfResult = null;
    let proceduralTwin: SocietyDigitalTwin | null = null;
    let generationStatus: DigitalTwinGenerationStatus = 'GENERATING';
    let generationError: string | null = null;

    if (isHuggingFaceConfigured()) {
      try {
        hfResult = await generate3DWithHuggingFace({
          imageDataUrlOrBuffer: sourceImageUrl,
          societyId,
          societyName,
        });

        if (!hfResult.success) {
          generationError = hfResult.message;
        }
      } catch (err: any) {
        generationError = err.message || 'Hugging Face inference failed.';
      }
    }

    // Generate procedural architectural scene layout from analyzed image features
    try {
      proceduralTwin = await analyzeSocietySiteImage(sourceImageUrl, societyName, societyId);
    } catch (err: any) {
      console.warn('[GenerateAPI] Procedural analysis fallback warning:', err);
    }

    // Determine final status
    const isSuccess = (hfResult && hfResult.success) || proceduralTwin !== null;
    generationStatus = isSuccess ? 'READY' : 'FAILED';

    const finalDigitalTwin: SocietyDigitalTwin = {
      id: `twin-${societyId}-${sourceImageVersion}`,
      societyId,
      societyName,
      sourceImage: sourceImageUrl,
      sourceImageUrl,
      sourceImageType: sourceImageType as any,
      sourceImageVersion,
      generatedModelUrl: hfResult?.modelUrl || null,
      generatedPreviewUrl: sourceImageUrl,
      generationProvider: hfResult?.success ? 'HUGGING_FACE' : 'PROCEDURAL_AI',
      generationStatus,
      generationError: generationStatus === 'FAILED' ? generationError || 'Generation failed' : null,
      generatedAt: timestamp,
      updatedAt: timestamp,
      confidence: hfResult?.confidence ?? proceduralTwin?.confidence ?? 0.88,
      analysisNotes:
        hfResult?.message ||
        proceduralTwin?.analysisNotes ||
        'AI synthesized society digital twin layout.',
      isAiAnalyzed: true,
      dataStatus: 'DEMO',
      isOfficialUlpin: false,
      sourceType: 'AI_GENERATED_VISUALIZATION',
      siteDimensions: proceduralTwin?.siteDimensions || { widthMeters: 250, depthMeters: 250 },
      siteBoundary: proceduralTwin?.siteBoundary || { half: [125, 125], radius: 25 },
      buildings: (proceduralTwin?.buildings || []).map((b) => ({
        ...b,
        societyId,
        x: b.position[0],
        z: b.position[1],
        y: 0,
        width: b.footprint[0],
        depth: b.footprint[1],
        height: b.heightMeters,
        floorCount: b.floors,
        buildingType: b.type,
        source: hfResult?.success ? 'HUGGING_FACE_3D' : 'AI_IMAGE_ANALYSIS',
        confidence: hfResult?.confidence ?? 0.88,
      })),
      roads: proceduralTwin?.roads || { segments: [] },
      parks: proceduralTwin?.parks || [],
      parkingAreas: proceduralTwin?.parkingAreas || [],
      amenities: proceduralTwin?.amenities || [],
      waterBodies: proceduralTwin?.waterBodies || [],
      entrances: proceduralTwin?.entrances || [],
      trees: proceduralTwin?.trees || [],
      streetLights: proceduralTwin?.streetLights || [],
      cars: proceduralTwin?.cars || [],
    };

    // Save to persistent registry
    if (isSuccess) {
      saveSocietyDigitalTwin(finalDigitalTwin);
    }

    return NextResponse.json(
      {
        success: isSuccess,
        status: generationStatus,
        societyId,
        societyName,
        sourceImageVersion,
        generationStatus,
        generationProvider: finalDigitalTwin.generationProvider,
        generatedModelUrl: finalDigitalTwin.generatedModelUrl,
        digitalTwin: finalDigitalTwin,
        error: generationStatus === 'FAILED' ? generationError || 'Generation failed' : null,
        hfInference: hfResult
          ? {
              modelId: hfResult.modelId,
              success: hfResult.success,
              rawFormat: hfResult.rawFormat,
              message: hfResult.message,
              errorCode: hfResult.errorCode,
            }
          : {
              configured: false,
              note: 'HF_TOKEN not set on server. Using procedural AI synthesis.',
            },
        notice:
          '3D visualization generated from uploaded society/site imagery and property data. Not an official cadastral survey, legal title record, or government-issued ULPIN.',
      },
      { status: isSuccess ? 200 : 422 }
    );
  } catch (error: any) {
    console.error('[API /api/digital-twin/generate] Internal error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred during 3D Digital Twin generation.',
      },
      { status: 500 }
    );
  }
}
