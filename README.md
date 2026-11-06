# CrossDoc

CrossDoc is a temporary document-sharing service for moving files between devices without requiring user accounts. Upload a supported document, share the generated link or QR code, and download it from another device.

## Overview

CrossDoc is designed around a simple, short-lived transfer workflow:

1. Select a document from a device.
2. Generate a temporary share link.
3. Open the link on another device and claim the download.

Share links are intended for one successful download claim and expire automatically. Files are stored privately, and downloads are delivered through time-limited signed URLs.

## Core capabilities

- Account-free document sharing
- Support for PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, and JPEG files
- Drag-and-drop and device file selection
- Temporary share links with expiry
- QR codes for cross-device transfers
- One-time download claims
- Private Supabase Storage-backed file handling
- Automated cleanup of expired and claimed files
- Responsive interface for mobile and desktop
- Privacy Policy and Terms of Service pages

## Technology

CrossDoc is built with:

- Next.js and React
- TypeScript
- Tailwind CSS
- Supabase Database, Storage, and Edge Functions
- Framer Motion
- Lucide React

The Next.js App Router contains the public homepage, legal pages, and recipient download route. Supabase Edge Functions provide the upload authorization, upload finalization, download claim, and cleanup services.

## Project focus

CrossDoc prioritizes fast transfers, minimal friction, temporary storage, and privacy-conscious defaults. It does not require accounts, make uploaded files publicly browsable, or claim end-to-end encryption or absolute security.
