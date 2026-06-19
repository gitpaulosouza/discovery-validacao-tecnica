'use client'

import { createContext, useContext, useState } from 'react'

type SidebarCtx = { open: boolean; toggle: () => void }

const SidebarContext = createContext<SidebarCtx>({ open: true, toggle: () => {} })

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen(v => !v) }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
