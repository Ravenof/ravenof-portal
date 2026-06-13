-- ============================================================
-- GAMEPLAY V1 — virtualaus žaidimo efektų sistema
-- Paleisti Supabase SQL editor'iuje PRIEŠ deploy'inant gameplay atnaujinimą.
-- (Jei nepaleista — žaidimas veikia fallback režimu: efektai iš teksto parserio,
--  ŽMK iš numatytosios sudėties.)
-- ============================================================

-- 1. Kortos gameplay konfigūracija (admin mapping'as virtualiam žaidimui)
--    Struktūra (JSONB) — žr. src/lib/game/types.ts GameplayConfig:
--    {
--      "virtualEnabled": true,
--      "needsEffectMapping": false,
--      "effectMappings": [
--        { "trigger": "onPlay", "effect": "damage", "target": "enemyUnit",
--          "value": 2, "requiresSelection": true, "allowRandomTarget": false,
--          "triggersCurse": { "count": 1, "appliesTo": "opponent" },
--          "animation": "fireball", "sound": "spellCast", "projectile": "fireball" }
--      ],
--      "fieldEffectConfig": { "passive": { "spellCostDelta": 100, "atkDelta": 0,
--        "attackLimitPerTurn": 2, "firstDamageReduction": 1 }, "triggers": [] },
--      "championSkillConfig": { "mappings": [] },
--      "artifactEffectConfig": { "mappings": [] },
--      "tutorialTags": []
--    }
alter table cards add column if not exists gameplay jsonb;

comment on column cards.gameplay is
  'Virtualaus žaidimo efektų mapping (GameplayConfig). NULL = fallback į effect_text parserį, korta žymima needsEffectMapping.';

-- 2. ŽMK (žalos modifikatorių) kortos — nebe hardcoded, valdomos per admin
create table if not exists zmk_cards (
  id          uuid         primary key default gen_random_uuid(),
  name        text         not null,
  description text,
  -- modifikatoriaus reikšmė: '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'
  value       text         not null check (value in ('+0','+1','-1','+2','-2','x2','x0')),
  -- kiek tokių kortų kaladėje
  count       int          not null default 1 check (count between 1 and 20),
  -- 'auto' — modifikatorius pritaikomas automatiškai su animacija
  -- 'draw' — žaidėjas pats paspaudžia atversti (interaktyvus režimas)
  mode        text         not null default 'auto' check (mode in ('auto','draw')),
  -- papildomas efektas ištraukus (nebūtina), pvz. trigger sąlygos
  effect_note text,
  image_url   text,
  sort_order  int          not null default 0,
  active      boolean      not null default true,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

drop trigger if exists trg_zmk_cards_updated_at on zmk_cards;
create trigger trg_zmk_cards_updated_at
  before update on zmk_cards
  for each row execute function update_updated_at_column();

-- RLS: skaityti gali visi, rašyti tik admin
alter table zmk_cards enable row level security;

drop policy if exists "zmk_cards_select_all" on zmk_cards;
create policy "zmk_cards_select_all" on zmk_cards
  for select using (true);

drop policy if exists "zmk_cards_admin_write" on zmk_cards;
create policy "zmk_cards_admin_write" on zmk_cards
  for all using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Numatytoji oficiali ŽMK sudėtis (20 kortų) — tik jei lentelė tuščia
insert into zmk_cards (name, description, value, count, mode, sort_order)
select * from (values
  ('Ramybė',          'Žala nekinta.',                                  '+0', 6, 'auto', 1),
  ('Įniršis',         'Žala +1.',                                       '+1', 5, 'auto', 2),
  ('Silpnumas',       'Žala −1.',                                       '-1', 5, 'auto', 3),
  ('Galios protrūkis','Žala +2.',                                       '+2', 1, 'auto', 4),
  ('Apsauga',         'Žala −2.',                                       '-2', 1, 'auto', 5),
  ('Kritinis smūgis', 'Žala ×2. ŽMK ir kapinynas permaišomi.',          'x2', 1, 'auto', 6),
  ('Visiška nesėkmė', 'Žala = 0. ŽMK ir kapinynas permaišomi.',         'x0', 1, 'auto', 7)
) as v(name, description, value, count, mode, sort_order)
where not exists (select 1 from zmk_cards);
