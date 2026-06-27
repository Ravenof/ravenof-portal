-- ════════════════════════════════════════════════════════════════════════════
-- Campaign Mode — admin-only CANON / SOURCE fields on nodes.
-- Ties each mission to the Varngradas novel / Atlas timeline so content stays
-- canon-accurate. Admin-only (not shown to players). Additive, idempotent.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.campaign_nodes
  add column if not exists source_chapter   text,                       -- e.g. 'VIII', 'Prologas'
  add column if not exists source_event_ids text[]  not null default '{}', -- Atlas event ids, e.g. {E08-01,E08-02}
  add column if not exists canon_summary    text,                       -- short canon recap (admin note)
  add column if not exists canon_characters text[]  not null default '{}',
  add column if not exists canon_locations  text[]  not null default '{}';

-- Optional reusable seed key so the Seed/Rebuild tool can find rows it owns
-- without depending on slug/title (safe-merge). Stored in existing metadata jsonb
-- on campaigns/cutscenes; nodes get a dedicated indexed column for fast lookup.
alter table public.campaign_nodes
  add column if not exists seed_key text;
create index if not exists idx_campaign_nodes_seed_key on public.campaign_nodes(seed_key);

alter table public.campaign_cutscenes
  add column if not exists seed_key text;
create index if not exists idx_campaign_cutscenes_seed_key on public.campaign_cutscenes(seed_key);

alter table public.campaign_chapters
  add column if not exists seed_key text;

-- campaigns already have metadata jsonb; seedKey lives there.
