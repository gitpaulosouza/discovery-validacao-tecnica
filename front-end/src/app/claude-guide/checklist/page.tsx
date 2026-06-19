'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { NavArrows } from '@/components/NavArrows'

const STORAGE_KEY = 'loomi-claude-onboarding-v1'

const items = [
  {
    id: 'install',
    label: 'Instalar o Claude Code',
    detail: 'npm install -g @anthropic-ai/claude-code',
  },
  {
    id: 'auth',
    label: 'Autenticar',
    detail: 'Execute claude e siga o fluxo no navegador. Use sua conta Google da Loomi.',
  },
  {
    id: 'init',
    label: 'Executar /init no primeiro repositório',
    detail: 'Abra qualquer projeto com claude, depois execute /init para gerar o CLAUDE.md.',
  },
  {
    id: 'explore',
    label: 'Explorar o código com o Claude',
    detail: 'Peça para ele explicar um módulo ou rastrear um fluxo de dados. Sinta como ele lê código.',
  },
  {
    id: 'frontend',
    label: 'Experimentar o skill /frontend',
    detail: 'Use em uma tarefa real ou faça scaffold de um novo projeto — veja os dois modos em ação.',
  },
  {
    id: 'review',
    label: 'Executar /review em uma branch',
    detail: 'Faça uma pequena alteração e execute /review antes de abrir o PR.',
  },
  {
    id: 'claude-md',
    label: 'Ler e atualizar o CLAUDE.md',
    detail: 'Abra o arquivo gerado, verifique se está correto, adicione convenções que estejam faltando.',
  },
]

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
}

export default function ChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setChecked(JSON.parse(stored) as Record<string, boolean>)
    } catch {
      // localStorage indisponível
    }
  }, [])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })
  }

  const completed = mounted ? items.filter((i) => checked[i.id]).length : 0
  const progress = Math.round((completed / items.length) * 100)

  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 8
      </Badge>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Checklist</h1>
      <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
        Siga nessa ordem. O progresso é salvo no seu navegador.
      </p>

      {/* Progress */}
      <Progress value={mounted ? progress : 0} className="mb-8">
        <ProgressLabel>Progresso</ProgressLabel>
        <ProgressValue />
      </Progress>

      {/* Items */}
      <ul className="mb-8 space-y-2.5">
        {items.map(({ id, label, detail }, i) => {
          const done = mounted && checked[id]
          return (
            <motion.li
              key={id}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.button
                onClick={() => toggle(id)}
                whileTap={{ scale: 0.985 }}
                className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors duration-150 ${
                  done
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-primary/3'
                }`}
              >
                {/* Checkbox */}
                <motion.div
                  animate={done ? { backgroundColor: '#5b2dc4', borderColor: '#5b2dc4' } : { backgroundColor: 'transparent', borderColor: 'oklch(0.918 0 0)' }}
                  transition={{ duration: 0.2 }}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2"
                >
                  <AnimatePresence>
                    {done && (
                      <motion.svg
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Text */}
                <div>
                  <motion.p
                    animate={{ color: done ? '#065f46' : '#0c0c0c' }}
                    className={`font-semibold leading-snug ${done ? 'line-through decoration-emerald-400' : ''}`}
                  >
                    {label}
                  </motion.p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </motion.button>
            </motion.li>
          )
        })}
      </ul>

      {/* Completion */}
      <AnimatePresence>
        {mounted && progress === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center"
          >
            <p className="font-display text-xl font-bold text-primary">Tudo pronto.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Onboarding do Claude Code concluído. Bem-vindo ao time.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <NavArrows current="/claude-guide/checklist" />
    </div>
  )
}
