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
