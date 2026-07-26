# Phase 5 design review

## Verdict

**Approved as the visual source of truth.** The profile, Account Level, Achievements and celebration
states form one coherent product system and are materially stronger than a generic game-dashboard
implementation. Cowork should implement this design, not reinterpret or redesign it.

## What works especially well

1. **The three progression systems are visually distinct.** Permanent Account Level uses aged gold,
   seasonal Ranked uses steel, and Achievements use burgundy. This prevents the player from confusing
   account XP with seasonal progress.
2. **The reward flow is safe.** Pending Rewards, automatic achievement grants, idempotent choice RPCs and
   one combined multi-level celebration prevent lost or double-granted rewards.
3. **The celebration hierarchy is appropriate for Ravenof.** Metallic numeral replacement, ash and a
   short impact cue fit the gothic game tone without confetti or mobile-game fireworks.
4. **Edit Profile respects the product rules.** Two starter avatars, limited cosmetic avatars, no avatar
   frames, and a server-validated 30-day name cooldown are correctly represented.
5. **The handoff is implementable.** It includes responsive behavior, motion reduction, data contracts,
   build order and all 12 important states.

## Required corrections during implementation

### P0 — Achievement mock data is not the approved 70-item system

The HTML contains layout examples such as `Savas veidas`, `Šimtas kovų` and the former category split
`6/12/10/9/8/9/8/8`. These are not production achievement data.

Use `asset-maps/achievement-manifest.csv` as the authoritative name/requirement list and use this split:
`8/10/12/10/10/10/6/4`.

### P0 — Ranked mock labels use the old format

`Sidabras XXIII` and `Auksas XVII` are visual placeholders. Production progression is:
`Rank 50 Bronze → Silver → Gold → Rank 49 Bronze → … → Rank 1 Gold`.

Render the unique name-specific badge below one reusable Bronze/Silver/Gold frame. Keep the already
approved Ranked screen and profile-slot geometry unchanged.

### P1 — Touch-target specification and mock dimensions conflict

The document requires 44 px targets, but the HTML includes visible controls at 34–40 px. On phone
landscape, preserve the visible design while expanding the interactive hit area to at least 44×44 using
wrappers or pseudo-elements.

### P1 — Do not eagerly load all badge PNGs

The source assets are 512×512 transparent PNGs. Keep these originals, but lazy-load achievement tiles
and fetch only visible rows. The rank profile slot loads only its current badge and one tier frame.
Runtime thumbnail/WebP derivatives may be generated without replacing the supplied masters.

### P1 — Achievement art does not include the UI frame

Achievement PNGs are the central illustrations. The existing burgundy hex shell remains a UI component.
Use `object-fit: contain`; do not add Ranked tier frames to achievements.

### P2 — Dense desktop text must not shrink further on phone

Some review-scale labels are visually dense. Follow the documented minimum 10 px phone-landscape body
text and move secondary information into sheets/expanders instead of shrinking typography.

## Final decision

No visual redesign is needed. Cowork should correct the data mapping, integrate the supplied art, enforce
touch targets and asset-loading discipline, then reproduce the approved HTML states in the live game.
