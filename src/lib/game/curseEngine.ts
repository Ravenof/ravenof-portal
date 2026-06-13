// ── Curse engine — Demonų prakeiksmų side deck ───────────────────────────────
// Atskira kortų krūva (ne pagrindinė kaladė). Prakeiksmai aktyvuojami TIK nuo
// kortų efektų (triggersCurse mapping'as) arba ištraukus prakeiksmą, kuris buvo
// įmaišytas į pagrindinę kaladę. Aktyvavus: parodoma korta, garsas, efektas
// pritaikomas iš karto pagal jos mapping'ą / tekstą.

import type { GameApi } from './effectEngine'
import { applyMapping } from './effectEngine'
import type { GameState, Side, TutCard } from '@/lib/tutorial/engine'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Side deck statyba iš curse tipo kortų (10-20 pagal taisykles, imam kiek yra). */
export function buildCurseDeck(curseCards: TutCard[], suffix: string): TutCard[] {
  return shuffle(curseCards.slice(0, 20).map((c, i) => ({ ...c, uid: `${c.id}-curse-${suffix}-${i}` })))
}

/**
 * Aktyvuoja `count` prakeiksmų iš AUKOS (victim) side deck'o.
 * Caster efektų atžvilgiu – priešinga pusė (prakeiksmas kenkia aukai).
 * Tuščias side deck → warning log, žaidimas tęsiasi.
 */
export function activateCurses(api: GameApi, g: GameState, victim: Side, count: number, srcName: string, depth: number): void {
  const p = victim === 'you' ? g.you : g.ai
  const caster: Side = victim === 'you' ? 'ai' : 'you'
  for (let i = 0; i < count; i++) {
    const curse = p.curses.pop()
    if (!curse) {
      api.log(g, { t: 'blocked', side: victim, msg: `Prakeiksmų krūva tuščia – „${srcName}" prakeiksmo neaktyvuoja.` })
      return
    }
    p.discard.push(curse)
    api.log(g, {
      t: 'curse', side: victim, cardName: curse.name,
      msg: `🕸 Prakeiksmas „${curse.name}" aktyvuojamas ${victim === 'you' ? 'tau' : 'priešininkui'}! ${curse.effectText || ''}`.trim(),
    })
    if (curse.mappings && curse.mappings.length > 0) {
      for (const m of curse.mappings) {
        applyMapping(api, g, caster, m, { sourceName: curse.name, depth })
        if (g.winner) return
      }
    } else {
      // fallback: parsed tekstas arba 1 bazinė žala aukai
      const dmg = curse.effect?.damage ?? 1
      api.dealToPlayer(g, victim, dmg, caster, true)
    }
    if (g.winner) return
  }
}
