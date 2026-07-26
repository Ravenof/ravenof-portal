# Ravenof — Profile, Account Level, Achievements & Celebrations
## Implementation handoff (Phase 5)

Source of truth: `Ravenof Profile.dc.html` (project root). Open it in a browser; the strip under the
artboard switches all 12 references. Screens are also switchable via the `screen` / `overlay` props.

Asset/data override: the HTML contains placeholder achievement names, category counts and old Ranked
labels for visual layout only. For implementation, use `asset-maps/achievement-manifest.csv`,
`asset-maps/ranked-manifest.csv`, `PROFILE-DATA-CONTRACT.md` and `COWORK-INSTRUCTIONS.md`.

Artboard: **1536 × 720** (Ravenof horizontal game layout, tablet landscape reference).
Phone-landscape (844 × 390) adaption is listed under "Responsive rules" — same structure, compact rail.

---

## 0. What must NOT change

| Rule | Why |
| --- | --- |
| Do not touch the existing Ranked screen | Already approved; Cowork replaces numbered ranks later |
| Account Level has **no** names, titles, level badges | Only `LEVEL n` + XP |
| Account Level rewards never contain avatars, frames, titles, ranked badges | Cosmetics are rare/limited, not level drops |
| Boosters are never a generic random pack | Player always chooses Light or Dark alignment |
| Card rewards always show the 3 exact cards up front | Never "Rare card" icon → random card |
| Achievements grant rewards automatically | No per-achievement Claim button |
| No avatar frames anywhere | The portrait holder is fixed UI, not a cosmetic |
| Level-up never appears during combat | Only post-match XP animation or on return to menu |

Three systems must stay visually separate:

| System | Visual language | Where |
| --- | --- | --- |
| Account Level 1–50 (permanent) | Aged-gold numeral + gold XP bar, no crest, Cinzel 800 | header chip, profile card, level screen, level-up |
| Ranked (seasonal) | Pewter/steel plate + existing rank art, cool grey text `#D6DCE6` | one compact profile slot only |
| Achievements (permanent) | Burgundy hex badge frame `#a9455a → #4a1d27`, burgundy bars | profile slot, achievements screen, unlock toast |

---

## 1. Design tokens (already in the DC, inline)

```
bg page        #050409     artboard        #07060A
panel          #0F0D15     panel raised    #15121D / #12101A
line           #241F2C     line strong     #36323B / #3A3040
text           #E8DFCC     text muted      #928B9D     text faint  #6F6A7A
gold           #C6A14F     gold bright     #E2B958     gold pale   #F2D492
burgundy       #6E2633     burgundy lit    #9B3A48 / #C1566A
win / positive #6F8562     loss            #8D2D38
ranked steel   #D6DCE6 on #4A4453 border
rarity         common #C6C0CC · magic #5A86BD · epic #9B6BBD · legendary #E2B958
fonts          Cinzel 500–800 (headings, numerals) · Alegreya Sans 400–700 (body)
```

Gothic framing: `clip-path: polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)`
for panels; `polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%)` for primary buttons; hex badge
`polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)`; portrait holder
`polygon(50% 0,100% 22%,100% 78%,50% 100%,0 78%,0 22%)`.

All interactive targets are ≥ 44 px on the primary axis (header buttons, tabs, chips, toggles are 44×44 / min-height 44).

---

## 2. Screens

### 01 · Player Profile (owner)
Left identity card (330 px, fixed): portrait holder → name → stable Player ID + copy → Edit Profile →
Account Level block (number, XP bar, "Visi 50 lygių ›") → Ranked slot (final layered rank badge +
tier frame, opens existing Ranked screen) → Achievements block (completed/70 + 3 featured badges).
Right: tab row (Apžvalga / Pasiekimai / Statistika / Vieši deckai / Kolekcija / Rungtynių istorija),
4 stat tiles, season Ranked stats + most-played faction, collection progress (%, rarity split,
"Atidaryti kolekciją" — never a card wall), then public decks / recent achievements / match history.
Pending-choice indicator: glowing header button with count + submenu banner.

