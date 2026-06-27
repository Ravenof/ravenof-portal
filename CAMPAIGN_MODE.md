# Ravenof — Campaign Mode

Generic, data-driven single-player story system. Campaigns → chapters → nodes
(missions) rendered on the Atlas world map. Battles run through the **existing**
`TutorialGame` engine; scenario/wave/objective data lives in node JSONB, so new
campaigns and missions need **no code changes**.

> Built incrementally and safely. When `TutorialGame` is launched without the
> new `onCampaignResult` prop, behaviour is 100% unchanged — zero regression to
> standard card battles.

---

## 1. Changed / added files

**Database (run these in Supabase, in order):**
- `supabase/migrations/20260707_campaigns.sql` — tables (`campaigns`,
  `campaign_chapters`, `campaign_cutscenes`, `campaign_nodes`,
  `campaign_progress`), RLS, and RPCs `rvn_campaign_state`,
  `rvn_campaign_complete_node`, `rvn_campaign_mark_cutscene` (rewards reuse the
  existing `rvn__grant_payload`).
- `supabase/migrations/20260708_campaign_prazaras_seed.sql` — the sample
  Prazaras / Varnagrad campaign (draft).

**Shared logic — `src/lib/campaign/`:**
- `types.ts` — all data models (Campaign, Chapter, Node, BattleConfig,
  ScenarioConfig, ScenarioWave, Cutscene, RewardPayload, MissionObjective, …).
- `scenarioEngine.ts` — pure scenario rule engine (triggers → effects), objective
  scoring → 1–3 stars.
- `waveEngine.ts` — wave resolution (turn-based, not real-time TD).
- `missionLoader.ts` — Supabase IO, row↔model mapping, node-state computation.
- `validate.ts` — admin validation (errors/warnings).

**Player — `src/components/digital/campaign/` + routes:**
- `CampaignList.tsx`, `CampaignMap.tsx`, `MissionIntroPanel.tsx`,
  `CutscenePlayer.tsx`, `CampaignRuntime.tsx`, `CampaignMapScreen.tsx`.
- Routes: `src/app/digital/campaign/page.tsx`,
  `src/app/digital/campaign/[slug]/page.tsx`.
- `src/components/digital/DigitalHub.tsx` — **modified**: added the "Kampanija" tile.

**Admin — `src/components/admin/campaign/` + routes:**
- `AdminCampaignsList.tsx`, `AdminCampaignEditor.tsx` (Settings · Map & Nodes ·
  Cutscenes · Validation), `AdminCampaignMapEditor.tsx`, `AdminNodeEditor.tsx`,
  `AdminCutsceneEditor.tsx`.
- Routes: `src/app/admin/campaigns/page.tsx`,
  `src/app/admin/campaigns/[campaignId]/page.tsx`.
- `src/app/admin/page.tsx` — **modified**: added "🗺️ Kampanijos" nav link.

**Engine hook — `src/components/tutorial/TutorialGame.tsx` (modified):**
- Added optional `onCampaignResult?: (r: CampaignBattleResult) => void`. Fires once
  when a battle ends, reporting result + turns + stats. Absent ⇒ no behaviour change.

---

## 2. How to create a new campaign
1. Admin → **🗺️ Kampanijos** → type a title → **+ Sukurti**. You land in the editor.
2. **Nustatymai** tab: set slug, description, related factions, cover/map image
   (leave map blank to use the Atlas world map), and **Matomumas = active** to make
   it visible to players. Add chapters/acts here.
3. Click **💾 Išsaugoti viską** (saves campaign + all nodes + all cutscenes).

