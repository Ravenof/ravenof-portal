# HANDOFF → Claude Code: Sequential Battlecry summons + Reaction trigger-source targeting + Reaction chain animation

**Task type:** gameplay resolution / effect-queue / admin + DB / battle animation.
**NOT a UI redesign. NOT a balance pass.**

---

## ⚠️ THE ONE REQUIREMENT THAT MATTERS MOST

The point of this task is **not** the `700 ms` and `2000 ms` numbers.

The point is that the **effect resolution queue must genuinely await the animation**.

A cosmetic `setTimeout` in a React component is an explicit FAIL condition. If damage, destruction, a status effect or a stat change is applied to game state while the chain is still visually travelling across the board, the implementation is wrong — even if it "looks right" in one manual test.

Required property:

- the visual animation and the gameplay resolution share **one authoritative completion signal**;
- `applyReactionEffect()` is called **after** that signal resolves, never before;
- if the animating component unmounts, the battle is left, or the animation is interrupted, the queue must **still resolve/settle** (never leave the battle permanently locked);
- the same holds for the sequential Battlecry chain: each summon is **committed to real battle state at its own moment**, not pre-committed and merely hidden.

---

## Part 0 — Repo context you must respect (Ravenof-specific)

Read these before touching anything; they are hard project rules, not style preferences.

### 0.1 File editing

- **Do ALL file edits in this repo via bash** (`cat > file << 'EOF'`, `python`), **never via the Write/Edit tools.** The Windows folder and the bash mount do not sync symmetrically; mixing the two on the same existing file truncates it (this has already happened once, mid-JSX).
- Deletes fail in bash (`Operation not permitted`) — clean untracked files with `git clean` inside a Windows `.bat`.
- Verification runs in bash: `npx tsc --noEmit`.

### 0.2 Commits

- Commits are made through a Windows `.bat` file in the repo root, following the existing numbering (`git-commit521.bat`, `git-commit522.bat`, …). Create the **next free number**, do not run `git commit` directly.
- Migrations live in the Supabase migrations folder with date-style prefixes; the last known ones are `20260840`–`20260845`. Use the **next free number** (e.g. `20260846_reaction_target_mode.sql`). Migrations in this project are applied manually by the owner — mark it clearly as PENDING in the completion report.

### 0.3 Localization (LT/EN) — this project has a custom i18n core

- i18n module: `src/lib/i18n/` (own implementation, **not i18next** — do not add a library).
- New keys must be added to **both** `src/locales/lt/*.json` and `src/locales/en/*.json`.
- Validate before commit: `node scripts/i18n-validate.mjs` and `npm run i18n:check`.
- **CRITICAL for the battle log:** log entries are stored **structurally** as `GameEvent.key` + `params` (`msg` is deprecated). Text is produced at render time via `src/lib/tutorial/logText.ts` (`eventText`, `ltext`, `resultText`). Every new battle-log line in this task (Battlecry activation, each summon, failed summon, reaction triggered, reaction lost its target) **must be a key + params**, never a hardcoded LT/EN string, and never something a later regex has to parse.
- FX / cinematic selection in `TutorialGame` must branch on `e.key`, **never** on log text.
- Namespaces already in use: `battleLog`, `statusEffects`, `battle`.

### 0.4 Existing systems to reuse, not reinvent

- Status VFX registry + `CardStatusVfxLayer` + `statusEvt` bus (13 statuses) — the post-chain effect visuals should route through the existing effect/status visual system.
- `GameCard` + `src/lib/ui-sound.ts` must be used for all card UI and card audio.
- Combat UI is **landscape/horizontal by default**; source/target positioning must work in that layout at current board scaling.
- Card effect parsing (`parseEffect` / `detectKeywords`) works on **LT** `effect_text`; `effect` / `mappings` / `CardPool.byName` stay LT. Do not "translate" anything the engine keys on.

### 0.5 Investigation before implementation (report what you found)

