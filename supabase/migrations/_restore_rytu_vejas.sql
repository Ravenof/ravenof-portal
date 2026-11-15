-- ════════════════════════════════════════════════════════════════════
-- „Rytų vėjas" ATSTATYMAS (leisti tik išleidžiant frakciją).
-- Kartu reikia ištuštinti sąrašus faile src/lib/game/hiddenFactions.ts
-- ir grąžinti du botus faile src/lib/ranked/bots.ts.
-- ════════════════════════════════════════════════════════════════════
begin;

update public.cards c set status = 'active'
  from public.hidden_faction_backup b
 where b.kind = 'card' and b.ref = c.id::text and c.status::text = 'hidden';

update public.starter_decks s set is_active = true
  from public.hidden_faction_backup b
 where b.kind = 'starter_deck' and b.ref = s.id::text;

insert into public.pack_factions (pack_id, faction_id)
select b.ref::uuid, b.prev::int from public.hidden_faction_backup b where b.kind = 'pack_faction'
on conflict do nothing;

update public.card_packs p set description = b.prev
  from public.hidden_faction_backup b
 where b.kind = 'pack_desc' and b.ref = p.id::text;

update public.content_translations t set value = b.prev
  from public.hidden_faction_backup b
 where b.kind = 'translation'
   and b.ref = t.owner_type || '|' || t.owner_id || '|' || t.locale || '|' || t.field;

update public.ranked_bots r
   set faction_slug = split_part(b.prev, '|', 1), faction = split_part(b.prev, '|', 2)
  from public.hidden_faction_backup b
 where b.kind = 'bot' and b.ref = r.slug;

update public.cosmetics c set is_active = true
  from public.hidden_faction_backup b
 where b.kind = 'cosmetic' and b.ref = c.id;

delete from public.hidden_faction_backup;
commit;