## 3. How to create a new mission (node)
1. In the editor open **🗺️ Žemėlapis ir mazgai**.
2. **Click the map** to drop a node; **drag** it to reposition (saved as x/y %).
3. Select the node → right panel (`AdminNodeEditor`):
   - **Pagrindai**: title, lore, mission type, icon, chapter, status, unlock rule,
     pre/post/failure cutscene.
   - **Kova**: player deck mode, enemy source (faction / deck id / waves / boss),
     enemy faction, difficulty, turn limit.
   - **Tikslai**: add primary + secondary objectives (kind + params, e.g.
     `{"turns":8}`).
   - **Atlygis**: gold / XP / boosters / min-rarity card / specific card ids /
     codex unlocks.
   - **Advanced JSON**: full `battleConfig` + `scenario` (waves, gate/wall HP,
     starting board, rules). Click **Pritaikyti JSON**.
4. **Connect nodes**: select a node → **🔗 Jungti iš šio mazgo** → click the target.
5. Set one node as **★ Pradinis** (start node). **Save all.** Use the **Validacija**
   tab to catch missing pieces.

## 4. How to add a cutscene
1. **🎬 Cutscenes** tab → **+ Nauja cutscene**.
2. Set type, skippable/autoplay, background image/video, music, ambient.
3. Add steps: side (left/right/center/narrator), character name, text, portrait URL,
   voice URL. Reorder with ↑/↓.
4. Assign it on a node (**Pagrindai → Pre/Post/Fail-cutscene**). Save all.

## 5. How to create a wave-defense mission
1. New node, **Mission type = WAVE_DEFENSE** (or WALL_DEFENSE).
2. **Kova**: enemy source = **Bangos (scenario)**, pick the enemy faction (used for
   the live battle deck).
3. **Advanced JSON → scenario**:
```json
{
  "survivalTurns": 8,
  "objectives": [{ "id": "gate", "kind": "gate", "label": "Vartai", "hp": 20, "maxHp": 20, "side": "player" }],
  "waves": [
    { "id": "demon_wave_01", "name": "Pirmoji banga", "triggerType": "turn", "turn": 2, "spawnSide": "top", "warningText": "Banga artėja!", "mustClear": true, "unitPool": ["<card-uuid>", "<card-uuid>"] }
  ]
}
```
4. **Tikslai**: add `survive_turns` (`{"turns":8}`) and/or `protect_objective`
   (`{"objectiveId":"gate","hp":10}`).

## 6. How to test the sample Prazaras campaign
1. Run both migrations (`20260707_campaigns.sql`, then the seed).
2. The sample is created as **draft**. Either: Admin → Kampanijos → open it →
   Nustatymai → **Matomumas = active** → Save; or play it as admin (admins can see
   drafts). Slug: `prazaro-kilme-varnagrado-uzrakinimas`.
3. Player: **Digital → Kampanija → Prazaro kilmė** → start at *Sargybos bokšto
   įspėjimas*. You'll see: story-only node + intro cutscene → standard battle →
   ambush → gate defense → wave defense → boss → branching story node → wall defense
   → final survival → ending cutscene. Stars, rewards and node unlocks persist per user.

---

## 7. Known limitations / extension points
- **Deep in-battle scripting** (live wave spawning, gate/wall HP damage, preplaced
  boards, in-battle dialogue) is **not yet wired into the live `TutorialGame`
  board**. Advanced mission types currently play as a standard battle vs. the
  configured enemy faction, and their objectives are **scored from real battle
  stats** (turns survived, kills, spells used, HP remaining). The foundations are
  ready: feed `BattleSnapshot`s from the engine into
  `scenarioEngine.runTrigger()` / `waveEngine.wavesForTurn()` and apply the
  returned `ScenarioEffect`s to the board. The hook point is the `battle` phase in
  `CampaignRuntime.tsx` and the engine events in `TutorialGame.tsx`.
- **Player deck selection**: campaign battles use the player's most-recently-edited
  deck (or a story deck via `battleConfig.storyDeckId`). A pre-mission deck picker /
  "edit deck before mission" UI is a future addition.
- **Custom battle-map rendering** (background art, lanes, objective HP bars,
  incoming-wave markers) is modelled in `ScenarioConfig.battleMap` but not yet
  drawn on the board.