Inspect and document the current implementation and file paths of:

- creature summoning; Battlecry resolution; effect queues; nested effects;
- reaction trigger detection; reaction target resolution; reaction reveal animation;
- admin card/effect mapping; card-effect DB schema;
- battle animation state; action locking; combat logs;
- replay / deterministic battle state, if present.

Write down the **current resolution flow** before changing it.

---

## Part 1 — Sequential Battlecry summons

### Current problem

When a creature with a Battlecry summons additional creatures, the original creature and all summoned creatures appear or resolve too close together — sometimes effectively simultaneously. The Battlecry is unreadable and does not feel caused by the original creature.

### Required sequence

1. The original creature is summoned first.
2. Its normal summon animation completes.
3. The Battlecry is visibly triggered.
4. Wait `700 ms`.
5. Summon the first creature produced by the Battlecry.
6. If another creature must be summoned, wait another `700 ms`.
7. Summon the next creature.
8. Continue one by one until all Battlecry summons are resolved.

```text
Original creature enters
→ Battlecry activates
→ 700 ms
→ Summoned creature 1 enters
→ 700 ms
→ Summoned creature 2 enters
→ 700 ms
→ Summoned creature 3 enters
```

Do **not** spawn all Battlecry-created creatures simultaneously.

### Gameplay resolution requirement

This must not be a visual-only fake delay. Each creature produced by the Battlecry must be added to the **actual battle state** sequentially, at the moment its individual summon resolves. The next summon must not be committed to the board early and merely hidden until its animation.

This matters because:

- available board slots may change;
- summoned creatures may trigger effects;
- creatures may die during resolution;
- buffs or auras may change between summons;
- combat logs must reflect the true order;
- nested Battlecries must remain deterministic.

### Nested Battlecries

If a creature summoned by another creature has its own valid Battlecry, resolve that summoned creature's entry **and** its Battlecry completely before continuing to the next remaining creature in the parent summon queue. Use deterministic depth-first resolution **unless** the current Ravenof rules engine already has an explicit stack/queue rule that must be preserved (if so, preserve it and document it).

```text
Creature A enters
→ A Battlecry begins
→ 700 ms
→ Creature B enters
→ B Battlecry resolves completely
→ 700 ms
→ Creature C enters
```

Two summon chains must never animate or resolve in parallel.

### Board capacity

Before **every individual** summoned creature enters:

- re-check the currently available creature slots;
- use the existing slot-selection rules;
- do not reserve every slot at the start of the Battlecry;
- if no valid slot remains, skip or fail that individual summon according to existing card-effect rules;
- add a clear battle-log entry (key + params) for the failed summon.

Never overwrite an occupied creature slot.

### Animation locking

During a sequential Battlecry summon chain:

- prevent the player from starting another gameplay action;
- prevent End Turn;
- prevent another card from being selected or played;
- allow only already-safe non-gameplay controls (e.g. opening/scrolling the battle log);
- release the gameplay lock only after the full effect queue has resolved.

Avoid arbitrary blocking timeouts scattered across components — use the game's **central** effect-resolution / animation queue.

### Battle log

The log must preserve the true order:

```text
Player summons "Original Creature".
"Original Creature" activates Battlecry.
Battlecry summons "Creature One".
Battlecry summons "Creature Two".
```

Do not write all summoned-creature entries before their actual board entry. (Keys + params, per 0.3.)

### Timing constant

Centralized named constant, not `700` hardcoded in several files:

```ts
const BATTLECRY_SEQUENTIAL_SUMMON_DELAY_MS = 700;
```

Use the repository's existing conventions for constants.

---

## Part 2 — Reaction effect limited to the triggering card

### Admin option

In the Admin interface where reaction effects are configured/mapped, add a checkbox.

Lithuanian label:

```text
Efektas taikomas tik reakciją suaktyvinusiai kortai
```

English label:

```text
Effect applies only to the card that triggered the reaction
```

Helper description — Lithuanian:

