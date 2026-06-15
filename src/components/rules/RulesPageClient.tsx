'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, X } from 'lucide-react'
import { RULES_SECTIONS, RULE_CATEGORIES, QUICK_LINKS, type RuleCategory } from '@/data/rules'
import { RuleSectionCard } from './RuleSectionCard'
import { RulesQuickReference } from './RulesQuickReference'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { TutorialButton, DEMO_DECK_TUTORIAL } from '@/components/tutorial/TutorialButton'
import { playUiClick, playSuccess } from '@/lib/ui-sound'

// ── Hero ──────────────────────────────────────────────────────────────────────
const HERO_STATS = [
  { label: '1v1',    value: '40 HP'        },
  { label: '2v2',    value: '60 HP komandai' },
  { label: 'Kaladė', value: '30–40 kortų'  },
  { label: 'ŽMK',    value: '20 kortų'     },
]

function RulesHero({ onQuickLink }: { onQuickLink: (href: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl mb-6" style={{ background: 'linear-gradient(135deg,#0c0c18 0%,#111122 60%,#0a0a16 100%)', border: '1px solid rgba(240,180,41,0.2)' }}>
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(240,180,41,0.06) 0%, transparent 60%)' }} />
      <div className="relative px-5 py-6">
        <div className="flex items-start gap-3 mb-3">
          <BookOpen className="w-6 h-6 shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
          <div>
            <h1 className="text-xl font-black leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
              Ravenof: Antrasis leidimas
            </h1>
            <p className="text-sm font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              Taisyklių knyga
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)', maxWidth: 480 }}>
          Interaktyvi taisyklių knyga: paieška, kortų apžiūra iš arti, ŽMK ir Monetos metimo bandymai, skaitymo progresas ir greitos atmintinės.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 mb-4">
          {HERO_STATS.map((s) => (
            <div key={s.label} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.2)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
              <span className="font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>GREITOS NUORODOS</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((ql) => (
              <button
                key={ql.href}
                onClick={() => onQuickLink(ql.href)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.4)] hover:text-[var(--gold)]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}
              >
                {ql.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Search ────────────────────────────────────────────────────────────────────
function RulesSearch({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  return (
    <div className="relative">
      <label htmlFor="rules-search" className="sr-only">Ieškoti taisyklėse</label>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none" style={{ color: 'var(--text-muted)' }}>
        🔍
      </div>
      <input
        id="rules-search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Ieškoti taisyklėse, ŽMK, raktažodžiuose, būsenose, aukojime…"
        className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none focus:ring-2"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--rvn-font-body)',
        }}
        aria-label="Ieškoti taisyklėse, ŽMK, raktažodžiuose, būsenose"
      />
      {query && (
        <button
          onClick={() => onQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Išvalyti paiešką"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function RulesSidebar({ activeId, readIds, onNav }: { activeId: string | null; readIds: Set<string>; onNav: (id: string) => void }) {
  const total = RULES_SECTIONS.length
  const read = RULES_SECTIONS.filter((s) => readIds.has(s.id)).length
  return (
    <nav aria-label="Taisyklių turinys" className="flex flex-col gap-0.5">
      <p className="text-xs font-bold mb-2 px-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        TURINYS
      </p>
      {/* Skaitymo progresas */}
      <div className="px-2 mb-2">
        <div className="flex items-center justify-between mb-1" style={{ fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>{read === total ? '🏆 Perskaityta viskas!' : 'Perskaityta'}</span>
          <span style={{ color: read === total ? 'var(--gold)' : 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', fontWeight: 700 }}>
            {read}/{total}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }} role="progressbar" aria-valuenow={read} aria-valuemax={total} aria-label="Skaitymo progresas">
          <div className="h-full rounded-full" style={{ width: `${(read / total) * 100}%`, background: 'linear-gradient(90deg,#f0b429,#ffd970)', transition: 'width 0.4s ease', boxShadow: '0 0 6px rgba(240,180,41,0.5)' }} />
        </div>
      </div>
      {RULES_SECTIONS.map((s) => {
        const active = activeId === s.id
        const isRead = readIds.has(s.id)
        return (
          <button
            key={s.id}
            onClick={() => onNav(s.id)}
            className="text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 w-full focus:ring-2 focus:ring-[rgba(240,180,41,0.4)] focus:outline-none"
            style={{
              background: active ? 'rgba(240,180,41,0.1)' : 'transparent',
              color: active ? 'var(--gold)' : 'var(--text-muted)',
              border: active ? '1px solid rgba(240,180,41,0.2)' : '1px solid transparent',
              fontFamily: active ? 'var(--rvn-font-display)' : 'var(--rvn-font-body)',
              fontWeight: active ? 600 : 400,
            }}
            aria-current={active ? 'true' : undefined}
          >
            <span className="w-5 shrink-0 text-center" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', opacity: active ? 1 : 0.5, fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}>
              {s.number}
            </span>
            <span className="leading-tight truncate flex-1">{s.title}</span>
            {isRead && (
              <span className="shrink-0" style={{ color: 'rgba(240,180,41,0.55)', fontSize: 9 }} aria-label="Perskaityta">✓</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ── Category chips ────────────────────────────────────────────────────────────
function CategoryChips({ active, onSelect }: { active: RuleCategory | 'viskas'; onSelect: (c: RuleCategory | 'viskas') => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtruoti pagal kategoriją">
      {RULE_CATEGORIES.map((cat) => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as RuleCategory | 'viskas')}
            className="text-xs px-3 py-1 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(240,180,41,0.4)]"
            style={{
              background: isActive ? 'rgba(240,180,41,0.15)' : 'var(--bg-surface)',
              border: isActive ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--bg-border)',
              color: isActive ? 'var(--gold)' : 'var(--text-muted)',
              fontFamily: isActive ? 'var(--rvn-font-display)' : 'var(--rvn-font-body)',
              fontWeight: isActive ? 600 : 400,
              boxShadow: isActive ? '0 0 8px rgba(240,180,41,0.15)' : undefined,
            }}
            aria-pressed={isActive}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Scroll progress bar ───────────────────────────────────────────────────────
function ScrollProgressBar() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ height: 3 }} aria-hidden>
      <div
        style={{
          width: `${p * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #f0b429, #ffd970)',
          boxShadow: '0 0 8px rgba(240,180,41,0.6)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.08s linear',
        }}
      />
    </div>
  )
}

// ── Back to top ───────────────────────────────────────────────────────────────
function BackToTopButton() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <button
      onClick={() => { playUiClick(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      className="fixed bottom-24 lg:bottom-6 right-4 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
      style={{
        background: 'rgba(12,12,24,0.92)',
        border: '1px solid rgba(240,180,41,0.4)',
        color: 'var(--gold)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(240,180,41,0.15)',
        backdropFilter: 'blur(8px)',
      }}
      aria-label="Grįžti į viršų"
    >
      ↑
    </button>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────
export function RulesPageClient() {
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState<RuleCategory | 'viskas'>('viskas')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [readIds, setReadIds]   = useState<Set<string>>(new Set())
  const [showTrophy, setShowTrophy] = useState(false)
  const trophyShownRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Skaitymo progresas iš localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rvn-rules-read-v1') ?? '[]') as string[]
      setReadIds(new Set(saved.filter((id) => RULES_SECTIONS.some((s) => s.id === id))))
      trophyShownRef.current = localStorage.getItem('rvn-rules-master') === '1'
    } catch { /* ignore */ }
  }, [])

  // Scroll to hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
        setActiveId(hash)
      }
    }
  }, [])

  const filteredSections = useMemo(() => {
    const rawQ = query.toLowerCase().trim()
    // Synonym map - anglicizmai → lietuviški terminai paieškoje
    const SYNONYMS: Record<string, string> = {
      'dmd': 'žmk žalos modifikatorių',
      'damage modifier': 'žalos modifikatorių',
      'coinflip': 'monetos metimas',
      'keyword': 'raktažodis',
      'statusas': 'būsena',
      'graveyard': 'kapinynas',
      'discard': 'kapinynas',
      'hand': 'ranka',
      'summon': 'iškviesti',
      'buff': 'pastiprinimas',
      'aoe': 'masinis efektas',
      'stack': 'efektų eilė',
      'phase': 'fazė',
      'tribute': 'aukojimas',
      'mulligan': 'pradinės rankos keitimas',
    }
    const q = SYNONYMS[rawQ] ? `${rawQ} ${SYNONYMS[rawQ]}` : rawQ
    return RULES_SECTIONS.filter((s) => {
      const matchCat = category === 'viskas' || s.category === category
      if (!matchCat) return false
      if (!rawQ) return true
      const haystack = [
        s.title, s.summary ?? '',
        ...(s.relatedTerms ?? []),
        ...s.content.flatMap((b) => [b.text ?? '', ...(b.items ?? []), ...(b.rows?.flat() ?? [])]),
      ].join(' ').toLowerCase()
      return q.split(' ').some(term => term && haystack.includes(term))
    })
  }, [query, category])

  // Intersection observer: sidebar highlight + skaitymo žymėjimas.
  // Priklauso nuo filteredSections, kad po filtravimo skyriai būtų stebimi iš naujo.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const id = visible[0].target.id
          setActiveId(id)
          setReadIds((prev) => {
            if (prev.has(id)) return prev
            const next = new Set(prev)
            next.add(id)
            try { localStorage.setItem('rvn-rules-read-v1', JSON.stringify([...next])) } catch { /* ignore */ }
            return next
          })
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    RULES_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [filteredSections])

  // Visi skyriai perskaityti -> apdovanojimas (vieną kartą)
  useEffect(() => {
    if (trophyShownRef.current || RULES_SECTIONS.length === 0) return
    if (readIds.size >= RULES_SECTIONS.length) {
      trophyShownRef.current = true
      try { localStorage.setItem('rvn-rules-master', '1') } catch { /* ignore */ }
      playSuccess()
      setShowTrophy(true)
      const t = setTimeout(() => setShowTrophy(false), 6000)
      return () => clearTimeout(t)
    }
  }, [readIds])

  const scrollTo = (id: string) => {
    playUiClick()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
      window.history.replaceState(null, '', `/rules#${id}`)
    }
  }

  const handleQuickLink = (href: string) => {
    const id = href.slice(1)
    scrollTo(id)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <ScrollProgressBar />
      {/* Page header */}
      <header className="sticky top-0 z-20 border-b px-4 py-3" style={{ background: 'rgba(7,7,15,0.96)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Pradžia
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="rvn-page-title text-lg flex-1">Taisyklės</h1>
          <HeaderNav />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Hero */}
        <RulesHero onQuickLink={handleQuickLink} />

        {/* Mokomoji kova */}
        <div className="mb-6 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(139,92,246,0.03))',
            border: '1px solid rgba(139,92,246,0.3)',
          }}>
          <div className="flex-1">
            <p className="text-sm font-bold mb-0.5" style={{ fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd' }}>
              Geriausia mokytis žaidžiant!
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Mokomoji kova prieš AI: kovos laukas, auksas, ŽMK ir patarimai žingsnis po žingsnio.
            </p>
          </div>
          <TutorialButton deckId={DEMO_DECK_TUTORIAL} deckName="Mokomoji kaladė" />
        </div>

        {/* Search + category */}
        <div className="flex flex-col gap-3 mb-6">
          <RulesSearch query={query} onQuery={setQuery} />
          <CategoryChips active={category} onSelect={setCategory} />
          {query && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Rasta skyrių: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{filteredSections.length}</span>
            </p>
          )}
        </div>

        {/* Body: sidebar + content + quick ref */}
        <div className="flex gap-6 items-start">

          {/* Sidebar - desktop sticky */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <RulesSidebar activeId={activeId} readIds={readIds} onNav={scrollTo} />
          </aside>

          {/* Main content */}
          <div ref={contentRef} className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Mobile section dropdown */}
            <div className="lg:hidden">
              <select
                value={activeId ?? ''}
                onChange={(e) => scrollTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
                aria-label="Pasirinkti skyrių"
              >
                <option value=""> -  Pasirinkti skyrių  - </option>
                {RULES_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.number}. {s.title}</option>
                ))}
              </select>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-xl flex flex-col items-center justify-center py-16 gap-4 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <span className="text-4xl">📖</span>
                <p className="text-base font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                  Nieko nerasta
                </p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Pabandyk ieškoti pagal kortų tipą, būseną, raktažodį ar taisyklės terminą.
                </p>
                <button
                  onClick={() => { setQuery(''); setCategory('viskas') }}
                  className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
                  style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.25)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}
                >
                  Išvalyti filtrą
                </button>
              </div>
            ) : (
              filteredSections.map((section) => (
                <RuleSectionCard key={section.id} section={section} searchQuery={query} />
              ))
            )}
          </div>

          {/* Right sidebar - quick reference, desktop xl+ */}
          <aside className="hidden xl:block w-56 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <RulesQuickReference />
          </aside>
        </div>
      </main>

      <BackToTopButton />

      {/* Apdovanojimo pranešimas */}
      {showTrophy && (
        <div
          className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl flex items-center gap-3"
          style={{
            background: 'rgba(12,12,24,0.97)',
            border: '1px solid rgba(240,180,41,0.5)',
            boxShadow: '0 0 30px rgba(240,180,41,0.25)',
            backdropFilter: 'blur(8px)',
          }}
          role="status"
        >
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Taisyklių žinovas!</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Perskaitei visus taisyklių skyrius.</p>
          </div>
        </div>
      )}

      {/* Mobile bottom padding for nav */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
