alter table public.documents
  add column if not exists share_slug text;

alter table public.documents
  add constraint documents_share_slug_format
  check (
    share_slug is null or
    share_slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])$'
  );

create unique index if not exists documents_share_slug_idx
  on public.documents (share_slug)
  where share_slug is not null;
