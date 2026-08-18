-- ════════════════════════════════════════════════════════════════════════════
-- TUTORIAL V3 — „Pilna naujo žaidėjo patirtis" (žr. TUTORIAL-V3-HANDOFF.md)
--   1) Naujos TUT-### kortos, kurių reikia 8 pamokų kursui (statusai, raktažodžiai,
--      auros, antras laukas, 3 fazių čempionas, demonų prakeiksmai).
--   2) rvn_media_manifest v3: `card-audio/tutorial/*` balso failai — tier 1
--      (naujokas juos gauna kartu su core paketu).
--   3) rvn_tutorial_state v2: SAVAIME susitvarkantis progreso perkėlimas v2→v3
--      (senos L1–L3 užbaigtos ⇒ naujos L1–L3 užbaigtos, atlygis NEDUBLIUOJAMAS).
-- Idempotentiška. Pamokų eilutės sėjamos iš admin ("Įkelti pamokas"), ne čia.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) NAUJOS TUTORIAL KORTOS ───────────────────────────────────────────────
-- Padarai / burtai / artefaktai / laukai / reakcijos (be čempionų).
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name = v.fac limit 1),
       (select id from public.card_types where name = v.typ limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       v.cost, v.atk, v.hp, v.eff, v.descr, false, 'hidden',
       case when v.gp = '' then null else v.gp::jsonb end
from (values
  -- ── L6: raktažodžiai (statiniai, per gameplay.keywords) ──
  ('TUT-105','Skydo naujokas','Universalus','Padaras','Magiškas',200,2,2,
    'Magiškas skydas.','Pirmas smūgis jo nepaliečia.',
    '{"keywords":["shield"]}'),
  ('TUT-106','Šešėlių žvalgas','Universalus','Padaras','Magiškas',200,3,1,
    'Sėlinimas.','Kol nesmogė – jo nematyti.',
    '{"keywords":["stealth"]}'),
  ('TUT-107','Sienos milžinas','Universalus','Padaras','Magiškas',300,2,5,
    'Pasišaipymas.','Siena su kirviu.',
    '{"keywords":["taunt"]}'),
  ('TUT-108','Vėjo raitelis','Universalus','Padaras','Magiškas',300,3,2,
    'Sprintas.','Atjoja ir kerta tą pačią akimirką.',
    '{"keywords":["sprint"]}'),
  -- ── L5: aura ──
  ('TUT-109','Vėliavnešys Aurėjas','Universalus','Padaras','Unikalus',300,1,4,
    'Aura: kiti tavo padarai gauna +1/+1.','Kol plevėsuoja vėliava – niekas nebėga.',
    '{"passive":{"auraAttack":1,"auraHealth":1,"auraScope":"friendly"}}'),
  -- ── L6: būsenų burtai ──
  ('TUT-126','Nuodų dūmai','Universalus','Burtas','Magiškas',200,null,null,
    'Apnuodija priešo padarą.','Lėta, bet tikra mirtis.',
    '{"spellType":"debuff","effectMappings":[{"trigger":"onCast","effect":"poison","target":"enemyUnit","requiresSelection":true}]}'),
  ('TUT-129','Liepsnos antspaudas','Universalus','Burtas','Magiškas',200,null,null,
    'Padega priešo padarą.','Ugnis, kuri nepamiršta.',
    '{"spellType":"fire","effectMappings":[{"trigger":"onCast","effect":"burn","target":"enemyUnit","requiresSelection":true}]}'),
  ('TUT-135','Tylos antspaudas','Universalus','Burtas','Unikalus',200,null,null,
    'Nutildo priešo padarą: nuima VISKĄ.','Žodžiai baigėsi.',
    '{"spellType":"debuff","effectMappings":[{"trigger":"onCast","effect":"silence","target":"enemyUnit","requiresSelection":true}]}'),
  -- ── L5: antra lauko korta (laukas išstumia lauką) ──
  ('TUT-151','Šventyklos kiemas','Universalus','Laukas','Epinis',300,null,null,
    'Kiekvieno ėjimo pradžioje VISI padarai pagydomi 1.','Akmenys, kurie atsimena maldas.',
    '{"fieldEffectConfig":{"affectsBothPlayers":true,"triggers":[{"trigger":"onTurnStart","effect":"heal","target":"allUnits","value":1}]}}'),
  -- ── L2/L6: priešo padarai ──
  ('TUT-204','Urvų sargas','Demonų orda','Padaras','Magiškas',300,2,5,
    'Pasišaipymas.','Stovi tarp tavęs ir pergalės.',
    '{"keywords":["taunt"]}'),
  ('TUT-205','Ledo šmėkla','Demonų orda','Padaras','Magiškas',300,3,4,'','Šaltis jos nebaugina.',''),
  -- ── L7: demonų šauklys (įmaišo 2 prakeiksmus) ──
  ('TUT-173','Prakeiksmų šauklys','Demonų orda','Padaras','Unikalus',300,2,3,
    'Kovos šūksnis: įmaišo 2 prakeiksmus į priešo kaladę.','Jo balsas girdimas svetimose kaladėse.',
    '{"effectMappings":[{"trigger":"onSummon","effect":"triggerCurse","target":"enemyPlayer","value":2,"triggersCurse":{"count":2,"appliesTo":"opponent"}}]}')
) as v(num, cname, fac, typ, rar, cost, atk, hp, eff, descr, gp)
where not exists (select 1 from public.cards c where c.card_number = v.num);

-- ── 1b) PRAKEIKSMAI (L7 šoninė kaladė; aktyvacija TIK per onCurseDrawn) ─────
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, effect_text, description, is_champion, status, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name ilike '%demon%' or slug ilike '%demon%' order by id limit 1),
       (select id from public.card_types where name ilike '%prakeik%' or name ilike '%curse%' order by id limit 1),
       (select id from public.rarities   where name = v.rar limit 1),
       0, null, null, v.eff, v.descr, false, 'hidden', v.gp::jsonb
