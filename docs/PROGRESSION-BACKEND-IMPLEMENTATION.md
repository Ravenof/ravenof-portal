# Ravenof — Progression v2 backend implementacija

Techninis dokumentas: lentelės, RPC, būsenų perėjimai, RLS, migravimas, testai, spragos.
Duomenų kontraktas UI'ui: [`PROGRESSION-DATA-CONTRACT.md`](./PROGRESSION-DATA-CONTRACT.md).

---

## 1. Migracijos

| Failas | Turinys |
|---|---|
| `20260840_progression_core.sql` | `factions.alignment`, rarity kodų žemėlapis, `progression_idempotency`, `reward_choices`, `progression_reward_grants`, **`rvn__grant_rewards_v2`** |
| `20260841_progression_boosters.sql` | `economy_config.booster_v2` + `card_choice_v2`, `rvn__generate_faction_booster`, `rvn__build_card_choice_pool`, pasirinkimų išsprendimo RPC |
| `20260842_login_cycle_v2.sql` | `login_cycle_reward_defs`, `user_login_cycles`, `user_login_claims`, **backfill iš v1**, `rvn_get_login_cycle`, `rvn_claim_login_reward` |
| `20260843_season_path_v2.sql` | `economy_config.season_path_v2`, `season_reward_defs` (sezonui užšaldyti), `progression_content_gaps`, claim + **Claim All** + pass unlock |
| `20260844_daily_quests_v2.sql` | `daily_quest_templates`, `user_daily_quests`, `user_daily_quest_meta`, `user_daily_chests`, generavimas, progresas, reroll, skrynia, `rvn_report_match_stats` |
| `20260845_progression_api.sql` | `rvn_get_progression_snapshot`, `rvn_continue_pending_claims`, `rvn_get_progression_config` |

**Visos migracijos additive.** Nė viena netrina eilučių, nekeičia esamų RPC ir
neperrašo jau claimintų ledger įrašų. Senos sistemos (`rvn_get_monthly_login`,
`rvn_get_season_path`, `rvn_get_daily_tasks`, `rvn_open_pack_v3`, `card_packs`)
veikia toliau nepakitusios.

## 2. Ekonomikos konfigūracijos vieta

Viskas `public.economy_config` (RLS: skaityti visi, rašyti tik `role='admin'`):

| Raktas | Turinys |
|---|---|
| `progression_economy_version` | `{"version":2}` — visų v2 įrašų versija |
| `season_path_v2` | 20 lygių × 2 takeliai (kanoninis šaltinis) |
| `daily_quests_v2` | questų atlygiai, skrynia, dienos maksimumas, reroll, generavimo vėliavos |
| `booster_v2` | 10/8/2, slotų minimumai, rarity svoriai, garantuotas slotas |
| `card_choice_v2` | pool dydis, alignment sąrašas, čempionų išskyrimas |
| `craft` | **esamas** — `disenchant` naudojamas dublikatų kompensacijai |
| `progression_duplicate_compensation` | nuoroda, kad kompensacija imama iš `craft.disenchant` (be dublikuoto tiesos šaltinio) |

Login 31 dienos lentelė laikoma **atskiroje versijuojamoje lentelėje**
`login_cycle_reward_defs (economy_version, day_number)`, nes ją admin turi galėti
redaguoti nesugriaunant jau pradėtų ciklų.

## 3. Lentelės

```
progression_idempotency (user_id, action, idempotency_key) → response jsonb
reward_choices          (id, user_id, source_type, source_id, seq, choice_type,
                         rarity_code, choice_pool, status, resolution, economy_version)
progression_reward_grants (user_id, source_type, source_id, reward_type, amount,
                         card_id, faction_id, cosmetic_id, economy_version, metadata)
progression_content_gaps (gap_type, scope, detail)

login_cycle_reward_defs (economy_version, day_number, rewards, is_milestone)
user_login_cycles       (id, user_id, cycle_index, economy_version, position,
                         started_at, completed_at)
user_login_claims       (cycle_id, user_id, day_number, claim_date, rewards)

season_reward_defs      (season_id, level, track, rewards, economy_version)
season_pass_seasons     +card_back_cosmetic_id +avatar_cosmetic_id +economy_version

daily_quest_templates   (code, difficulty, objective_type, target_value,
                         requires_pvp, requires_faction, requires_stats,
                         conflict_group, weight, is_active, title_key, desc_key)
user_daily_quests       (id, user_id, date_key, difficulty, template_code,
                         objective_type, target_value, faction_id, progress,
                         rewards, economy_version, reroll_index, is_completed, is_claimed)
user_daily_quest_meta   (user_id, date_key, free_reroll_used, paid_reroll_count, retired_codes)
user_daily_chests       (user_id, date_key, rewards)

matches                 +deck_faction_id +creatures_played +spells_played
                        +damage_dealt +stats_reported_at
factions                +alignment (light|dark|neutral)
```

