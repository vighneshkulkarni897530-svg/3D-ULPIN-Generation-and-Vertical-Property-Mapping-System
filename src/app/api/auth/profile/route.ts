import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, jsonError, readJsonBody, clientIp } from "@/lib/auth/server/apiAuth";
import { updateUserProfile, findUserById, toPublicUser } from "@/lib/auth/server/userStore";
import { appendAudit } from "@/lib/auth/server/auditStore";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("response" in auth) return auth.response;

  const user = findUserById(auth.user.id);
  if (!user) return jsonError(404, "NOT_FOUND", "User not found.");

  return NextResponse.json({ user: toPublicUser(user) });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(req);
  if (!body) return jsonError(400, "INVALID_BODY", "Request body must be a JSON object.");

  const allowedFields = [
    "name",
    "phone",
    "avatarUrl",
    "department",
    "designation",
    "jurisdictionDistrict",
    "badgeNumber",
    "societyName",
    "societyRegNo",
    "aadhaarOrGovId",
  ];

  const patch: Record<string, any> = {};
  for (const field of allowedFields) {
    if ((body as any)[field] !== undefined) {
      patch[field] = (body as any)[field];
    }
  }

  if (Object.keys(patch).length === 0) {
    return jsonError(400, "EMPTY_PATCH", "No updatable fields provided.");
  }

  const result = updateUserProfile(auth.user.id, patch);
  if (!result.ok) {
    return jsonError(400, "UPDATE_FAILED", result.error || "Failed to update profile.");
  }

  // Audit profile update
  appendAudit({
    actorId: auth.user.id,
    actorName: auth.user.name,
    actorRole: auth.user.role,
    action: "USER_STATUS_CHANGE",
    entityType: "USER",
    entityId: auth.user.id,
    newValue: JSON.stringify(patch).slice(0, 150),
    details: `User profile updated by ${auth.user.name}`,
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true, user: result.user });
}
