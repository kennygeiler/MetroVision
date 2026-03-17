import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import type {
  ShotObjectAttributes,
  ShotObjectKeyframe,
} from "@/db/schema";

export const GEMINI_OBJECT_MODEL = "gemini-2.5-flash";
export const OBJECT_SAMPLE_INTERVAL_SECONDS = 1.5;
const MAX_OBJECT_SAMPLES = 10;
const MIN_OBJECT_SAMPLES = 2;

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

type DetectedCategory =
  | "person"
  | "vehicle"
  | "object"
  | "environment"
  | "animal"
  | "text";

type RawDetectedObject = {
  label?: unknown;
  category?: unknown;
  confidence?: unknown;
  bbox?: unknown;
  attributes?: unknown;
};

type NormalizedBbox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DetectedObject = {
  label: string;
  category: DetectedCategory | null;
  confidence: number | null;
  bbox: NormalizedBbox;
  attributes: ShotObjectAttributes | null;
};

type FrameDetection = DetectedObject & {
  time: number;
};

type MutableTrack = {
  trackId: string;
  detections: FrameDetection[];
};

export type ObjectTrack = {
  trackId: string;
  label: string;
  category: string | null;
  confidence: number | null;
  keyframes: ShotObjectKeyframe[];
  startTime: number;
  endTime: number;
  attributes: ShotObjectAttributes | null;
};

export type StoredObjectTrack = ObjectTrack & {
  id: string;
};

function resolveGeminiApiKey(apiKey?: string) {
  const resolvedApiKey =
    apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();

  if (!resolvedApiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set.");
  }

  return resolvedApiKey;
}

function roundNumber(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function roundTime(value: number) {
  return roundNumber(value, 3);
}

function clampUnitInterval(value: number) {
  return Math.min(1, Math.max(0, roundNumber(value)));
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clampUnitInterval(value);
}

function normalizeBbox(value: unknown): NormalizedBbox | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }

  const [x, y, width, height] = value.map((entry) => Number(entry));

  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }

  return {
    x: clampUnitInterval(x),
    y: clampUnitInterval(y),
    w: clampUnitInterval(width),
    h: clampUnitInterval(height),
  };
}

function normalizeAttributes(value: unknown): ShotObjectAttributes | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value).flatMap(([key, entryValue]) => {
    const normalizedKey = key.trim();
    const normalizedValue =
      typeof entryValue === "string" ||
      typeof entryValue === "number" ||
      typeof entryValue === "boolean"
        ? String(entryValue).trim()
        : "";

    if (!normalizedKey || !normalizedValue) {
      return [];
    }

    return [[normalizedKey, normalizedValue] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : null;
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
      typeof item.category === "string" &&
      ALLOWED_CATEGORIES.has(item.category as DetectedCategory)
        ? (item.category as DetectedCategory)
        : null;

    objects.push({
      label,
      category,
      confidence: normalizeConfidence(item.confidence),
      bbox,
      attributes: normalizeAttributes(item.attributes),
    });
  }

  return objects;
}

function buildPromptForTimestamp(timestamp: number) {
  return `${OBJECT_DETECTION_PROMPT}

Frame timestamp: ${roundTime(timestamp)} seconds into the shot. Use the timestamp only as context for what may be in motion. Return only the JSON array.`;
}

function tokenizeLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function labelsAreSimilar(left: string, right: string) {
  const normalizedLeft = tokenizeLabel(left);
  const normalizedRight = tokenizeLabel(right);

  if (normalizedLeft.length === 0 || normalizedRight.length === 0) {
    return false;
  }

  if (normalizedLeft.join(" ") === normalizedRight.join(" ")) {
    return true;
  }

  const leftSet = new Set(normalizedLeft);
  const rightSet = new Set(normalizedRight);
  const overlap = [...leftSet].filter((token) => rightSet.has(token)).length;
  const minTokenCount = Math.min(leftSet.size, rightSet.size);
  const unionCount = new Set([...leftSet, ...rightSet]).size;

  return overlap / minTokenCount >= 0.6 || overlap / unionCount >= 0.5;
}

function getBoxCenter(box: NormalizedBbox) {
  return {
    x: box.x + box.w / 2,
    y: box.y + box.h / 2,
  };
}

function getIntersectionOverUnion(left: NormalizedBbox, right: NormalizedBbox) {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.w, right.x + right.w);
  const y2 = Math.min(left.y + left.h, right.y + right.h);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersection = intersectionWidth * intersectionHeight;
  const leftArea = left.w * left.h;
  const rightArea = right.w * right.h;
  const union = leftArea + rightArea - intersection;

  if (union <= 0) {
    return 0;
  }

  return intersection / union;
}