```text
Kai įjungta, reakcijos efektas automatiškai taikomas tik tai kortai, kurios veiksmas suaktyvino reakciją.
```

English:

```text
When enabled, the reaction effect automatically targets only the card whose action triggered the reaction.
```

(Both labels and both helper texts go into the LT and EN locale JSONs — no hardcoded strings.)

### Data model

Persist as an explicit boolean or a clearly defined target mode:

```text
effect_applies_to_trigger_source: boolean
```

or:

```text
reaction_target_mode: normal | trigger_source
```

Inspect the current schema and choose the **least disruptive** implementation. A target-mode enum is preferable if the system already has several target behaviours; a boolean is acceptable if reactions currently need only this one additional distinction.

### Backward compatibility

Existing reaction cards must behave **exactly** as they do now. Default for all existing records preserves old behaviour (`false` / `normal`). Do not silently change existing reaction targets.

If a migration is required: make it safe for existing data, use a backward-compatible default, update generated types, update admin reads and writes, update runtime effect mapping, and document the migration.

### Runtime meaning

When enabled:

- the reaction effect resolves automatically against the exact card that triggered the reaction;
- no manual target selection opens;
- no retargeting to another legal card;
- no random target;
- not applied to every card of the same type;
- preserve the triggering card's **unique runtime entity ID**, not merely its card definition ID (several copies of the same card may be in play).

### Trigger context

The reaction-resolution context must retain enough information to identify:

- the reaction card;
- the player who owns the reaction;
- the exact triggering action;
- the exact triggering card **instance**;
- the triggering card's current zone;
- the intended reaction target.

Never rediscover the target later by card name or card definition ID.

### Invalid or disappeared trigger source

The triggering card may change zone, be destroyed or become invalid before the reaction resolves:

1. Keep its stable runtime entity ID in the reaction context.
2. At effect-resolution time, check whether the effect can still legally apply.
3. If still valid → apply.
4. If no longer valid → resolve according to existing Ravenof invalid-target rules.
5. Never silently redirect to another target.
6. Add a battle-log message when the reaction loses its target.

Must not crash and must not leave the resolution queue locked.

---

## Part 3 — Reaction chain animation and delayed effect

### Current problem

Reaction effects resolve too immediately / without a readable visual sequence. The player needs to clearly see which reaction activated, which card triggered it, which card receives the effect, and when the effect actually resolves.

### Required sequence

1. Lock further gameplay actions.
2. Reveal / highlight the reaction card.
3. Clearly identify the triggering target card.
4. Animate a chain travelling from the reaction card to the target card.
5. The chain reaches the target and wraps around it.
6. The full animation lasts exactly `2000 ms`.
7. Only when the animation completes may the gameplay effect be applied.
8. Show the effect result.
9. Complete reaction cleanup and move the reaction card to its correct zone.
10. Release the lock or continue with the next queued effect.

```text
Reaction detected
→ reaction revealed
→ chain animation starts
→ chain reaches and wraps around target
→ 2000 ms animation completes
→ reaction effect is applied
→ resulting damage/status/change is shown
→ resolution continues
```

The effect must **not** be applied at animation start.

### Animation specification

A reusable reaction-targeting animation:

- a dark metallic or spectral chain originates from the revealed reaction card;
- it travels along a clear curved path toward the target;
- it reaches the target card;
- it wraps around the target card or its board frame;
- the target receives a brief tightening pulse / impact;
- after the wrap completes, the gameplay effect resolves.

Must fit the established Ravenof stylised-gothic interface. Avoid: generic lightning; a straight debug line; bright sci-fi lasers; a chain that appears instantly with no travel; an effect that obscures the whole board.

### Animation duration

```ts
const REACTION_CHAIN_ANIMATION_DURATION_MS = 2000;
```

The effect-resolution promise/queue must wait for the **animation completion event**. Do not implement this as an unrelated `setTimeout` that can desynchronize from component unmounting or interrupted battles. Prefer: an animation controller; a promise-based effect queue; a transition-completion callback; the project's existing battle animation scheduler.