- **Asset upload widgets** in the cutscene/node editors currently accept **URLs**
  (paste a Supabase Storage URL). A drag-drop uploader can be added like the
  existing `CinematicUpload`/`VoiceLinesUpload` widgets.
- Reward extras beyond `rvn__grant_payload` ({gold,exp,boosters,cardMin}) — specific
  `cards[]`, cosmetics, faction rep, codex — are stored and shown but only the core
  payload is auto-granted by the RPC; wire the extras into `rvn__grant_payload` or a
  campaign-specific grant when those systems are ready.
- To add a **new mission type**: extend the `MissionType` union in `types.ts`, add a
  branch in `CampaignRuntime.tsx`, and (optionally) scenario rules — no schema change
  needed.

---

# Canon content pass — "Prazaro kilmė: Varngrado užrakinimas"

The sample campaign was rebuilt to match the **Varngradas novel / Atlas timeline**
(source folder: Drive → Ravenof → Lore → "Varngrado plyšys"). Canon was taken from
`Ravenof_Varngradas_Atlaso_gaires.xlsx` (full event/character/fate table) plus the
chapter documents. Nothing was invented from memory.

## What changed in this pass
- **DB migration** `supabase/migrations/20260709_campaign_canon_fields.sql` — adds
  admin-only canon fields to nodes (`source_chapter`, `source_event_ids`,
  `canon_summary`, `canon_characters`, `canon_locations`) and a `seed_key` column on
  nodes/chapters/cutscenes (campaigns use `metadata.seedKey`) for safe-merge.
- **Seed file** `src/data/campaignSeeds/prazarasVarngradasCampaign.ts` — the full
  canon campaign: 18 nodes (Prologas → Epilogas), rewritten cutscenes in Ravenof
  voice, objectives, scenario configs, rewards, canon/source notes, and the 3 lore
  deck packages + Demonų orda enemy packages.
- **Seed types** `src/lib/campaign/seedTypes.ts`; **rebuild engine**
  `src/lib/campaign/seedRebuild.ts` (safe-merge / reset).
- **Admin**: node editor gained a **📖 Kanonas** tab; campaigns list gained a
  **Seed / Rebuild** panel (🔁 Saugus sujungimas / ♻️ Pilnas perrašymas).
- **Validation**: canon checks (active node needs a source chapter; major node needs
  a cutscene; **final node must have Belzatoras retreat, not death**; Varngradas
  spelling consistency; Prazaras not written as an undead villain).
- **Naming**: standardized to canon **Varngradas** (world = Ravenoras). The app had no
  prior "Varnagradas" convention — only the old generic seed used it; that seed is
  superseded and removed by ♻️ Pilnas perrašymas.

## How to (re)build the canon campaign
1. Run migrations `20260707`, `20260708` (legacy), `20260709` in Supabase.
2. Admin → 🗺️ Kampanijos → **🔁 Saugus sujungimas** (creates missing rows, fills
   blanks, **never** overwrites your manual text/positions) or **♻️ Pilnas
   perrašymas** (overwrites everything from the seed + removes the old generic sample).
3. Open the campaign, set **Matomumas = active** to publish.

## How to edit campaign content manually in admin
All content is editable in the builder (Settings · Map & Nodes · Cutscenes ·
Validation). Manual edits survive 🔁 Saugus sujungimas. To intentionally discard
manual edits and return to canon, use ♻️ Pilnas perrašymas. Each node's **📖 Kanonas**
tab shows the source chapter, Atlas event ids, canon summary, characters and locations.

