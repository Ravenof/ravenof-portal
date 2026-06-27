-- ════════════════════════════════════════════════════════════════════════════
-- CAMPAIGN CARD GAMEPLAY — wires real cards.gameplay (JSONB) effects so key
-- Varngradas cards actually FIRE in battle (TutorialGame effect engine):
-- battlecries (onSummon), deathrattles (onDeath), spells (onCast), static
-- keywords/auras, and champion skills (Prazaras + Belzatoras phases).
-- Shape matches src/lib/game/types.ts (GameplayConfig / EffectMapping / ChampionSkill).
-- Safe & idempotent: only updates rows where gameplay is null/empty.
-- ════════════════════════════════════════════════════════════════════════════

-- Ensure gameplay columns exist (added outside repo migrations on live DB; no-op if present)
alter table public.cards add column if not exists gameplay       jsonb;
alter table public.cards add column if not exists subtype        text;
alter table public.cards add column if not exists champion_group text;
alter table public.cards add column if not exists champion_phase int;

-- helper: set gameplay only if not already configured (don't clobber admin edits)
create or replace function pg_temp.rvn_set_gameplay(p_num text, p_json jsonb)
returns void language plpgsql as $$
begin
  update public.cards
    set gameplay = p_json
    where card_number = p_num
      and (gameplay is null or gameplay = '{}'::jsonb);
end $$;

-- ── Paketas 1: Varngrado gynėjai ──
select pg_temp.rvn_set_gameplay('VRN-002', '{"keywords":["taunt"]}');
select pg_temp.rvn_set_gameplay('VRN-003', '{"effectMappings":[{"trigger":"onSummon","effect":"buffHealth","target":"selfUnit","value":1}]}');
select pg_temp.rvn_set_gameplay('VRN-004', '{"effectMappings":[{"trigger":"onSummon","effect":"damage","target":"enemyUnit","value":1,"requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-005', '{"effectMappings":[{"trigger":"onSummon","effect":"gainGold","target":"ownPlayer","value":1}]}');
select pg_temp.rvn_set_gameplay('VRN-006', '{"effectMappings":[{"trigger":"onSummon","effect":"heal","target":"ownUnit","value":2,"requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-007', '{"passiveAura":{"auraKeywords":["taunt"],"auraScope":"friendly"}}');
select pg_temp.rvn_set_gameplay('VRN-008', '{"keywords":["taunt"],"effectMappings":[{"trigger":"onDeath","effect":"buffAttack","target":"allOwnUnits","value":1},{"trigger":"onDeath","effect":"buffHealth","target":"allOwnUnits","value":1}]}');
select pg_temp.rvn_set_gameplay('VRN-009', '{"effectMappings":[{"trigger":"onSummon","effect":"heal","target":"ownUnit","value":3,"requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-010', '{"effectMappings":[{"trigger":"onSummon","effect":"buffAttack","target":"allOwnUnits","value":1}]}');
select pg_temp.rvn_set_gameplay('VRN-011', '{"effectMappings":[{"trigger":"onCast","effect":"freeze","target":"enemyUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-012', '{"effectMappings":[{"trigger":"onCast","effect":"damage","target":"allEnemyUnits","value":1}]}');
select pg_temp.rvn_set_gameplay('VRN-013', '{"effectMappings":[{"trigger":"onCast","effect":"buffHealth","target":"ownUnit","value":2,"requiresSelection":true,"allowRandomTarget":true,"then":[{"trigger":"onCast","effect":"shield","target":"ownUnit","sameTarget":true}]}]}');
select pg_temp.rvn_set_gameplay('VRN-014', '{"effectMappings":[{"trigger":"onCast","effect":"returnToHand","target":"ownUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-015', '{"effectMappings":[{"trigger":"onCast","effect":"buffHealth","target":"ownUnit","value":3,"requiresSelection":true,"allowRandomTarget":true,"then":[{"trigger":"onCast","effect":"taunt","target":"ownUnit","sameTarget":true}]}]}');

-- ── Champion: Prazaras (3 skills; champion_phase=3 atrakina visus) ──
select pg_temp.rvn_set_gameplay('VRN-001', '{"championSkillConfig":{"skills":[{"name":"Kelkite vartus","mappings":[{"trigger":"onChampionSkill","effect":"taunt","target":"ownUnit","requiresSelection":true},{"trigger":"onChampionSkill","effect":"shield","target":"ownUnit","sameTarget":true}]},{"name":"Rikiuotė prie sienos","mappings":[{"trigger":"onChampionSkill","effect":"buffAttack","target":"allOwnUnits","value":1},{"trigger":"onChampionSkill","effect":"buffHealth","target":"allOwnUnits","value":1}]},{"name":"Niekas nepalieka spragos","mappings":[{"trigger":"onChampionSkill","effect":"buffHealth","target":"allOwnUnits","value":2}]}]}}');
update public.cards set champion_phase = 3 where card_number = 'VRN-001' and coalesce(champion_phase,0) < 3;

-- ── Paketas 2: Trijų jėgų frontas ──
select pg_temp.rvn_set_gameplay('VRN-017', '{"effectMappings":[{"trigger":"onSummon","effect":"damage","target":"enemyUnit","value":2,"requiresSelection":true,"allowRandomTarget":true,"then":[{"trigger":"onSummon","effect":"damage","target":"ownUnit","value":1,"allowRandomTarget":true}]}]}');
select pg_temp.rvn_set_gameplay('VRN-018', '{"keywords":["taunt"],"effectMappings":[{"trigger":"onDeath","effect":"buffHealth","target":"allOwnUnits","value":2}]}');
select pg_temp.rvn_set_gameplay('VRN-019', '{"effectMappings":[{"trigger":"onSummon","effect":"silence","target":"enemyUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-020', '{"keywords":["taunt"],"passiveAura":{"auraAttack":1,"auraScope":"friendly"}}');
select pg_temp.rvn_set_gameplay('VRN-021', '{"effectMappings":[{"trigger":"onSummon","effect":"shield","target":"ownUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-022', '{"keywords":["sprint"]}');
select pg_temp.rvn_set_gameplay('VRN-023', '{"passiveAura":{"auraKeywords":["taunt"],"auraScope":"friendly"}}');
select pg_temp.rvn_set_gameplay('VRN-024', '{"keywords":["taunt"]}');
select pg_temp.rvn_set_gameplay('VRN-025', '{"effectMappings":[{"trigger":"onCast","effect":"silence","target":"enemyUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-027', '{"effectMappings":[{"trigger":"onCast","effect":"damage","target":"allEnemyUnits","value":3,"then":[{"trigger":"onCast","effect":"damage","target":"allOwnUnits","value":1}]}]}');
select pg_temp.rvn_set_gameplay('VRN-028', '{"effectMappings":[{"trigger":"onCast","effect":"destroy","target":"enemyArtifact","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-029', '{"effectMappings":[{"trigger":"onCast","effect":"damage","target":"enemyChampion","value":6,"requiresSelection":true,"allowRandomTarget":true}]}');

-- ── Paketas 3: Varngrado Užraktas ──
select pg_temp.rvn_set_gameplay('VRN-031', '{"effectMappings":[{"trigger":"onCast","effect":"buffHealth","target":"allOwnUnits","value":2},{"trigger":"onCast","effect":"taunt","target":"allOwnUnits"}]}');
select pg_temp.rvn_set_gameplay('VRN-034', '{"effectMappings":[{"trigger":"onCast","effect":"damage","target":"allUnits","value":2}]}');
select pg_temp.rvn_set_gameplay('VRN-036', '{"effectMappings":[{"trigger":"onCast","effect":"shield","target":"ownUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-037', '{"effectMappings":[{"trigger":"onCast","effect":"buffAttack","target":"allOwnUnits","value":2,"buffDuration":"endOfTurn"}]}');
select pg_temp.rvn_set_gameplay('VRN-038', '{"effectMappings":[{"trigger":"onDeath","effect":"buffHealth","target":"allOwnUnits","value":1}]}');

-- ── Priešų paketas: Demonų orda ──
select pg_temp.rvn_set_gameplay('VRN-101', '{"keywords":["sprint"]}');
select pg_temp.rvn_set_gameplay('VRN-102', '{"keywords":["taunt"]}');
select pg_temp.rvn_set_gameplay('VRN-103', '{"effectMappings":[{"trigger":"onDeath","effect":"damage","target":"allEnemyUnits","value":1}]}');
select pg_temp.rvn_set_gameplay('VRN-104', '{"keywords":["stealth"]}');
select pg_temp.rvn_set_gameplay('VRN-105', '{"effectMappings":[{"trigger":"onSummon","effect":"freeze","target":"enemyUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-107', '{"effectMappings":[{"trigger":"onSummon","effect":"silence","target":"enemyUnit","requiresSelection":true,"allowRandomTarget":true}]}');
select pg_temp.rvn_set_gameplay('VRN-108', '{"keywords":["stealth","sprint"]}');

-- ── Boss: Belzatoras (3 fazės/skills) ──
select pg_temp.rvn_set_gameplay('VRN-109', '{"championSkillConfig":{"skills":[{"name":"Kirvio smūgis","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"enemyUnit","value":4,"requiresSelection":true,"allowRandomTarget":true}]},{"name":"Juodo dūmo banga","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"allEnemyUnits","value":2}]},{"name":"Plyšio riaumojimas","mappings":[{"trigger":"onChampionSkill","effect":"damage","target":"enemyChampion","value":4,"requiresSelection":true,"allowRandomTarget":true}]}]}}');
update public.cards set champion_phase = 3 where card_number = 'VRN-109' and coalesce(champion_phase,0) < 3;
