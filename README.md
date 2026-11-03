# CrossDoc

A polished frontend prototype for temporary document sharing: upload a file, generate a one-time link, and download it on another device.

## Setup

```bash
pnpm install
pnpm dev
```

## Architecture

The current prototype is intentionally frontend-only. `app/page.tsx` contains the reusable layout, upload flow, success state, and recipient route handling. The upload UI validates supported file extensions and size, then simulates progress in memory. QR codes are generated with `qrcode.react` and downloads create a local browser Blob.

## Mock behavior

- Links use a generated token and are marked clearly as prototype links.
- The selected `File` object stays in the current browser session only; another device cannot access it yet.
- The `/s/[token]` experience demonstrates a recipient flow with a locally generated demo PDF and one-time claimed state.
- No sensitive file or token data is written to `localStorage`.

## Supabase integration seam

When the backend is added, extract the current actions into a `documentService` interface with `uploadDocument`, `getDocument`, `claimDownload`, `generateShareLink`, and `deleteDocument`. Replace the in-memory upload callback with a Supabase Storage upload, PostgreSQL metadata record, and Edge Function for atomic download claims and expiry cleanup. Keep the UI states (`ready`, `claimed`, `expired`, `invalid`) unchanged so the frontend does not need a major rewrite.

## Functional checklist

Drag/drop, browse, validation, upload progress, link generation, clipboard copy, QR generation, reset, responsive navigation, smooth anchor navigation, one-time download simulation, and responsive states are implemented.
