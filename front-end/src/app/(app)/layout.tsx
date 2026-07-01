import Image from 'next/image'
import Link from 'next/link'

import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { AccountTopbar } from './_components/AccountTopbar'
import { AppNav } from './_components/AppNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-5">
              <Link href="/discovery" className="flex items-center gap-2">
                <Image
                  src="/gzero-logo.png"
                  alt="Loomi"
                  width={56}
                  height={20}
                  sizes="56px"
                  className="opacity-80"
                />
                <span className="font-display text-sm font-semibold">Discovery</span>
              </Link>
              <AppNav />
            </div>
            <AccountTopbar />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
      </div>
    </RequireAuth>
  )
}
