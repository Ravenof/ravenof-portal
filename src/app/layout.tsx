import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'
import { MobileNav } from '@/components/layout/MobileNav'

const cinzel = Cinzel({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

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
    <html lang="lt" className={`${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="pb-16 lg:pb-0">
        {children}
        <MobileNav />
      </body>
    </html>
  )
}