### 02 · Public Player Profile
Same skeleton, owner-only controls removed (no edit, no privacy, no pending, no private collection).
Adds `DRAUGAS` / `IŠKVIESTI`, a "VIEŠAS PROFILIS" banner, and privacy-gated blocks: collection % and
match history render only when the owner allows it. XP progress is hidden publicly — level number only.

### 03 · Edit Profile modal
Sections: Vardas / Avataras / Prisegti ženklai / Privatumas.
Name: current name, input with 3–16 char counter, availability state (`Vardas laisvas` ✓ / taken ✗),
30-day cooldown card with the exact date string `Vardą vėl galėsi pakeisti 2026-08-25.`, confirm button
disabled while on cooldown. Profile URL + relations use `player_id`, never the name.
Avatar: 2 starting avatars (selectable), unlocked cosmetics, locked cosmetics greyscaled with a lock and
the explicit note that they are not Account Level rewards. No frames.
Featured: 3 slots, completed achievements only. Privacy: 4 toggles.

### 04 · Achievements
Header: 26/70 + bar, search, All/Completed/Locked. Category chip row (8 categories + Visos, each with
`done/total`). Grid of achievement cards: hex badge, name, exact requirement, progress bar + `cur / max`,
reward chips, state (`UŽBAIGTA` / `VYKSTA` / `UŽRAKINTA`), pin-to-profile diamond button (enabled only
when completed). Right rail: 3 featured slots + per-category progress + the "rewards are automatic" note.

### 05 · Account Level progression
Header: level numeral, XP `16 176 / 16 300`, bar, next-level reward, pending-choice CTA.
Track: two rows (1–25, 26–50), horizontally scrollable. Regular level = 58 px compact cell;
milestone = 104 px tall-weight cell with larger icon. Corner triangle marks state
(green claimed / gold current / gold pending). Right inspector shows the selected level's exact rewards,
state, XP requirement, and the action (`PASIRINKTI DABAR` when pending, `PERŽIŪRĖTI APDOVANOJIMĄ` for
future levels, disabled `ATSIIMTA` for past). Legend at the bottom.

Milestones (must match server config exactly):

| Lvl | Reward |
| --- | --- |
| 5 | choose 1 of 3 visible **Rare** cards |
| 10 | 50 gems + card back |
| 15 | choose 1 of 3 visible **Rare** cards |
| 20 | 75 gems + card back |
| 25 | choose 1 of 3 visible **Epic** cards |
| 30 | 100 gems + card back |
| 35 | 2 alignment boosters (each chosen separately) |
| 40 | 125 gems + card back |
| 45 | choose 1 of 3 visible **Epic** cards |
| 50 | choose 1 of 3 visible **Legendary** cards + 200 gems + exclusive card back |

Regular levels alternate: odd = coins (`200 + round(n/2)·50` in the mock — replace with server table),
even = one alignment booster choice.

### 06 · Achievement Unlocked
430 px card, top-center, above the menu, `pointer-events:none` backdrop so the game stays usable.
Badge stamp-in, `PASIEKIMAS ATVERTAS`, name, requirement, progress bar filling to 1/1, reward chips,
`PERŽIŪRĖTI ›` to full details, 4.5 s auto-dismiss bar. Queue unlocks; never render over a combat decision.

### 07–11 · Level Up celebration
Full-screen overlay, dark vignette + ash particles + one short flash. Sequence:
1. XP bar fills (owned by the post-match screen) → 2. vignette darkens → 3. old numeral cracks/dissolves
(`rvCrack`, 1.1 s) → 4. new metallic numeral stamps in (`rvStamp`, 0.62 s) → 5. rewards reveal staggered
(0.35 s + 0.15 s each) → 6. CTA enabled. Total ≈ 2.2 s; tapping anywhere skips to the end state.

