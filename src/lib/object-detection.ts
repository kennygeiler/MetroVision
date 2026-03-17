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
export const OBJECT_SAMPLE_INTERVAL_SECONDS = 1;
const MAX_OBJECT_SAMPLES = 8;
const MIN_OBJECT_SAMPLES = 3;
const MIN_TRACK_CONFIDENCE = 0.5;

export const OBJECT_DETECTION_PROMPT = `You are a professional computer vision system analyzing a sequence of video frames from a film. The frames are sampled at regular intervals from a single continuous shot.

FRAMES PROVIDED (in chronological order):
{list of frame timestamps}

For each significant visual element (person, vehicle, object, key environment feature), track it across ALL frames where it appears. Assign each unique object a consistent track_id (T1, T2, T3, etc.) that persists across frames.

RULES:
- The SAME person/object must have the SAME track_id in every frame
- Bounding boxes must be TIGHT around the object (not loose)
- Coordinates are normalized 0.0-1.0 relative to frame dimensions
- x = left edge, y = top edge, w = width, h = height
- Only detect objects that are cinematographically relevant (characters, key props, vehicles, environmental anchors)
- Maximum 8 tracked objects per shot
- Confidence reflects how certain you are this is a real, significant element (not noise)

Return ONLY valid JSON:
{
  "tracks": [
    {
      "track_id": "T1",
      "label": "man in dark suit",
      "category": "person",
      "confidence": 0.95,
      "attributes": {"clothing": "dark suit and fedora", "action": "walking"},
      "detections": [
        {"frame_index": 0, "bbox": [0.32, 0.15, 0.12, 0.65]},
        {"frame_index": 1, "bbox": [0.35, 0.15, 0.12, 0.65]},
        {"frame_index": 2, "bbox": [0.38, 0.16, 0.12, 0.64]}
      ]
    },
    {
      "track_id": "T2",
      "label": "black sedan",
      "category": "vehicle",
      "confidence": 0.90,
      "attributes": {"color": "black", "era": "1940s"},
      "detections": [
        {"frame_index": 0, "bbox": [0.55, 0.35, 0.30, 0.25]},
        {"frame_index": 1, "bbox": [0.55, 0.35, 0.30, 0.25]},
        {"frame_index": 2, "bbox": [0.55, 0.35, 0.30, 0.25]}
      ]
    }
  ]
}`;

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

type NormalizedBbox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type RawTrackDetection = {
  frame_index?: unknown;
  bbox?: unknown;
};

type RawTrack = {
  track_id?: unknown;
  label?: unknown;
  category?: unknown;
  confidence?: unknown;
  attributes?: unknown;
  detections?: unknown;
};

type RawTrackResponse = {
  tracks?: unknown;
};

type FrameImage = {
  frameIndex: number;
  timestamp: number;
  data: string;
  contentType: string;
};

export type DetectedObject = {
  label: string;
  category: DetectedCategory | null;
  confidence: number | null;
  bbox: NormalizedBbox;
  attributes: ShotObjectAttributes | null;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampUnitInterval(value: number) {
  return clamp(roundNumber(value), 0, 1);
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

  const [rawX, rawY, rawW, rawH] = value.map((entry) => Number(entry));
  if (![rawX, rawY, rawW, rawH].every(Number.isFinite)) {
    return null;
  }

  const x = clampUnitInterval(rawX);
  const y = clampUnitInterval(rawY);
  const w = clamp(roundNumber(rawW), 0, 1 - x);
  const h = clamp(roundNumber(rawH), 0, 1 - y);

  if (w <= 0 || h <= 0) {
    return null;
  }

  return { x, y, w, h };
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

function extractJsonObject(payload: string) {
  const trimmed = payload.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim()
    : trimmed;
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini object detection did not return a JSON object.");
  }

  return JSON.parse(unfenced.slice(start, end + 1)) as unknown;
}

function buildBatchPrompt(timestamps: number[]) {
  const frameList = timestamps
    .map((timestamp, index) => `- Frame ${index}: ${roundTime(timestamp)}s`)
    .join("\n");

  return OBJECT_DETECTION_PROMPT.replace("{list of frame timestamps}", frameList);
}

function normalizeFrameDetection(
  detection: RawTrackDetection,
  timestamps: number[],
) {
  const frameIndex =
    typeof detection.frame_index === "number" && Number.isInteger(detection.frame_index)
      ? detection.frame_index
      : Number.NaN;
  const bbox = normalizeBbox(detection.bbox);

  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= timestamps.length || !bbox) {
    return null;
  }

  return {
    frameIndex,
    keyframe: {
      t: roundTime(timestamps[frameIndex]),
      x: bbox.x,
      y: bbox.y,
      w: bbox.w,
      h: bbox.h,
    } satisfies ShotObjectKeyframe,
  };
}