function getCenterDistance(left: NormalizedBbox, right: NormalizedBbox) {
  const leftCenter = getBoxCenter(left);
  const rightCenter = getBoxCenter(right);
  return Math.hypot(leftCenter.x - rightCenter.x, leftCenter.y - rightCenter.y);
}

function getMostCommonValue(values: Array<string | null>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let winner: string | null = null;
  let winnerCount = -1;

  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  return winner;
}

function mergeAttributes(
  attributesList: Array<ShotObjectAttributes | null>,
): ShotObjectAttributes | null {
  const merged: ShotObjectAttributes = {};

  for (const attributes of attributesList) {
    if (!attributes) {
      continue;
    }

    for (const [key, value] of Object.entries(attributes)) {
      merged[key] = value;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export function sampleObjectDetectionTimestamps(shotDuration: number) {
  const duration = Number.isFinite(shotDuration) ? Math.max(0, shotDuration) : 0;
  const timestamps = new Set<number>([0]);

  for (
    let current = OBJECT_SAMPLE_INTERVAL_SECONDS;
    current <= duration && timestamps.size < MAX_OBJECT_SAMPLES;
    current += OBJECT_SAMPLE_INTERVAL_SECONDS
  ) {
    timestamps.add(roundTime(current));
  }

  if (timestamps.size < MIN_OBJECT_SAMPLES) {
    timestamps.add(roundTime(duration > 0 ? duration : OBJECT_SAMPLE_INTERVAL_SECONDS));
  }

  return [...timestamps].sort((left, right) => left - right).slice(0, MAX_OBJECT_SAMPLES);
}

async function runProcessForBuffer(command: string, args: string[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }

      reject(
        new Error(stderr.trim() || `${command} exited with code ${code ?? "unknown"}.`),
      );
    });
  });
}

async function extractFrameBuffer(videoPath: string, timestamp: number) {
  return runProcessForBuffer("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    roundTime(timestamp).toFixed(3),
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "pipe:1",
  ]);
}

