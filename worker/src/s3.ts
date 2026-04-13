import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION ?? "us-east-2";
const BUCKET = process.env.AWS_S3_BUCKET ?? "";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return _client;
}

export function getBucket(): string {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET is not set.");
  return BUCKET;
}

export async function uploadToS3(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  await getClient().send(new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType }));
  return key;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: getBucket(), Key: key }), { expiresIn });
}

/** Stream a bucket object to disk (for large sources; avoids ffmpeg-over-HTTPS remux). */
export async function downloadBucketObjectToFile(key: string, destPath: string): Promise<void> {
  const out = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  const body = out.Body;
  if (!body) {
    throw new Error("S3 GetObject returned an empty body.");
  }
  await pipeline(body as NodeJS.ReadableStream, createWriteStream(destPath));
}

export function buildS3Key(filmSlug: string, type: "source" | "clips" | "thumbnails", filename: string): string {
  return `films/${filmSlug}/${type}/${filename}`;
}
