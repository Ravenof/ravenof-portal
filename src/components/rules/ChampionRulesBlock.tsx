const PHASES = [
  {
    phase: '1 fazė',
    cost: 'Aukso kaina + Tribute',
    heal: false,
    desc: 'Visi 3 gebėjimai iš karto pasiekiami. Gebėjimą galima naudoti tą patį ėjimą, kai Čempionas buvo iškviestas.',
  },
  {
    phase: '2 fazė',
    cost: 'Aukso kaina + Tribute',
    heal: true,
    desc: 'Evoliucionavęs Čempionas pilnai pagyja. Visi gebėjimai toliau pasiekiami.',
  },
  {
    phase: '3 fazė',
    cost: 'Aukso kaina + Tribute',
    heal: true,
    desc: 'Galutinė forma. Čempionas pilnai pagyja evoliucijoje.',
  },
]

const RULES = [
  'Čempionas yra atskiras kortų tipas — ne Padaras, nors dalijasi padarų zona.',
  'Neturi ATK reikšmės. Negali atlikti įprastos atakos, nebent kortos tekstas nurodo kitaip.',
  'Turi gyvybės taškus ir 3 gebėjimus.',
  'Per vieną savo ėjimą galima naudoti tik vieną gebėjimą.',
  'Gebėjimą galima naudoti tą patį ėjimą, kai Čempionas buvo iškviestas, jei kortos tekstas nenurodo kitaip.',
  'Kortos tekstas nurodo, nuo kurios fazės konkretūs gebėjimai yra pasiekiami.',
  'Negauna atgalinės žalos naudodamas gebėjimą (gebėjimas yra efektas, ne ataka).',
  'Nutildytas arba Apsvaigintas Čempionas negali naudoti gebėjimų.',
  'To paties Čempiono kovos lauke negali būti daugiau nei vienas. Skirtingų — gali būti keli.',
  'Dedamas į padarų zoną — įskaičiuojamas į 5 vietų limitą.',
  'Gyvybės taškams nukritus iki 0, Čempionas keliauja į panaudotų kortų krūvą.',
]

const TRIBUTE_SOURCES = [
  { icon: '⚔', label: '1 padaras iš savo kovos lauko', value: '= 1 Tribute' },
  { icon: '🃏', label: '2 kortos iš savo rankos',       value: '= 1 Tribute' },
  { icon: '✂',  label: 'Kombinacija',                    value: 'pvz. 1 padaras + 2 kortos = 2 Tribute' },
]

export function ChampionRulesBlock() {
  return (
    <div className="flex flex-col gap-4">
      {/* Rules list */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(240,180,41,0.2)' }}>
        <p className="text-xs font-bold mb-3" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          ČEMPIONŲ TAISYKLĖS
        </p>
        <div className="flex flex-col gap-1.5">
          {RULES.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--gold)', opacity: 0.6, marginTop: 1 }}>▸</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tribute sources */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(240,180,41,0.15)' }}>
        <p className="text-xs font-bold mb-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          TRIBUTE — AUKOJIMO KAINA
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Kiek Tribute reikia, visada nurodo konkreti Čempiono korta. Tribute galima mokėti bet kokia kombinacija: padarais iš savo kovos lauko ir kortomis iš rankos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TRIBUTE_SOURCES.map((t) => (
            <div key={t.label} className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(240,180,41,0.05)', border: '1px solid rgba(240,180,41,0.1)' }}>
              <span className="text-lg">{t.icon}</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{t.label}</p>
                <p className="text-xs" style={{ color: 'var(--gold)', opacity: 0.8 }}>{t.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase progression */}
      <div>
        <p className="text-xs font-bold mb-3" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          FAZIŲ PROGRESIJA
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PHASES.map((p, i) => (
            <div key={p.phase} className="relative rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: `1px solid rgba(240,180,41,${0.15 + i * 0.1})` }}>
              <div className="inline-flex items-center gap-1.5 mb-3 px-2 py-1 rounded-full" style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)' }}>
                <span className="text-xs font-black" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{p.phase}</span>
              </div>
              <p className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>{p.cost}</p>
              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>{p.desc}</p>
              {p.heal && (
                <div className="flex items-center gap-1 text-xs" style={{ color: '#4ade80' }}>
                  <span>♥</span>
                  <span>Pilnas pagijimas</span>
                </div>
              )}
              {i < 2 && (
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 text-base z-10" style={{ color: 'var(--gold)', opacity: 0.4 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
