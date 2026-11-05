import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  corsHeaders,
  getAllowedOrigin,
  isAllowedOrigin,
} from "../_shared/cors.ts";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const BUCKET = "crossdoc-files";
// Supabase's signed upload token lifetime is currently fixed at two hours.
const UPLOAD_EXPIRY_SECONDS = 2 * 60 * 60;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getSecretKey(): string {
  const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!rawKeys) throw new Error("SUPABASE_SECRET_KEYS is not configured");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawKeys);
  } catch {
    parsed = rawKeys;
  }

  if (typeof parsed === "string" && parsed.length > 0) return parsed;
  if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].length > 0) {
    return parsed[0];
  }
  if (parsed && typeof parsed === "object") {
    const values = Object.values(parsed);
    const key = values.find((value): value is string =>
      typeof value === "string" && value.startsWith("sb_secret_")
    );
    if (key) return key;
  }

  throw new Error("SUPABASE_SECRET_KEYS does not contain a secret key");
}

function createAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return createClient(url, getSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function isValidFilename(filename: unknown): filename is string {
  return typeof filename === "string" &&
    filename.length > 0 &&
    filename.length <= 255 &&
    !/[\u0000-\u001f\u007f]/u.test(filename);
}

function isValidSize(size: unknown): size is number {
  return typeof size === "number" && Number.isSafeInteger(size) && size >= 1 && size <= MAX_FILE_SIZE;
}

function isValidMimeType(mimeType: unknown): mimeType is string {
  return typeof mimeType === "string" && ALLOWED_MIME_TYPES.has(mimeType);
}

function getWindowStart(): string {
  const now = Date.now();
  return new Date(Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
}

function getStoragePath(): string {
  return `uploads/${crypto.randomUUID()}/${randomToken(24)}`;
}

const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>();

async function reserveRateLimit(
  admin: SupabaseClient,
  ipHash: string,
): Promise<boolean> {
  const now = Date.now();
  const local = inMemoryRateLimit.get(ipHash);
  if (local && local.resetAt > now && local.count >= RATE_LIMIT) return false;
  if (!local || local.resetAt <= now) {
    inMemoryRateLimit.set(ipHash, { count: 0, resetAt: now + RATE_WINDOW_MS });
  }
  if (inMemoryRateLimit.size > 10_000) {
    for (const [key, value] of inMemoryRateLimit) {
      if (value.resetAt <= now) inMemoryRateLimit.delete(key);
    }
  }

  const { data, error } = await admin.rpc("reserve_upload_slot", {
    p_ip_hash: ipHash,
    p_window_start: getWindowStart(),
    p_limit: RATE_LIMIT,
  });
  if (error) throw error;

  const allowed = data === true;
  if (allowed) {
    const current = inMemoryRateLimit.get(ipHash);
    if (current) current.count += 1;
  }
  return allowed;
}

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      return jsonResponse({ error: "Origin is not allowed" }, 403, null);
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origin is not allowed" }, 403, null);
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16 * 1024) {
    return jsonResponse({ error: "Request body is too large" }, 413, origin);
  }

  let body: unknown;
  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > 16 * 1024) {
      return jsonResponse({ error: "Request body is too large" }, 413, origin);
    }
    body = JSON.parse(bodyText);
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400, origin);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Request body must be an object" }, 400, origin);
  }
  const { filename, mimeType, fileSize } = body as Record<string, unknown>;
  if (!isValidFilename(filename)) {
    return jsonResponse({ error: "filename must be a non-empty filename of 255 characters or fewer" }, 400, origin);
  }
  if (!isValidMimeType(mimeType)) {
    return jsonResponse({ error: "The supplied MIME type is not supported" }, 415, origin);
  }
  if (!isValidSize(fileSize)) {
    return jsonResponse({ error: "fileSize must be an integer from 1 through 52428800" }, 413, origin);
  }

  const admin = createAdminClient();
  const ipHash = await sha256(getClientIp(request));
  if (!(await reserveRateLimit(admin, ipHash))) {
    return jsonResponse({ error: "Too many upload requests; try again later" }, 429, origin);
  }

  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const storagePath = getStoragePath();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: document, error: insertError } = await admin
    .from("documents")
    .insert({
      token_hash: tokenHash,
      original_filename: filename,
      mime_type: mimeType,
      file_size: fileSize,
      storage_path: storagePath,
      status: "uploading",
      expires_at: expiresAt,
    })
    .select("id, storage_path, expires_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return jsonResponse({ error: "Duplicate upload request" }, 409, origin);
    }
    console.error("Document creation failed", insertError.code);
    return jsonResponse({ error: "Unable to create upload" }, 500, origin);
  }

  const { data: signedUpload, error: signedUploadError } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(document.storage_path, { upsert: false });

  if (signedUploadError || !signedUpload) {
    const { error: cleanupError } = await admin.from("documents").delete().eq("id", document.id);
    if (cleanupError) console.error("Document cleanup failed", cleanupError.code);
    console.error("Signed upload creation failed", signedUploadError?.message ?? "missing response");
    return jsonResponse({ error: "Unable to authorize upload" }, 502, origin);
  }

  return jsonResponse({
    token: rawToken,
    document: {
      id: document.id,
      filename,
      mimeType,
      fileSize,
      expiresAt: document.expires_at,
    },
    uploadAuthorization: {
      bucket: BUCKET,
      path: document.storage_path,
      token: signedUpload.token,
      signedUrl: signedUpload.signedUrl,
      expiresIn: UPLOAD_EXPIRY_SECONDS,
    },
  }, 201, origin);
}

Deno.serve(async (request: Request) => {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error("create-upload failed", error instanceof Error ? error.message : "unknown error");
    return jsonResponse(
      { error: "Unable to create upload" },
      500,
      getAllowedOrigin(request.headers.get("origin")),
    );
  }
});
