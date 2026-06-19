'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'

export type TerminalStep = {
  role: 'user' | 'claude'
  text: string
}

type Item =
  | { kind: 'user';   text: string; id: number }
  | { kind: 'claude'; text: string; id: number }
  | { kind: 'typing'; text: string; id: number }

type Props = {
  title: string
  description?: string
  steps: TerminalStep[]
  /** ms to wait before auto-looping after the script finishes (default 2400) */
  loopDelay?: number
}

const CHAR_MS = 38
const PRE_MS  = 600
const POST_MS = 220
const LOOP_MS = 2400

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

export function TerminalDemo({ title, description, steps, loopDelay = LOOP_MS }: Props) {
  const [items, setItems]   = useState<Item[]>([])
  const [done, setDone]     = useState(false)
  const [runKey, setRunKey] = useState(0)
  const abort   = useRef(false)
  const counter = useRef(0)
  const bodyRef = useRef<HTMLDivElement>(null)

  const nextId = () => ++counter.current

  const scrollBottom = useCallback(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  /* ── Animation loop ─────────────────────────────────── */
  useEffect(() => {
    abort.current = false
    setItems([])
    setDone(false)

    async function run() {
      await sleep(400)

      for (const step of steps) {
        if (abort.current) return

        if (step.role === 'user') {
          const id = nextId()
          for (let i = 1; i <= step.text.length; i++) {
            if (abort.current) return
            const partial = step.text.slice(0, i)
            setItems(prev => {
              const base = prev.filter(x => x.kind !== 'typing')
              return [...base, { kind: 'typing', text: partial, id }]
            })
            scrollBottom()
            await sleep(CHAR_MS)
          }
          await sleep(260)
          setItems(prev => {
            const base = prev.filter(x => x.kind !== 'typing')
            return [...base, { kind: 'user', text: step.text, id }]
          })
          await sleep(PRE_MS)
        } else {
          if (abort.current) return
          const id = nextId()
          setItems(prev => [...prev, { kind: 'claude', text: step.text, id }])
          scrollBottom()
          await sleep(POST_MS)
        }
      }

      if (!abort.current) setDone(true)
    }

    run()
    return () => { abort.current = true }
  }, [runKey, steps, scrollBottom])

  /* ── Auto-loop after script finishes ────────────────── */
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setRunKey(k => k + 1), loopDelay)
    return () => clearTimeout(t)
  }, [done, loopDelay])

  const restartNow = useCallback(() => {
    abort.current = true
    setRunKey(k => k + 1)
  }, [])

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-white/8 bg-[#0f0f0f] shadow-xl shadow-black/20">
      {/* ── Terminal chrome ──────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-white/20">
          terminal
        </span>
      </div>

      {/* ── Terminal body ────────────────────────────────── */}
      <div
        ref={bodyRef}
        className="min-h-[196px] max-h-72 overflow-y-auto scroll-smooth p-5 font-mono text-[13px] leading-relaxed"
      >
        {items.map(item => {
          if (item.kind === 'typing') {
            return (
              <div key={item.id} className="flex gap-2">
                <span className="select-none text-emerald-400/60">$</span>
                <span className="text-slate-200">
                  {item.text}
                  <span className="ml-px inline-block h-[14px] w-px animate-pulse bg-slate-300 align-middle" />
                </span>
              </div>
            )
          }
          if (item.kind === 'user') {
            return (
              <div key={item.id} className="mb-2 flex gap-2">
                <span className="select-none text-emerald-400/60">$</span>
                <span className="text-slate-200">{item.text}</span>
              </div>
            )
          }
          return (
            <div key={item.id} className="mb-1 flex gap-2 pl-4 text-slate-400 animate-fade-in">
              <span className="shrink-0 text-[#8b5cf6]">◆</span>
              <span>{item.text}</span>
            </div>
          )
        })}

        {/* Idle cursor — shown whenever nothing is being typed */}
        {!items.some(x => x.kind === 'typing') && (
          <div className="mt-1 flex gap-2">
            <span className="select-none text-emerald-400/60">$</span>
            <span className="inline-block h-[14px] w-px animate-pulse bg-slate-500/60 align-middle" />
          </div>
        )}
      </div>

      {/* ── Caption bar ─────────────────────────────────── */}
      <div className="flex items-start justify-between border-t border-white/6 px-5 py-3">
        <div>
          <p className="text-[13px] font-semibold text-slate-200">{title}</p>
          {description && (
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {done && (
          <button
            onClick={restartNow}
            aria-label="Reiniciar demo"
            className="ml-4 flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] text-white/30 transition-colors hover:bg-white/6 hover:text-white/60"
          >
            <RotateCcw size={11} />
            reiniciar
          </button>
        )}
      </div>
    </div>
  )
}
