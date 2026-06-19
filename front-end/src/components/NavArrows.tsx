'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { sections } from '@/lib/sections'
import type { SectionHref } from '@/lib/sections'

export function NavArrows({ current }: { current: SectionHref }) {
  const idx = sections.findIndex((s) => s.href === current)
  const prev = sections[idx - 1]
  const next = sections[idx + 1]

  return (
    <div className="mt-16 flex items-center justify-between border-t border-border pt-6">
      {prev ? (
        <motion.div whileHover={{ x: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
          <Link
            href={prev.href}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {prev.label}
          </Link>
        </motion.div>
      ) : (
        <span />
      )}
      {next ? (
        <motion.div whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
          <Link
            href={next.href}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90"
          >
            {next.label} →
          </Link>
        </motion.div>
      ) : (
        <span />
      )}
    </div>
  )
}
