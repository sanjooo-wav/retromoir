create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 160),
  body text not null check (char_length(body) <= 10000),
  month text not null,
  kind text not null check (kind in ('monthly', 'little')),
  attachment_url text,
  author text not null default 'sander' check (author in ('sander', 'cristine')),
  theme text not null default 'apricot' check (theme in ('apricot', 'rose', 'midnight', 'meadow')),
  paper_style text not null default 'lined' check (paper_style in ('lined', 'plain')),
  sign_off text check (char_length(sign_off) <= 100),
  created_at timestamptz not null default now()
);

alter table public.letters add column if not exists attachment_url text;
alter table public.letters add column if not exists author text not null default 'sander' check (author in ('sander', 'cristine'));
alter table public.letters add column if not exists theme text not null default 'apricot' check (theme in ('apricot', 'rose', 'midnight', 'meadow'));
alter table public.letters add column if not exists paper_style text not null default 'lined' check (paper_style in ('lined', 'plain'));
alter table public.letters add column if not exists sign_off text check (char_length(sign_off) <= 100);
update public.letters set author = 'sander' where author is null;
alter table public.letters enable row level security;

-- The website accesses this table only through its server route, using the secret key.
-- No direct browser access is allowed.



