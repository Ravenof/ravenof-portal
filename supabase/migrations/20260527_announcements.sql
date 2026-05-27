-- ═══════════════════════════════════════════════════════════
-- Announcements / News system
-- ═══════════════════════════════════════════════════════════

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  body         text,                     -- full markdown/text body
  summary      text,                     -- short teaser shown on homepage
  type         text not null default 'news',   -- 'news' | 'update' | 'event' | 'warning'
  pinned       boolean not null default false,
  published_at timestamptz,             -- null = draft; set to publish
  expires_at   timestamptz,             -- optional: auto-hide after this date
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Only admins can write; everyone can read published
alter table public.announcements enable row level security;

create policy "Public can view published announcements"
  on public.announcements for select
  using (published_at is not null and published_at <= now()
         and (expires_at is null or expires_at > now()));

create policy "Admins can do everything on announcements"
  on public.announcements for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Index for homepage query
create index if not exists announcements_homepage_idx
  on public.announcements (pinned desc, published_at desc)
  where published_at is not null;
