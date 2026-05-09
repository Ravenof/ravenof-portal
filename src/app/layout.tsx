import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Ravenof Portal',
    template: '%s | Ravenof Portal',
  },
  description: 'Ravenof fantasy kortų žaidimo companion portalas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="lt" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
