import type { Metadata } from 'next'
import Link from 'next/link'

// ── Privatumo politika (Google Play / App Store reikalavimas) ─────────────────
// Viešas puslapis be prisijungimo. Nuoroda nurodoma Play Console „Privacy policy".
export const metadata: Metadata = {
  title: 'Privatumo politika | Ravenof',
  description: 'Ravenof Digital ir ravenof.lt privatumo politika: kokius duomenis renkame, kam naudojame ir kaip juos ištrinti.',
}

const UPDATED = '2026-09-17'

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold mt-8 mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{children}</p>
)
const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>{children}</li>
)

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>Privatumo politika</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ravenof Digital (Android, Windows) ir ravenof.lt · Atnaujinta {UPDATED} · <a href="#en" style={{ color: 'var(--gold)' }}>English version below</a></p>

        <H>1. Kas mes</H>
        <P>Duomenų valdytojas – <b>Kaukas Games</b> (Lietuva), Ravenof kortų žaidimo kūrėjas. Klausimais dėl duomenų rašykite <a href="mailto:info@ravenof.lt" style={{ color: 'var(--gold)' }}>info@ravenof.lt</a>.</P>

        <H>2. Kokius duomenis renkame</H>
        <ul className="list-disc pl-5 mb-3">
          <Li><b>Paskyros duomenys:</b> el. pašto adresas, slapyvardis, rodomas vardas, avataras, slaptažodžio maiša (jei registruojatės el. paštu). Prisijungiant per Google gauname jūsų Google paskyros el. paštą ir vardą.</Li>
          <Li><b>Žaidimo duomenys:</b> kortų kolekcija, kaladės, kovų istorija ir rezultatai, reitingas, pasiekimai, lygis, užduotys, žaidimo valiuta, pirkiniai ir kosmetika, kampanijos ir mokymo progresas, nustatymai.</Li>
          <Li><b>Socialiniai duomenys:</b> draugų sąrašas, kvietimai, žinutės draugams, mainai, blokavimai.</Li>
          <Li><b>Techniniai duomenys:</b> programėlės versija, platforma, paskutinio aktyvumo laikas; klaidų pranešimuose – įrenginio modelis, OS versija, ekrano dydis, paskutinės konsolės klaidos ir jūsų savanoriškai pridėta ekrano nuotrauka.</Li>
        </ul>
        <P>Nerenkame tikslios buvimo vietos, kontaktų, nuotraukų galerijos ar kitų įrenginio failų. Programėlėje nėra reklamos ir trečiųjų šalių analitikos ar sekimo SDK.</P>

        <H>3. Kam naudojame</H>
        <ul className="list-disc pl-5 mb-3">
          <Li>Paskyrai sukurti, prisijungti ir sinchronizuoti progresą tarp įrenginių.</Li>
          <Li>Žaidimo funkcijoms: kovoms su kitais žaidėjais, reitingams, lyderių lentelėms, draugams, mainams.</Li>
          <Li>Klaidoms taisyti ir sukčiavimui užkardyti.</Li>
          <Li>Vietiniams priminimams telefone (tik jei įjungiate nustatymuose; jie neišeina iš įrenginio).</Li>
        </ul>
        <P>Teisinis pagrindas – sutarties vykdymas (žaidimo paslaugos teikimas) ir teisėtas interesas (saugumas, klaidų taisymas). Duomenų neparduodame ir nenaudojame reklamai.</P>

        <H>4. Kur saugoma ir kas mato</H>
        <P>Duomenys saugomi <b>Supabase</b> (duomenų bazė ir failų saugykla) Europos Sąjungos duomenų centre. Prisijungimui per Google naudojama Google tapatybės paslauga. Kiti žaidėjai mato jūsų slapyvardį, avatarą, lygį, reitingą ir viešai paskelbtas kalades; profilio nustatymuose galite riboti, kas rodoma. Administratoriai mato paskyros ir žaidimo duomenis moderavimo bei pagalbos tikslais.</P>

        <H>5. Kiek laiko saugome</H>
        <P>Kol turite paskyrą. Ištrynus paskyrą – visi su ja susieti duomenys ištrinami iš karto (žr. 6 p.). Anoniminė žaidimo statistika ir klaidų pranešimai be nuorodos į jus gali būti saugomi ilgiau.</P>

        <H>6. Paskyros ir duomenų ištrynimas</H>
        <P>Paskyrą galite ištrinti patys bet kada: programėlėje <b>Nustatymai → Paskyra → Ištrinti paskyrą</b>, arba svetainėje <Link href="/account/delete" style={{ color: 'var(--gold)' }}>ravenof.lt/account/delete</Link>. Ištrynimas negrįžtamas ir įvyksta iš karto. Taip pat galite prašyti ištrinti ar pateikti savo duomenų kopiją el. paštu info@ravenof.lt.</P>

        <H>7. Jūsų teisės</H>
        <P>Pagal BDAR turite teisę susipažinti su savo duomenimis, juos ištaisyti, ištrinti, apriboti tvarkymą, perkelti ir nesutikti. Skundą galite teikti Valstybinei duomenų apsaugos inspekcijai (vdai.lrv.lt).</P>

        <H>8. Vaikai</H>
        <P>Žaidimas skirtas 13 metų ir vyresniems. Jaunesnių nei 13 metų vaikų paskyrų sąmoningai nekuriame; sužinoję – jas ištriname.</P>

        <H>9. Pakeitimai</H>
        <P>Apie esminius pakeitimus pranešime programėlėje arba šiame puslapyje. Data viršuje rodo paskutinį atnaujinimą.</P>

        <hr className="my-10" style={{ borderColor: 'var(--bg-border)' }} />

        <h1 id="en" className="text-2xl font-bold mb-1" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>Privacy Policy</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ravenof Digital (Android, Windows) and ravenof.lt · Updated {UPDATED}</p>

        <H>1. Who we are</H>
        <P>The data controller is <b>Kaukas Games</b> (Lithuania), developer of the Ravenof card game. Contact: <a href="mailto:info@ravenof.lt" style={{ color: 'var(--gold)' }}>info@ravenof.lt</a>.</P>

        <H>2. Data we collect</H>
        <ul className="list-disc pl-5 mb-3">
          <Li><b>Account data:</b> email address, username, display name, avatar, password hash (if you register with email). With Google Sign-In we receive your Google account email and name.</Li>
          <Li><b>Game data:</b> card collection, decks, match history and results, rating, achievements, level, quests, in-game currency, purchases and cosmetics, campaign and tutorial progress, settings.</Li>
          <Li><b>Social data:</b> friends list, challenges, messages to friends, trades, blocks.</Li>
          <Li><b>Technical data:</b> app version, platform, last activity time; in bug reports – device model, OS version, screen size, recent console errors and a screenshot you attach voluntarily.</Li>
        </ul>
        <P>We do not collect precise location, contacts, photo library or other device files. The app contains no ads and no third-party analytics or tracking SDKs.</P>

        <H>3. How we use it</H>
        <ul className="list-disc pl-5 mb-3">
          <Li>To create your account, sign you in and sync progress across devices.</Li>
          <Li>For game features: matches against other players, ratings, leaderboards, friends, trades.</Li>
          <Li>To fix bugs and prevent cheating.</Li>
          <Li>For local reminders on your phone (only if enabled in settings; they never leave the device).</Li>
        </ul>
        <P>Legal basis: performance of a contract (providing the game) and legitimate interest (security, bug fixing). We do not sell data or use it for advertising.</P>

        <H>4. Storage and sharing</H>
        <P>Data is stored with <b>Supabase</b> (database and file storage) in an EU data centre. Google Identity is used for Google Sign-In. Other players see your username, avatar, level, rating and publicly shared decks; you can limit what is shown in profile settings. Administrators can access account and game data for moderation and support.</P>

        <H>5. Retention</H>
        <P>For as long as you have an account. When you delete your account, all data linked to it is deleted immediately (see 6). Anonymous game statistics and bug reports not linked to you may be kept longer.</P>

        <H>6. Deleting your account and data</H>
        <P>You can delete your account yourself at any time: in the app under <b>Settings → Account → Delete account</b>, or on the web at <Link href="/account/delete" style={{ color: 'var(--gold)' }}>ravenof.lt/account/delete</Link>. Deletion is immediate and irreversible. You may also request deletion or a copy of your data by emailing info@ravenof.lt.</P>

        <H>7. Your rights</H>
        <P>Under the GDPR you have the right to access, rectify, erase, restrict, port and object to processing of your data. You may lodge a complaint with the Lithuanian State Data Protection Inspectorate (vdai.lrv.lt).</P>

        <H>8. Children</H>
        <P>The game is intended for players aged 13 and over. We do not knowingly create accounts for children under 13; if we learn of one, we delete it.</P>

        <H>9. Changes</H>
        <P>We will announce material changes in the app or on this page. The date above shows the last update.</P>
      </div>
    </div>
  )
}