## 4. Unikalumo apsaugos ir row locking

| Apsauga | Įgyvendinimas |
|---|---|
| login: 1 atlygis per UTC parą | `unique (user_id, claim_date)` ant `user_login_claims` |
| login: 1 atlygis per ciklo dieną | `primary key (cycle_id, day_number)` |
| login: 1 aktyvus ciklas | dalinis `unique index ... where completed_at is null` |
| season: user+season+level+track | `primary key` ant `user_season_reward_claims` |
| quest claim | `update ... where is_completed and not is_claimed` (atominis) |
| daily chest: user + UTC data | `primary key (user_id, date_key)` ant `user_daily_chests` |
| reward choice | `unique (user_id, source_type, source_id, seq)` |
| idempotency | `primary key (user_id, action, idempotency_key)` |

Kiekvienas claim/reroll pradeda nuo
`perform 1 from public.profiles where id = auth.uid() for update;` —
tai serializuoja **visas to paties vartotojo** lygiagrečias progresijos operacijas.
Reroll papildomai užrakina `user_daily_quests` ir `user_daily_quest_meta` eilutes.

## 5. Būsenų perėjimai

### Login ciklas

```
(nėra ciklo) --claim--> [aktyvus ciklas, position=1]
[position=n] --claim (kitą UTC parą)--> [position=n+1]
[position=30] --claim--> [position=31, completed_at=now()]
[completed_at = šiandien] --claim--> ERROR cycle_completed_today
[completed_at < šiandien] --claim--> (naujas ciklas, cycle_index+1, position=1)
```

Praleista para nekeičia `position` — ji juda tik per claim'ą.

### Season claim

```
xp >= level*1000 ?  ne  -> level_not_reached
track = pass ir not has_season_pass ? -> no_pass
insert user_season_reward_claims (PK apsauga) -> jau yra? -> already_claimed
grant rewards -> jei yra choice tipų: sukuriami reward_choices, status=choice_required
```

`Claim All`: eina `level asc, free→pass`; radęs pasirinkimą — **užfiksuoja claim'ą**,
sukuria pending choice ir **sustoja**. Kol yra `pending` pasirinkimų, kitas `Claim All`
grąžina eilę ir nieko neclaimina. `continuePendingClaims()` tęsia, kai eilė tuščia.

### Reward choice

```
pending --resolve(faction)--> generuojamas boosteris --> resolved
pending --resolve(card, iš pool'o)--> korta arba esencijos kompensacija --> resolved
pending --resolve svetimo vartotojo--> choice_not_found (RPC mato tik auth.uid() eilutes)
```

### Daily quest

```
(nėra) --get/first match--> sugeneruojami 3 (easy/medium/hard)
progress < target --valid match--> progress+1
progress >= target --> is_completed
is_completed --claim--> is_claimed + atlygis
visi trys is_completed --claim chest--> user_daily_chests (1/UTC para)
reroll: 1 nemokamas -> 2×100 Silver -> 4-as reroll_limit_reached
```

## 6. RLS modelis

- **Visos** v2 vartotojo lentelės: `enable row level security`, politika tik `select`
  su `user_id = auth.uid()`. **Jokių** `insert/update/delete` politikų klientui —
  visi rašymai vyksta tik per `security definer` RPC.
- Visos claim funkcijos: `security definer` + `set search_path = public`;
  tapatybė **visada** iš `auth.uid()`, niekada iš parametro. `user_id` parametro
  viešose RPC apskritai nėra (patikra testuose per `pg_proc`).
- Definition lentelės (`login_cycle_reward_defs`, `daily_quest_templates`,
  `season_reward_defs`) — vieša `select`, rašymas tik `profiles.role = 'admin'`.
- `progression_content_gaps` — matoma tik adminams.
- Service-role logikos į browser bundle nekeliama: `src/lib/progression/client.ts`
  naudoja tik `@/lib/supabase/client` (anon raktas) ir kviečia RPC.

