// ── Kampanijos „Varngrado plyšys" V3 scenų sanity (M1 + M2–M10):
//    validateMotionComic be klaidų, unikalūs shot id, visi speakerId /
//    characterId / pozės egzistuoja scenos characters sąraše ──────────────────
import { describe, expect, it } from 'vitest'
import { validateMotionComic, type MotionComicDef } from '@/lib/campaign/motionComic'
import { raudonasisSignalasCutscene, raudonasisSignalasPost } from '@/data/cutscenes/raudonasisSignalas'
import {
  m02pre, m02post, m03pre, m03post, m04pre, m04post, m05pre, m05post,
  m06pre, m06post, m07pre, m07post, m08pre, m08post, m09pre, m09post,
  m10pre, m10post,
} from '@/data/cutscenes/varngradoPlysys'

const SCENES: [string, MotionComicDef][] = [
  ['m01pre', raudonasisSignalasCutscene], ['m01post', raudonasisSignalasPost],
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

describe('Varngrado plyšys V3 motion-comic scenos', () => {
  it.each(SCENES)('%s praeina validateMotionComic', (_name, def) => {
    expect(validateMotionComic(def)).toEqual([])
    expect(def.shots.length).toBeGreaterThan(6)
  })

  it.each(SCENES)('%s shot id unikalūs', (_name, def) => {
    const ids = def.shots.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(SCENES)('%s speakerId/characterId/pozė egzistuoja cast\'e', (_name, def) => {
    const cast = new Map(def.characters.map((c) => [c.id, c]))
    for (const shot of def.shots) {
      if (shot.speakerId) expect(cast.has(shot.speakerId), `speaker ${shot.speakerId}`).toBe(true)
      for (const ch of shot.characters ?? []) {
        const cd = cast.get(ch.characterId)
        expect(cd, `char ${ch.characterId}`).toBeTruthy()
        const pose = ch.pose ?? 'neutral'
        expect(cd!.poses[pose], `${ch.characterId}.${pose}`).toBeTruthy()
      }
    }
  })

  it.each(SCENES)('%s kadrai be teksto turi holdMs (V3 tempo taisyklė)', (_name, def) => {
    for (const shot of def.shots) {
      if (shot.text === null) {
        expect(shot.holdMs ?? 0, `shot ${shot.id} be teksto turi turėti holdMs`).toBeGreaterThanOrEqual(800)
      }
    }
  })
})
