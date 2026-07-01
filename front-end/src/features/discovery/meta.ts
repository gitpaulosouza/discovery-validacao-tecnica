import type { DecisionType, LeadStatus, Severity } from './types'

/**
 * Severity drives the visual hierarchy of every screen. Each level carries a
 * label, a short meaning, the SLA window in hours, and Tailwind classes for
 * tint/text/border so color and text always travel together (WCAG AA: color is
 * never the sole carrier of meaning).
 */
export interface SeverityMeta {
  label: string
  meaning: string
  slaHours: number
  /** solid chip — used when severity is the focal point */
  solid: string
  /** soft chip — used inline in dense lists */
  soft: string
  /** accent rail / left border */
  rail: string
  dot: string
}

export const severityMeta: Record<Severity, SeverityMeta> = {
  S1: {
    label: 'S1 · Crítico',
    meaning: 'Risco alto ou prazo agressivo. Precisa de validação técnica antes de qualquer compromisso.',
    slaHours: 4,
    solid: 'bg-destructive text-white',
    soft: 'bg-destructive/10 text-destructive',
    rail: 'bg-destructive',
    dot: 'bg-destructive',
  },
  S2: {
    label: 'S2 · Atenção',
    meaning: 'Escopo viável com pontos a esclarecer. Roteia para arquiteto antes do go.',
    slaHours: 24,
    solid: 'bg-amber-500 text-amber-950',
    soft: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
    rail: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  S3: {
    label: 'S3 · Saudável',
    meaning: 'Escopo claro e dentro de padrão. Caminho curto para decisão.',
    slaHours: 72,
    solid: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-600/12 text-emerald-700 dark:text-emerald-400',
    rail: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
}

export interface StatusMeta {
  label: string
  soft: string
}

export const statusMeta: Record<LeadStatus, StatusMeta> = {
  PENDING_ANALYSIS: {
    label: 'Aguardando análise',
    soft: 'bg-muted text-muted-foreground',
  },
  ANALYZED: {
    label: 'Analisado',
    soft: 'bg-primary/10 text-primary',
  },
  DECIDED: {
    label: 'Decidido',
    soft: 'bg-foreground/10 text-foreground',
  },
}

export interface DecisionMeta {
  label: string
  short: string
  description: string
  soft: string
  /** classes for the decision button when idle */
  button: string
  /** classes for the decision button when selected */
  buttonActive: string
}

export const decisionMeta: Record<DecisionType, DecisionMeta> = {
  GO: {
    label: 'Go',
    short: 'Go',
    description: 'Viável como está. Seguir para proposta com o Brief gerado.',
    soft: 'bg-emerald-600/12 text-emerald-700 dark:text-emerald-400',
    button:
      'border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-400',
    buttonActive: 'border-emerald-600 bg-emerald-600 text-white',
  },
  CONDITIONAL: {
    label: 'Conditional',
    short: 'Cond.',
    description: 'Go condicionado a remediações. Registre o que precisa mudar.',
    soft: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
    button:
      'border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400',
    buttonActive: 'border-amber-500 bg-amber-500 text-amber-950',
  },
  RECYCLE: {
    label: 'Recycle',
    short: 'Recycle',
    description: 'Ainda não. Volta para o comercial com o que falta esclarecer.',
    soft: 'bg-primary/10 text-primary',
    button: 'border-primary/30 text-primary hover:bg-primary/10',
    buttonActive: 'border-primary bg-primary text-primary-foreground',
  },
  KILL: {
    label: 'Kill',
    short: 'Kill',
    description: 'Inviável. Registre o motivo e a tag para aprendizado.',
    soft: 'bg-destructive/10 text-destructive',
    button:
      'border-destructive/30 text-destructive hover:bg-destructive/10',
    buttonActive: 'border-destructive bg-destructive text-white',
  },
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export function formatBudget(value: number | null): string {
  if (value == null) return '—'
  return brl.format(value)
}

/**
 * Human SLA state derived from a deadline. Returns the remaining time as text
 * plus a tone bucket so the UI can flag what is urgent in one glance.
 */
export interface SlaState {
  label: string
  tone: 'overdue' | 'urgent' | 'ok'
}

export const slaToneClass: Record<SlaState['tone'], string> = {
  overdue: 'text-destructive',
  urgent: 'text-amber-600 dark:text-amber-400',
  ok: 'text-muted-foreground',
}

export function slaState(deadlineIso: string | null, now = Date.now()): SlaState | null {
  if (!deadlineIso) return null
  const diffMs = new Date(deadlineIso).getTime() - now
  const overdue = diffMs < 0
  const totalMin = Math.round(Math.abs(diffMs) / 60_000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60

  const human =
    hours >= 24
      ? `${Math.floor(hours / 24)}d ${hours % 24}h`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`

  if (overdue) return { label: `Estourou há ${human}`, tone: 'overdue' }
  if (hours < 4) return { label: `Vence em ${human}`, tone: 'urgent' }
  return { label: `Vence em ${human}`, tone: 'ok' }
}
