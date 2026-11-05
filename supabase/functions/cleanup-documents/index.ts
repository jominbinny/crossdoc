
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "crossdoc-files";
const CLAIMED_CLEANUP_MINUTES = 10;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getSecretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (!raw) {
    throw new Error("Missing Supabase secret keys");
  }

  try {
    const parsed = JSON.parse(raw);
    const secret = Object.values(parsed).find(
      (value) => typeof value === "string" && value.startsWith("sb_secret_"),
    );

    if (secret) return secret as string;
  } catch {
    if (raw.startsWith("sb_secret_")) return raw;
  }

  throw new Error("No valid Supabase secret key found");
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");

  if (!url) throw new Error("Missing SUPABASE_URL");

  return createClient(url, getSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("CLEANUP_SECRET");
  const suppliedSecret = req.headers.get("x-cron-secret");

  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createAdminClient();

    const now = new Date();
    const nowIso = now.toISOString();

    const claimedCutoff = new Date(
      now.getTime() - CLAIMED_CLEANUP_MINUTES * 60 * 1000,
    ).toISOString();

    // Find expired documents and documents claimed over 10 minutes ago.
    const { data: documents, error: fetchError } = await supabase
      .from("documents")
      .select("id, storage_path, status")
      .in("status", ["uploading", "ready", "claimed"])
      .or(
        `expires_at.lte.${nowIso},and(status.eq.claimed,claimed_at.lte.${claimedCutoff})`,
      );

    if (fetchError) {
      throw fetchError;
    }

    let filesDeleted = 0;
    let documentsUpdated = 0;
    let failures = 0;

    for (const document of documents ?? []) {
      // Delete the corresponding Storage object first.
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([document.storage_path]);

      if (storageError) {
        console.error("Storage deletion failed:", document.id, storageError);
        failures++;
        continue;
      }

      const finalStatus =
        document.status === "claimed" ? "consumed" : "expired";

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          status: finalStatus,
          deleted_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", document.id)
        .eq("status", document.status);

      if (updateError) {
        console.error("Document update failed:", document.id, updateError);
        failures++;
        continue;
      }

      filesDeleted++;
      documentsUpdated++;
    }

    // Remove rate-limit records older than 48 hours.
    const rateLimitCutoff = new Date(
      now.getTime() - 48 * 60 * 60 * 1000,
    ).toISOString();

    const { error: rateLimitError } = await supabase
      .from("upload_rate_limits")
      .delete()
      .lt("window_start", rateLimitCutoff);

    if (rateLimitError) {
      console.error("Rate-limit cleanup failed:", rateLimitError);
      failures++;
    }

    return jsonResponse({
      success: failures === 0,
      documentsFound: documents?.length ?? 0,
      filesDeleted,
      documentsUpdated,
      failures,
      rateLimitCleanup: rateLimitError ? "failed" : "completed",
    });
  } catch (error) {
    console.error("Cleanup failed:", error);

    return jsonResponse({
      error: "Internal cleanup error",
    }, 500);
  }
});
