create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 1 and file_size <= 52428800),
  status text not null default 'uploading'
  check (status in (
    'uploading',
    'ready',
    'claimed',
    'consumed',
    'expired',
    'failed'
  )),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  consumed_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists documents_expiry_idx on public.documents (expires_at);

alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crossdoc-files',
  'crossdoc-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
