'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gauge,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useDecideLead } from '@/features/discovery/hooks/useDecideLead'
import { useLead } from '@/features/discovery/hooks/useLead'
import {
  decisionMeta,
  formatBudget,
  formatDateTime,
  severityMeta,
  slaState,
  slaToneClass,
  statusMeta,
} from '@/features/discovery/meta'
import type {
  DecideLeadPayload,
  DecisionType,
  LeadAnalysis,
  LeadBrief,
  LeadDetail,
  SquadMember,
} from '@/features/discovery/types'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: lead, isLoading, isError } = useLead(params.id)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (isError || !lead) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center"
        >
          <AlertCircle className="size-7 text-destructive" aria-hidden />
          <p className="text-sm text-foreground/80">Lead não encontrado.</p>
          <Button variant="outline" size="sm" render={<Link href="/discovery" />}>
            Voltar ao painel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      <BackLink />
      <LeadHeader lead={lead} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {lead.analysis ? <AnalysisCard analysis={lead.analysis} /> : null}
          <DealDesk lead={lead} />
          {lead.brief ? <BriefCard brief={lead.brief} /> : null}
        </div>

        <aside className="flex flex-col gap-6">
          <ContextCard lead={lead} />
          {lead.suggestedSquad.length > 0 ? <SquadCard squad={lead.suggestedSquad} /> : null}
        </aside>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/discovery"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Voltar ao painel
    </Link>
  )
}

