import { readFile } from "node:fs/promises";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";

export const GEMINI_OBJECT_MODEL = "gemini-2.5-flash";

export const OBJECT_DETECTION_PROMPT = `You are analyzing a frame from a film scene. Identify all significant visual elements with their approximate bounding box locations.

For each detected element, provide:
- label: short descriptive name (2-4 words, e.g., "man in fedora", "vintage black car", "tall golden reeds")
- category: one of "person", "vehicle", "object", "environment", "animal", "text"
- confidence: 0.0-1.0 how certain you are
- bbox: [x, y, width, height] as normalized coordinates (0-1 range relative to frame dimensions)
  - x = left edge position (0 = left of frame, 1 = right)
  - y = top edge position (0 = top, 1 = bottom)
  - width = box width as fraction of frame
  - height = box height as fraction of frame
- attributes: object with any notable details (color, action, clothing, etc.)

Focus on cinematographically relevant elements: characters, key props, vehicles, environmental features, lighting sources.

Return ONLY valid JSON array:
[
  { "label": "man in fedora", "category": "person", "confidence": 0.92, "bbox": [0.3, 0.2, 0.15, 0.6], "attributes": {"clothing": "dark suit", "action": "walking"} },
  { "label": "vintage black car", "category": "vehicle", "confidence": 0.88, "bbox": [0.5, 0.4, 0.35, 0.3], "attributes": {"color": "black", "era": "1940s"} }
]`;

const ALLOWED_CATEGORIES = new Set([
  "person",
  "vehicle",
  "object",
  "environment",
  "animal",
  "text",
] as const);

type DetectedCategory = "person" | "vehicle" | "object" | "environment" | "animal" | "text";

type RawDetectedObject = {
  label?: unknown;
  category?: unknown;
  confidence?: unknown;
  bbox?: unknown;
  attributes?: unknown;
};

export type DetectedObject = {
  label: string;
  category: DetectedCategory | null;
  confidence: number | null;
  bboxX: number | null;
  bboxY: number | null;
  bboxW: number | null;
  bboxH: number | null;
  attributes: Record<string, string> | null;
};

function resolveGeminiApiKey(apiKey?: string) {
  const resolvedApiKey = apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!resolvedApiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set.");
  }

  return resolvedApiKey;
}

function clampUnitInterval(value: number) {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clampUnitInterval(value);
}

function normalizeBbox(value: unknown) {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }

  const [x, y, width, height] = value.map((entry) => Number(entry));

  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }

  return {
    bboxX: clampUnitInterval(x),
    bboxY: clampUnitInterval(y),
    bboxW: clampUnitInterval(width),
    bboxH: clampUnitInterval(height),
  };
}

function normalizeAttributes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).flatMap(([key, entryValue]) => {
    const normalizedKey = key.trim();
    const normalizedValue =
      typeof entryValue === "string" || typeof entryValue === "number" || typeof entryValue === "boolean"
        ? String(entryValue).trim()
        : "";

    if (!normalizedKey || !normalizedValue) {
      return [];
    }

    return [[normalizedKey, normalizedValue] as const];
  });

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
}

function extractJsonArray(payload: string) {
  const trimmed = payload.trim();
  const fenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim()
    : trimmed;
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini object detection did not return a JSON array.");
  }

  return JSON.parse(fenced.slice(start, end + 1)) as unknown;
}

function normalizeDetectedObjects(payload: unknown): DetectedObject[] {
  if (!Array.isArray(payload)) {
    throw new Error("Gemini object detection payload must be an array.");
  }

  const objects: DetectedObject[] = [];

  for (const item of payload as RawDetectedObject[]) {
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label) {
      continue;
    }

    const bbox = normalizeBbox(item.bbox);
    if (!bbox) {
      continue;
    }

    const category =
      typeof item.category === "string" && ALLOWED_CATEGORIES.has(item.category as DetectedCategory)
        ? (item.category as DetectedCategory)
        : null;

    objects.push({
      label,
      category,
      confidence: normalizeConfidence(item.confidence),
      ...bbox,
      attributes: normalizeAttributes(item.attributes),
    });
  }

  return objects;
}

export async function fetchAssetBuffer(url: string) {
  const token =
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN?.trim();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

export async function detectObjectsFromImageBuffer(
  imageBuffer: Buffer,
  contentType: string,
  apiKey?: string,
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_OBJECT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": resolveGeminiApiKey(apiKey),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: OBJECT_DETECTION_PROMPT },
              {
                inline_data: {
                  mime_type: contentType,
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generation_config: {
          temperature: 0,
          response_mime_type: "application/json",
          media_resolution: "MEDIA_RESOLUTION_HIGH",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini object detection failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .find(Boolean);

  if (!text) {
    throw new Error("Gemini object detection response did not include text.");
  }

  return normalizeDetectedObjects(extractJsonArray(text));
}

export async function detectObjectsFromImagePath(imagePath: string, contentType = "image/jpeg") {
  const imageBuffer = Buffer.from(await readFile(imagePath));
  return detectObjectsFromImageBuffer(imageBuffer, contentType);
}

export async function replaceShotObjects(
  shotId: string,
  objects: DetectedObject[],
  frameTime: number | null,
) {
  await db.delete(schema.shotObjects).where(eq(schema.shotObjects.shotId, shotId));

  if (objects.length === 0) {
    return [];
  }

  const inserted = await db
    .insert(schema.shotObjects)
    .values(
      objects.map((object) => ({
        shotId,
        label: object.label,
        category: object.category,
        confidence: object.confidence,
        bboxX: object.bboxX,
        bboxY: object.bboxY,
        bboxW: object.bboxW,
        bboxH: object.bboxH,
        frameTime,
        attributes: object.attributes,
      })),
    )
    .returning();

  return inserted;
}
