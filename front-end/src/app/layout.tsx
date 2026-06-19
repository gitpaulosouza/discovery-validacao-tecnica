import type { Metadata } from 'next'
import { Instrument_Sans, Open_Sans, JetBrains_Mono } from 'next/font/google'
import { QueryProvider } from '@/components/QueryProvider'
import '@/styles/globals.css'
import { cn } from '@/lib/utils'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  weight: ['400', '500', '600', '700'],
})

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  weight: ['400', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Claude Code — Onboarding Loomi',
  description: 'Guia prático de onboarding do Claude Code para o time de produto da Loomi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        className={cn("bg-background font-body text-foreground antialiased", instrumentSans.variable, openSans.variable, jetbrains.variable)}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
