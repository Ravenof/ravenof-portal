-- ════════════════════════════════════════════════════════════════════════════
--  Inkvizitorius Madielius (commit616): nemirtingumo aura (passiveAura.
--  auraImmortal) turi veikti TIK Inkvizicijos legiono frakcijos padarus —
--  anksčiau be auraFaction filtro ją gaudavo VISI draugiški padarai
--  (įskaitant universalius). Variklis auraFaction jau palaiko
--  (aurasAffecting: paveikiamo padaro card.factionId turi sutapti) —
--  tai grynai duomenų pataisa.
-- ════════════════════════════════════════════════════════════════════════════

update public.cards
set gameplay = jsonb_set(
  gameplay,
  '{passiveAura,auraFaction}',
  to_jsonb((select id from public.factions where name = 'Inkvizicijos legionas'))
)
where name = 'Inkvizitorius Madielius'
  and (gameplay->'passiveAura'->>'auraImmortal')::boolean is true
returning name, gameplay->'passiveAura' as aura;