### Source and target positioning

Dynamically calculate the reaction card's rendered source position, the target card's rendered position, current board scaling, viewport position, and any battle-log overlay / responsive offset. Do not hardcode one fixed chain path from a single screenshot.

Must work when the reaction card is in any valid reaction slot, owned by either player, activated on either half of the board. Must work when the target card is in the player's hand, on the player board, on the enemy board, or in another visible supported zone if current reaction rules allow it.

If a valid trigger source is not currently visible, use a **documented fallback** animation anchored to the relevant zone indicator — never a chain toward an arbitrary screen coordinate.

### Reaction card lifecycle

Keep the reaction card visibly present/revealed while the chain animation plays; do not remove it from the reaction slot before the chain has visibly originated from it. After the effect is applied: use the current reaction-consumption rules, move the card to the graveyard or other destination, update counters, clear highlights, continue the resolution queue.

### Multiple reactions

Resolve one at a time; never play multiple chain animations simultaneously; use the existing reaction priority order; each reaction gets its own full animation + effect-resolution step; continue only after the preceding reaction has fully resolved.

```text
Reaction A reveals
→ 2-second chain animation
→ A effect resolves
→ Reaction B reveals
→ 2-second chain animation
→ B effect resolves
```

If Reaction A causes another reaction, preserve the existing stack/priority semantics, but never overlap the visual resolution.

### Effect-specific visuals

The chain is the **common reaction-targeting intro**. After the two seconds, run the existing effect-specific visual (damage, stat change, destruction, silence, status effect, card movement, cancellation, or other mapped effect). Do not replace every reaction effect with only a chain — the chain communicates targeting; the mapped effect still communicates the result.

---

## Part 4 — Combat-state architecture

Do not solve any of this with independent page-level timers. Inspect whether the combat engine already has: an effect stack; a resolution queue; an animation queue; a pending action; an interaction lock; a battle event dispatcher; visual event promises. Integrate with the correct central system.

Sequences should be expressible as ordered events, conceptually:

```ts
await summonOriginalCreature();
await playBattlecryActivation();

for (const summon of battlecrySummons) {
  await delay(BATTLECRY_SEQUENTIAL_SUMMON_DELAY_MS);
  await resolveSingleSummon(summon);
}
```

and:

```ts
await revealReaction(reaction);
await playReactionChainAnimation({
  sourceReactionId: reaction.runtimeId,
  targetEntityId: triggerSource.runtimeId,
  durationMs: REACTION_CHAIN_ANIMATION_DURATION_MS,
});

await applyReactionEffect(reaction, triggerContext);
```

Conceptual examples only — adapt to the existing architecture. Gameplay state, animation state and network synchronization must remain deterministic.

---

## Part 5 — Networking and multiplayer safety

If battles can run in PvP or synchronized multiplayer:

- never use local visual timers as the source of gameplay truth;
- preserve server-authoritative or deterministic event ordering;
- send/consume ordered battle events;
- let each client visually await the same event sequence;
- prevent duplicate effect application after reconnection;
- prevent the same reaction from resolving twice;
- ensure animation delays do not create gameplay desynchronization.

The two-second reaction animation is a **presentation delay before local display of an already-authorized resolution**, not permission for clients to independently compute different results. Document how the existing networking model is preserved.

---

## Part 6 — Admin implementation

Update every necessary layer: form UI; validation schema; card-effect type; API request; API response; DB persistence; edit-existing-card population; create-card defaults; duplication / copy-card behaviour; CSV import/export if reaction mappings appear there; generated TypeScript types; localization (LT + EN).

- Opening an existing reaction in Admin must display its saved value correctly.
- Duplicating a card must preserve the setting.
- If Admin has conditional sections, show this checkbox **only** for reaction cards / reaction effects where it applies — not for unrelated creature, spell or artefact effects.

