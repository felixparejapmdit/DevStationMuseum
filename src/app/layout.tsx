import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { site } from '@/site.config'
import './globals.css'

const display = localFont({
  src: [
    { path: '../../public/fonts/space-grotesk-latin-500-normal.woff2', weight: '500' },
    { path: '../../public/fonts/space-grotesk-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-space-grotesk',
  display: 'swap',
})
const body = localFont({
  src: [
    { path: '../../public/fonts/inter-latin-400-normal.woff2', weight: '400' },
    { path: '../../public/fonts/inter-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-inter',
  display: 'swap',
})
const mono = localFont({
  src: [{ path: '../../public/fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500' }],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.museumName}`, template: `%s — ${site.name}` },
  description: `${site.tagline} ${site.role}.`,
  authors: [{ name: site.name }],
  openGraph: { type: 'website', siteName: site.museumName, title: `${site.name} — ${site.museumName}`, description: site.tagline },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#04050a', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        {/* Only on Vercel deployments: elsewhere the script 404s and logs to the console. */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV && <Analytics />}
      </body>
    </html>
  )
}