function normalizeTrackResponse(payload: unknown, timestamps: number[]): ObjectTrack[] {
  const tracks = (payload as RawTrackResponse)?.tracks;
  if (!Array.isArray(tracks)) {
    throw new Error("Gemini object tracking payload must include a tracks array.");
  }

  const seenTrackIds = new Set<string>();
  const normalizedTracks: ObjectTrack[] = [];

  for (const [index, item] of tracks.entries()) {
    const track = item as RawTrack;
    const label = typeof track.label === "string" ? track.label.trim() : "";
    const confidence = normalizeConfidence(track.confidence);
    const category: ObjectTrack["category"] =
      typeof track.category === "string" &&
      ALLOWED_CATEGORIES.has(track.category as DetectedCategory)
        ? (track.category as DetectedCategory)
        : null;
    const trackIdCandidate =
      typeof track.track_id === "string" ? track.track_id.trim() : "";
    const trackId =
      trackIdCandidate && !seenTrackIds.has(trackIdCandidate)
        ? trackIdCandidate
        : `T${index + 1}`;
    seenTrackIds.add(trackId);

    const keyframes = Array.isArray(track.detections)
      ? track.detections
          .map((detection) => normalizeFrameDetection(detection as RawTrackDetection, timestamps))
          .filter((detection): detection is NonNullable<typeof detection> => detection !== null)
          .sort((left, right) => left.frameIndex - right.frameIndex)
          .filter(
            (detection, detectionIndex, detections) =>
              detectionIndex === 0 ||
              detection.frameIndex !== detections[detectionIndex - 1]?.frameIndex,
          )
          .map((detection) => detection.keyframe)
      : [];

    if (!label || confidence === null || confidence < MIN_TRACK_CONFIDENCE || keyframes.length < 2) {
      continue;
    }

    normalizedTracks.push({
      trackId,
      label,
      category,
      confidence,
      keyframes,
      startTime: keyframes[0]?.t ?? 0,
      endTime: keyframes.at(-1)?.t ?? keyframes[0]?.t ?? 0,
      attributes: normalizeAttributes(track.attributes),
    });
  }

  return normalizedTracks
    .sort(
      (left, right) =>
        left.startTime - right.startTime ||
        (right.confidence ?? 0) - (left.confidence ?? 0),
    )
    .slice(0, MAX_OBJECT_SAMPLES);
}

export function sampleObjectDetectionTimestamps(shotDuration: number) {
  const duration = Number.isFinite(shotDuration) ? Math.max(0, shotDuration) : 0;

  if (duration <= OBJECT_SAMPLE_INTERVAL_SECONDS * (MIN_OBJECT_SAMPLES - 1)) {
    const count = MIN_OBJECT_SAMPLES;
    const step = count > 1 ? duration / (count - 1) : 0;
    return Array.from({ length: count }, (_, index) => roundTime(step * index));
  }

  const timestamps: number[] = [];
  for (
    let current = 0;
    current <= duration && timestamps.length < MAX_OBJECT_SAMPLES;
    current += OBJECT_SAMPLE_INTERVAL_SECONDS
  ) {
    timestamps.push(roundTime(current));
  }

  if (timestamps.length < MIN_OBJECT_SAMPLES) {
    timestamps.push(roundTime(duration));
  }

  return timestamps.slice(0, MAX_OBJECT_SAMPLES);
}

async function runProcess(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(stderr.trim() || `${command} exited with code ${code ?? "unknown"}.`),
      );
    });
  });
}

async function extractFrameImage(
  videoPath: string,
  timestamp: number,
  frameIndex: number,
  outputDir: string,
) {
  const framePath = path.join(outputDir, `frame_${frameIndex}.jpg`);

  await runProcess("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    roundTime(timestamp).toFixed(3),
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-q:v",
    "2",
    framePath,
  ]);

  const buffer = await readFile(framePath);

  return {
    frameIndex,
    timestamp,
    data: buffer.toString("base64"),
    contentType: "image/jpeg",
  } satisfies FrameImage;
}

async function extractFrameImages(videoPath: string, timestamps: number[]) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "scenedeck-object-frames-"));

  try {
    const frames: FrameImage[] = [];

    for (const [frameIndex, timestamp] of timestamps.entries()) {
      frames.push(await extractFrameImage(videoPath, timestamp, frameIndex, tempDir));
    }

    return frames;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function requestTrackedObjects(frames: FrameImage[], apiKey?: string) {
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
              { text: buildBatchPrompt(frames.map((frame) => frame.timestamp)) },
              ...frames.flatMap((frame) => [
                {
                  text: `Frame ${frame.frameIndex} at ${roundTime(frame.timestamp)} seconds.`,
                },
                {
                  inline_data: {
                    mime_type: frame.contentType,
                    data: frame.data,
                  },
                },
              ]),
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

  return normalizeTrackResponse(
    extractJsonObject(text),
    frames.map((frame) => frame.timestamp),
  );
}

async function detectObjectsInFrame(
  imageBuffer: Buffer,
  timestamp: number,
  contentType = "image/jpeg",
  apiKey?: string,
) {
  const tracks = await requestTrackedObjects(
    [
      {
        frameIndex: 0,
        timestamp,
        data: imageBuffer.toString("base64"),
        contentType,
      },
      {
        frameIndex: 1,
        timestamp: roundTime(timestamp + 0.001),
        data: imageBuffer.toString("base64"),
        contentType,
      },
    ],
    apiKey,
  );

  return tracks.flatMap((track) => {
    const keyframe = track.keyframes[0];
    return keyframe
      ? [
          {
            label: track.label,
            category: track.category as DetectedCategory | null,
            confidence: track.confidence,
            bbox: {
              x: keyframe.x,
              y: keyframe.y,
              w: keyframe.w,
              h: keyframe.h,
            },
            attributes: track.attributes,
          } satisfies DetectedObject,
        ]
      : [];
  });
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
  const frames = await extractFrameImages(videoPath, timestamps);
  return requestTrackedObjects(frames);
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
