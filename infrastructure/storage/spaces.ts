import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv, isSpacesConfigured } from "@/shared/env";
import { externalServiceError } from "@/shared/errors";
import { logger } from "@/shared/logger";

let s3: S3Client | null = null;

export function getSpacesClient(): S3Client {
  if (!isSpacesConfigured()) {
    throw externalServiceError("DigitalOcean Spaces is not configured");
  }

  if (s3) return s3;

  const env = getEnv();
  s3 = new S3Client({
    region: env.DO_SPACES_REGION,
    endpoint: env.DO_SPACES_ENDPOINT,
    forcePathStyle: false,
    credentials: {
      accessKeyId: env.DO_SPACES_KEY,
      secretAccessKey: env.DO_SPACES_SECRET,
    },
  });

  return s3;
}

export function getSpacesBucket(): string {
  return getEnv().DO_SPACES_BUCKET;
}

export function buildObjectKey(params: {
  workspaceId: string;
  fileId: string;
  filename: string;
}): string {
  const safe = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `workspaces/${params.workspaceId}/${params.fileId}/${safe}`;
}

export async function createPresignedUploadUrl(params: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  try {
    const client = getSpacesClient();
    const command = new PutObjectCommand({
      Bucket: getSpacesBucket(),
      Key: params.objectKey,
      ContentType: params.contentType,
    });
    return await getSignedUrl(client, command, {
      expiresIn: params.expiresInSeconds ?? 900,
    });
  } catch (error) {
    logger.error("spaces_presign_upload_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw externalServiceError("Unable to create upload URL");
  }
}

export async function createPresignedDownloadUrl(params: {
  objectKey: string;
  expiresInSeconds?: number;
}): Promise<string> {
  try {
    const client = getSpacesClient();
    const command = new GetObjectCommand({
      Bucket: getSpacesBucket(),
      Key: params.objectKey,
    });
    return await getSignedUrl(client, command, {
      expiresIn: params.expiresInSeconds ?? 900,
    });
  } catch (error) {
    logger.error("spaces_presign_download_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw externalServiceError("Unable to create download URL");
  }
}

export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    const client = getSpacesClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: getSpacesBucket(),
        Key: objectKey,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  const client = getSpacesClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getSpacesBucket(),
      Key: objectKey,
    })
  );
}

export async function pingSpaces(): Promise<boolean> {
  if (!isSpacesConfigured()) return false;
  try {
    const client = getSpacesClient();
    await client.send(new HeadBucketCommand({ Bucket: getSpacesBucket() }));
    return true;
  } catch {
    return false;
  }
}
