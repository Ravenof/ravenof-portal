-- ══════════════════════════════════════════════════════════════════════════════
-- Fazė 4 (i18n) — DB TURINIO VERTIMAI
--
-- Viena generinė lentelė visiems turinio tipams: (owner_type, owner_id, locale,
-- field) -> value. LT lieka šaltiniu pačiose lentelėse (fallback), čia laikomi
-- LT snapshot'ai (admin redagavimui) ir EN vertimai.
--
-- Kliento resolveris: src/lib/i18n/content.ts  → tc(ownerType, ownerId, field, fallback)
-- owner_type reikšmės: daily_quest | daily_task | shop_item | cosmetic |
--                      ranked_achievement | faction | rarity | card_type |
--                      card_pack | starter_deck | lore_faction
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.content_translations (
  owner_type  text not null,
  owner_id    text not null,
  locale      text not null check (locale in ('lt','en')),
  field       text not null,
  value       text not null,
  updated_at  timestamptz not null default now(),
  primary key (owner_type, owner_id, locale, field)
);

create index if not exists ct_locale_idx on public.content_translations (locale);
create index if not exists ct_owner_idx  on public.content_translations (owner_type, owner_id);

alter table public.content_translations enable row level security;
drop policy if exists ct_read on public.content_translations;
create policy ct_read on public.content_translations for select using (true);
drop policy if exists ct_admin on public.content_translations;
create policy ct_admin on public.content_translations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── Pagalbinė: įrašo vertimą (idempotentiška) ────────────────────────────────
create or replace function public.rvn_set_translation(
  p_owner_type text, p_owner_id text, p_locale text, p_field text, p_value text
) returns void language sql as $$
  insert into public.content_translations (owner_type, owner_id, locale, field, value)
  values (p_owner_type, p_owner_id, p_locale, p_field, p_value)
  on conflict (owner_type, owner_id, locale, field)
  do update set value = excluded.value, updated_at = now();
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- LT SNAPSHOT'AI (iš esamų lentelių; LT vis tiek lieka fallback'as)
-- ══════════════════════════════════════════════════════════════════════════════
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'daily_quest', quest_key, 'lt', 'title', title from public.daily_quest_defs
union all select 'daily_quest', quest_key, 'lt', 'description', description from public.daily_quest_defs
union all select 'daily_task', id::text, 'lt', 'title', title from public.daily_task_templates
union all select 'daily_task', id::text, 'lt', 'description', description from public.daily_task_templates
union all select 'shop_item', slug, 'lt', 'name', name from public.shop_items
union all select 'shop_item', slug, 'lt', 'description', description from public.shop_items where description is not null
union all select 'cosmetic', id, 'lt', 'name', name from public.cosmetics
union all select 'cosmetic', id, 'lt', 'description', description from public.cosmetics where description is not null
union all select 'ranked_achievement', achievement_key, 'lt', 'name', name from public.ranked_achievements
union all select 'ranked_achievement', achievement_key, 'lt', 'description', description from public.ranked_achievements where description is not null
union all select 'faction', id::text, 'lt', 'name', name from public.factions
union all select 'rarity', id::text, 'lt', 'name', name from public.rarities
union all select 'card_type', id::text, 'lt', 'name', name from public.card_types
union all select 'card_pack', id::text, 'lt', 'name', name from public.card_packs
union all select 'card_pack', id::text, 'lt', 'description', description from public.card_packs where description is not null
union all select 'starter_deck', id::text, 'lt', 'name', name from public.starter_decks
union all select 'starter_deck', id::text, 'lt', 'description', description from public.starter_decks where description is not null
on conflict (owner_type, owner_id, locale, field) do nothing;

-- ══════════════════════════════════════════════════════════════════════════════
-- EN VERTIMAI
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Dienos užduotys (daily_quest_defs.key) ──────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('daily_quest','win1','en','title','First Win'),              ('daily_quest','win1','en','description','Win 1 battle'),
  ('daily_quest','win3','en','title','Winning Streak'),         ('daily_quest','win3','en','description','Win 3 battles'),
  ('daily_quest','win5','en','title','Unbeatable'),             ('daily_quest','win5','en','description','Win 5 battles'),
  ('daily_quest','play3','en','title','Warm-Up'),               ('daily_quest','play3','en','description','Play 3 battles'),
  ('daily_quest','play5','en','title','Endurance'),             ('daily_quest','play5','en','description','Play 5 battles'),
  ('daily_quest','pve_win3','en','title','Bot Cleaner'),        ('daily_quest','pve_win3','en','description','Win 3 battles against AI'),
  ('daily_quest','pvp_win2','en','title','Arena Fighter'),      ('daily_quest','pvp_win2','en','description','Win 2 PvP battles'),
  ('daily_quest','open_pack1','en','title','Collector'),        ('daily_quest','open_pack1','en','description','Open 1 pack')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Dienos darbai (daily_task_templates — uuid id, siejam per LT title) ─────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'daily_task', t.id::text, 'en', 'title', x.en_title
