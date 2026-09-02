// ── Kampanijos „Varngrado plyšys" M2–M10 scenų sanity: validateMotionComic
//    be klaidų, unikalūs shot id, visi speakerId egzistuoja CAST'e ─────────────
import { describe, expect, it } from 'vitest'
import { validateMotionComic, type MotionComicDef } from '@/lib/campaign/motionComic'
import {
  CAST,
  m02pre, m02post, m03pre, m03post, m04pre, m04post, m05pre, m05post,
  m06pre, m06post, m07pre, m07post, m08pre, m08post, m09pre, m09post,
  m10pre, m10post,
} from '@/data/cutscenes/varngradoPlysys'

const SCENES: [string, MotionComicDef][] = [
  ['m02pre', m02pre], ['m02post', m02post],
  ['m03pre', m03pre], ['m03post', m03post],
  ['m04pre', m04pre], ['m04post', m04post],
  ['m05pre', m05pre], ['m05post', m05post],
  ['m06pre', m06pre], ['m06post', m06post],
  ['m07pre', m07pre], ['m07post', m07post],
  ['m08pre', m08pre], ['m08post', m08post],
  ['m09pre', m09pre], ['m09post', m09post],
  ['m10pre', m10pre], ['m10post', m10post],
]

const castIds = new Set(CAST.map((c) => c.id))

describe('Varngrado plyšys M2–M10 motion-comic scenos', () => {
  it.each(SCENES)('%s praeina validateMotionComic', (_name, def) => {
    expect(validateMotionComic(def)).toEqual([])
    expect(def.shots.length).toBeGreaterThan(4)
  })

  it.each(SCENES)('%s shot id unikalūs', (_name, def) => {
    const ids = def.shots.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(SCENES)('%s speakerId ir characterId egzistuoja CAST', (_name, def) => {
    for (const shot of def.shots) {
      if (shot.speakerId) expect(castIds.has(shot.speakerId), `speaker ${shot.speakerId}`).toBe(true)
      for (const ch of shot.characters ?? []) {
        expect(castIds.has(ch.characterId), `char ${ch.characterId}`).toBe(true)
        const cd = CAST.find((c) => c.id === ch.characterId)!
        expect(cd.poses[ch.pose], `${ch.characterId}.${ch.pose}`).toBeTruthy()
      }
    }
  })
})
