import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "~/env";
import { db } from "~/server/db";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
};

function config() {
  const {
    GOOGLE_DRIVE_CLIENT_ID: clientId,
    GOOGLE_DRIVE_CLIENT_SECRET: clientSecret,
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId,
    GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY: encryptionKey,
  } = env;
  if (!clientId || !clientSecret || !rootFolderId || !encryptionKey) {
    throw new Error(
      "Google Drive is not configured. An administrator must add the Google Drive environment variables.",
    );
  }
  const key = Buffer.from(encryptionKey, "base64");
  if (key.length !== 32)
    throw new Error(
      "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  return { clientId, clientSecret, rootFolderId, key };
}

function encrypt(value: string) {
  const { key } = config();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

function decrypt(value: string) {
  const { key } = config();
  const payload = Buffer.from(value, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    payload.subarray(0, 12),
  );
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([
    decipher.update(payload.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

export function googleDriveAuthorizationUrl(
  redirectUri: string,
  state: string,
) {
  const { clientId } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPE,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function saveAuthorizationCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = config();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = (await response.json()) as {
    refresh_token?: string;
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !token.refresh_token || !token.access_token)
    throw new Error(
      token.error_description ?? "Google did not return a refresh token.",
    );
  const user = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  const profile = (await user.json().catch(() => ({}))) as { email?: string };
  await db.googleDriveIntegration.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      encryptedRefreshToken: encrypt(token.refresh_token),
      accountEmail: profile.email,
    },
    update: {
      encryptedRefreshToken: encrypt(token.refresh_token),
      accountEmail: profile.email,
    },
  });
}

export async function getGoogleDriveStatus() {
  const configured = Boolean(
    env.GOOGLE_DRIVE_CLIENT_ID &&
      env.GOOGLE_DRIVE_CLIENT_SECRET &&
      env.GOOGLE_DRIVE_ROOT_FOLDER_ID &&
      env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY,
  );
  if (!configured)
    return { configured: false, connected: false, accountEmail: null };
  const integration = await db.googleDriveIntegration.findUnique({
    where: { id: 1 },
  });
  return {
    configured: true,
    connected: Boolean(integration),
    accountEmail: integration?.accountEmail ?? null,
  };
}

async function accessToken() {
  const { clientId, clientSecret } = config();
  const integration = await db.googleDriveIntegration.findUnique({
    where: { id: 1 },
  });
  if (!integration)
    throw new Error(
      "Google Drive has not been connected by an administrator yet.",
    );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decrypt(integration.encryptedRefreshToken),
      grant_type: "refresh_token",
    }),
  });
  const result = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !result.access_token)
    throw new Error(
      result.error_description ?? "Could not authorize Google Drive.",
    );
  return result.access_token;
}

async function driveFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new Error(`Google Drive request failed (${response.status}).`);
  return response;
}

export async function listDriveFolder(folderId?: string) {
  const { rootFolderId } = config();
  const parentId = folderId ?? rootFolderId;
  await assertWithinRoot(parentId);
  const query = new URLSearchParams({
    q: `'${parentId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,modifiedTime,size,parents)",
    orderBy: "folder,name",
  });
  const response = await driveFetch(`/files?${query}`);
  return ((await response.json()) as { files?: DriveItem[] }).files ?? [];
}

export async function createDriveFolder(name: string, parentId?: string) {
  const { rootFolderId } = config();
  const parent = parentId ?? rootFolderId;
  await assertWithinRoot(parent);
  const response = await driveFetch(
    "/files?fields=id,name,mimeType,modifiedTime,parents",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent],
      }),
    },
  );
  return (await response.json()) as DriveItem;
}

export async function renameDriveItem(id: string, name: string) {
  await assertWithinRoot(id);
  const response = await driveFetch(
    `/files/${encodeURIComponent(id)}?fields=id,name,mimeType,modifiedTime,size,parents`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  return (await response.json()) as DriveItem;
}

/** Moves an item to Google Drive trash; it remains recoverable by the owner. */
export async function trashDriveItem(id: string) {
  await assertWithinRoot(id);
  await driveFetch(`/files/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

export async function uploadDriveFile(file: File, parentId?: string) {
  const { rootFolderId } = config();
  const parent = parentId ?? rootFolderId;
  await assertWithinRoot(parent);
  const boundary = `resilience-${randomBytes(12).toString("hex")}`;
  const metadata = JSON.stringify({ name: file.name, parents: [parent] });
  const bytes = Buffer.from(await file.arrayBuffer());
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,parents",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!response.ok)
    throw new Error(`Google Drive upload failed (${response.status}).`);
  return (await response.json()) as DriveItem;
}

export async function downloadDriveFile(fileId: string) {
  await assertWithinRoot(fileId);
  return driveFetch(`/files/${encodeURIComponent(fileId)}?alt=media`);
}

async function assertWithinRoot(id: string) {
  const { rootFolderId } = config();
  let current: string | undefined = id;
  for (let depth = 0; current && depth < 32; depth++) {
    if (current === rootFolderId) return;
    const response = await driveFetch(
      `/files/${encodeURIComponent(current)}?fields=parents`,
    );
    const data = (await response.json()) as { parents?: string[] };
    current = data.parents?.[0];
  }
  throw new Error("That item is outside the configured documents folder.");
}
