// ⚠️ GENERUOTAS FAILAS — nekeisk ranka.
// Šaltinis: asffa/asset-maps/achievement-manifest.csv · scripts/gen-handoff-registries.mjs
// 70 gamybinių pasiekimų. 63–70 badge'ai dar negeneruoti (art blocker) — jiems
// badgeFile = null ir status = 'pending'; NIEKADA nepakeisti atsitiktine ikona.

export type AchievementCategory = 'start' | 'combat' | 'tactics' | 'decks' | 'collection' | 'ranked' | 'daily' | 'community'

export const ACHIEVEMENT_CATEGORIES: { key: AchievementCategory; nameLt: string; total: number }[] = [
  { key: 'start', nameLt: 'Pradžia ir profilis', total: 8 },
  { key: 'combat', nameLt: 'Kovos ir pergalės', total: 10 },
  { key: 'tactics', nameLt: 'Taktika ir mechanikos', total: 12 },
  { key: 'decks', nameLt: 'Kaladės ir frakcijos', total: 10 },
  { key: 'collection', nameLt: 'Kolekcija', total: 10 },
  { key: 'ranked', nameLt: 'Ranked', total: 10 },
  { key: 'daily', nameLt: 'Dienos aktyvumas', total: 6 },
  { key: 'community', nameLt: 'Bendruomenė', total: 4 },
]