from public.daily_task_templates t
join (values
  ('Sužaisk kovą','Play a Battle','Play 1 battle'),
  ('Du žingsniai','Two Steps','Play 2 battles'),
  ('Boto pergalė','Bot Victory','Win 1 battle against a bot'),
  ('Trys kovos','Three Battles','Play 3 battles'),
  ('Dvi pergalės','Two Victories','Win 2 battles'),
  ('Nereitinguota pergalė','Unranked Victory','Win 1 unranked battle'),
  ('Penkios kovos','Five Battles','Play 5 battles'),
  ('Trys pergalės','Three Victories','Win 3 battles'),
  ('Reitinguota pergalė','Ranked Victory','Win 1 ranked battle')
) as x(lt_title, en_title, en_desc) on x.lt_title = t.title
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'daily_task', t.id::text, 'en', 'description', x.en_desc
from public.daily_task_templates t
join (values
  ('Sužaisk kovą','Play a Battle','Play 1 battle'),
  ('Du žingsniai','Two Steps','Play 2 battles'),
  ('Boto pergalė','Bot Victory','Win 1 battle against a bot'),
  ('Trys kovos','Three Battles','Play 3 battles'),
  ('Dvi pergalės','Two Victories','Win 2 battles'),
  ('Nereitinguota pergalė','Unranked Victory','Win 1 unranked battle'),
  ('Penkios kovos','Five Battles','Play 5 battles'),
  ('Trys pergalės','Three Victories','Win 3 battles'),
  ('Reitinguota pergalė','Ranked Victory','Win 1 ranked battle')
) as x(lt_title, en_title, en_desc) on x.lt_title = t.title
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Parduotuvės prekės (shop_items.slug) ────────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('shop_item','standard_pack','en','name','Standard Pack'),                ('shop_item','standard_pack','en','description','10 cards'),
  ('shop_item','standard_pack_10','en','name','10x Standard'),              ('shop_item','standard_pack_10','en','description','10 standard packs'),
  ('shop_item','rare_pack','en','name','Rare+ Pack'),                       ('shop_item','rare_pack','en','description','Guaranteed rare or better'),
  ('shop_item','champion_pack','en','name','Champion Pack'),                ('shop_item','champion_pack','en','description','Guaranteed champion'),
  ('shop_item','faction_pack','en','name','Faction Pack'),                  ('shop_item','faction_pack','en','description','10 faction cards'),
  ('shop_item','basic_card_back','en','name','Basic Card Back'),
  ('shop_item','rare_card_back','en','name','Rare Card Back'),
  ('shop_item','premium_card_back','en','name','Premium Card Back'),
  ('shop_item','legendary_card_back','en','name','Legendary Card Back'),
  ('shop_item','basic_player_avatar','en','name','Basic Avatar'),
  ('shop_item','rare_player_avatar','en','name','Rare Avatar'),
  ('shop_item','premium_player_avatar','en','name','Premium Avatar'),
  ('shop_item','legendary_player_avatar','en','name','Legendary Avatar'),
  ('shop_item','cb_crimson_crown','en','name','Crimson Crown'),             ('shop_item','cb_crimson_crown','en','description','An exclusive card back'),
  ('shop_item','cb_ruby_inferno','en','name','Ruby Inferno'),               ('shop_item','cb_ruby_inferno','en','description','An exclusive card back'),
  ('shop_item','av_ruby_raven','en','name','Ruby Raven'),                   ('shop_item','av_ruby_raven','en','description','An exclusive avatar'),
  ('shop_item','rubies_500','en','name','500 Rubies'),
  ('shop_item','rubies_1100','en','name','1100 Rubies'),
  ('shop_item','rubies_2400','en','name','2400 Rubies'),
  ('shop_item','rubies_5000','en','name','5000 Rubies')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Kosmetika (cosmetics.id) ────────────────────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','cb_ember','en','name','Ember Back'),               ('cosmetic','cb_ember','en','description','A fiery card back'),
  ('cosmetic','cb_frost','en','name','Frost Back'),               ('cosmetic','cb_frost','en','description','An icy blue card back'),
  ('cosmetic','cb_void','en','name','Void Back'),                 ('cosmetic','cb_void','en','description','A dark violet card back'),
  ('cosmetic','cb_gold','en','name','Golden Back'),               ('cosmetic','cb_gold','en','description','A luxurious golden card back'),
  ('cosmetic','cb_crimson_crown','en','name','Crimson Crown'),    ('cosmetic','cb_crimson_crown','en','description','An exclusive card back — rubies only'),
  ('cosmetic','cb_ruby_inferno','en','name','Ruby Inferno'),      ('cosmetic','cb_ruby_inferno','en','description','An exclusive card back — rubies only'),
  ('cosmetic','basic_card_back','en','name','Basic Card Back'),   ('cosmetic','basic_card_back','en','description','A simple card back'),
  ('cosmetic','rare_card_back','en','name','Rare Card Back'),     ('cosmetic','rare_card_back','en','description','A rare card back'),
  ('cosmetic','premium_card_back','en','name','Premium Card Back'),('cosmetic','premium_card_back','en','description','A premium card back'),
  ('cosmetic','legendary_card_back','en','name','Legendary Card Back'),('cosmetic','legendary_card_back','en','description','A legendary card back'),
  ('cosmetic','av_raven','en','name','Raven'),                    ('cosmetic','av_raven','en','description','Raven avatar'),
  ('cosmetic','av_dragon','en','name','Dragon'),                  ('cosmetic','av_dragon','en','description','Dragon avatar'),
  ('cosmetic','av_skull','en','name','Skull'),                    ('cosmetic','av_skull','en','description','Skull avatar'),
  ('cosmetic','av_crown','en','name','Crown'),                    ('cosmetic','av_crown','en','description','Crown avatar'),
  ('cosmetic','av_ruby_raven','en','name','Ruby Raven'),          ('cosmetic','av_ruby_raven','en','description','An exclusive avatar — rubies only'),
  ('cosmetic','av_nekronautas','en','name','Necronaut'),          ('cosmetic','av_nekronautas','en','description','The default bone lord avatar.'),
  ('cosmetic','av_inkvizitorius','en','name','Inquisitor'),       ('cosmetic','av_inkvizitorius','en','description','Judge of the Legion of Light.'),
  ('cosmetic','basic_player_avatar','en','name','Basic Avatar'),  ('cosmetic','basic_player_avatar','en','description','A simple player avatar'),
  ('cosmetic','rare_player_avatar','en','name','Rare Avatar'),    ('cosmetic','rare_player_avatar','en','description','A rare player avatar'),
  ('cosmetic','premium_player_avatar','en','name','Premium Avatar'),('cosmetic','premium_player_avatar','en','description','A premium player avatar'),
  ('cosmetic','legendary_player_avatar','en','name','Legendary Avatar'),('cosmetic','legendary_player_avatar','en','description','A legendary player avatar'),
  ('cosmetic','bd_arena','en','name','Arena Board'),              ('cosmetic','bd_arena','en','description','A classic arena'),
  ('cosmetic','bd_forest','en','name','Forest Board'),            ('cosmetic','bd_forest','en','description','A green battlefield'),
  ('cosmetic','bd_inferno','en','name','Inferno Board'),          ('cosmetic','bd_inferno','en','description','A field of fire and ash')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Reitingo pasiekimai (ranked_achievements.achievement_key) ───────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('ranked_achievement','first_win','en','name','First Ranked Win'),           ('ranked_achievement','first_win','en','description','Win 1 ranked battle'),
  ('ranked_achievement','wins_5','en','name','Five Wins'),                     ('ranked_achievement','wins_5','en','description','Win 5 ranked battles'),
  ('ranked_achievement','wins_10','en','name','Ten Wins'),                     ('ranked_achievement','wins_10','en','description','Win 10 ranked battles'),
  ('ranked_achievement','wins_25','en','name','Twenty-Five Wins'),             ('ranked_achievement','wins_25','en','description','Win 25 ranked battles'),
  ('ranked_achievement','wins_50','en','name','Fifty Wins'),                   ('ranked_achievement','wins_50','en','description','Win 50 ranked battles'),
  ('ranked_achievement','wins_100','en','name','One Hundred Wins'),            ('ranked_achievement','wins_100','en','description','Win 100 ranked battles'),
  ('ranked_achievement','streak_3','en','name','Win Streak I'),                ('ranked_achievement','streak_3','en','description','Win 3 ranked battles in a row'),
  ('ranked_achievement','streak_5','en','name','Win Streak II'),               ('ranked_achievement','streak_5','en','description','Win 5 ranked battles in a row'),
  ('ranked_achievement','beat_higher','en','name','Giant Slayer'),             ('ranked_achievement','beat_higher','en','description','Defeat a higher-ranked opponent'),
  ('ranked_achievement','comeback','en','name','Comeback from the Abyss'),     ('ranked_achievement','comeback','en','description','Win after dropping below 10 HP'),
  ('ranked_achievement','flawless','en','name','Flawless Control'),            ('ranked_achievement','flawless','en','description','Win with 20+ HP remaining'),
  ('ranked_achievement','bot_hunter','en','name','Bot Hunter'),                ('ranked_achievement','bot_hunter','en','description','Defeat 10 bot opponents'),
  ('ranked_achievement','real_fighter','en','name','True Duelist'),            ('ranked_achievement','real_fighter','en','description','Defeat 10 real players'),
  ('ranked_achievement','season_veteran','en','name','Season Veteran'),        ('ranked_achievement','season_veteran','en','description','Play 50 ranked battles in a season'),
  ('ranked_achievement','blood_statistician','en','name','Blood Statistician'),('ranked_achievement','blood_statistician','en','description','Reach a 2.0+ K/D after at least 20 battles'),
  ('ranked_achievement','reach_40','en','name','Rank 40 Reached'),             ('ranked_achievement','reach_40','en','description','Reach rank 40 Bronze or higher'),
  ('ranked_achievement','reach_30','en','name','Rank 30 Reached'),             ('ranked_achievement','reach_30','en','description','Reach rank 30 Bronze or higher'),
  ('ranked_achievement','reach_20','en','name','Rank 20 Reached'),             ('ranked_achievement','reach_20','en','description','Reach rank 20 Bronze or higher'),
  ('ranked_achievement','reach_10','en','name','Rank 10 Reached'),             ('ranked_achievement','reach_10','en','description','Reach rank 10 Bronze or higher'),
  ('ranked_achievement','reach_1_gold','en','name','Golden Summit'),           ('ranked_achievement','reach_1_gold','en','description','Reach rank 1 Gold')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Frakcijos (factions / lore_factions — siejam per LT vardą) ──────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'faction', f.id::text, 'en', 'name', x.en
