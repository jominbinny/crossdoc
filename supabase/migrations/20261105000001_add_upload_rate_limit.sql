create table if not exists public.upload_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0
    check (request_count >= 0 and request_count <= 10),
  primary key (ip_hash, window_start)
);

alter table public.upload_rate_limits enable row level security;
revoke all on public.upload_rate_limits from anon, authenticated;

create or replace function public.reserve_upload_slot(
  p_ip_hash text,
  p_window_start timestamptz,
  p_limit integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if p_limit is distinct from 10
   or p_ip_hash is null
   or p_ip_hash = ''
   or p_window_start is null then
    return false;
  end if;

  insert into public.upload_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, p_window_start, 1)
  on conflict (ip_hash, window_start) do update
    set request_count = upload_rate_limits.request_count + 1
    where upload_rate_limits.request_count < 10
  returning request_count into inserted_count;

  return inserted_count is not null;
end;
$$;

revoke all on function public.reserve_upload_slot(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.reserve_upload_slot(text, timestamptz, integer) to service_role;