export type AchievementDef = {
  id: number
  code: string
  category: AchievementCategory
  nameLt: string
  requirementLt: string
  badgeFile: string | null
  status: 'generated' | 'pending'
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 1, code: 'ach_01', category: 'start', nameLt: 'Pirmasis žingsnis', requirementLt: 'Susikurkite paskyrą ir pirmą kartą įeikite į žaidimą', badgeFile: '01-pirmasis-zingsnis.webp', status: 'generated' },
  { id: 2, code: 'ach_02', category: 'start', nameLt: 'Vardas įrašytas', requirementLt: 'Pasirinkite žaidėjo vardą', badgeFile: '02-vardas-irasytas.webp', status: 'generated' },
  { id: 3, code: 'ach_03', category: 'start', nameLt: 'Veidas Arenoje', requirementLt: 'Pasirinkite ne numatytąjį avatarą', badgeFile: '03-veidas-arenoje.webp', status: 'generated' },
  { id: 4, code: 'ach_04', category: 'start', nameLt: 'Kovos priesaika', requirementLt: 'Užbaikite mokymus', badgeFile: '04-kovos-priesaika.webp', status: 'generated' },
  { id: 5, code: 'ach_05', category: 'start', nameLt: 'Pirmoji kaladė', requirementLt: 'Išsaugokite galiojančią 30–40 kortų kaladę', badgeFile: '05-pirmoji-kalade.webp', status: 'generated' },
  { id: 6, code: 'ach_06', category: 'start', nameLt: 'Pirmasis susirėmimas', requirementLt: 'Užbaikite pirmąsias rungtynes', badgeFile: '06-pirmasis-susiremimas.webp', status: 'generated' },
  { id: 7, code: 'ach_07', category: 'start', nameLt: 'Pirmoji pergalė', requirementLt: 'Laimėkite pirmąsias Casual arba Ranked rungtynes', badgeFile: '07-pirmoji-pergale.webp', status: 'generated' },
  { id: 8, code: 'ach_08', category: 'start', nameLt: 'Pilnas profilis', requirementLt: 'Pasirinkite avatarą prisegtus ženklus ir profilio privatumo nustatymus', badgeFile: '08-pilnas-profilis.webp', status: 'generated' },
  { id: 9, code: 'ach_09', category: 'combat', nameLt: 'Kraujo krikštas', requirementLt: 'Užbaikite 10 rungtynių', badgeFile: '09-kraujo-krikstas.webp', status: 'generated' },
  { id: 10, code: 'ach_10', category: 'combat', nameLt: 'Arenos nuolatinis', requirementLt: 'Užbaikite 50 rungtynių', badgeFile: '10-arenos-nuolatinis.webp', status: 'generated' },
  { id: 11, code: 'ach_11', category: 'combat', nameLt: 'Šimtas susirėmimų', requirementLt: 'Užbaikite 100 rungtynių', badgeFile: '11-simtas-susiremimu.webp', status: 'generated' },
  { id: 12, code: 'ach_12', category: 'combat', nameLt: 'Karo veteranas', requirementLt: 'Užbaikite 250 rungtynių', badgeFile: '12-karo-veteranas.webp', status: 'generated' },
  { id: 13, code: 'ach_13', category: 'combat', nameLt: 'Pergalių skonis', requirementLt: 'Laimėkite 10 PvP rungtynių', badgeFile: '13-pergaliu-skonis.webp', status: 'generated' },
  { id: 14, code: 'ach_14', category: 'combat', nameLt: 'Kovų nugalėtojas', requirementLt: 'Laimėkite 50 PvP rungtynių', badgeFile: '14-kovu-nugaletojas.webp', status: 'generated' },
  { id: 15, code: 'ach_15', category: 'combat', nameLt: 'Šimtąkart triumfavęs', requirementLt: 'Laimėkite 100 PvP rungtynių', badgeFile: '15-simtakart-triumfaves.webp', status: 'generated' },
  { id: 16, code: 'ach_16', category: 'combat', nameLt: 'Arenos siaubas', requirementLt: 'Laimėkite 250 PvP rungtynių', badgeFile: '16-arenos-siaubas.webp', status: 'generated' },
  { id: 17, code: 'ach_17', category: 'combat', nameLt: 'Pergalių serija', requirementLt: 'Laimėkite 3 rungtynes iš eilės', badgeFile: '17-pergaliu-serija.webp', status: 'generated' },
  { id: 18, code: 'ach_18', category: 'combat', nameLt: 'Nenugalimas', requirementLt: 'Laimėkite 5 parinktas PvP rungtynes iš eilės', badgeFile: '18-nenugalimas.webp', status: 'generated' },
  { id: 19, code: 'ach_19', category: 'tactics', nameLt: 'Pirma reakcija', requirementLt: 'Panaudokite pirmą Reakcijos kortą', badgeFile: '19-pirma-reakcija.webp', status: 'generated' },
  { id: 20, code: 'ach_20', category: 'tactics', nameLt: 'Grandinės pradžia', requirementLt: 'Suaktyvinkite 2 Reakcijas vienoje grandinėje', badgeFile: '20-grandines-pradzia.webp', status: 'generated' },
  { id: 21, code: 'ach_21', category: 'tactics', nameLt: 'Reakcijų meistras', requirementLt: 'Panaudokite 50 Reakcijų', badgeFile: '21-reakciju-meistras.webp', status: 'generated' },
  { id: 22, code: 'ach_22', category: 'tactics', nameLt: 'Kovos šauksmas', requirementLt: 'Suaktyvinkite pirmą Kovos šūksnį', badgeFile: '22-kovos-sauksmas.webp', status: 'generated' },
  { id: 23, code: 'ach_23', category: 'tactics', nameLt: 'Šauklių armija', requirementLt: 'Suaktyvinkite 100 Kovos šūksnio arba iškvietimo efektų', badgeFile: '23-saukliu-armija.webp', status: 'generated' },
  { id: 24, code: 'ach_24', category: 'tactics', nameLt: 'Aukos kaina', requirementLt: 'Pirmą kartą sumokėkite Tribute', badgeFile: '24-aukos-kaina.webp', status: 'generated' },
  { id: 25, code: 'ach_25', category: 'tactics', nameLt: 'Čempiono iškilimas', requirementLt: 'Pasiekite Champion III fazę', badgeFile: '25-cempiono-iskilimas.webp', status: 'generated' },
  { id: 26, code: 'ach_26', category: 'tactics', nameLt: 'Lauko valdovas', requirementLt: 'Pakeiskite priešininko lauką', badgeFile: '26-lauko-valdovas.webp', status: 'generated' },
  { id: 27, code: 'ach_27', category: 'tactics', nameLt: 'Vienu smūgiu', requirementLt: 'Vienu efektu sunaikinkite 3 padarus', badgeFile: '27-vienu-smugiu.webp', status: 'generated' },
  { id: 28, code: 'ach_28', category: 'tactics', nameLt: 'Trigubas taikinys', requirementLt: 'Viena korta arba efektu paveikite 3 taikinius', badgeFile: '28-trigubas-taikinys.webp', status: 'generated' },
  { id: 29, code: 'ach_29', category: 'tactics', nameLt: 'Ant mirties slenksčio', requirementLt: 'Laimėkite kai herojui likę 5 arba mažiau HP', badgeFile: '29-ant-mirties-slenkscio.webp', status: 'generated' },
  { id: 30, code: 'ach_30', category: 'tactics', nameLt: 'Be įbrėžimo', requirementLt: 'Laimėkite nepatyrę žalos herojui', badgeFile: '30-be-ibrezimo.webp', status: 'generated' },
  { id: 31, code: 'ach_31', category: 'decks', nameLt: 'Kaladžių kalvis', requirementLt: 'Sukurkite 5 galiojančias kalades', badgeFile: '31-kaladziu-kalvis.webp', status: 'generated' },
  { id: 32, code: 'ach_32', category: 'decks', nameLt: 'Frakcijų eksperimentuotojas', requirementLt: 'Sužaiskite su 3 skirtingomis frakcijomis', badgeFile: '32-frakciju-eksperimentuotojas.webp', status: 'generated' },
  { id: 33, code: 'ach_33', category: 'decks', nameLt: 'Trijų vėliavų nugalėtojas', requirementLt: 'Laimėkite su 3 skirtingomis frakcijomis', badgeFile: '33-triju-veliavu-nugaletojas.webp', status: 'generated' },
  { id: 34, code: 'ach_34', category: 'decks', nameLt: 'Visų kelių keleivis', requirementLt: 'Sužaiskite su visomis 8 frakcijomis', badgeFile: '34-visu-keliu-keleivis.webp', status: 'generated' },
  { id: 35, code: 'ach_35', category: 'decks', nameLt: 'Visų frakcijų strategas', requirementLt: 'Laimėkite su visomis 8 frakcijomis', badgeFile: '35-visu-frakciju-strategas.webp', status: 'generated' },
  { id: 36, code: 'ach_36', category: 'decks', nameLt: 'Ištikimas vėliavai', requirementLt: 'Laimėkite 10 rungtynių su ta pačia frakcija', badgeFile: '36-istikimas-veliavai.webp', status: 'generated' },
  { id: 37, code: 'ach_37', category: 'decks', nameLt: 'Frakcijos čempionas', requirementLt: 'Laimėkite 50 rungtynių su ta pačia frakcija', badgeFile: '37-frakcijos-cempionas.webp', status: 'generated' },
  { id: 38, code: 'ach_38', category: 'decks', nameLt: 'Čempiono kaladė', requirementLt: 'Laimėkite su III fazės Champion', badgeFile: '38-cempiono-kalade.webp', status: 'generated' },
  { id: 39, code: 'ach_39', category: 'decks', nameLt: 'Burtų meistras', requirementLt: 'Laimėkite su kalade turinčia bent 12 burtų', badgeFile: '39-burtu-meistras.webp', status: 'generated' },
  { id: 40, code: 'ach_40', category: 'decks', nameLt: 'Padarų vadas', requirementLt: 'Laimėkite su kalade turinčia bent 20 padarų', badgeFile: '40-padaru-vadas.webp', status: 'generated' },
  { id: 41, code: 'ach_41', category: 'collection', nameLt: 'Pirmasis radinys', requirementLt: 'Gaukite pirmą kortą nepriklausančią pradinei kolekcijai', badgeFile: '41-pirmasis-radinys.webp', status: 'generated' },
  { id: 42, code: 'ach_42', category: 'collection', nameLt: 'Auganti kolekcija', requirementLt: 'Surinkite 50 unikalių kortų', badgeFile: '42-auganti-kolekcija.webp', status: 'generated' },
  { id: 43, code: 'ach_43', category: 'collection', nameLt: 'Kortų archyvas', requirementLt: 'Surinkite 100 unikalių kortų', badgeFile: '43-kortu-archyvas.webp', status: 'generated' },
  { id: 44, code: 'ach_44', category: 'collection', nameLt: 'Didžioji saugykla', requirementLt: 'Surinkite 200 unikalių kortų', badgeFile: '44-didzioji-saugykla.webp', status: 'generated' },
  { id: 45, code: 'ach_45', category: 'collection', nameLt: 'Ravenoro kolekcionierius', requirementLt: 'Surinkite 300 unikalių kortų', badgeFile: '45-ravenoro-kolekcionierius.webp', status: 'generated' },
  { id: 46, code: 'ach_46', category: 'collection', nameLt: 'Retas laimikis', requirementLt: 'Gaukite pirmą Rare kortą', badgeFile: '46-retas-laimikis.webp', status: 'generated' },
  { id: 47, code: 'ach_47', category: 'collection', nameLt: 'Epiškas radinys', requirementLt: 'Gaukite pirmą Epic kortą', badgeFile: '47-episkas-radinys.webp', status: 'generated' },
  { id: 48, code: 'ach_48', category: 'collection', nameLt: 'Legenda rankose', requirementLt: 'Gaukite pirmą Legendary kortą', badgeFile: '48-legenda-rankose.webp', status: 'generated' },
  { id: 49, code: 'ach_49', category: 'collection', nameLt: 'Čempionas pabudo', requirementLt: 'Gaukite pirmą Champion kortą', badgeFile: '49-cempionas-pabudo.webp', status: 'generated' },
  { id: 50, code: 'ach_50', category: 'collection', nameLt: 'Aštuonių vėliavų rinkinys', requirementLt: 'Surinkite po 10 unikalių kortų iš kiekvienos iš 8 frakcijų', badgeFile: '50-astuoniu-veliavu-rinkinys.webp', status: 'generated' },
  { id: 51, code: 'ach_51', category: 'ranked', nameLt: 'Pirmasis rangas', requirementLt: 'Užbaikite pirmąsias Ranked rungtynes', badgeFile: '51-pirmasis-rangas.webp', status: 'generated' },
  { id: 52, code: 'ach_52', category: 'ranked', nameLt: 'Įrašas lentelėje', requirementLt: 'Laimėkite pirmąsias Ranked rungtynes', badgeFile: '52-irasas-lenteleje.webp', status: 'generated' },
  { id: 53, code: 'ach_53', category: 'ranked', nameLt: 'Kylantis varžovas', requirementLt: 'Laimėkite 10 Ranked rungtynių', badgeFile: '53-kylantis-varzovas.webp', status: 'generated' },
  { id: 54, code: 'ach_54', category: 'ranked', nameLt: 'Arenos grėsmė', requirementLt: 'Laimėkite 50 Ranked rungtynių', badgeFile: '54-arenos-gresme.webp', status: 'generated' },
  { id: 55, code: 'ach_55', category: 'ranked', nameLt: 'Šimtas ranginių pergalių', requirementLt: 'Laimėkite 100 Ranked rungtynių', badgeFile: '55-simtas-ranginiu-pergaliu.webp', status: 'generated' },
  { id: 56, code: 'ach_56', category: 'ranked', nameLt: 'Sidabro slenkstis', requirementLt: 'Pirmą kartą pasiekite Silver pakopą', badgeFile: '56-sidabro-slenkstis.webp', status: 'generated' },
  { id: 57, code: 'ach_57', category: 'ranked', nameLt: 'Aukso vartai', requirementLt: 'Pirmą kartą pasiekite Gold pakopą', badgeFile: '57-aukso-vartai.webp', status: 'generated' },
  { id: 58, code: 'ach_58', category: 'ranked', nameLt: 'Aukso viršūnė', requirementLt: 'Pasiekite aukščiausią Gold pakopą', badgeFile: '58-aukso-virsune.webp', status: 'generated' },
  { id: 59, code: 'ach_59', category: 'ranked', nameLt: 'Sezono veteranas', requirementLt: 'Per vieną sezoną sužaiskite 50 Ranked rungtynių', badgeFile: '59-sezono-veteranas.webp', status: 'generated' },
  { id: 60, code: 'ach_60', category: 'ranked', nameLt: 'Auksinė pabaiga', requirementLt: 'Užbaikite sezoną Gold pakopoje', badgeFile: '60-auksine-pabaiga.webp', status: 'generated' },
  { id: 61, code: 'ach_61', category: 'daily', nameLt: 'Dienos darbas', requirementLt: 'Užbaikite pirmą Daily Quest', badgeFile: '61-dienos-darbas.webp', status: 'generated' },
  { id: 62, code: 'ach_62', category: 'daily', nameLt: 'Darbas baigtas', requirementLt: 'Per vieną dieną užbaikite visus 3 Daily Quest', badgeFile: '62-darbas-baigtas.webp', status: 'generated' },
  { id: 63, code: 'ach_63', category: 'daily', nameLt: 'Patikimas samdinys', requirementLt: 'Užbaikite 25 Daily Quest', badgeFile: null, status: 'pending' },
  { id: 64, code: 'ach_64', category: 'daily', nameLt: 'Šimtas užduočių', requirementLt: 'Užbaikite 100 Daily Quest', badgeFile: null, status: 'pending' },
  { id: 65, code: 'ach_65', category: 'daily', nameLt: 'Savaitės ritmas', requirementLt: 'Prisijunkite 7 dienas iš eilės', badgeFile: null, status: 'pending' },
  { id: 66, code: 'ach_66', category: 'daily', nameLt: 'Mėnesio ištvermė', requirementLt: 'Prisijunkite 30 dienų iš eilės', badgeFile: null, status: 'pending' },
  { id: 67, code: 'ach_67', category: 'community', nameLt: 'Vieša strategija', requirementLt: 'Paskelbkite pirmą viešą kaladę', badgeFile: null, status: 'pending' },
  { id: 68, code: 'ach_68', category: 'community', nameLt: 'Pirmas balsas', requirementLt: 'Balsuokite už kito žaidėjo kaladę', badgeFile: null, status: 'pending' },
  { id: 69, code: 'ach_69', category: 'community', nameLt: 'Bendruomenės kibirkštis', requirementLt: 'Gaukite 10 balsų už paskelbtą kaladę', badgeFile: null, status: 'pending' },
  { id: 70, code: 'ach_70', category: 'community', nameLt: 'Meta pėdsakas', requirementLt: 'Pasiekite kad jūsų kaladė būtų nukopijuota 25 kartus', badgeFile: null, status: 'pending' },
]

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length
const BY_CODE = new Map<string, AchievementDef>(ACHIEVEMENTS.map((a) => [a.code, a]))
export const achievementDef = (code: string): AchievementDef | null => BY_CODE.get(code) ?? null

/** Pasiekimo iliustracija (512×512 WebP su alfa). null = dar negeneruota. */
export const achievementBadgeSrc = (code: string): string | null => {
  const a = BY_CODE.get(code)
  return a?.badgeFile ? `/ravenof-ui/achievements/${a.badgeFile}` : null
}
export const achievementsByCategory = (key: AchievementCategory): AchievementDef[] =>
  ACHIEVEMENTS.filter((a) => a.category === key)
