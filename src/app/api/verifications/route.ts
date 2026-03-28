import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db, schema } from "@/db";
import { getVerificationStats, submitVerification } from "@/db/queries";

const verifiableFields = new Set([
  // shotMetadata columns
  "framing",
  "depth",
  "blocking",
  "shotSize",
  "angleVertical",
  "angleHorizontal",
  "durationCat",
  // shotSemantic columns
  "description",
  "mood",
  "lighting",
]);

function isValidRating(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5;
}

export async function GET() {
  try {
    const stats = await getVerificationStats();

    return Response.json(stats);
  } catch (error) {
    console.error("Failed to load verification stats.", error);

    return Response.json(
      { error: "Failed to load verification stats." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shotId =
      typeof body?.shotId === "string" ? body.shotId.trim() : "";
    const overallRating = body?.overallRating;
    const fieldRatings =
      body?.fieldRatings && typeof body.fieldRatings === "object"
        ? body.fieldRatings
        : null;
    const corrections =
      body?.corrections && typeof body.corrections === "object"
        ? body.corrections
        : undefined;
    const notes = typeof body?.notes === "string" ? body.notes : undefined;

    if (!shotId) {
      return Response.json({ error: "shotId is required." }, { status: 400 });
    }

    if (!isValidRating(overallRating)) {
      return Response.json(
        { error: "overallRating must be an integer from 0 to 5." },
        { status: 400 },
      );
    }

    if (!fieldRatings || Object.keys(fieldRatings).length === 0) {
      return Response.json(
        { error: "fieldRatings must include at least one rated field." },
        { status: 400 },
      );
    }

    const normalizedFieldRatings = Object.fromEntries(
      Object.entries(fieldRatings).filter(
        ([field, value]) => verifiableFields.has(field) && isValidRating(value),
      ),
    ) as Record<string, number>;

    if (Object.keys(normalizedFieldRatings).length === 0) {
      return Response.json(
        { error: "fieldRatings must contain valid 0-5 scores." },
        { status: 400 },
      );
    }

    const normalizedCorrections = Object.fromEntries(
      Object.entries(corrections ?? {}).filter(
        ([field, value]) =>
          verifiableFields.has(field) &&
          typeof value === "string" &&
          value.trim().length > 0,
      ),
    ) as Record<string, string>;

    const [shot] = await db
      .select({ id: schema.shots.id })
      .from(schema.shots)
      .where(eq(schema.shots.id, shotId))
      .limit(1);

    if (!shot) {
      return Response.json({ error: "Shot not found." }, { status: 404 });
    }

    const verification = await submitVerification({
      shotId,
      overallRating,
      fieldRatings: normalizedFieldRatings,
      corrections: normalizedCorrections,
      notes,
    });

    // Determine whether any field was rated below threshold
    const hasLowRatedField = Object.values(normalizedFieldRatings).some(
      (r) => r < 3,
    );

    // Write corrections back to shot_metadata / shot_semantic
    if (hasLowRatedField && Object.keys(normalizedCorrections).length > 0) {
      const metadataFields = [
        "framing",
        "depth",
        "blocking",
        "shotSize",
        "angleVertical",
        "angleHorizontal",
        "durationCat",
      ] as const;

      const semanticFields = ["description", "mood", "lighting"] as const;

      const metadataUpdate: Record<string, unknown> = {
        reviewStatus: "human_corrected",
      };
      for (const field of metadataFields) {
        if (normalizedCorrections[field]) {
          metadataUpdate[field] = normalizedCorrections[field];
        }
      }

      await db
        .update(schema.shotMetadata)
        .set(metadataUpdate)
        .where(eq(schema.shotMetadata.shotId, shotId));

      const semanticUpdate: Record<string, unknown> = {};
      for (const field of semanticFields) {
        if (normalizedCorrections[field]) {
          semanticUpdate[field] = normalizedCorrections[field];
        }
      }

      if (Object.keys(semanticUpdate).length > 0) {
        await db
          .update(schema.shotSemantic)
          .set(semanticUpdate)
          .where(eq(schema.shotSemantic.shotId, shotId));
      }
    } else {
      // All fields rated >= 3 — mark as verified
      await db
        .update(schema.shotMetadata)
        .set({ reviewStatus: "human_verified" })
        .where(eq(schema.shotMetadata.shotId, shotId));
    }

    return Response.json(verification, { status: 201 });
  } catch (error) {
    console.error("Failed to submit verification.", error);

    return Response.json(
      { error: "Failed to submit verification." },
      { status: 500 },
    );
  }
}
