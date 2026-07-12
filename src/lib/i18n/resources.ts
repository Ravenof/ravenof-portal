// ── Ravenof i18n — resursų registras (statiniai importai, sinchroninis init) ──
// Nauji namespace failai registruojami čia IR scripts/i18n-validate.mjs tikrina parity.

import lt_common from '@/locales/lt/common.json'
import en_common from '@/locales/en/common.json'
import lt_navigation from '@/locales/lt/navigation.json'
import en_navigation from '@/locales/en/navigation.json'
import lt_settings from '@/locales/lt/settings.json'
import en_settings from '@/locales/en/settings.json'
import lt_auth from '@/locales/lt/auth.json'
import en_auth from '@/locales/en/auth.json'
import lt_onboarding from '@/locales/lt/onboarding.json'
import en_onboarding from '@/locales/en/onboarding.json'
import lt_home from '@/locales/lt/home.json'
import en_home from '@/locales/en/home.json'
import lt_collection from '@/locales/lt/collection.json'
import en_collection from '@/locales/en/collection.json'
import lt_decks from '@/locales/lt/decks.json'
import en_decks from '@/locales/en/decks.json'
import lt_deckBuilder from '@/locales/lt/deckBuilder.json'
import en_deckBuilder from '@/locales/en/deckBuilder.json'
import lt_battle from '@/locales/lt/battle.json'
import en_battle from '@/locales/en/battle.json'
import lt_ranked from '@/locales/lt/ranked.json'
import en_ranked from '@/locales/en/ranked.json'
import lt_social from '@/locales/lt/social.json'
import en_social from '@/locales/en/social.json'
import lt_shop from '@/locales/lt/shop.json'
import en_shop from '@/locales/en/shop.json'
import lt_quests from '@/locales/lt/quests.json'
import en_quests from '@/locales/en/quests.json'
import lt_errors from '@/locales/lt/errors.json'
import en_errors from '@/locales/en/errors.json'
import lt_more from '@/locales/lt/more.json'
import en_more from '@/locales/en/more.json'
import lt_accessibility from '@/locales/lt/accessibility.json'
import en_accessibility from '@/locales/en/accessibility.json'

export const RESOURCES = {
 lt: {
    common: lt_common,
    navigation: lt_navigation,
    settings: lt_settings,
    auth: lt_auth,
    onboarding: lt_onboarding,
    home: lt_home,
    collection: lt_collection,
    decks: lt_decks,
    deckBuilder: lt_deckBuilder,
    battle: lt_battle,
    ranked: lt_ranked,
    social: lt_social,
    shop: lt_shop,
    quests: lt_quests,
    errors: lt_errors,
    more: lt_more,
    accessibility: lt_accessibility,
 },
 en: {
    common: en_common,
    navigation: en_navigation,
    settings: en_settings,
    auth: en_auth,
    onboarding: en_onboarding,
    home: en_home,
    collection: en_collection,
    decks: en_decks,
    deckBuilder: en_deckBuilder,
    battle: en_battle,
    ranked: en_ranked,
    social: en_social,
    shop: en_shop,
    quests: en_quests,
    errors: en_errors,
    more: en_more,
    accessibility: en_accessibility,
 },
} as const