from (values
  ('TUT-170','Kraujo prakeiksmas','Magiškas',
    'Kai priešas ištraukia šią kortą – jis gauna 3 žalos.','Kraujas moka už smalsumą.',
    '{"effectMappings":[{"trigger":"onCurseDrawn","effect":"damage","target":"enemyPlayer","value":3,"triggersZmk":false}]}'),
  ('TUT-171','Silpnumo prakeiksmas','Magiškas',
    'Kai priešas ištraukia šią kortą – visi jo padarai gauna −1 puolimą.','Rankos sunkėja pačios.',
    '{"effectMappings":[{"trigger":"onCurseDrawn","effect":"debuffAttack","target":"allEnemyUnits","value":1}]}'),
  ('TUT-172','Alkio prakeiksmas','Magiškas',
    'Kai priešas ištraukia šią kortą – jis praranda 200 aukso.','Skrynia tuščia. Vėl.',
    '{"effectMappings":[{"trigger":"onCurseDrawn","effect":"loseGold","target":"enemyPlayer","value":200,"goldAppliesTo":"opponent"}]}')
) as v(num, cname, rar, eff, descr, gp)
where not exists (select 1 from public.cards c where c.card_number = v.num);

-- ── 1c) L4 ČEMPIONAS: 3 fazės (300 / 600 / 900 aukso; gebėjimai 1/2/3) ──────
-- Kanonas: fazės keičiamos žaidžiant kitos fazės kortą su Tribute (2 kortos iš
-- rankos), gebėjimas atsirakina, kai phase >= indeksas+1 (championSkills).
insert into public.cards (card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health,
                          effect_text, description, is_champion, status, champion_group, champion_phase, gameplay)
