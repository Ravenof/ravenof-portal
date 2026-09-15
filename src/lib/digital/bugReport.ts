// ── Klaidų pranešimai: kontekstas + siuntimas (rvn_report_bug) ───────────────
// Kovos ekranas registruoja kontekstą (režimas, ėjimas, kaladės, paskutiniai
// žurnalo įrašai) per setBugGameContext; forma jį prideda automatiškai.
// Konsolės klaidos (paskutinės 20) renkamos globaliai – installBugConsoleCapture().
import { createClient } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'
import { currentPlatform } from '@/lib/digital/native'

export type BugCategory = 'battle' | 'cards' | 'ui' | 'auth' | 'shop' | 'other'
export type BugSeverity = 'blocker' | 'major' | 'normal' | 'minor'
export type BugGameContext = {
  mode: string; matchId?: string | null; turn?: number; active?: string
  yourDeckId?: string | null; oppDeckId?: string | null; opponent?: string | null
  log?: string[]; extra?: Record<string, unknown>
}

let gameCtx: BugGameContext | null = null
export function setBugGameContext(ctx: BugGameContext | null): void { gameCtx = ctx }
export function getBugGameContext(): BugGameContext | null { return gameCtx }

const consoleErrors: string[] = []
let captureInstalled = false
export function installBugConsoleCapture(): void {
  if (captureInstalled || typeof window === 'undefined') return
  captureInstalled = true
  const push = (s: string) => { consoleErrors.push(`${new Date().toISOString().slice(11, 19)} ${s}`.slice(0, 400)); if (consoleErrors.length > 20) consoleErrors.shift() }
  const orig = console.error
  console.error = (...args: unknown[]) => { try { push(args.map((a) => a instanceof Error ? `${a.name}: ${a.message}` : typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) } catch { /* */ } orig.apply(console, args) }
  window.addEventListener('error', (e) => push(`window.error: ${e.message} @${e.filename}:${e.lineno}`))
  window.addEventListener('unhandledrejection', (e) => push(`unhandledrejection: ${String((e as PromiseRejectionEvent).reason).slice(0, 300)}`))
}

export function deviceInfo(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  return {
    ua: navigator.userAgent, lang: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`, dpr: window.devicePixelRatio,
    screen: `${screen.width}x${screen.height}`, online: navigator.onLine,
    touch: 'ontouchstart' in window, hover: window.matchMedia?.('(hover: hover)').matches ?? null,
    consoleErrors: consoleErrors.slice(),
  }
}

export type BugInput = { category: BugCategory; severity: BugSeverity; title: string; description: string; expected?: string; screenshot?: File | null }

/** Išsiunčia pranešimą. Grąžina pranešimo numerį. Nuotrauka – į Storage `bug-reports/<uid>/…`. */
export async function submitBugReport(input: BugInput): Promise<number> {
  const sb = createClient()
  let screenshotPath: string | null = null
  if (input.screenshot) {
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const ext = input.screenshot.type === 'image/png' ? 'png' : input.screenshot.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await sb.storage.from('bug-reports').upload(path, input.screenshot, { contentType: input.screenshot.type, upsert: false })
      if (!error) screenshotPath = path
    }
  }
  const { data, error } = await sb.rpc('rvn_report_bug', {
    p_category: input.category, p_severity: input.severity, p_title: input.title, p_description: input.description, p_expected: input.expected ?? null,
    p_route: typeof window !== 'undefined' ? window.location.pathname : null,
    p_platform: currentPlatform(), p_app_version: APP_VERSION,
    p_device: deviceInfo(), p_game_context: gameCtx, p_screenshot_path: screenshotPath,
  })
  if (error) throw new Error(error.message)
  return Number(data)
}

export type MyBug = { id: number; created_at: string; category: string; severity: string; title: string; status: string; admin_note: string | null }
export async function listMyBugReports(): Promise<MyBug[]> {
  const sb = createClient()
  const { data } = await sb.from('bug_reports').select('id, created_at, category, severity, title, status, admin_note').order('created_at', { ascending: false }).limit(50)
  return (data as MyBug[] | null) ?? []
}
