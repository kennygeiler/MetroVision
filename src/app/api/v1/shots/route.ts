export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { getAllShots } from "@/db/queries";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 20)));

    const filters: Record<string, string> = {};
    const movementType = request.nextUrl.searchParams.get("movementType");
    const director = request.nextUrl.searchParams.get("director");
    const filmTitle = request.nextUrl.searchParams.get("filmTitle");
    const shotSize = request.nextUrl.searchParams.get("shotSize");

    if (movementType) filters.movementType = movementType;
    if (director) filters.director = director;
    if (filmTitle) filters.filmTitle = filmTitle;
    if (shotSize) filters.shotSize = shotSize;

    const shots = await getAllShots(
      Object.keys(filters).length > 0 ? filters : undefined,
    );

    const start = (page - 1) * limit;
    const paginated = shots.slice(start, start + limit).map((s) => ({
      id: s.id,
      filmTitle: s.film.title,
      director: s.film.director,
      year: s.film.year,
      movementType: s.metadata.movementType,
      direction: s.metadata.direction,
      speed: s.metadata.speed,
      shotSize: s.metadata.shotSize,
      angleVertical: s.metadata.angleVertical,
      angleHorizontal: s.metadata.angleHorizontal,
      duration: s.duration,
      startTc: s.startTc,
      endTc: s.endTc,
      isCompound: s.metadata.isCompound,
      description: s.semantic?.description ?? null,
      mood: s.semantic?.mood ?? null,
      thumbnailUrl: s.thumbnailUrl,
      videoUrl: s.videoUrl,
    }));

    return Response.json({
      data: paginated,
      pagination: {
        page,
        limit,
        total: shots.length,
        totalPages: Math.ceil(shots.length / limit),
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch shots" },
      { status: 500 },
    );
  }
}