---

## Part 7 — Logging and debug visibility

Keep development logs behind the existing debug mechanism. The resolution trace should be readable, e.g.:

```text
[BattlecryQueue] Original creature resolved: entity-123
[BattlecryQueue] Waiting 700 ms before summon 1/3
[BattlecryQueue] Summoned entity-456
[Reaction] Triggered reaction entity-789 by source entity-456
[Reaction] Target mode: trigger_source
[ReactionAnimation] Started, duration 2000 ms
[ReactionAnimation] Completed
[Reaction] Effect applied to entity-456
```

No uncontrolled production console spam. The player-facing battle log uses localized readable text (key + params), never internal IDs.

---

## Part 8 — Tests

### Battlecry summon tests

1. Original creature enters before all Battlecry summons.
2. One Battlecry summon resolves after the activation delay.
3. Three summons resolve individually and in order.
4. Summons are not added to game state simultaneously.
5. Board capacity is re-checked before every summon.
6. A failed summon does not stop later legal effects unless the rules require it.
7. A summoned creature's Battlecry resolves before the next parent summon.
8. Player input remains locked during resolution.
9. Input unlocks when the full chain completes.
10. Battle-log order matches resolution order.
11. End Turn cannot interrupt the summon queue.
12. Animation cancellation / component cleanup does not leave the battle permanently locked.

Use fake timers where appropriate, **but also include an integration-level check of the real resolution queue.**

### Reaction targeting tests

1. Admin setting defaults to `false` / `normal`.
2. Existing reaction cards preserve old behaviour.
3. Admin can save the new setting.
4. Admin can reload and display the saved setting.
5. Duplicating a card preserves the setting.
6. A trigger-source reaction targets the exact runtime card instance.
7. Two identical card definitions are not confused.
8. No manual target selection opens when trigger-source mode is enabled.
9. A disappeared invalid target is not replaced by another target.
10. Invalid-target resolution does not lock the queue.

### Reaction animation tests

1. Reaction is revealed before the animation begins.
2. Gameplay effect is not applied at animation start.
3. Gameplay effect is not applied before 2000 ms.
4. Gameplay effect applies after animation completion.
5. Reaction source remains visible during the chain.
6. Correct source and target elements are used.
7. Multiple reactions animate sequentially.
8. Effect-specific animation follows the chain animation.
9. Input remains locked during resolution.
10. The queue safely recovers if the animation component unmounts.
11. PvP / deterministic event order remains unchanged.

### Regression

- Normal creature summons still work.
- Non-Battlecry mass summons keep their existing semantics unless they use the same sequential summon effect.
- Reactions without the new flag behave exactly as before.
- Reactions with manual targeting still allow the intended target flow.
- Card deaths and graveyard movement remain correct.
- Battle results remain deterministic.
- Battle replays / reconnection remain valid.
- No existing card mappings are lost.

---

## Part 9 — Manual QA scenarios

**A.** Creature whose Battlecry summons one creature → original enters → Battlecry feedback → 700 ms → summoned creature enters.

**B.** Creature whose Battlecry summons three creatures → original → 700 ms → summon 1 → 700 ms → summon 2 → 700 ms → summon 3.

**C.** Reaction with the new checkbox **disabled** → current targeting behaviour unchanged.

**D.** Reaction with the checkbox **enabled** → the exact triggering card becomes the automatic target; no target-selection prompt; reaction card reveals; chain travels to and wraps around the triggering card; effect does not apply early; after two seconds the effect resolves.

**E.** Two reactions triggered by one action → first completes animation + effect, then the second starts; no overlapping chains.

**F.** Triggering card disappears before effect resolution → no retargeting; safe invalid-target resolution; battle queue continues; clear battle-log entry.

---

## Part 10 — Required checks

