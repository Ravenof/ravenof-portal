# Profile / Account Level / Achievements — data contract

Server is the source of truth for every number the UI shows. The client never computes XP thresholds,
reward contents, cooldown dates or achievement progress locally.

---

## 1. Tables

### `profiles`
| column | type | notes |
| --- | --- | --- |
| `player_id` | text, PK | stable, public, never changes (`RVN-4821-KRT`) |
| `display_name` | text | 3–16 chars, unique (case-insensitive) |
| `name_changed_at` | timestamptz | null if never changed |
| `avatar_id` | text | must exist in `avatars` and be unlocked |
| `account_level` | int | 1–50, derived, never decreases |
| `account_xp` | bigint | lifetime XP |
| `featured_achievements` | text[3] | completed achievement codes only |
| `privacy` | jsonb | `{collection:bool, match_history:bool, exact_mmr:bool, friend_requests:bool}` |
| `created_at` | timestamptz | |

`display_name` is never used for routing or relations — always `player_id`.

### `account_levels` (config, read-only)
| column | notes |
| --- | --- |
| `level` | 1–50 |
| `xp_required` | cumulative XP to reach this level (level 19 → 16 300 in the mock) |
| `rewards` | `RewardSpec[]` (below) |
| `is_milestone` | bool — drives the wide cell + larger art |

### `level_reward_claims`
`player_id, level, reward_index, state('granted'|'pending_choice'|'resolved'), choice jsonb, granted_at, resolved_at`
— unique on `(player_id, level, reward_index)`.

### `achievements` (config) / `achievement_progress`
`code, category, name_lt, requirement_lt, target, rewards RewardSpec[], badge_asset, is_secret`
`player_id, code, progress, completed_at` — unique on `(player_id, code)`.

### `pending_rewards` (view over `level_reward_choices` + achievement choices)
`id, player_id, source ('level'|'achievement'), source_ref, kind ('booster'|'card'), options jsonb, created_at`

---

## 2. RewardSpec

```ts
type RewardSpec =
  | { kind: 'coins';   amount: number }
  | { kind: 'gems';    amount: number }
  | { kind: 'xp';      amount: number }                        // achievements only
  | { kind: 'booster'; count: number }                         // requires alignment choice per unit
  | { kind: 'card_choice'; rarity: 'rare'|'epic'|'legendary';
      options: [CardOption, CardOption, CardOption] }          // always exactly 3, visible up front
  | { kind: 'card_back'; back_id: string; exclusive?: boolean }
  | { kind: 'card'; card_id: string };                         // fixed card, achievements only

type CardOption = {
  card_id: string; name: string; rarity: string; faction: string;
  artwork_url: string; owned_count: number;                    // shown as "turi n"
  duplicate_compensation?: { kind: 'essence'|'coins'; amount: number };
};
```

Forbidden in `account_levels.rewards`: `avatar`, `avatar_frame`, `profile_frame`, `title`, `ranked_badge`.
Server must reject config containing them.

Booster alignment:
```
light = [inkvizicijos_legionas, sviesos_pulkas, mistikos_melodija, rytu_vejas]
dark  = [mirties_marsas, plesiku_naktis, vryhioko_gauja, demonu_orda]
universal cards may roll in either alignment
```

---

## 3. RPCs

| RPC | Input | Returns | Rules |
| --- | --- | --- | --- |
| `get_profile` | `player_id` | full owner payload | owner only |
| `get_public_profile` | `player_id` | privacy-filtered payload | omits pending, privacy, XP progress; collection % and match history only when the flags allow |
| `get_account_progression` | — | current level, xp, xp_required, all 50 levels with per-level state | states: `claimed` \| `current` \| `pending_choice` \| `locked` |
| `award_xp` | `amount, source` | `{ levels_gained, new_level, rewards[] }` | idempotent per `source_ref`; multiple levels return ONE combined payload |
| `resolve_booster_choice` | `pending_id, alignment` | opened booster contents | idempotent; second call returns the first result |
| `resolve_card_choice` | `pending_id, card_id` | `{ card_id, owned_count_after, compensation? }` | `card_id` must be one of the 3 stored options |
| `get_pending_rewards` | — | `pending_rewards[]` | never expires, never auto-resolves |
| `change_display_name` | `new_name` | `{ ok, next_change_allowed_at }` | validates 3–16 chars, uniqueness, and `name_changed_at + 30d <= now()` |
| `check_name_available` | `new_name` | `{ available }` | debounce 350 ms client-side |
| `set_avatar` | `avatar_id` | ok | must be unlocked |
| `set_featured_achievements` | `codes[3]` | ok | rejects incomplete achievements |
| `set_privacy` | `patch` | ok | |
| `get_achievements` | `category?, filter?, search?` | list + `26/70` totals + per-category counts | server-side filtering; client only renders |

`change_display_name` error `NAME_ON_COOLDOWN` must include `next_change_allowed_at` — the UI renders the
exact date string: `Vardą vėl galėsi pakeisti YYYY-MM-DD.`

---

## 4. Reward safety (non-negotiable)

1. Reaching a level writes all `level_reward_claims` rows in the same transaction as the level increase.
2. Non-choice rewards (coins, gems, card back) are credited immediately — the celebration only visualises them.
3. Choice rewards are written as `pending_choice`. Closing the app, crashing, or dismissing the celebration
   never loses them.
4. `resolve_*` RPCs are idempotent and single-use per `pending_id`; concurrent calls resolve once.
5. Achievement rewards are granted automatically on completion — there is no client claim call.
6. The client shows the pending indicator whenever `get_pending_rewards` is non-empty (header, submenu,
   Account Level screen).

---

## 5. Multi-level and queueing

`award_xp` returning `levels_gained > 1` must produce a single celebration:
headline `{new_level} LYGIS PASIEKTAS`, sub `Gavai {levels_gained} lygius`, and the union of all rewards
grouped by source level. Choice rewards inside the batch open one after another; anything unresolved
falls through to Pending Rewards.

Presentation queue order after a match: post-match XP animation → level-up celebration →
achievement unlock toasts (max 3 visible sequentially, rest folded into "Nauji pasiekimai").
Nothing in this queue may render during combat.

---

## 6. Achievement categories (70 total)

| Category | count |
| --- | --- |
| Pradžia ir profilis | 8 |
| Kovos ir pergalės | 10 |
| Taktika ir mechanikos | 12 |
| Kaladės ir frakcijos | 10 |
| Kolekcija | 10 |
| Ranked | 10 |
| Dienos aktyvumas | 6 |
| Bendruomenė | 4 |

Achievement rewards may include XP, coins, gems, boosters, specific cards and card backs.
They may not include avatar frames or profile titles. A single very rare future achievement may unlock a
cosmetic avatar — not used in the initial set.

---

## 7. Ranked boundary

The profile reads Ranked data read-only:
`{ rank_number, rank_name, tier, points, season }`.

- `rank_number`: integer 50 → 1, where 50 is the entry rank and 1 is the highest rank.
- `rank_name`: server value matching `asset-maps/ranked-manifest.csv`.
- `tier`: `bronze | silver | gold`.
- Progression is exactly `50 Bronze → 50 Silver → 50 Gold → 49 Bronze → … → 1 Gold`.
- `badge_asset` is selected by rank number/name and rendered below the reusable tier frame.

This handoff does not redesign or write to the existing Ranked screen. Cowork only replaces the profile
slot's old placeholder image and label, keeping its layout and navigation unchanged.
