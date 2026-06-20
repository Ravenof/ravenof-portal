// ── Ravenof Reitingo kova — pasiekimai (Source of Truth) ─────────────────────
// Atspindi DB lentelę ranked_achievements. Progresas/claim — serveryje (RPC).

import type { RewardPayload } from './rewards'

export type RequirementType =
  | 'wins'              // bendros reitingo pergalės
  | 'reach_rank'        // pasiektas rango numeris (mažesnis = aukštesnis) — value = rankNumber
  | 'win_streak'        // pergalių serija
  | 'beat_higher'       // nugalėtas aukštesnio rango priešas
  | 'comeback'          // pergalė nukritus < 10 HP
  | 'flawless'          // pergalė su 20+ HP
  | 'beat_bots'         // pergalės prieš botus
  | 'beat_real'         // pergalės prieš tikrus žaidėjus
  | 'season_games'      // sužaista kovų per sezoną
  | 'kd_ratio'          // K/D >= value (po >=20 kovų)

export type RankedAchievement = {
  key: string
  name: string
  description: string
  requirementType: RequirementType
  requirementValue: number
  reward: RewardPayload
}

export const RANKED_ACHIEVEMENTS: RankedAchievement[] = [
  { key: 'first_win', name: 'Pirma reitingo pergalė', description: 'Laimėk 1 reitingo kovą', requirementType: 'wins', requirementValue: 1, reward: { exp: 100, gold: 100 } },
  { key: 'wins_5', name: 'Penkios pergalės', description: 'Laimėk 5 reitingo kovas', requirementType: 'wins', requirementValue: 5, reward: { exp: 250, gold: 150 } },
  { key: 'wins_10', name: 'Dešimt pergalių', description: 'Laimėk 10 reitingo kovų', requirementType: 'wins', requirementValue: 10, reward: { exp: 500, gold: 250 } },
  { key: 'wins_25', name: 'Dvidešimt penkios pergalės', description: 'Laimėk 25 reitingo kovas', requirementType: 'wins', requirementValue: 25, reward: { exp: 1000, gold: 500 } },
  { key: 'wins_50', name: 'Penkiasdešimt pergalių', description: 'Laimėk 50 reitingo kovų', requirementType: 'wins', requirementValue: 50, reward: { exp: 1500, boosters: 1 } },
  { key: 'wins_100', name: 'Šimtas pergalių', description: 'Laimėk 100 reitingo kovų', requirementType: 'wins', requirementValue: 100, reward: { exp: 2500, boosters: 2 } },
  { key: 'reach_40', name: 'Pasiektas 40 rangas', description: 'Pasiek 40 Bronza ar aukščiau', requirementType: 'reach_rank', requirementValue: 40, reward: { exp: 500, gold: 300 } },
  { key: 'reach_30', name: 'Pasiektas 30 rangas', description: 'Pasiek 30 Bronza ar aukščiau', requirementType: 'reach_rank', requirementValue: 30, reward: { exp: 800, boosters: 1 } },
  { key: 'reach_20', name: 'Pasiektas 20 rangas', description: 'Pasiek 20 Bronza ar aukščiau', requirementType: 'reach_rank', requirementValue: 20, reward: { exp: 1200, boosters: 1 } },
  { key: 'reach_10', name: 'Pasiektas 10 rangas', description: 'Pasiek 10 Bronza ar aukščiau', requirementType: 'reach_rank', requirementValue: 10, reward: { exp: 2000, boosters: 2 } },
  { key: 'reach_1_gold', name: 'Aukso viršūnė', description: 'Pasiek 1 Auksas', requirementType: 'reach_rank', requirementValue: 1, reward: { exp: 5000, boosters: 3, badge: true } },
  { key: 'streak_3', name: 'Pergalių serija I', description: 'Laimėk 3 reitingo kovas iš eilės', requirementType: 'win_streak', requirementValue: 3, reward: { exp: 500 } },
  { key: 'streak_5', name: 'Pergalių serija II', description: 'Laimėk 5 reitingo kovas iš eilės', requirementType: 'win_streak', requirementValue: 5, reward: { exp: 1000, gold: 500 } },
  { key: 'beat_higher', name: 'Stipresnio nugalėtojas', description: 'Nugalėk aukštesnio rango priešininką', requirementType: 'beat_higher', requirementValue: 1, reward: { exp: 500 } },
  { key: 'comeback', name: 'Sugrįžimas iš bedugnės', description: 'Laimėk nukritus žemiau 10 HP', requirementType: 'comeback', requirementValue: 1, reward: { exp: 750 } },
  { key: 'flawless', name: 'Tobula kontrolė', description: 'Laimėk turėdamas 20+ HP', requirementType: 'flawless', requirementValue: 1, reward: { exp: 750 } },
  { key: 'bot_hunter', name: 'Botų medžiotojas', description: 'Nugalėk 10 botų priešininkų', requirementType: 'beat_bots', requirementValue: 10, reward: { exp: 500, gold: 300 } },
  { key: 'real_fighter', name: 'Tikrų dvikovų kovotojas', description: 'Nugalėk 10 tikrų žaidėjų', requirementType: 'beat_real', requirementValue: 10, reward: { exp: 1000, gold: 500 } },
  { key: 'season_veteran', name: 'Sezono veteranas', description: 'Sužaisk 50 reitingo kovų per sezoną', requirementType: 'season_games', requirementValue: 50, reward: { exp: 1500, boosters: 1 } },
  { key: 'blood_statistician', name: 'Kraujo statistikas', description: 'Pasiek K/D 2.0+ po bent 20 kovų', requirementType: 'kd_ratio', requirementValue: 2, reward: { exp: 1000 } },
]

export const ACHIEVEMENT_BY_KEY = new Map(RANKED_ACHIEVEMENTS.map((a) => [a.key, a]))