Determine and run the repository's actual commands for: schema/DB validation (if modified); generated types; type checking (`npx tsc --noEmit`); lint; localization validation (`node scripts/i18n-validate.mjs`, `npm run i18n:check`); unit tests; integration tests; production build; Admin smoke test; combat smoke test; multiplayer / deterministic simulation tests if available.

Do not suppress errors. **Do not report success solely because TypeScript compiles.**

---

## Completion report

1. Summary of the implemented gameplay changes.
2. Exact files created.
3. Exact files modified.
4. Database migration details, if any (file name + PENDING status).
5. New Admin field name and stored values.
6. Existing reactions affected or migrated.
7. Battlecry queue implementation details.
8. Nested Battlecry resolution semantics.
9. Reaction animation timing implementation.
10. **How gameplay waits for animation completion** (the authoritative signal — name the mechanism).
11. How input locking is handled.
12. How multiplayer determinism is preserved.
13. Test results.
14. Build result.
15. Manual QA results.
16. Remaining edge cases or risks.
17. Confirmation that unrelated card effects were not changed.
18. The commit `.bat` number created, and any pending migration to run.

---

**Do not modify unrelated UI or card balance. Do not replace the existing combat engine without necessity.**

The task is complete only when summon sequencing, Admin persistence, automatic trigger-source targeting and delayed reaction resolution all work together in the live battle flow — with the resolution queue genuinely awaiting the animation, not a cosmetic timer.

---

# ĮGYVENDINIMO BŪSENA (commit526, 2026-07-25)

## Kas padaryta (1 fazė — variklis + admin)

**Naujas failas:** `src/lib/game/timing.ts`
- `BATTLECRY_SEQUENTIAL_SUMMON_DELAY_MS = 700`
- `REACTION_CHAIN_ANIMATION_DURATION_MS = 2000`

