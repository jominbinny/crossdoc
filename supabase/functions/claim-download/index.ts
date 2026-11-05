import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getAllowedOrigin,
  isAllowedOrigin,
} from "../_shared/cors.ts";

const BUCKET = "crossdoc-files";
const DOWNLOAD_EXPIRY_SECONDS = 5 * 60;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_TOKEN_LENGTH = 512;

type Document = {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  status: string;
  expires_at: string;
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
  if (
    Array.isArray(parsed) &&
    typeof parsed[0] === "string" &&
    parsed[0].length > 0
  ) {
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

async function parseToken(request: Request): Promise<
  { token: string } | { error: string; status: number }
> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: "Request body is too large", status: 413 };
  }

  let body: unknown;
  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return { error: "Request body is too large", status: 413 };
    }
    body = JSON.parse(bodyText);
  } catch {
    return { error: "Request body must be valid JSON", status: 400 };
  }

  const token = body && typeof body === "object"
    ? (body as Record<string, unknown>).token
    : undefined;
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return { error: "token must be a non-empty string", status: 400 };
  }

  return { token };
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

  const parsedToken = await parseToken(request);
  if ("error" in parsedToken) {
    return jsonResponse(
      { error: parsedToken.error },
      parsedToken.status,
      origin,
    );
  }

  const admin = createAdminClient();
  const tokenHash = await sha256(parsedToken.token);
  const { data: document, error: documentError } = await admin
    .from("documents")
    .select(
      "id, storage_path, original_filename, mime_type, file_size, status, expires_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle<Document>();

  if (documentError) throw documentError;
  if (!document) {
    return jsonResponse({ error: "Document not found" }, 404, origin);
  }
  if (document.status !== "ready") {
    return jsonResponse({ error: "Document is not available" }, 409, origin);
  }
  if (Date.parse(document.expires_at) <= Date.now()) {
    return jsonResponse({ error: "Document has expired" }, 410, origin);
  }

  const nowIso = new Date().toISOString();
  const { data: claimedDocument, error: claimError } = await admin
    .from("documents")
    .update({
      status: "claimed",
      claimed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", document.id)
    .eq("status", "ready")
    .gt("expires_at", nowIso)
    .select(
      "id, storage_path, original_filename, mime_type, file_size, status, expires_at",
    )
    .maybeSingle<Document>();

  if (claimError) throw claimError;
  if (!claimedDocument) {
    return jsonResponse({ error: "Document is no longer available" }, 409, origin);
  }

  const { data: signedDownload, error: signedDownloadError } = await admin
    .storage
    .from(BUCKET)
    .createSignedUrl(claimedDocument.storage_path, DOWNLOAD_EXPIRY_SECONDS);

  if (signedDownloadError || !signedDownload) {
    console.error("Signed download creation failed", {
      documentId: claimedDocument.id,
      errorCode: signedDownloadError?.name ?? "missing_response",
    });
    return jsonResponse({ error: "Unable to authorize download" }, 500, origin);
  }

  return jsonResponse({
    filename: claimedDocument.original_filename,
    mimeType: claimedDocument.mime_type,
    fileSize: claimedDocument.file_size,
    signedDownloadUrl: signedDownload.signedUrl,
  }, 200, origin);
}

Deno.serve(async (request: Request) => {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error(
      "claim-download failed",
      error instanceof Error ? error.name : "unknown_error",
    );
    return jsonResponse(
      { error: "Unable to claim download" },
      500,
      getAllowedOrigin(request.headers.get("origin")),
    );
  }
});
