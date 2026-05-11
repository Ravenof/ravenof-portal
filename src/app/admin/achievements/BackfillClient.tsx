'use client'

import { useActionState } from 'react'
import { recalculateAchievementsForAllUsers } from './actions'
import type { BackfillState } from './actions'

const initialState: BackfillState = {}

export function BackfillClient() {
  const [state, formAction, pending] = useActionState(
    recalculateAchievementsForAllUsers,
    initialState,
  )

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
      <h2 className="mb-1 text-lg font-semibold text-white">Backfill pasiekimai</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Perskaičiuoja pasiekimus ir XP visiems vartotojams. Saugu paleisti kelis kartus —
        XP nesidubliuoja (ON CONFLICT DO NOTHING).
      </p>

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          {pending ? 'Apdorojama…' : 'Paleisti backfill'}
        </button>
      </form>

      {state.error && (
        <p className="mt-3 text-sm text-red-400">⚠ {state.error}</p>
      )}
      {state.success && !state.error && (
        <p className="mt-3 text-sm text-green-400">
          ✓ Baigta — apdorota {state.processed} vartotojų.
        </p>
      )}
      {state.success && state.error && (
        <p className="mt-3 text-sm text-yellow-400">
          ⚠ {state.error}
        </p>
      )}
    </div>
  )
}