function LeadHeader({ lead }: { lead: LeadDetail }) {
  const sev = lead.analysis ? severityMeta[lead.analysis.severity] : null
  const status = statusMeta[lead.status]
  const sla = lead.analysis ? slaState(lead.analysis.slaDeadlineAt) : null

  return (
    <header className="flex flex-col gap-4 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.soft)}>
              {status.label}
            </span>
            {lead.decisorName ? (
              <span className="text-xs text-muted-foreground">Decisor: {lead.decisorName}</span>
            ) : null}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{lead.clientName}</h1>
          <p className="max-w-prose text-sm text-foreground/80">{lead.painPoint}</p>
        </div>

        {sev ? (
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <span className={cn('rounded-lg px-3 py-1.5 text-sm font-bold', sev.solid)}>
              {sev.label}
            </span>
            {lead.status !== 'DECIDED' && sla ? (
              <span
                className={cn('text-xs font-medium tabular-nums', slaToneClass[sla.tone])}
              >
                SLA · {sla.label}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {sev ? (
        <div className="border-t border-border/60 bg-muted/40 px-6 py-3">
          <p className="text-xs text-muted-foreground">{sev.meaning}</p>
        </div>
      ) : null}
    </header>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      {children}
    </h2>
  )
}

function AnalysisCard({ analysis }: { analysis: LeadAnalysis }) {
  const riskTone = severityMeta[analysis.severity].rail

  return (
    <Card className="ring-foreground/10">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={<Sparkles className="size-4" />}>Análise do agente</SectionTitle>
          <span className="text-xs text-muted-foreground">{analysis.confidenceNote.split(' — ')[0]}</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Metric label="Esforço estimado">
            <span className="font-display text-2xl font-bold tabular-nums">
              {analysis.effortMinWeeks}–{analysis.effortMaxWeeks}
            </span>
            <span className="text-sm text-muted-foreground"> semanas</span>
          </Metric>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">Risco</span>
              <span className="font-display text-2xl font-bold tabular-nums">{analysis.riskScore}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', riskTone)}
                style={{ width: `${analysis.riskScore}%` }}
                role="meter"
                aria-valuenow={analysis.riskScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Pontuação de risco"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">NFRs extraídas</h3>
          <ul className="flex flex-wrap gap-2">
            {analysis.extractedNfrs.map((nfr) => (
              <li
                key={nfr}
                className="rounded-md bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/15"
              >
                {nfr}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
            Requisitos que o vendedor pode não ter percebido na conversa.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Principais riscos</h3>
          <ul className="flex flex-col gap-2">
            {analysis.topRisks.map((risk) => (
              <li key={risk} className="flex items-start gap-2 text-sm text-foreground/80">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden />
                {risk}
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {analysis.confidenceNote}
        </p>
      </CardContent>
    </Card>
  )
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}

function ContextCard({ lead }: { lead: LeadDetail }) {
  return (
    <Card size="sm" className="ring-foreground/10">
      <CardContent className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-sm font-semibold">Contexto do lead</h2>
        <dl className="flex flex-col divide-y divide-border/60">
          <Row label="Prazo declarado" value={lead.declaredDeadline ?? '—'} />
          <Row label="Orçamento" value={formatBudget(lead.budget)} />
          <Row label="Stack mencionada" value={lead.mentionedStack ?? '—'} />
          <Row label="Registrado" value={formatDateTime(lead.createdAt)} />
        </dl>
        {lead.transcript ? (
          <details className="group mt-1">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-primary">
              <FileText className="size-3.5" aria-hidden />
              Ver transcrição
            </summary>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {lead.transcript}
            </p>
          </details>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs font-medium text-foreground">{value}</dd>
    </div>
  )
}

function SquadCard({ squad }: { squad: SquadMember[] }) {
  return (
    <Card size="sm" className="ring-foreground/10">
      <CardContent className="flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          <Users className="size-4 text-primary" aria-hidden />
          Squad sugerida
        </h2>
        <ul className="flex flex-col gap-3">
          {squad.map((member) => (
            <li key={member.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{member.name}</span>
                <span className="text-xs text-muted-foreground">{member.seniority}</span>
              </div>
              <span className="text-xs text-muted-foreground">{member.role}</span>
              <div className="flex flex-wrap gap-1">
                {member.matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-primary/8 px-1.5 py-0.5 text-[0.7rem] font-medium text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const DECISIONS = Object.keys(decisionMeta) as DecisionType[]

function DealDesk({ lead }: { lead: LeadDetail }) {
  const { data: user } = useCurrentUser()
  const decide = useDecideLead(lead.id)

  const decided = lead.decision

  const [selected, setSelected] = useState<DecisionType | null>(null)
  const [deciderName, setDeciderName] = useState(user?.name ?? user?.email ?? '')
  const [note, setNote] = useState('')
  const [killTag, setKillTag] = useState('')

  if (decided) {
    const meta = decisionMeta[decided.type]
    return (
      <Card className="ring-foreground/10">
        <CardContent className="flex flex-col gap-4 p-6">
          <SectionTitle icon={<CheckCircle2 className="size-4" />}>Deal Desk</SectionTitle>
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <span className={cn('rounded-md px-2.5 py-1 text-sm font-bold', meta.soft)}>
                {meta.label}
              </span>
              <span className="text-xs text-muted-foreground">
                por {decided.deciderName} · {formatDateTime(decided.createdAt)}
              </span>
            </div>
            {decided.remediationNote ? (
              <DecisionNote label="Remediações" value={decided.remediationNote} />
            ) : null}
            {decided.recycleReason ? (
              <DecisionNote label="Motivo do recycle" value={decided.recycleReason} />
            ) : null}
            {decided.killReason ? (
              <DecisionNote label="Motivo do kill" value={decided.killReason} />
            ) : null}
            {decided.killTag ? (
              <DecisionNote label="Tag" value={decided.killTag} />
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  const requiresNote =
    selected === 'CONDITIONAL' || selected === 'RECYCLE' || selected === 'KILL'
  const canSubmit =
    selected != null &&
    deciderName.trim().length > 0 &&
    (!requiresNote || note.trim().length > 0) &&
    (selected !== 'KILL' || killTag.trim().length > 0)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !canSubmit) return

    const payload: DecideLeadPayload = { type: selected, deciderName: deciderName.trim() }
    if (selected === 'CONDITIONAL') payload.remediationNote = note.trim()
    if (selected === 'RECYCLE') payload.recycleReason = note.trim()
    if (selected === 'KILL') {
      payload.killReason = note.trim()
      payload.killTag = killTag.trim()
    }
    decide.mutate(payload)
  }

  const errorMessage = apiErrorMessage(
    decide.error,
    'Não foi possível registrar a decisão. Tente novamente.',
  )

  const noteLabel =
    selected === 'CONDITIONAL'
      ? 'Remediações necessárias'
      : selected === 'RECYCLE'
        ? 'O que falta esclarecer'
        : 'Motivo do kill'

  return (
    <Card className="ring-foreground/10">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <SectionTitle icon={<Gauge className="size-4" />}>Deal Desk</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Registre a decisão go/no-go. O Brief de handoff é gerado para Go e Conditional.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DECISIONS.map((type) => {
              const meta = decisionMeta[type]
              const active = selected === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelected(type)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? meta.buttonActive : cn('bg-background', meta.button),
                  )}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>

          {selected ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {decisionMeta[selected].description}
            </p>
          ) : null}

          <Field label="Quem decide" htmlFor="deciderName">
            <Input
              id="deciderName"
              value={deciderName}
              maxLength={120}
              onChange={(e) => setDeciderName(e.target.value)}
              placeholder="Seu nome"
            />
          </Field>

          {requiresNote ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decisionNote">{noteLabel}</Label>
              <Textarea
                id="decisionNote"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  selected === 'KILL'
                    ? 'Por que este lead é inviável?'
                    : 'Descreva de forma acionável…'
                }
              />
            </div>
          ) : null}

          {selected === 'KILL' ? (
            <Field label="Tag de aprendizado" htmlFor="killTag" hint="Ex: prazo, orçamento, escopo">
              <Input
                id="killTag"
                value={killTag}
                maxLength={40}
                onChange={(e) => setKillTag(e.target.value)}
                placeholder="orçamento"
              />
            </Field>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || decide.isPending}
            className="w-fit"
          >
            {decide.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Registrando…
              </>
            ) : (
              'Registrar decisão'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DecisionNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground/80">{value}</p>
    </div>
  )
}

function BriefCard({ brief }: { brief: LeadBrief }) {
  return (
    <Card className="ring-foreground/10">
      <CardContent className="flex flex-col gap-5 p-6">
        <SectionTitle icon={<FileText className="size-4" />}>Brief de handoff</SectionTitle>

        <div className="grid gap-4 sm:grid-cols-3">
          <ScopeColumn title="Must" tone="text-destructive" items={brief.scopeMust} />
          <ScopeColumn title="Should" tone="text-amber-600 dark:text-amber-400" items={brief.scopeShould} />
          <ScopeColumn title="Could" tone="text-emerald-600 dark:text-emerald-400" items={brief.scopeCould} />
        </div>

        {brief.risksAndMitigation.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Riscos e mitigação</h3>
            <ul className="flex flex-col gap-2">
              {brief.risksAndMitigation.map((item) => (
                <li
                  key={item.risk}
                  className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
                >
                  <p className="font-medium text-foreground/90">{item.risk}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">→ {item.mitigation}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/8 px-3 py-2.5 ring-1 ring-primary/15">
          <span className="text-xs font-medium text-muted-foreground">Modelo de contrato recomendado</span>
          <span className="text-sm font-semibold text-primary">{brief.recommendedContractModel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ScopeColumn({
  title,
  tone,
  items,
}: {
  title: string
  tone: string
  items: string[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn('text-xs font-bold uppercase tracking-wide', tone)}>{title}</h3>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item} className="text-sm text-foreground/80">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground/60">—</p>
      )}
    </div>
  )
}
