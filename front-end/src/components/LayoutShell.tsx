'use client'

import { motion } from 'framer-motion'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { Sidebar } from './Sidebar'
import { PageWrapper } from './PageWrapper'

const OPEN_W = 240
const CLOSED_W = 64

const spring = { type: 'spring', stiffness: 300, damping: 30 } as const

function Shell({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  return (
    <>
      <Sidebar />
      <motion.main
        initial={{ marginLeft: OPEN_W }}
        animate={{ marginLeft: open ? OPEN_W : CLOSED_W }}
        transition={spring}
        className="min-h-screen"
      >
        <PageWrapper>
          <div className="mx-auto max-w-2xl px-10 py-14">{children}</div>
        </PageWrapper>
      </motion.main>
    </>
  )
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  )
}
