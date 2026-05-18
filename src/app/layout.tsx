import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'
import { MobileNav } from '@/components/layout/MobileNav'
import { PWARegister } from '@/components/pwa/PWARegister'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'

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

export const viewport: Viewport = {
  themeColor:         '#f2a20c',
  width:              'device-width',
  initialScale:       1,
  maximumScale:       1,
  userScalable:       false,
  viewportFit:        'cover',
}

export const metadata: Metadata = {
  title: {
    default:  'Ravenof Portalas',
    template: '%s | Ravenof',
  },
  description: 'Ravenof kortų duomenų bazė, kaladžių kūrimas, renginiai, turnyrai ir HP sekiklis.',
  manifest:    '/manifest.webmanifest',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'Ravenof',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type:        'website',
    siteName:    'Ravenof Portalas',
    title:       'Ravenof Portalas',
    description: 'Ravenof kortų duomenų bazė, kaladžių kūrimas, renginiai ir HP sekiklis.',
  },
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
        <InstallPrompt />
        <PWARegister />
      </body>
    </html>
  )
}