**Nuoseklūs Kovos šūksnio iškvietimai (tikras būsenos rašymas, ne animacija):**
- `GameState.summonChain: SummonChainFrame[] | null` — kadrų stekas ([0] = vykdomas; įdėtiniai dedami į priekį → depth-first).
- `summonFromZonePrim` / `summonAdvancedPrim` išskaidyti į `summonOneFromZone` / `summonOneAdvanced` (vienas iškvietimas = viena laisvos vietos patikra).
- Kovos šūksnio kontekste (`runMappingsDeferrable`, armed) pirmas padaras įrašomas iškart, likę – po `advanceSummonChain()` tick'ą kiekvienas.
- Likę to paties šaltinio mapping'ai atidedami į `frame.after` → efektų eiliškumas lieka toks pat kaip sinchroniniame variante.
- Neskaidoma, kai: lauko pasyvas „Kovos šūksniai 2x" (rounds > 1), keli rankiniai taikiniai, arba iškvietimas ne iš Kovos šūksnio (burtai, globalūs trigeriai, kapinyno efektai) — jų semantika NEPAKEISTA.
- `advanceSummonChain(g)` — vienas žingsnis; `flushSummonChain(g)` — saugiklis (kviečiamas `playCard`, `attack`, `useChampionAbility`, `seatEndTurn` pradžioje ir 2v2 komponente), todėl grandinė niekada nepasimeta ir žaidimas neužstringa.
- NetAction `{ t: 'advanceSummon' }`; UI (`TutorialGame`) kas 700 ms siunčia jį, kol grandinė aktyvi (tik host'as; svečias gauna būseną broadcast'u).
- Įvestis užrakinta per `actionsLocked = popupBlocks || chainBlocks` (kortos, atakos, „Baigti ėjimą"); AI ciklas irgi laukia.

**Reakcijos taikymas į trigerio šaltinį:**
- `EffectMapping.useTriggerSource?: boolean` (saugoma `cards.gameplay.effectMappings` JSONB — **SQL migracijos NEREIKIA**, senos kortos lieka `undefined` = senas elgesys).
- `ApplyCtx.triggerSource` / `triggerSourceName`; `fireGlobalListeners(..., { srcRef, srcName })` perduoda TIKSLŲ runtime uid (ataka, žala padarui/artefaktui, iškvietimas, sužaidimas, burtas).
- `effectEngine`: `useTriggerSource` → taikinys tik trigerio šaltinis; `mappingNeedsSelection` grąžina `false` (rankinis taikymas nerodomas); dingęs šaltinis → `battleLog.reactionTargetLost` ir efektas neįvyksta (jokio pertaikymo), eilė tęsiasi.
- Admin: `GameplayConfigEditor` varnelė „⛓ Efektas taikomas tik reakciją suaktyvinusiai kortai" — rodoma TIK reakcijos kortoms su globaliu trigeriu (`onAny*`, `onOpponentGoldEmpty`). `CardForm` perduoda `isReaction`.
- `reactionTrigger` log įvykis dabar turi `tgt` (grandinės animacijos taikinys).

**Reakcijos grandinės vartai (laikinas vizualas):**
- `TutorialGame` `reactionTrigger` apdorojimas: atskleidimas → grandinė (`beam`, metalo/spektro spalvos, `REACTION_CHAIN_ANIMATION_DURATION_MS`) → tik po jos rodomi tolesni FX ir mūšio žurnalo įrašai (`showcaseHold`/`logCut`).

**Testai:** `scripts/simulate-battlecry-chain.ts` (`npx tsx scripts/simulate-battlecry-chain.ts`) — 33 patikros, visos PASS.

## Kas dar liko (2 fazė — VFX + PvP poliravimas)

1. **Dailus grandinės VFX** vietoj laikino `beam`: atskiras `ReactionChainLayer` (SVG kelias + grandies raštas + apsivijimas apie taikinio rėmą + suveržimo pulsas), prototipas — `ravenof-fx-preview.html`.
2. **Snapshot-gate lentai**: šiuo metu per 2 s sulaikomi FX ir žurnalas, bet skaičiai lentoje (HP) atsinaujina iškart. Reikia variklio tarpinės būsenos snapshot'o ties reakcija ir jo rodymo iki animacijos pabaigos.
3. **2v2**: `Team2v2Game` kol kas iškvietimų grandinę užbaigia iškart (`flushSummonChain`) — nuosekli animacija dar nepridėta.
4. **PvP svečias**: svečias gauna būsenų broadcast'us; tick'us siunčia tik host'as. Verta patikrinti tempą realioje PvP kovoje.

---

# 2 FAZĖ — Reaction Chain VFX (commit527, 2026-07-25)

Etalonas: `ravenof-fx-preview-reaction-chain.html` (aprobuota geometrija/laikai).

## Naujas failas
- `src/components/tutorial/ReactionChainLayer.tsx` — canvas overlay (fixed, z-index 128, pointer-events none).
  Imperatyvus handle: `play(opts) => Promise<void>`, `cancel()`, `busy()`.
  **`play()` Promise išsisprendžia TIK ties „efekto" fazės pradžia** (P0+P1+P2+P3 = 3200 ms) —
  tai vienintelis autoritetinis signalas, kurio laukia gameplay. `cancel()` ir unmount promise'ą
  irgi išsprendžia → kovos eilė niekada nelieka užrakinta.

## Fazės (`src/lib/game/timing.ts` → `REACTION_CHAIN_PHASES`)
| Fazė | ms | Turinys |
|---|---|---|
| detect | 350 | rune flare nuo reakcijos kortos |
| chain | 1000 | strėlės antgalis + grandys Bezier trajektorija (arc-length LUT, sway, ember dalelės, easeOutCubic) |
| wrap | 650 | grandinė įtraukiama, 2 kilpos (rx52/ry24 rot −0.32; rx55/ry22 rot 0.26, mastelis pagal kortos plotį) + susiveržimas 1.12→1.0 |
| showcase | 1200 | reakcijos kortos parodymas (naudojamas ESAMAS `spawnShowcase`) |
| effect | 700 | grandinė sudūžta (shatter + burst 26 + impact žiedas) — **čia jau matoma pritaikyta būsena** |

`REACTION_CHAIN_GATE_MS = 3200`, `REACTION_CHAIN_TOTAL_MS = 3900`,
`REACTION_CHAIN_REDUCED_GATE_MS = 900` (prefers-reduced-motion: be skrydžio).
`REACTION_CHAIN_ANIMATION_DURATION_MS = 2000` liko TIK kaip fallback, kai sluoksnio nėra.

## Kaip gameplay laukia animacijos (svarbiausia)
1. **Variklis** (`fireGlobalListeners`) ties KIEKVIENA suveikusia reakcija įsimena būsenos
   snapshot'ą **PRIEŠ jos efektą** (reakcijos korta dar slot'e, taikinys dar nepaliestas) ir
   įrašo kadrą į `GameState.reactionGates` (`ReactionGate`: snapshotId, atLog, side, reactionUid,
   reactionCardName, target, targetName). Snapshot'ai laikomi MODULYJE (`consumeReactionSnapshot`),
   ne būsenoje — PvP broadcast payload nepadidėja, rekursijos nėra. Rezoliucijos tvarka NEPAKEISTA.
