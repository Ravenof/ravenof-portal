// ── Duomenis keičiančių užklausų signalas (844) ───────────────────────────────
// offlineFetch praneša, kai sėkmingai įvyko užklausa, galinti pakeisti kolekciją,
// kaladės ar parduotuvės būseną; screenCache tada išmeta ekranų kopijas, kad
// po pirkimo / pako / kaladės išsaugojimo nebūtų rodomi seni duomenys.
// Be importų – kad nesusidarytų ciklas su supabase klientu.
type Fn = () => void
const listeners = new Set<Fn>()
export function onDataMutation(fn: Fn): () => void { listeners.add(fn); return () => { listeners.delete(fn) } }
export function emitDataMutation(): void { listeners.forEach((f) => { try { f() } catch { /* */ } }) }