## Canon notes / decisions
- **Prazaras = Varngrado *maršalas*** (the Atlas and every chapter call him this;
  Oglor'as even imitates "maršalo balsą"). Your brief said "kapralas/corporal" — I
  followed the priority-#1 source (the Atlas xlsx) and used **maršalas**. Change it in
  the seed if you prefer the corporal framing.
- **Belzatoras** is the canon spelling (Atlas + ch. IV/VIII/XVI). The Prologue doc uses
  an early variant "Belzoras" once; standardized to **Belzatoras**.
- Ending is canon: Belzatoras is **wounded and retreats** (not killed); the ring stays
  closed; only Silelora's message channel remains; Tylos protokolas begins. Validation
  enforces "no Belzatoras death in the final node."

## Known limitations (this pass)
- **Story-deck cards are design data, not DB cards yet.** The 3 deck packages
  ("Varngrado gynėjai / Trijų jėgų frontas / Varngrado Užraktas") are encoded as the
  lore-accurate target in the seed (`deckPackages`). Battles currently run with the
  player's collection deck vs. **Demonų orda** faction decks. Creating the ~70
  campaign-only cards (with gameplay JSON) is the explicit next step the brief
  deprioritized; the data is ready to drive it.
- **Wave/gate/objective HP** are modelled in each node's `scenario` (waves, objective
  HP, survivalTurns) and scored from real battle stats, but live in-battle spawning /
  gate-damage on the board is still the documented engine extension point.
- **Cutscene/asset uploads**: the editor exposes URL slots for portraits, backgrounds,
  video, voice, music and ambient (data model complete). Drag-drop upload widgets
  (like the existing CinematicUpload) are a follow-up.
- **Sources read in full**: Atlas xlsx + Prologue, IV, VIII, XIV, XVI, Epilogue. For
  chapters I/II/III/V–XIII/XV I used the Atlas event table (E01-xx … E15-xx), which
  documents each chapter's events, participants, locations and fates. If you want
  every cutscene line drawn verbatim from those chapters, point me at them and I'll do
  a line-level pass.

⚠️ **Security note (unrelated to code):** while listing your Drive I saw a readable
Firebase **service-account private key** (`ravenof-firebase-adminsdk-…json`) and a
Supabase password file in the "APP" folder. Rotate that key and move secrets out of
Drive — anyone with access to that folder can use them.

---

# Line-level cutscene pass + campaign-only cards (follow-up)

## Cutscene pass
All 18 chapter documents were read in full from Drive. Cutscenes for every node
were rewritten with **authentic, near-verbatim lines** from the novel (compact
Ravenof style — key sentences only, not full prose). Examples now in the seed:
Konstancijus "Liudiju…", Belzatoras "Jūs ne miestas. Jūs kapas su ginklais",
Velnio advokatas "Jūs sudaužėte indą, bet ne alkį", the closing
"Vardas? / Prazaras. Varngrado maršalas. / Pareiga? / Laikyti."

**Canon fix:** Saldas's death (impaling Belzatoras) is in **chapter XI**
("Kai šviesa užsidaro"), not X. Node 10 = first wounding (gates collapse, chains,
lanterns, falling rubble) with Saldas wounded-but-alive; node 11 = the "paaukota
zona" declaration **and** Saldas's fatal spear thrust. Node 10/11 lore + the
cs10/cs11 cutscenes were corrected.

## Campaign-only cards
`supabase/migrations/20260710_campaign_varngradas_cards.sql` — **49 real `cards`
rows** (card_number `VRN-001…VRN-109`, `status='active'`):
- **Pkg 1 "Varngrado gynėjai"** (Universalus): champion *Prazaras, Varngrado
  maršalas* + defenders, walls, names, rescue spells.
- **Pkg 2 "Trijų jėgų frontas"** (Inkvizicijos legionas + Šviesos pulkas):
  Madelius, Konstancijus, Eleonora, Gunteris, Doriana, lanterns, witness,
  "Balta šviesa" (with its canon downside to your own units), "Grandinės ir balista".
- **Pkg 3 "Varngrado Užraktas"** (Universalus): objective/sacrifice/name cards,
  "Užrakintųjų sprendimas", "Liudiju", "Prazaro žaizda" (risk object, not a buff).
