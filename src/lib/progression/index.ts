// ════════════════════════════════════════════════════════════════════════════
//  PROGRESSION v2 — vieša API
//  Naudojimas iš UI:
//    import { getProgressionSnapshot, claimLoginReward } from '@/lib/progression'
//  Dokumentacija: docs/PROGRESSION-DATA-CONTRACT.md
// ════════════════════════════════════════════════════════════════════════════
export * from './types'
export * from './client'
export {
  getMonthlyLogin, claimMonthlyLogin, getSeasonPath, claimSeasonReward,
  unlockSeasonPass, getDailyTasks, claimDailyTask, claimDailyChest, rerollDailyTask,
} from './compat'