## 7. Idempotencija

```
klientas -> stickyKey(scope) -> RPC(p_idempotency_key)
serveris -> jei (user, action, key) jau yra -> grąžina IŠSAUGOTĄ atsakymą
         -> kitaip vykdo, tada įrašo atsakymą
```

Scope pavyzdžiai: `login`, `season:12:pass`, `season:all`, `quest:481`,
`reroll:481:true`, `choice:<uuid>`, `chest`, `pass:silver`.

## 8. Migravimo pastabos

- **Login backfill** (`20260842`, `do $$` blokas): kiekvienam vartotojui, turinčiam
  `user_monthly_login` įrašų ir dar neturinčiam v2 ciklo, sukuriamas ciklas #1 su
  paskutinėmis iki **31** atsiimtomis dienomis; `claim_date` paimamas iš v1 `date_key`,
  todėl **tą pačią parą du kartus atsiimti neįmanoma**. Turintiems ≥31 claim'ą ciklas
  pažymimas užbaigtu. Senas `user_monthly_login` **nekeičiamas ir netrinamas**.
  Blokas idempotentinis (praleidžia vartotojus, kurie jau turi ciklą).
- **Sezono atlygiai** įrašomi į `season_reward_defs` pirmo v2 kvietimo metu
  (`rvn__ensure_season_rewards`) ir **užšaldomi**. Vėlesnis `economy_config` keitimas
  nepaliečia vykstančio sezono. Adminas gali atnaujinti dar **neatsiimtus** įrašus per
  `rvn_admin_refresh_season_rewards(season_id)`.
- **Sezoninė kosmetika**: `season_pass_seasons.card_back_cosmetic_id` ir
  `avatar_cosmetic_id`. Kol nepriskirta esama `cosmetics` eilutė, tas atlygio
  komponentas **praleidžiamas**, o į `progression_content_gaps` įrašoma spraga.
  Likusi compound atlygio dalis (pvz. 2 boosteriai 20 lygyje) išduodama normaliai.
- **Daily quest v1 ↔ v2**: sistemos veikia lygiagrečiai. v1 naudoja 05:00 ribą,
  v2 — 00:00 UTC. Perjungus UI į v2, v1 lenteles galima palikti archyvui.

## 9. Testai

Realūs integraciniai testai prieš **PostgreSQL 16**, ne mock'ai.

```bash
# 1) lokalus klasteris
initdb -D /tmp/pgdata -U postgres --auth=trust
pg_ctl -D /tmp/pgdata -o "-p 55432 -k /tmp/pgsock" start

# 2) testai
PGHOST=/tmp/pgsock PGPORT=55432 PGUSER=postgres npm run progression:test

# 3) statinė ekonomikos/kontrakto validacija (be DB)
npm run progression:check
```

- `supabase/tests/_bootstrap.sql` — **produkcijos formos** schema snapshot
  (frakcijos id 6–14, rarities id 6–10 su `sort_order` 1–5 ir `copy_limit` 2/2/2/1/1),
  `auth.uid()` stubas per sesijos GUC, 180 kortų katalogas, v1 login progresas backfill'ui.
  Šis failas **nėra migracija** ir niekada neleidžiamas prieš produkciją.
