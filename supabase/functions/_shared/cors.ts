const LOCALHOST_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function getAllowedOrigins(): Set<string> {
  const configuredOrigins = Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "";
  return new Set(
    [...LOCALHOST_ORIGINS, ...configuredOrigins.split(",")]
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isAllowedOrigin(origin: string | null): boolean {
  return origin === null || getAllowedOrigins().has(origin);
}

export function getAllowedOrigin(origin: string | null): string | null {
  return origin !== null && getAllowedOrigins().has(origin) ? origin : null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  const allowedOrigin = getAllowedOrigin(origin);
  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin;

  return headers;
}
