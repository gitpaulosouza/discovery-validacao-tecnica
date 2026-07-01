'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const links = [
  { href: '/discovery', label: 'Painel' },
  { href: '/account', label: 'Conta' },
] as const

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1" aria-label="Navegação principal">
      {links.map((link) => {
        const active =
          link.href === '/discovery'
            ? pathname.startsWith('/discovery')
            : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-foreground/5 text-foreground'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