2. **UI** (`TutorialGame.gateCommit` → `startGateRun`): jei naujoje būsenoje yra kadrų, ji
   **neįrašoma** į React state. Vietoje to kiekvienam kadrui: parodomas snapshot'as →
   `await chainRef.play(...)` → tik tada kita būsena. Po visų kadrų — galutinė autoritetinė būsena.
3. Todėl HP/statusai/žūtys ekrane pasirodo tik ties „efekto" faze, o ne animacijos pradžioje.
4. Vartai veikia visuose keliuose: žaidėjo veiksmas, AI ciklas, PvP host (svečio veiksmas) ir
   PvP svečias (`swapPerspective` dabar apverčia ir `reactionGates` bei `summonChain` puses).
   Svečias snapshot'ų neturi → mato animaciją ir galutinę būseną (be tarpinių kadrų).

## Įvesties užraktas
`actionsLocked = popupBlocks || chainBlocks || gateActive`; AI ciklas laukia to paties `gateActive`.
Kelios reakcijos — griežtai po vieną (`startGateRun` ciklas + `play()` nutraukia ankstesnį paleidimą).

## Pozicionavimas
Dinamiškai iš DOM: šaltinis `[data-pile="reactions-{side}"]`, taikinys `[data-unit-uid]`/`[data-artifact-uid]`
(per `boxFor`), fallback — `[data-tut="units-{side}"]` zona, galiausiai lentos centras. Veikia landscape
layout'e, abiem pusėms, bet kokiu board scale (rect'ai imami po realaus render'io, per 2×rAF).

## Garsai / prieinamumas
Fazių callback'ai (`onPhase`) groja `spellCast` / `impact` / `death` per esamą `playBattleSound`;
lentos purtymas — per esamą `BattleFxLayer.shakeBoard` (nedubliuota mechanika).
`prefers-reduced-motion` → be skrydžio, vartai 900 ms.

## Testai
`npx tsx scripts/simulate-battlecry-chain.ts` — **48/48 PASS** (buvo 33; pridėti vartų testai:
snapshot rodo NEPRITAIKYTĄ efektą ir reakcijos kortą slot'e, galutinė būsena — pritaikytą;
dvi reakcijos → du kadrai iš eilės, antro snapshot'e matomas pirmo efektas).

## Kas dar liko
- 2v2 (`Team2v2Game`) — reakcijų grandinės animacijos nėra (kadrai išvalomi, elgesys kaip anksčiau).
- Garso failai (launch swoosh / metal impact / tighten / shatter) — kol kas naudojami esami SFX.
- Efekto variantas renkamas iš frakcijos vardo (demonai/prakeiksmai → `infernal`); vėliau galima imti
  iš `effectAnimationMap` frakcijų palečių.