from public.factions f
join (values
  ('Mirties maršas','March of Death'),
  ('Demonų orda','Demon Horde'),
  ('Inkvizicijos legionas','Inquisition Legion'),
  ('Šviesos pulkas','Legion of Light'),
  ('Mistikos melodija','Melody of Mystics'),
  ('Rytų vėjas','Eastern Wind'),
  ('Plėšikų naktis','Night of Thieves'),
  ('Vryhioko gauja','Vryhiok Pack')
) as x(lt, en) on x.lt = f.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'lore_faction', f.id::text, 'en', 'name', x.en
from public.lore_factions f
join (values
  ('Mirties maršas','March of Death'),
  ('Demonų orda','Demon Horde'),
  ('Inkvizicijos legionas','Inquisition Legion'),
  ('Šviesos pulkas','Legion of Light'),
  ('Mistikos melodija','Melody of Mystics'),
  ('Rytų vėjas','Eastern Wind'),
  ('Plėšikų naktis','Night of Thieves'),
  ('Vryhioko gauja','Vryhiok Pack')
) as x(lt, en) on x.lt = f.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Retumai (rarities) ──────────────────────────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'rarity', r.id::text, 'en', 'name', x.en
from public.rarities r
join (values
  ('Paprasta','Common'), ('Reta','Rare'), ('Epinė','Epic'), ('Legendinė','Legendary'),
  ('Unikali','Unique'), ('Mitinė','Mythic'), ('Čempionas','Champion'), ('Prakeiksmas','Curse')
) as x(lt, en) on x.lt = r.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();

