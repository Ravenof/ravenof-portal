# Cowork implementation instructions

## Goal

Implement the approved Ravenof Profile & Progression Phase 5 design in the live game and integrate the
supplied Ranked and Achievement assets. This is an implementation handoff, not permission to redesign
the interface.

## Source-of-truth order

1. `Ravenof Profile.dc.html` — layout, visual hierarchy, tokens and interaction states.
2. `screens/01…12*.png` — visual review references.
3. `PROFILE-DATA-CONTRACT.md` — server/client behavior and reward safety.
4. `asset-maps/achievement-manifest.csv` — production achievement names and requirements.
5. `asset-maps/ranked-manifest.csv` — production rank order, names and badge files.
6. `asset-manifest.json` — packaged asset roots and remaining art blockers.

When mock content conflicts with a manifest or the data contract, keep the mock's layout but use the
manifest/data-contract value.

## Non-negotiable product rules

- Do not redesign or replace the existing Ranked screen.
- Account Level has no names, titles, level badges, avatars or cosmetic frames.
- Cosmetic avatars are rare/limited; the two starting avatars are granted at account start.
- The display name can change once every 30 days and must be server validated.
- Achievement rewards grant automatically; there is no Claim button.
- Choice rewards survive dismissal, logout, crash and multi-level gains.
- Level-up celebration never interrupts combat.
- Achievement badges never use Bronze/Silver/Gold frames.

## Step 1 — Install packaged assets

Copy the supplied `public/ravenof-ui/` directory into the live project's public root without renaming
files.

Expected asset counts:

| Asset group | Path | Count |
| --- | --- | ---: |
| Rank badge art | `public/ravenof-ui/ranks/badges/` | 50 |
| Reusable rank frames | `public/ravenof-ui/ranks/frames/` | 3 |
| Achievement badge art | `public/ravenof-ui/achievements/` | 62 |

Achievement 63–70 remain art blockers. Their exact specifications are in
`asset-maps/PENDING_ACHIEVEMENTS_63-70.md`. Do not ship unrelated placeholder art as final.

## Step 2 — Ranked asset resolver

Read the current server fields:

```ts
type RankedProfile = {
  rank_number: number; // 50 entry → 1 highest
  rank_name: string;
  tier: 'bronze' | 'silver' | 'gold';
  points: number;
  season: string;
};
```

Resolve the badge from `asset-maps/ranked-manifest.csv`.

```ts
badgeSrc = `/ravenof-ui/ranks/badges/${badge_file_name}`;
frameSrc = `/ravenof-ui/ranks/frames/${tier}-frame.png`;
```

Render both in one square:

```tsx
<div className="rank-art">
  <img className="rank-art__badge" src={badgeSrc} alt="" />
  <img className="rank-art__frame" src={frameSrc} alt="" />
</div>
```

Both layers use identical `inset:0; width:100%; height:100%; object-fit:contain`. The frame is the top
layer. `asset-previews/rank-layering-example.png` shows the intended composition.

Progression order is exact:
`50 Bronze → 50 Silver → 50 Gold → 49 Bronze → … → 1 Gold`.

Recommended profile label:
`{rank_number} RANGAS · {rank_name}` with `{tier}` as the smaller material label.

## Step 3 — Achievement resolver

Use `asset-maps/achievement-manifest.csv` for all names, requirements, categories and badge paths.
Do not hardcode the sample achievement array from the HTML.

Generated rows have `status=generated` and a valid `badge_file`. Pending rows have
`status=pending_generation_limit` and no badge file.

The 512×512 PNG is the central illustration placed inside the existing burgundy hex badge component:

```tsx
<div className="achievement-hex">
  <img src={`/ravenof-ui/achievements/${fileName}`} alt="" loading="lazy" />
</div>
```

- Preserve transparent alpha.
- Use `object-fit:contain`.
- Do not mask the illustration into a second medal or add a Ranked tier frame.
- Keep the achievement name and exact requirement as accessible text outside the image.
- Load only visible grid rows; do not preload all 70 masters.

Production category totals:

| Category | Total |
| --- | ---: |
| Pradžia ir profilis | 8 |
| Kovos ir pergalės | 10 |
| Taktika ir mechanikos | 12 |
| Kaladės ir frakcijos | 10 |
| Kolekcija | 10 |
| Ranked | 10 |
| Dienos aktyvumas | 6 |
| Bendruomenė | 4 |

## Step 4 — Implement in the documented safety-first order

1. Account Level server config and read-only progression.
2. Pending Rewards persistence and indicators.
3. Booster/card choice shared flows.
4. Owner profile and privacy-filtered public profile.
5. Edit Profile with name cooldown and avatar ownership validation.
6. Achievements from the production manifest.
7. Ranked profile-slot asset/label replacement only.
8. Celebration variants and post-match presentation queue.

## Acceptance checklist

- [ ] The live profile matches the approved 1536×720 reference and documented 844×390 adaptation.
- [ ] Account Level, Ranked and Achievements remain visually distinct.
- [ ] No old labels such as `Sidabras XXIII` or `Auksas XVII` remain in production data.
- [ ] All 50 rank badges resolve and all 3 tier frames overlay correctly.
- [ ] Rank 50 progresses Bronze → Silver → Gold before Rank 49.
- [ ] Achievement names, requirements and category totals match the production manifest.
- [ ] Achievement art stays inside the burgundy achievement shell and never receives a rank frame.
- [ ] Name change cooldown is enforced server-side for 30 days.
- [ ] Choice rewards remain pending until explicitly resolved.
- [ ] Multi-level gains show one combined celebration.
- [ ] No celebration interrupts combat.
- [ ] All phone-landscape hit areas are at least 44×44.
- [ ] `prefers-reduced-motion` renders the final state immediately.
- [ ] Missing achievement art 63–70 is tracked as a blocker, not silently replaced.