select v.num, v.cname,
       (select id from public.factions  where name = 'Universalus' limit 1),
       (select id from public.card_types where name = 'Čempionas' limit 1),
       (select id from public.rarities   where name = 'Legendinis' limit 1),
       v.cost, null, v.hp, v.eff, v.descr, true, 'hidden', 'TUT-KORVAS', v.phase, v.gp::jsonb
from (values
  ('TUT-131','Korvo mokinys',300,20,1,
    'Čempionas (1 fazė). Gebėjimas: 3 žala priešo padarui.','Dar mokinys – bet jau su varno ženklu.',
    '{"championSkillConfig":{"skills":[{"name":"Šešėlio strėlė","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"enemyUnit","value":3,"requiresSelection":true,"projectile":"shadow"}]},{"name":"Varno sparnas","mappings":[{"trigger":"onChampionSkill","effect":"heal","target":"allOwnUnits","value":3}]},{"name":"Korvo teismas","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"allEnemyUnits","value":4}]}]}}'),
  ('TUT-132','Korvo riteris',600,26,2,
    'Čempionas (2 fazė). Atrakina antrą gebėjimą.','Sparnai jau meta šešėlį.',
    '{"championSkillConfig":{"skills":[{"name":"Šešėlio strėlė","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"enemyUnit","value":3,"requiresSelection":true,"projectile":"shadow"}]},{"name":"Varno sparnas","mappings":[{"trigger":"onChampionSkill","effect":"heal","target":"allOwnUnits","value":3}]},{"name":"Korvo teismas","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"allEnemyUnits","value":4}]}]}}'),
  ('TUT-134','Korvo valdovas',900,32,3,
    'Čempionas (3 fazė). Atrakina trečią gebėjimą.','Varnai skrenda ten, kur jis rodo.',
    '{"championSkillConfig":{"skills":[{"name":"Šešėlio strėlė","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"enemyUnit","value":3,"requiresSelection":true,"projectile":"shadow"}]},{"name":"Varno sparnas","mappings":[{"trigger":"onChampionSkill","effect":"heal","target":"allOwnUnits","value":3}]},{"name":"Korvo teismas","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"allEnemyUnits","value":4}]}]}}')
) as v(num, cname, cost, hp, phase, eff, descr, gp)
where not exists (select 1 from public.cards c where c.card_number = v.num);

