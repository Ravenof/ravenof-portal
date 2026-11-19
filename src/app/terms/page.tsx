import type { Metadata } from 'next'
import Link from 'next/link'

// ── Naudojimo sąlygos (Google Play „Terms of Service" nuoroda) ────────────────
// Viešas puslapis be prisijungimo, LT + EN viename puslapyje (kaip /privacy).
export const metadata: Metadata = {
  title: 'Terms of Service | Ravenof',
  description: 'Ravenof Digital naudojimo sąlygos: paskyra, elgesio taisyklės, virtualūs daiktai, atsakomybė ir kontaktai.',
}

const UPDATED = '2026-11-19'

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold mt-8 mb-2" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{children}</p>
)
const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-secondary)' }}>{children}</li>
)
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} style={{ color: 'var(--gold)' }}>{children}</a>
)

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>Terms of Service</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ravenof Digital (Android, Windows) · Updated {UPDATED} · <a href="#lt" style={{ color: 'var(--gold)' }}>Lietuviška versija žemiau</a></p>

        <H>1. Who provides the service</H>
        <P>The game “Ravenof Digital” (the Game) is provided by <b>MB „Daiktų dėžutė“</b> (company code 305271827, Šiaurės pr. 87, LT-49245 Kaunas, Lithuania), operating under the <b>Kaukas Games</b> brand. Contact: <A href="mailto:info@ravenof.lt">info@ravenof.lt</A>.</P>
        <P>By using the Game you agree to these terms. If you do not agree, do not use the Game.</P>

        <H>2. Who can play</H>
        <P>The Game is intended for people aged 13 and over. If you are a minor, you may play only with the consent of a parent or guardian.</P>

        <H>3. Your account</H>
        <ul className="list-disc pl-5 mb-3">
          <Li>You can play as a guest or create an account (with email or Google).</Li>
          <Li>A guest account is tied to one device. If you do not turn it into a full account and you sign out or uninstall the app, your progress may be lost.</Li>
          <Li>You are responsible for keeping your sign-in details safe and for activity on your account.</Li>
          <Li>Accounts may not be sold, bought or transferred to another person.</Li>
        </ul>

        <H>4. Rules of conduct</H>
        <P>In the Game you must not:</P>
        <ul className="list-disc pl-5 mb-3">
          <Li>use cheats, bots, exploits or otherwise gain an unfair advantage;</Li>
          <Li>deliberately manipulate rankings or match results;</Li>
          <Li>insult, threaten or harass other players, or send them unwanted content;</Li>
          <Li>use usernames, deck names or other text that is offensive, unlawful or infringes the rights of others;</Li>
          <Li>attempt to compromise the security of the Game, its servers or other players’ accounts.</Li>
        </ul>
        <P>You can block another player from your friends list. Report violations to <A href="mailto:info@ravenof.lt">info@ravenof.lt</A>.</P>

        <H>5. Content you create</H>
        <P>Decks, deck names, messages and other content you create remain yours, but you grant us the right to store and display them in the Game as needed to provide the service (for example, a deck you publish is visible to other players). We may remove content that breaks these terms.</P>

        <H>6. Virtual items and currency</H>
        <P>In-game currency, cards, packs, cosmetics and other virtual items are part of the Game. They have no monetary value and cannot be exchanged for real money or sold outside the Game. You receive only a personal, non-transferable right to use them in the Game.</P>
        <P>At present nothing in the Game can be bought with real money. If that changes, purchase terms will be published separately before any purchase.</P>
        <P>To keep the Game balanced, we may change card properties, prices, rewards and other game elements.</P>

        <H>7. Intellectual property</H>
        <P>The Game, its name, cards, artwork, text, music and code belong to MB „Daiktų dėžutė“ or its licensors. You are granted a personal, non-exclusive, non-transferable right to use the Game for non-commercial purposes. You may not copy, distribute or commercially use Game content without our written consent.</P>

        <H>8. Availability</H>
        <P>The Game requires an internet connection. It is under active development, so bugs, interruptions and changes may occur, and some features may be in testing. We work to keep the Game running smoothly but do not guarantee continuous, uninterrupted operation. We may change, suspend or discontinue the Game or parts of it.</P>

        <H>9. Restriction and deletion of accounts</H>
        <P>If you break these terms we may warn you, temporarily restrict or permanently close your account. You can delete your account yourself at any time: in the app under <b>Settings → Account → Delete account</b>, or at <Link href="/account/delete" style={{ color: 'var(--gold)' }}>/account/delete</Link>.</P>

        <H>10. Liability</H>
        <P>The Game is provided as is. To the extent permitted by law, we are not liable for indirect losses or for lost progress or data caused by disruptions we could not reasonably control. Nothing in these terms limits the rights you have as a consumer under mandatory law.</P>

        <H>11. Privacy</H>
        <P>How we handle personal data is described in the <Link href="/privacy" style={{ color: 'var(--gold)' }}>privacy policy</Link>.</P>

        <H>12. Changes to these terms</H>
        <P>We may update these terms. We will announce material changes in the app or on this page. The date above shows the last update. By continuing to use the Game after a change, you accept it.</P>

        <H>13. Governing law</H>
        <P>These terms are governed by the law of the Republic of Lithuania. Disputes are settled by negotiation and, failing that, in the courts of the Republic of Lithuania. Consumers may also contact the State Consumer Rights Protection Authority (<A href="https://www.vvtat.lt">vvtat.lt</A>).</P>

        <hr className="my-10" style={{ borderColor: 'var(--bg-border)' }} />

        <h1 id="lt" className="text-2xl font-bold mb-1" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>Naudojimo sąlygos</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ravenof Digital (Android, Windows) · Atnaujinta {UPDATED}</p>

        <H>1. Kas teikia paslaugą</H>
        <P>Žaidimą „Ravenof Digital“ (toliau – Žaidimas) teikia <b>MB „Daiktų dėžutė“</b> (įmonės kodas 305271827, Šiaurės pr. 87, LT-49245 Kaunas, Lietuva), veikianti su prekių ženklu <b>Kaukas Games</b>. Kontaktai: <A href="mailto:info@ravenof.lt">info@ravenof.lt</A>.</P>
        <P>Naudodamiesi Žaidimu sutinkate su šiomis sąlygomis. Jei nesutinkate – Žaidimu nesinaudokite.</P>

        <H>2. Kas gali žaisti</H>
        <P>Žaidimas skirtas 13 metų ir vyresniems asmenims. Jei esate nepilnametis, žaisti galite tik su tėvų ar globėjų sutikimu.</P>

        <H>3. Paskyra</H>
        <ul className="list-disc pl-5 mb-3">
          <Li>Žaisti galima kaip svečiui arba susikūrus paskyrą (el. paštu arba per Google).</Li>
          <Li>Svečio paskyra susieta su vienu įrenginiu. Jei jos nepaversite tikra paskyra ir atsijungsite ar ištrinsite programėlę, progresas gali būti prarastas.</Li>
          <Li>Esate atsakingi už savo prisijungimo duomenų saugumą ir už veiksmus, atliktus iš jūsų paskyros.</Li>
          <Li>Paskyros negalima parduoti, pirkti ar perleisti kitam asmeniui.</Li>
        </ul>

        <H>4. Elgesio taisyklės</H>
        <P>Žaidime draudžiama:</P>
        <ul className="list-disc pl-5 mb-3">
          <Li>naudoti sukčiavimo programas, botus, klaidų išnaudojimą ar kitaip gauti nesąžiningą pranašumą;</Li>
          <Li>tyčia manipuliuoti reitingu ar kovų rezultatais;</Li>
          <Li>įžeidinėti, grasinti, priekabiauti prie kitų žaidėjų ar siųsti jiems nepageidaujamą turinį;</Li>
          <Li>naudoti įžeidžiančius, neteisėtus ar svetimas teises pažeidžiančius slapyvardžius, kaladžių pavadinimus ir kitą tekstą;</Li>
          <Li>bandyti pažeisti Žaidimo, serverių ar kitų žaidėjų paskyrų saugumą.</Li>
        </ul>
        <P>Kitą žaidėją galite užblokuoti draugų sąraše. Apie pažeidimus praneškite el. paštu <A href="mailto:info@ravenof.lt">info@ravenof.lt</A>.</P>

        <H>5. Jūsų kuriamas turinys</H>
        <P>Kaladės, jų pavadinimai, žinutės ir kitas jūsų sukurtas turinys lieka jūsų, tačiau suteikiate mums teisę jį saugoti ir rodyti Žaidime tiek, kiek reikia paslaugai teikti (pvz., viešai paskelbtą kaladę matys kiti žaidėjai). Turinį, pažeidžiantį šias sąlygas, galime pašalinti.</P>

        <H>6. Virtualūs daiktai ir valiuta</H>
        <P>Žaidimo valiuta, kortos, pakuotės, kosmetika ir kiti virtualūs daiktai yra Žaidimo dalis. Jie neturi piniginės vertės, jų negalima iškeisti į tikrus pinigus ar parduoti už Žaidimo ribų. Jums suteikiama tik asmeninė, neperleidžiama teisė jais naudotis Žaidime.</P>
        <P>Šiuo metu Žaidime nieko negalima įsigyti už tikrus pinigus. Jei tokia galimybė atsiras, pirkimo sąlygos bus paskelbtos atskirai prieš pirkimą.</P>
        <P>Kad žaidimas išliktų subalansuotas, kortų savybes, kainas, atlygius ir kitus žaidimo elementus galime keisti.</P>

        <H>7. Intelektinė nuosavybė</H>
        <P>Žaidimas, jo pavadinimas, kortos, iliustracijos, tekstai, muzika ir programinis kodas priklauso MB „Daiktų dėžutė“ arba jos licenciarams. Jums suteikiama asmeninė, neišimtinė, neperleidžiama teisė naudotis Žaidimu nekomerciniais tikslais. Žaidimo turinio negalima kopijuoti, platinti ar naudoti komerciškai be mūsų raštiško sutikimo.</P>

        <H>8. Paslaugos prieinamumas</H>
        <P>Žaidimui reikia interneto ryšio. Žaidimas tobulinamas, todėl gali pasitaikyti klaidų, pertraukų ar pakeitimų; dalis funkcijų gali būti testuojamos. Stengiamės, kad Žaidimas veiktų be sutrikimų, tačiau nuolatinio ir nepertraukiamo veikimo negarantuojame. Galime keisti, sustabdyti ar nutraukti Žaidimą ar jo dalis.</P>

        <H>9. Paskyros apribojimas ir ištrynimas</H>
        <P>Pažeidus šias sąlygas, galime įspėti, laikinai apriboti arba visam laikui uždaryti paskyrą. Savo paskyrą galite bet kada ištrinti patys: programėlėje <b>Nustatymai → Paskyra → Ištrinti paskyrą</b> arba puslapyje <Link href="/account/delete" style={{ color: 'var(--gold)' }}>/account/delete</Link>.</P>

        <H>10. Atsakomybė</H>
        <P>Žaidimas teikiamas toks, koks yra. Kiek leidžia teisės aktai, neatsakome už netiesioginius nuostolius, prarastą progresą ar duomenis, atsiradusius dėl sutrikimų, kurių negalėjome pagrįstai kontroliuoti. Šios sąlygos neriboja teisių, kurias jums kaip vartotojui suteikia privalomos teisės normos.</P>

        <H>11. Privatumas</H>
        <P>Kaip tvarkome asmens duomenis, aprašyta <Link href="/privacy" style={{ color: 'var(--gold)' }}>privatumo politikoje</Link>.</P>

        <H>12. Sąlygų pakeitimai</H>
        <P>Sąlygas galime atnaujinti. Apie esminius pakeitimus pranešime programėlėje arba šiame puslapyje. Data viršuje rodo paskutinį atnaujinimą. Toliau naudodamiesi Žaidimu po pakeitimų, su jais sutinkate.</P>

        <H>13. Taikytina teisė</H>
        <P>Šioms sąlygoms taikoma Lietuvos Respublikos teisė. Ginčai sprendžiami derybomis, o nepavykus susitarti – Lietuvos Respublikos teismuose. Vartotojai taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (<A href="https://www.vvtat.lt">vvtat.lt</A>).</P>
      </div>
    </div>
  )
}