-- ── Kortų tipai (card_types) ────────────────────────────────────────────────
insert into public.content_translations (owner_type, owner_id, locale, field, value)
select 'card_type', c.id::text, 'en', 'name', x.en
from public.card_types c
join (values
  ('Padaras','Creature'), ('Burtas','Spell'), ('Artefaktas','Artifact'), ('Reakcija','Reaction'),
  ('Laukas','Field'), ('Čempionas','Champion'), ('Prakeiksmas','Curse')
) as x(lt, en) on x.lt = c.name
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value, updated_at = now();


-- ── rvn_get_daily_tasks: +templateId (reikalingas turinio vertimams) ────────
create or replace function public.rvn_get_daily_tasks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk text := public.rvn__daily_key();
  v_diff text; v_used text[] := '{}'; v_tpl record; v_cnt int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;

  select count(*) into v_cnt from public.user_daily_tasks where user_id=v_uid and date_key=v_dk;
  if v_cnt = 0 then
    foreach v_diff in array array['easy','medium','hard'] loop
      select * into v_tpl from public.daily_task_templates
        where is_active and difficulty=v_diff and not (objective_type = any(v_used))
        order by random() * weight desc limit 1;
      if not found then
        select * into v_tpl from public.daily_task_templates where is_active and difficulty=v_diff order by random() limit 1;
      end if;
      if found then
        v_used := array_append(v_used, v_tpl.objective_type);
        insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type, title, description, target_value, reward_payload)
          values (v_uid, v_tpl.id, v_dk, v_diff, v_tpl.objective_type, v_tpl.title, v_tpl.description, v_tpl.target_value, v_tpl.reward_payload)
          on conflict (user_id, date_key, difficulty) do nothing;
      end if;
    end loop;

    -- galutinis saugiklis: jei dėl bet kokios priežasties nieko neįsirašė,
    -- imame bet kuriuos 3 aktyvius šablonus (po vieną difficulty, jei yra)
    select count(*) into v_cnt from public.user_daily_tasks where user_id=v_uid and date_key=v_dk;
    if v_cnt = 0 then
      insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type, title, description, target_value, reward_payload)
      select v_uid, t.id, v_dk, t.difficulty, t.objective_type, t.title, t.description, t.target_value, t.reward_payload
      from (
        select distinct on (difficulty) * from public.daily_task_templates
        where is_active order by difficulty, random()
      ) t
      on conflict (user_id, date_key, difficulty) do nothing;
    end if;

    insert into public.user_daily_completion(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
    insert into public.user_daily_rerolls(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'dateKey', v_dk,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id',id,'templateId',template_id,'difficulty',difficulty,'objectiveType',objective_type,
        'title',title,'description',description,'progress',progress,'target',target_value,
        'rewardPayload',reward_payload,'completed',is_completed,'claimed',is_claimed)
        order by case difficulty when 'easy' then 1 when 'medium' then 2 else 3 end)
      from public.user_daily_tasks where user_id=v_uid and date_key=v_dk), '[]'::jsonb),
    'allDone', coalesce((select count(*)=3 and bool_and(is_completed) from public.user_daily_tasks where user_id=v_uid and date_key=v_dk), false),
    'chestClaimed', coalesce((select is_claimed from public.user_daily_completion where user_id=v_uid and date_key=v_dk), false),
    'reroll', coalesce((select jsonb_build_object('freeUsed',free_reroll_used,'paidCount',paid_reroll_count) from public.user_daily_rerolls where user_id=v_uid and date_key=v_dk), '{"freeUsed":false,"paidCount":0}'::jsonb)
  );
end $$;

-- ── Frakcijų vertimai TAIP PAT pagal slug (kolekcijos filtras neturi id) ────
-- Apsauga: jei factions.slug stulpelio nėra – blokas praleidžiamas.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='factions' and column_name='slug'
  ) then
    execute $sql$
      insert into public.content_translations (owner_type, owner_id, locale, field, value)
      select 'faction', f.slug, ct.locale, 'name', ct.value
      from public.factions f
      join public.content_translations ct
        on ct.owner_type = 'faction' and ct.owner_id = f.id::text and ct.field = 'name'
      where f.slug is not null
      on conflict (owner_type, owner_id, locale, field) do update
        set value = excluded.value, updated_at = now()
    $sql$;
  end if;
end $$;
