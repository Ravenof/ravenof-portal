import { Component, type ReactNode } from 'react'

/** Paskutinės vilties klaidų gaudyklė: vietoj tuščio juodo ekrano – klaidos tekstas (telefone be DevTools irgi matosi). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error, info: { componentStack?: string }) { console.error('[ravenof] render klaida:', err, info.componentStack) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ padding: 24, color: '#f2c9c9', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', background: '#14110f', minHeight: '100vh' }}>
        <b style={{ color: '#e8c84a' }}>Ravenof: įvyko klaida</b>{'\n\n'}{String(this.state.err?.stack || this.state.err)}
        {'\n\n'}<button onClick={() => location.reload()} style={{ padding: '6px 14px', background: '#2a2320', color: '#e8c84a', border: '1px solid #7a6330', borderRadius: 6 }}>Perkrauti</button>
      </div>
    )
  }
}
