'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlertCircle, ArrowUpRight, Clock, Inbox, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useLeads } from '@/features/discovery/hooks/useLeads'
import {
  decisionMeta,
  formatDateTime,
  severityMeta,
  slaState,
  slaToneClass,
  statusMeta,
} from '@/features/discovery/meta'
import type { LeadSummary, Severity } from '@/features/discovery/types'
import { cn } from '@/lib/utils'

const SEVERITY_RANK: Record<Severity, number> = { S1: 0, S2: 1, S3: 2 }

function rank(lead: LeadSummary): number {
  return lead.severity ? SEVERITY_RANK[lead.severity] : 3
}

export default function DiscoveryPanelPage() {
  const { data: leads, isLoading, isError, refetch, isFetching } = useLeads()

  const sorted = useMemo(() => {
    if (!leads) return []
    return [...leads].sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      const aSla = a.slaDeadlineAt ? new Date(a.slaDeadlineAt).getTime() : Infinity
      const bSla = b.slaDeadlineAt ? new Date(b.slaDeadlineAt).getTime() : Infinity
      return aSla - bSla
    })
  }, [leads])

  const counts = useMemo(() => {
    const open = sorted.filter((l) => l.status !== 'DECIDED')
    return {
      S1: open.filter((l) => l.severity === 'S1').length,
      S2: open.filter((l) => l.severity === 'S2').length,
      S3: open.filter((l) => l.severity === 'S3').length,
      decided: sorted.filter((l) => l.status === 'DECIDED').length,
    }
  }, [sorted])

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold tracking-tight">Painel de discovery</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Leads em pré-venda, ordenados por severidade e SLA. O que está mais perto
            de estourar aparece primeiro.
          </p>
        </div>
        <Button render={<Link href="/discovery/intake" />} size="lg" className="sm:w-auto">
          <Plus className="size-4" />
          Novo lead
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SeverityStat severity="S1" count={counts.S1} />
        <SeverityStat severity="S2" count={counts.S2} />
        <SeverityStat severity="S3" count={counts.S3} />
        <div className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <span className="text-xs font-medium text-muted-foreground">Decididos</span>
          <span className="font-display text-2xl font-bold tabular-nums">{counts.decided}</span>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={isFetching}>
          {sorted.map((lead) => (
            <li key={lead.id}>
              <LeadRow lead={lead} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SeverityStat({ severity, count }: { severity: Severity; count: number }) {
  const meta = severityMeta[severity]
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden />
        {meta.label.split(' · ')[0]} aberto{count === 1 ? '' : 's'}
      </span>
      <span className="font-display text-2xl font-bold tabular-nums">{count}</span>
    </div>
  )
}

function LeadRow({ lead }: { lead: LeadSummary }) {
  const sev = lead.severity ? severityMeta[lead.severity] : null
  const status = statusMeta[lead.status]
  const sla = slaState(lead.slaDeadlineAt)
  const decision = lead.decisionType ? decisionMeta[lead.decisionType] : null

  return (
    <Link
      href={`/discovery/${lead.id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl bg-card py-4 pr-4 pl-5 ring-1 ring-foreground/10 transition-all hover:ring-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn('absolute inset-y-0 left-0 w-1', sev ? sev.rail : 'bg-border')}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {sev ? (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', sev.soft)}>
              {lead.severity}
            </span>
          ) : null}
          <span className="truncate font-display text-base font-semibold">{lead.clientName}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.soft)}>
            {status.label}
          </span>
          {decision ? (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', decision.soft)}>
              {decision.label}
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          Registrado {formatDateTime(lead.createdAt)}
        </span>
      </div>

      {lead.status !== 'DECIDED' && sla ? (
        <span
          className={cn(
            'hidden items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums sm:inline-flex',
            slaToneClass[sla.tone],
          )}
        >
          <Clock className="size-3.5" aria-hidden />
          {sla.label}
        </span>
      ) : null}

      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" aria-hidden />
    </Link>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <Inbox className="size-8 text-muted-foreground/50" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-display text-base font-semibold">Nenhum lead ainda</p>
        <p className="text-sm text-muted-foreground">
          Registre o primeiro lead para o agente rodar a análise.
        </p>
      </div>
      <Button render={<Link href="/discovery/intake" />} className="mt-2">
        <Plus className="size-4" />
        Novo lead
      </Button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center"
    >
      <AlertCircle className="size-7 text-destructive" aria-hidden />
      <p className="text-sm text-foreground/80">Não foi possível carregar os leads.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  )
}