- **Demonų orda enemy package**: Impas, Dyglių velnias, Maro kirminas, Okuliaras,
  Oglor'as, Regnaras, and boss **Belzatoras** (can't be permanently killed).

Cards reference the **live factions** (Universalus / Inkvizicijos legionas /
Šviesos pulkas / Demonų orda), real types (Padaras/Burtas/Čempionas/Reakcija/
Artefaktas/Laukas) and rarities (Paprastas…Legendinis). The battle engine derives
keywords from `effect_text` (Pasišaipymas→taunt, „Kovos šūksnis"→battlecry,
Greitis→sprint, Sėlinimas→stealth, …) — so these cards are immediately playable as
keyworded units/spells.

The migration also builds **3 story decks** (`[Kampanija] Varngrado gynėjai / Trijų
jėgų frontas / Varngrado Užraktas`), owned by the first admin profile, with
`deck_cards`. The **Seed/Rebuild** tool now resolves each node's `storyDeckPackage`
→ deck id and sets `battle_config.storyDeckId` + `playerDeckMode='story'`, so
campaign battles use the **canon story deck** (not a random modern collection).

### Run order
1. `20260707_campaigns.sql`, `20260708_*` (legacy), `20260709_*` — campaign system.
2. **`20260710_campaign_varngradas_cards.sql`** — cards + story decks.
3. Admin → 🗺️ Kampanijos → **🔁 Saugus sujungimas** (or ♻️ Pilnas perrašymas) to
   (re)apply the canon seed and wire the story decks.

### Known limitations (cards)
- Card **keywords** work from text; **deeper effects** (exact žala/gydymas/summon
  numbers, champion skill buttons) need `cards.gameplay` JSONB, addable per-card in
  the admin Gameplay editor. The cards play as keyworded vanilla units/spells until
  then.
- Story decks are owned by the **first admin profile**; if no admin exists the
  migration creates the cards but skips decks (and logs a NOTICE).

## Card gameplay wired (effects fire in battle)
`supabase/migrations/20260711_campaign_card_gameplay.sql` sets `cards.gameplay`
(JSONB, shape = `src/lib/game/types.ts` GameplayConfig) on ~38 key cards so their
effects actually run in the TutorialGame engine:
- **Battlecries** (onSummon): Vartų arbaletininkas (1 žala), Karantino prižiūrėtoja /
  Ema (gydymas), Madelius (2 žala + 1 sau), Eleonora/Oglor'as (silence), Sandėlių
  nešikas (+auksas), Grandinių nešėjas (freeze)…
- **Deathrattles** (onDeath): Saldas (+1/+1 visiems), Konstancijus (+0/+2), Maro
  kirminas (1 žala priešams), Liudiju.
- **Spells** (onCast): Akmenys nuo sienos (AoE 1), Balta šviesa (3 priešams + 1 sau —
  canon kaina), Grandinės ir balista (6 bosui), Užrakintųjų sprendimas (+0/+2 +taunt),
  Paskutinė rikiuotė (+2 atk end-of-turn), Uždaryti vartus (freeze)…
- **Static keywords/auras**: taunt (sargybinis, riteris, dyglių velnias), sprint
  (Doriana, Impas), stealth (Regnaras, Juodo dūmo nešėjas), Gunteris (+1 atk aura).
- **Champion skills**: **Prazaras** (Kelkite vartus / Rikiuotė prie sienos / Niekas
  nepalieka spragos) and boss **Belzatoras** (Kirvio smūgis / Juodo dūmo banga /
  Plyšio riaumojimas), both `champion_phase=3` so all three unlock.

Safe-merge: only writes `gameplay` where it's null/empty (won't clobber admin edits).
Adds `gameplay/subtype/champion_group/champion_phase` columns `if not exists`.
Run after `20260710`. Remaining cards (fields, a few utility spells) still play from
keywords; enrich any of them later in the admin Gameplay editor.
