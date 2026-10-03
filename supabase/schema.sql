create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 160),
  body text not null check (char_length(body) <= 10000),
  month text not null,
  kind text not null check (kind in ('monthly', 'little')),
  created_at timestamptz not null default now()
);

alter table public.letters enable row level security;
-- The website accesses this table only through its server route, using the secret key.
-- No direct browser access is allowed.