async function detectObjectsInFrame(
  imageBuffer: Buffer,
  timestamp: number,
  contentType = "image/jpeg",
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
              { text: buildPromptForTimestamp(timestamp) },
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

function buildTrackFromDetections(track: MutableTrack): ObjectTrack {
  const keyframes = track.detections
    .map((detection) => ({
      t: roundTime(detection.time),
      x: detection.bbox.x,
      y: detection.bbox.y,
      w: detection.bbox.w,
      h: detection.bbox.h,
    }))
    .sort((left, right) => left.t - right.t);
  const confidences = track.detections
    .map((detection) => detection.confidence)
    .filter((confidence): confidence is number => typeof confidence === "number");
  const averageConfidence =
    confidences.length > 0
      ? roundNumber(
          confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length,
        )
      : null;

  return {
    trackId: track.trackId,
    label: getMostCommonValue(track.detections.map((detection) => detection.label)) ?? "object",
    category: getMostCommonValue(track.detections.map((detection) => detection.category)),
    confidence: averageConfidence,
    keyframes,
    startTime: keyframes[0]?.t ?? 0,
    endTime: keyframes.at(-1)?.t ?? keyframes[0]?.t ?? 0,
    attributes: mergeAttributes(track.detections.map((detection) => detection.attributes)),
  };
}

function buildObjectTracks(frameDetections: FrameDetection[][]) {
  const tracks: MutableTrack[] = [];

  for (const detections of frameDetections) {
    const matchedTrackIds = new Set<string>();

    for (const detection of detections) {
      let bestTrack: MutableTrack | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (const track of tracks) {
        if (matchedTrackIds.has(track.trackId)) {
          continue;
        }

        const lastDetection = track.detections.at(-1);
        if (!lastDetection || lastDetection.time > detection.time) {
          continue;
        }

        if (!labelsAreSimilar(lastDetection.label, detection.label)) {
          continue;
        }

        const iou = getIntersectionOverUnion(lastDetection.bbox, detection.bbox);
        const centerDistance = getCenterDistance(lastDetection.bbox, detection.bbox);

        if (iou <= 0.3 && centerDistance >= 0.2) {
          continue;
        }

        const score =
          iou +
          Math.max(0, 0.2 - centerDistance) +
          (lastDetection.category === detection.category ? 0.1 : 0);

        if (score > bestScore) {
          bestScore = score;
          bestTrack = track;
        }
      }

      if (bestTrack) {
        bestTrack.detections.push(detection);
        matchedTrackIds.add(bestTrack.trackId);
        continue;
      }

      tracks.push({
        trackId: `track_${String(tracks.length + 1).padStart(3, "0")}`,
        detections: [detection],
      });
    }
  }

  return tracks
    .map(buildTrackFromDetections)
    .filter((track) => track.keyframes.length > 0)
    .sort(
      (left, right) =>
        left.startTime - right.startTime ||
        (right.confidence ?? 0) - (left.confidence ?? 0),
    );
}

function mapStoredTrack(row: typeof schema.shotObjects.$inferSelect): StoredObjectTrack {
  return {
    id: row.id,
    trackId: row.trackId,
    label: row.label,
    category: row.category ?? null,
    confidence: row.confidence ?? null,
    keyframes: row.keyframes ?? [],
    startTime: row.startTime ?? 0,
    endTime: row.endTime ?? 0,
    attributes: row.attributes ?? null,
  };
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
  timestamp = 0,
) {
  return detectObjectsInFrame(imageBuffer, timestamp, contentType, apiKey);
}

export async function detectObjectsFromImagePath(
  imagePath: string,
  contentType = "image/jpeg",
  timestamp = 0,
) {
  const imageBuffer = Buffer.from(await readFile(imagePath));
  return detectObjectsInFrame(imageBuffer, timestamp, contentType);
}

export async function detectObjectsMultiFrame(
  videoPath: string,
  shotDuration: number,
): Promise<ObjectTrack[]> {
  const timestamps = sampleObjectDetectionTimestamps(shotDuration);
  const frameDetections: FrameDetection[][] = [];

  for (const timestamp of timestamps) {
    const frameBuffer = await extractFrameBuffer(videoPath, timestamp);
    const detections = await detectObjectsInFrame(frameBuffer, timestamp);
    frameDetections.push(
      detections.map((detection) => ({
        ...detection,
        time: timestamp,
      })),
    );
  }

  return buildObjectTracks(frameDetections);
}

export async function replaceShotObjects(shotId: string, tracks: ObjectTrack[]) {
  await db.delete(schema.shotObjects).where(eq(schema.shotObjects.shotId, shotId));

  if (tracks.length === 0) {
    return [];
  }

  const inserted = await db
    .insert(schema.shotObjects)
    .values(
      tracks.map((track) => ({
        shotId,
        trackId: track.trackId,
        label: track.label,
        category: track.category,
        confidence: track.confidence,
        keyframes: track.keyframes,
        startTime: track.startTime,
        endTime: track.endTime,
        attributes: track.attributes,
      })),
    )
    .returning();

  return inserted.map(mapStoredTrack);
}

export async function detectObjectsFromVideo(shotId: string): Promise<ObjectTrack[]> {
  const [shot] = await db
    .select({
      id: schema.shots.id,
      startTc: schema.shots.startTc,
      endTc: schema.shots.endTc,
      duration: schema.shots.duration,
      videoUrl: schema.shots.videoUrl,
    })
    .from(schema.shots)
    .where(eq(schema.shots.id, shotId))
    .limit(1);

  if (!shot) {
    throw new Error("Shot not found.");
  }

  if (!shot.videoUrl) {
    throw new Error("Shot does not have a video asset.");
  }

  const duration =
    shot.duration ??
    (typeof shot.startTc === "number" && typeof shot.endTc === "number"
      ? Math.max(0, shot.endTc - shot.startTc)
      : null);

  if (duration === null) {
    throw new Error("Shot duration is required for object tracking.");
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "scenedeck-objects-"));
  const videoPath = path.join(tempDir, "input.mp4");

  try {
    const { buffer } = await fetchAssetBuffer(shot.videoUrl);
    await writeFile(videoPath, buffer);
    const tracks = await detectObjectsMultiFrame(videoPath, duration);
    await replaceShotObjects(shotId, tracks);
    return tracks;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
