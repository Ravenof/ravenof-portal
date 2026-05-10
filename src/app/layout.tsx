import type { Metadata } from 'next'
import './globals.css'
import { MobileNav } from '@/components/layout/MobileNav'

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
      <body className="pb-16 lg:pb-0">
        {children}
        <MobileNav />
      </body>
    </html>
  )
}
