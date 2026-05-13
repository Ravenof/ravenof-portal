import type { Metadata } from 'next'
import './globals.css'
import { MobileNav } from '@/components/layout/MobileNav'

export const metadata: Metadata = {
  title: {
    default: 'Ravenof Portal',
    template: '%s | Ravenof Portal',
  },
  description: 'Ravenof fantasy kortu zaidimo companion portalas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="lt" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="pb-16 lg:pb-0">
        {children}
        <MobileNav />
      </body>
    </html>
  )
}
