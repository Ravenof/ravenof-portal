-- ════════════════════════════════════════════════════════════════════════════
--  BOTAI ATRODO KAIP ŽAIDĖJAI (2026-09-20, playtest)
--  ─────────────────────────────────────────────────────────────────────────
--   1) Avatarai: vietoj emoji – TIKRI avatarų kosmetikos paveikslėliai
--      (cosmetics.kind in ('avatar','player_avatar') su image_url), priskirti
--      deterministiškai pagal rango eilę. Nėra kosmetikos su artu → emoji lieka.
--   2) Sunkumas pagal rangą: viršutinė pusė (top 10 iš 20) – hard,
--      kitas ketvirtis (5) – normal, žemiausias ketvirtis (5) – easy.
--   3) rvn_pick_friendly_bot() – botas draugiškai kovai (be ranked profilio).
--  Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Avatarai ─────────────────────────────────────────────────────────────
with av as (
  select image_url,
         (row_number() over (order by id)) - 1 as i,
         count(*) over () as n
    from public.cosmetics
   where kind in ('avatar', 'player_avatar')
     and coalesce(is_active, true)
     and image_url is not null and image_url <> ''
), b as (
  select slug, (row_number() over (order by rank_step desc, slug)) - 1 as j
    from public.ranked_bots
   where active
)
update public.ranked_bots rb
   set avatar = av.image_url
  from b join av on av.i = (b.j % av.n)
 where rb.slug = b.slug;

-- ── 2) Sunkumas pagal rangą ─────────────────────────────────────────────────
--  Aukščiausias rangas = didžiausias rank_step (stepFromRank: (50-n)*3+tier).
with b as (
  select slug,
         row_number() over (order by rank_step desc, slug) as r,
         count(*) over () as n
    from public.ranked_bots
   where active
)
update public.ranked_bots rb
   set difficulty = case
         when b.r <= ceil(b.n / 2.0)      then 'hard'     -- top 10 iš 20
         when b.r <= ceil(b.n * 3 / 4.0)  then 'normal'   -- viduriniai 5
         else 'easy'                                       -- žemiausi 5
       end
  from b
 where rb.slug = b.slug;

-- ── 3) Botas draugiškai kovai ───────────────────────────────────────────────
--  Skirtingai nuo rvn_pick_bot: nereikalauja ranked profilio ir nesirenka
--  pagal rangą – draugiška kova neturi reitingo, tad varžovas atsitiktinis.
create or replace function public.rvn_pick_friendly_bot()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_bot public.ranked_bots;
begin
  select * into v_bot from public.ranked_bots where active order by random() limit 1;
  if v_bot.slug is null then return null; end if;
  return jsonb_build_object(
    'slug', v_bot.slug, 'name', v_bot.name, 'avatar', v_bot.avatar,
    'faction', v_bot.faction, 'faction_slug', v_bot.faction_slug,
    'rank_step', v_bot.rank_step, 'difficulty', v_bot.difficulty
  );
end $$;

grant execute on function public.rvn_pick_friendly_bot() to authenticated;