- `supabase/tests/test_00..05_*.mjs` — 76 patikros:
  backfill sauga · login ciklas (31 d., praleistos dienos, 7/21/31 pasirinkimai,
  idempotencija, 8 lygiagrečios užklausos) · season (eligibility, retroaktyvus pass,
  Claim All sustojimas ir tęsimas, spragų registras) · quests (generavimas,
  PvP/frakcijos filtrai, reroll 0/100/100/deny, patvirtinimas dėl progreso, skrynia,
  lygiagretumas) · boosteris (10 kortų, 8+2, garantuotas slotas, copy limit,
  kompensacija) · saugumas (svetimi claim'ai, RLS, `pg_proc` parametrų auditas).

## 10. UI prijungimas (dizaino handoff'as gautas 2026-07-25)

Šaltinis: `Raveknof Digital Phase 5 continuation/ravenof-progression-handoff`
(`IMPLEMENTATION.md`, `PROGRESSION-DATA-CONTRACT.md`, `screens/01…20`).

| Ekranas | Route | Komponentas |
|---|---|---|
| Prisijungimo dovanos | `/digital/rewards` | `components/digital/progression/LoginRewardsScreen.tsx` |
| Sezono kelias | `/digital/season` | `components/digital/progression/SeasonPathScreen.tsx` |
| Dienos užduotys | `/digital/quests` | `components/digital/progression/DailyQuestsScreen.tsx` |
| Pasirinkimų langai | — | `components/digital/progression/ChoiceModals.tsx` |
| Bendri elementai | — | `components/digital/progression/kit.tsx` |

- Trys **atskiri** route'ai; jokio bendro „rewards hub'o", jokių tabų tarp jų.
- Shell (`app/digital/layout.tsx`) nekeistas — pridėti tik 3 nauji route'ai į
  `MIGRATED_ROUTES`. Įėjimai: `MoreScreen` („Daugiau") ir `DigitalHub` mygtukai.
- Dizaino tokenai (`--rvn-*`) ir `rvIn/rvGlow/rvSpin/rvSkel` gyvena `ravenof-ui.css`.
  Įėjimo animacija — **tik opacity**; `prefers-reduced-motion` viską išjungia.
- Atlygių ikonos **tik** iš centrinio registro `src/lib/rewards/rewardVisuals.ts`
  (`resolveRewardVisualV2`) — emoji neleidžiami, nežinomas tipas → `fi-gifts`.
- Modalai: Escape, focus trap ir fokuso grąžinimas (`ProgressionModal`).
- `npm run progression:check` tikrina, kad progresijos komponentuose **nėra**
  hardcodintų atlygio sumų (`amount:` / `quantity:` / `+N` JSX tekstuose).
- Pašalinti v1 komponentai: `QuestsModal`, `SeasonPassModal`, `MonthlyLoginModal`,
  `SeasonPathModal`, `DailyTasksModal` — jų įėjimai perjungti į naujus route'us.

### Vizualinė verifikacija

`artifacts/ravenof-progression/` — 17 ekrano nuotraukų (LT+EN @1536×720 ir
1366×768 / 1280×720 / 1024×600 / 844×390). Visuose: `hOverflow 0`, `vOverflow 0`,
0 pageerror, jokių <44px lietimo taikinių turinyje, jokio nukirsto teksto.

## 11. Likusios spragos (gap report)

| # | Spraga | Poveikis | Ką reikia |
|---|---|---|---|
| 1 | **Kovos telemetrija** — `matches` neturėjo kortų/žalos statistikos | „Iškviesk padarus", „Padaryk žalos", „Frakcijos pergalė" questai **negeneruojami** (`enable_stat_objectives = false`) | Prijungti `reportMatchStats()` kovos pabaigoje (reikia liesti combat kodą — šioje užduotyje uždrausta) ir įjungti vėliavą |
| 2 | **Sezoninė kosmetika** | 12 lygio Card Back ir 20 lygio Player Avatar praleidžiami | Sukurti `cosmetics` įrašus ir priskirti `season_pass_seasons.card_back_cosmetic_id` / `avatar_cosmetic_id`, tada `rvn_admin_refresh_season_rewards()` |
| 3 | **Match Season XP** | `rvn_report_match_v2` (v1, gyvas) vis dar duoda `season_xp` už kovas; specifikacija sako, kad šiuo etapu Season XP tik iš questų/skrynios | Produkto sprendimas: palikti ar išjungti `economy_config.match_rewards.*.season_xp` (nekeičiau — tai gyvos ekonomikos pakeitimas) |
| 4 | **PvP prieinamumo kriterijus** | Naudojamas `digital_onboarded_at is not null` | Patvirtinti tikrą PvP atrakinimo sąlygą; keičiama `daily_quests_v2.generation` |
| 5 | **Kortų katalogo pilnumas** | Jei kuriai nors rarity nėra bent 1 Light ir 1 Dark kortos, pool'as bus trumpesnis | `progression_content_gaps` registruoja; reikia turinio, ne kodo |
| 6 | ~~v1 UI naudoja v1 RPC~~ | **Išspręsta 2026-07-25** — visi trys ekranai perjungti į `@/lib/progression` | — |
| 7 | **Nėra skrynios / sutarčių iliustracijų** | Skrynia naudoja registro `fi-gifts.png`, questų fonai — 2 esami `backgrounds/*.webp` | Dizaino komandai: skrynios artas + 3 kategorijų iliustracijos |
| 8 | **`schema.sql` seed'ai pasenę** | Švarus bootstrap sukurtų DB su EN frakcijomis id 1–5 | Ne šios užduoties apimtis; užfiksuota testų stende |
