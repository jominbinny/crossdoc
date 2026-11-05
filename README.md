# CrossDoc

A polished frontend prototype for temporary document sharing: upload a file, generate a one-time link, and download it on another device.

## Setup

```bash
pnpm install
pnpm dev
```

## Architecture

`app/page.tsx` contains the reusable layout, upload flow, success state, and recipient route handling. The frontend remains a prototype and has not yet been wired to the backend. The first backend seam is the `create-upload` Supabase Edge Function, which creates a temporary upload authorization without exposing privileged credentials.

## Mock behavior

- Links use a generated token and are marked clearly as prototype links.
- The selected `File` object stays in the current browser session only; another device cannot access it yet.
- The `/s/[token]` experience demonstrates a recipient flow with a locally generated demo PDF and one-time claimed state.
- No sensitive file or token data is written to `localStorage`.

## Supabase backend

Apply the schema and private Storage bucket before serving the function:

```bash
npx supabase db push
npx supabase functions serve create-upload --no-verify-jwt --env-file .env
```

Configure `SUPABASE_SECRET_KEYS` through Supabase-managed function secrets and set `CORS_ALLOWED_ORIGINS` to one or more comma-separated deployed frontend origins. `http://localhost:3000` and `http://127.0.0.1:3000` are always allowed for local development. The client-facing functions accept JSON POST bodies and return their existing one-time token or signed URL responses; they never expose privileged credentials.

Local smoke test:

```bash
curl -i http://127.0.0.1:54321/functions/v1/create-upload \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://127.0.0.1:3000' \
  --data '{"filename":"notes.pdf","mimeType":"application/pdf","fileSize":1024}'
```

Do not deploy until the migration has been applied, the local function serves successfully, and invalid MIME types, files over 50 MiB, duplicate `Idempotency-Key` requests, CORS failures, and rate limiting have been exercised.

## Functional checklist

Drag/drop, browse, validation, upload progress, link generation, clipboard copy, QR generation, reset, responsive navigation, smooth anchor navigation, one-time download simulation, and responsive states are implemented.