Variants:
- **07 standard** — `LYGIS PAKILO` + coins/gems cards with count-up, then a move-to-balance flight on collect.
- **08 booster choice** — two 352 px choices; each lists its four factions (Light: Inkvizicijos legionas,
  Šviesos pulkas, Mistikos melodija, Rytų vėjas · Dark: Mirties maršas, Plėšikų naktis, Vryhioko gauja,
  Demonų orda) + "Universal cards may appear in either" note. Selection is required; no default.
- **09 card choice** — three real cards, rarity label, owned-copy count, eye button for full preview,
  selected state + explicit confirm bar.
- **10 card back** — large back with slow parallax turn, `NAUJA` tag, `NAUDOTI DABAR` / `PASIIMTI`.
- **11 multi-level** — one celebration only: `10 LYGIS PASIEKTAS` / "Gavai 3 lygius", combined 8+9+10 rewards.

### 12 · Pending Rewards
Reward is attached to the account the moment the level is reached. If the player quits before choosing,
the entry lives here with source level, timestamp and `PASIRINKTI`, and the indicator shows in the header,
the submenu and the level screen. Closing the modal never consumes the reward.

---

## 3. Responsive rules (844 × 390 phone landscape)

- Rail 74 → 56 px, icons only; submenu collapses into the header tab chips.
- Header 56 → 48 px; currency chips collapse to the two most relevant + `⋯` overflow.
- Profile: identity card becomes a full-width top band (portrait 64 px), overview becomes a single
  horizontally-snapping column set.
- Achievements grid 3 → 1 column, featured rail moves into a collapsible sheet.
- Level track keeps 58/104 px cells (already touch-sized); inspector becomes a bottom sheet.
- Level-up numeral 132 → 86 px; booster choices stack to a 2-up row at 300 px width; card choice becomes
  a 3-up snap row at 150 px.
- Minimum body text 10 px at this scale; never below. All targets stay ≥ 44 px.

---

## 4. Animation & audio budget

| Element | Duration | Notes |
| --- | --- | --- |
| Achievement unlocked | 0.34 s in, 4.5 s hold | one short burgundy impact cue |
| Level-up | ≈ 2.2 s total, skippable | one strong short brass/metal cue, no loop |
| Currency count-up | 0.6 s | then 0.4 s flight to the balance chip |
| Card back turn | 6 s loop, ±13° | parallax only, no shine sweep |
| Ash particles | 14 s linear loop, opacity .16 | reduce-motion disables all of the above |

`prefers-reduced-motion` must skip cracking, ash, flash and count-up and render the end state instantly.
Forbidden: confetti, balloons, bright fireworks, cartoon squash, colour gradients outside the palette.

---

## 5. Build order for Cowork

0. Copy the supplied `public/ravenof-ui/` tree unchanged; wire the two asset manifests before UI work.
1. Account Level config + XP curve endpoint, level screen read-only (states, inspector).
2. Pending-reward table + indicator + Pending modal (safety first, before any celebration).
3. Booster choice and card choice flows (shared components, reused by level-up and Pending).
4. Profile owner view; then public view behind the privacy flags.
5. Edit Profile (name cooldown server-validated, avatar, featured, privacy).
6. Achievements list from `achievement-manifest.csv` + automatic grant + pin-to-profile.
7. Layer Ranked badge art beneath the reusable Bronze/Silver/Gold frame; update only profile slot art/label.
8. Level-up celebration variants; multi-level combining; achievement unlock queue.

See `PROFILE-DATA-CONTRACT.md` for tables, RPCs and idempotency rules, and `asset-manifest.json`
for the assets to move into `public/ravenof-ui/`.

Still owned by art after this handoff: achievement badges 63–70, dedicated Account-XP icon, dark booster
pack art, and real card art for the choice overlays. Ranked art is complete. Achievement badges 01–62
are complete. The mock still uses Mistikos Melodija 153/154/159 as card-choice stand-ins.
