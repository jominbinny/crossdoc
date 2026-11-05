import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getAllowedOrigin,
  isAllowedOrigin,
} from "../_shared/cors.ts";

const BUCKET = "crossdoc-files";
const MAX_BODY_BYTES = 16 * 1024;
const MAX_TOKEN_LENGTH = 512;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

type Document = {
  id: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  status: string;
  expires_at: string;
};

type StorageFile = {
  name: string;
  metadata?: {
    size?: number | string;
    mimetype?: string;
  } | null;
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
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
    const key = Object.values(parsed).find(
      (value): value is string =>
        typeof value === "string" && value.startsWith("sb_secret_"),
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
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function getStorageLocation(path: string): { directory: string; name: string } | null {
  const separator = path.lastIndexOf("/");
  if (separator <= 0 || separator === path.length - 1) return null;
  return {
    directory: path.slice(0, separator),
    name: path.slice(separator + 1),
  };
}

async function getStorageFile(
  admin: SupabaseClient,
  storagePath: string,
): Promise<StorageFile | null> {
  const location = getStorageLocation(storagePath);
  if (!location) return null;

  const { data, error } = await admin.storage.from(BUCKET).list(location.directory, {
    limit: 100,
    search: location.name,
  });
  if (error) throw error;

  const files = (data ?? []) as StorageFile[];
  return files.find((file) => file.name === location.name) ?? null;
}

function getActualSize(file: StorageFile): number | null {
  const value = file.metadata?.size;
  const size = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(size) ? size : null;
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
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request body is too large" }, 413, origin);
  }

  let body: unknown;
  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request body is too large" }, 413, origin);
    }
    body = JSON.parse(bodyText);
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400, origin);
  }

  const token = body && typeof body === "object"
    ? (body as Record<string, unknown>).token
    : undefined;
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return jsonResponse({ error: "token must be a non-empty string" }, 400, origin);
  }

  const admin = createAdminClient();
  const tokenHash = await sha256(token);
  const { data: document, error: documentError } = await admin
    .from("documents")
    .select("id, storage_path, mime_type, file_size, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<Document>();

  if (documentError) throw documentError;
  if (!document) {
    return jsonResponse({ error: "Upload not found" }, 404, origin);
  }
  if (document.status !== "uploading") {
    return jsonResponse({ error: "Upload has already been finalized" }, 409, origin);
  }
  if (Date.parse(document.expires_at) <= Date.now()) {
    return jsonResponse({ error: "Upload has expired" }, 410, origin);
  }

  const storageFile = await getStorageFile(admin, document.storage_path);
  const actualSize = storageFile ? getActualSize(storageFile) : null;
  const actualMimeType = storageFile?.metadata?.mimetype;
  if (
    !storageFile ||
    actualSize === null ||
    actualSize <= 0 ||
    actualSize > MAX_FILE_SIZE ||
    actualSize !== document.file_size ||
    actualMimeType !== document.mime_type
  ) {
    return jsonResponse({ error: "Uploaded file is not ready" }, 409, origin);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const { data: finalizedDocument, error: updateError } = await admin
    .from("documents")
    .update({
      status: "ready",
      updated_at: nowIso,
    })
    .eq("id", document.id)
    .eq("status", "uploading")
    .gt("expires_at", nowIso)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;
  if (!finalizedDocument) {
    const { data: currentDocument, error: currentDocumentError } = await admin
      .from("documents")
      .select("status, expires_at")
      .eq("id", document.id)
      .maybeSingle<{ status: string; expires_at: string }>();

    if (currentDocumentError) throw currentDocumentError;
    if (
      currentDocument?.status === "uploading" &&
      Date.parse(currentDocument.expires_at) <= now.getTime()
    ) {
      return jsonResponse({ error: "Upload has expired" }, 410, origin);
    }
    return jsonResponse({ error: "Upload has already been finalized" }, 409, origin);
  }

  return jsonResponse({ status: "ready" }, 200, origin);
}

Deno.serve(async (request: Request) => {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error(
      "finalize-upload failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return jsonResponse(
      { error: "Unable to finalize upload" },
      500,
      getAllowedOrigin(request.headers.get("origin")),
    );
  }
});