-- ── 2) MEDIA MANIFESTAS v3: mokymų balsai (tier 1) ──────────────────────────
-- Balso failai yra STATINIAI (nėra DB lentoje), tad imam juos tiesiai iš
-- storage: bucket 'card-audio', aplankas 'tutorial/'. Origin'ą pasiimam iš bet
-- kurio jau esančio storage URL (projekto domenas SQL'e nežinomas).
create or replace function public.rvn_media_manifest()
returns table(url text, kind text, tier int, bytes bigint)
language sql security definer set search_path = public, storage as $$
  with origin as (
    select split_part(c.image_url, '/storage/v1/object/public/', 1) as base
    from public.cards c
    where c.image_url like '%/storage/v1/object/public/%'
    limit 1
  ),
  urls as (
    select c.image_url as url, 'card-art' as kind, 2 as tier
      from public.cards c where c.status = 'active' and c.image_url is not null
    union all
    select jsonb_array_elements_text(c.gameplay->'voiceLines'), 'voice', 2
      from public.cards c where c.status = 'active' and jsonb_typeof(c.gameplay->'voiceLines') = 'array'
    union all
    select c.gameplay->'summonCinematic'->>'webm', 'cinematic', 3 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'webm' is not null
    union all
    select c.gameplay->'summonCinematic'->>'mp4', 'cinematic', 3 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'mp4' is not null
    union all
    select c.gameplay->'summonCinematic'->>'poster', 'cinematic-poster', 2 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'poster' is not null
    union all
    select s.value->'cinematic'->>'webm', 'cinematic', 3
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'webm' is not null
    union all
    select s.value->'cinematic'->>'mp4', 'cinematic', 3
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'mp4' is not null
    union all
    select s.value->'cinematic'->>'poster', 'cinematic-poster', 2
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'poster' is not null
    union all
    select co.image_url, 'cosmetic', 1 from public.cosmetics co where co.image_url is not null
    union all
    select jsonb_array_elements_text(co.videos), 'avatar-video', 3
      from public.cosmetics co where jsonb_typeof(co.videos) = 'array'
    union all
    select aa.file_url, 'avatar-voice', 2 from public.avatar_audio aa where aa.enabled
    union all
    select p.image_url, 'pack', 1 from public.card_packs p where p.image_url is not null
    union all
    select f.icon_url, 'ui', 1 from public.factions f where f.icon_url is not null
    union all
    -- V3: „Senojo Korvo" mokymų balsai — TIER 1 (core paketas naujokui)
    select o.base || '/storage/v1/object/public/card-audio/' || so.name, 'tutorial-voice', 1
      from storage.objects so, origin o
      where so.bucket_id = 'card-audio' and so.name like 'tutorial/%'
    union all
    -- statinės kovos nugarėlės (hardcoded TutorialGame CARD_BACK_SRC + default)
    select v.url, 'card-back-static', 1 from (values
      ('/card-backs/back.webp?v=2'), ('/card-backs/curse.webp'), ('/card-backs/zmk.webp'),
      ('/card-backs/ravenof-default.webp')
    ) as v(url)
  ),
  storage_urls as (
    select distinct on (u.url) u.url, u.kind, u.tier,
      split_part(split_part(u.url, '/storage/v1/object/public/', 2), '/', 1) as bucket,
      substr(
        split_part(u.url, '/storage/v1/object/public/', 2),
        length(split_part(split_part(u.url, '/storage/v1/object/public/', 2), '/', 1)) + 2
      ) as path
    from urls u
    where u.url like '%/storage/v1/object/public/%'
    order by u.url, u.tier
  ),
  relative_urls as (
    select distinct on (u.url) u.url, u.kind, u.tier
    from urls u
    where u.url like '/%' and u.url not like '//%'
    order by u.url, u.tier
  )
  select s.url, s.kind, s.tier, coalesce((o.metadata->>'size')::bigint, 0) as bytes
  from storage_urls s
  left join storage.objects o on o.bucket_id = s.bucket and o.name = s.path
  union all
  select r.url, r.kind, r.tier, 0::bigint from relative_urls r;
$$;
grant execute on function public.rvn_media_manifest() to authenticated;

-- ── 3) rvn_tutorial_state v2: progreso perkėlimas v2 → v3 ───────────────────
-- Žaidėjas, jau baigęs senas 1–3 pamokas, NEPRARANDA graduation: prieš
-- grąžinant būseną, jo progresas nukopijuojamas į atitinkamas V3 pamokas
-- (reward_claimed = true, kad atlygis nebūtų išduotas antrą kartą).
create or replace function public.rvn_tutorial_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is not null then
    insert into public.tutorial_progress (user_id, lesson_id, completed, attempts, best_time_ms, reward_claimed, completed_at)
    select v_uid, nl.id, true, coalesce(op.attempts, 1), op.best_time_ms, true, coalesce(op.completed_at, now())
    from (values ('tut-1-basics','tut-v3-l1'), ('tut-2-spells','tut-v3-l2'), ('tut-3-board','tut-v3-l3')) as m(old_key, new_key)
    join public.tutorial_lessons ol on ol.seed_key = m.old_key
    join public.tutorial_lessons nl on nl.seed_key = m.new_key
    join public.tutorial_progress op on op.lesson_id = ol.id and op.user_id = v_uid and op.completed
    on conflict (user_id, lesson_id) do nothing;
  end if;

  return jsonb_build_object(
    'lessons', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.sort_order)
      from public.tutorial_lessons l where l.status = 'active'), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(to_jsonb(p))
      from public.tutorial_progress p where p.user_id = v_uid), '[]'::jsonb)
  );
end $$;
grant execute on function public.rvn_tutorial_state() to authenticated;
