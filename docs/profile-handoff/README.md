# Ravenof — Profile & Progression Cowork handoff v2

This package preserves the approved Phase 5 design and adds the production asset layer for Ranked and
Achievements. `Ravenof Profile.dc.html` remains the visual source of truth; the new manifests and
`COWORK-INSTRUCTIONS.md` are the data and implementation source of truth where the mock contains
placeholder names, counts or art.

| File | What it is |
| --- | --- |
| `COWORK-INSTRUCTIONS.md` | Start here — exact integration order, paths, data mapping and acceptance checks |
| `DESIGN-REVIEW.md` | Design evaluation and the issues Cowork must correct during implementation |
| `VALIDATION-REPORT.md` | Asset counts, image integrity, manifest checks and known blockers |
| `IMPLEMENTATION.md` | Screen-by-screen build spec, tokens, animation budget, responsive rules, build order |
| `PROFILE-DATA-CONTRACT.md` | Tables, RewardSpec, RPCs, reward-safety and idempotency rules |
| `asset-manifest.json` | Existing upload moves plus the integrated Ranked/Achievement asset roots |
| `asset-maps/ranked-manifest.csv` | All 50 rank names and the descending progression order |
| `asset-maps/achievement-manifest.csv` | All 70 achievement names/requirements; 01–62 generated, 63–70 pending |
| `public/ravenof-ui/ranks/` | 50 rank badge images + reusable Bronze/Silver/Gold frames |
| `public/ravenof-ui/achievements/` | 62 production achievement badge PNGs |
| `asset-previews/` | Contact sheets and rank layer-composition example |
| `screens/01…12*.png` | The 12 visual references (whole artboard, 1536 × 720 design, exported at review scale) |
| `Ravenof Profile.dc.html` + `support.js` | Live interactive source — open in a browser, use the strip under the artboard to switch all 12 states. This is the pixel source of truth, not the PNGs. |

## The 12 references
1. Player Profile — owner · 2. Public Player Profile · 3. Edit Profile modal · 4. Achievements (70) ·
5. Account Level progression 1–50 · 6. Achievement Unlocked · 7. Level Up (standard) ·
8. Light / Dark booster choice · 9. Rare/Epic/Legendary card choice · 10. Card back reward ·
11. Multiple levels gained · 12. Pending rewards.

## Read first
- Account Level, Ranked and Achievements are three separate systems with three separate visual languages —
  see the table at the top of `IMPLEMENTATION.md`.
- Ranked is **not** redesigned here: the profile has one compact slot with a temporary badge.
- No boosters without an alignment choice, no hidden card rewards, no manual achievement claiming,
  no avatar frames, no titles, no level names.
- Rewards are attached on level-up; unresolved choices always survive in Pending Rewards.

## Asset completion

- Ranked: **complete** — 50/50 name-specific badges and 3 reusable tier frames.
- Achievements: **62/70 complete** — badge 63–70 specifications are in
  `asset-maps/PENDING_ACHIEVEMENTS_63-70.md`. Do not substitute unrelated generic icons in production.
- Still missing: dedicated Account-XP icon, dark booster pack art, real card art for choice overlays.

UI copy is Lithuanian only. The string set can be mirrored to EN later without changing the layout.
