// ── Kosmetikos resolveris: VIENA fallback logika (cosmeticsStore) ────────────
import { beforeAll, describe, expect, it } from 'vitest'
import { setLocale } from '@/lib/i18n/core'
beforeAll(() => setLocale('lt', { explicit: true, syncProfile: false }))
import {
  activeAvatarVisual, activeCardBackVisual, cosmeticVisual,
  DEFAULT_AVATAR_ID, DEFAULT_CARD_BACK_ID, DEFAULT_CARD_BACK_SRC,
} from '@/lib/digital/cosmeticsStore'
import type { Cosmetic } from '@/lib/cosmetics'

const cb = (id: string, over: Partial<Cosmetic> = {}): Cosmetic => ({
  id, kind: 'card_back', name: `Back ${id}`, description: null, priceGold: 800,
  css: null, emoji: null, imageUrl: `/card-backs/${id}.webp`, ...over,
})
const av = (id: string, over: Partial<Cosmetic> = {}): Cosmetic => ({
  id, kind: 'avatar', name: `Av ${id}`, description: null, priceGold: 500,
  css: null, emoji: null, imageUrl: `/av/${id}.webp`, ...over,
})

const baseState = {
  items: [
    av(DEFAULT_AVATAR_ID, { ownedByDefault: true }),
    av('av_x'),
    cb(DEFAULT_CARD_BACK_ID, { ownedByDefault: true, imageUrl: DEFAULT_CARD_BACK_SRC }),
    cb('cb_x'),
    cb('cb_css_only', { imageUrl: null, css: 'linear-gradient(#000,#111)' }),
  ],
  defaults: { avatar: DEFAULT_AVATAR_ID, cardBack: DEFAULT_CARD_BACK_ID },
}

describe('activeCardBackVisual — fallback grandinė', () => {
  it('pasirinkta turima nugarėlė → jos vizualas', () => {
    const v = activeCardBackVisual({ ...baseState, active: { avatar: null, cardBack: 'cb_x' } })
    expect(v.id).toBe('cb_x')
    expect(v.url).toBe('/card-backs/cb_x.webp')
  })
  it('nepasirinkta (null) → default nugarėlė', () => {
    const v = activeCardBackVisual({ ...baseState, active: { avatar: null, cardBack: null } })
    expect(v.id).toBe(DEFAULT_CARD_BACK_ID)
    expect(v.url).toBe(DEFAULT_CARD_BACK_SRC)
  })
  it('neegzistuojantis id → default (be sulūžusio vaizdo)', () => {
    const v = activeCardBackVisual({ ...baseState, active: { avatar: null, cardBack: 'istrinta' } })
    expect(v.id).toBe(DEFAULT_CARD_BACK_ID)
    expect(v.url).toBe(DEFAULT_CARD_BACK_SRC)
  })
  it('katalogas tuščias (RPC nepasiekiamas) → statinis default kelias', () => {
    const v = activeCardBackVisual({ items: [], active: { avatar: null, cardBack: null }, defaults: baseState.defaults })
    expect(v.url).toBe(DEFAULT_CARD_BACK_SRC)
  })
  it('css-only nugarėlė turi piešiamą vizualą (css), o be nieko — statinį url', () => {
    const v = activeCardBackVisual({ ...baseState, active: { avatar: null, cardBack: 'cb_css_only' } })
    expect(v.css).toBeTruthy()
    const empty = activeCardBackVisual({
      items: [cb('cb_tuscia', { imageUrl: null, css: null })],
      active: { avatar: null, cardBack: 'cb_tuscia' },
      defaults: baseState.defaults,
    })
    expect(empty.url).toBe(DEFAULT_CARD_BACK_SRC)
  })
})

describe('activeAvatarVisual — fallback grandinė', () => {
  it('pasirinktas → jo vizualas; null → default; dingęs → default', () => {
    expect(activeAvatarVisual({ ...baseState, active: { avatar: 'av_x', cardBack: null } }).id).toBe('av_x')
    expect(activeAvatarVisual({ ...baseState, active: { avatar: null, cardBack: null } }).id).toBe(DEFAULT_AVATAR_ID)
    expect(activeAvatarVisual({ ...baseState, active: { avatar: 'nope', cardBack: null } }).id).toBe(DEFAULT_AVATAR_ID)
  })
  it('katalogas tuščias → neutralus fallback be sulūžusio img (url=null, emoji)', () => {
    const v = activeAvatarVisual({ items: [], active: { avatar: null, cardBack: null }, defaults: baseState.defaults })
    expect(v.url).toBeNull()
    expect(v.emoji).toBeTruthy()
  })
})

describe('cosmeticVisual — grid fallback be tuščių plytelių', () => {
  it('nežinomam card_back id grąžina default asset, ne tuščią', () => {
    const v = cosmeticVisual({ items: [] }, 'kazkas', 'card_back')
    expect(v.url).toBe(DEFAULT_CARD_BACK_SRC)
  })
})

describe('kanoniniai default ID sutampa su migracija 20260860', () => {
  it('av_nekronautas / cb_default', () => {
    expect(DEFAULT_AVATAR_ID).toBe('av_nekronautas')
    expect(DEFAULT_CARD_BACK_ID).toBe('cb_default')
  })
})
