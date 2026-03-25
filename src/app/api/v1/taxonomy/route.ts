export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import {
  MOVEMENT_TYPES,
  DIRECTIONS,
  SPEEDS,
  SHOT_SIZES,
  VERTICAL_ANGLES,
  HORIZONTAL_ANGLES,
  SPECIAL_ANGLES,
  DURATION_CATEGORIES,
} from "@/lib/taxonomy";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  return Response.json({
    movementTypes: Object.entries(MOVEMENT_TYPES).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    directions: Object.entries(DIRECTIONS).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    speeds: Object.entries(SPEEDS).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    shotSizes: Object.entries(SHOT_SIZES).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    verticalAngles: Object.entries(VERTICAL_ANGLES).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    horizontalAngles: Object.entries(HORIZONTAL_ANGLES).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    specialAngles: Object.entries(SPECIAL_ANGLES).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
    durationCategories: Object.entries(DURATION_CATEGORIES).map(([key, val]) => ({
      slug: key,
      displayName: val.displayName,
    })),
  });
}
