'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Code2,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { useCreateLead } from '@/features/discovery/hooks/useCreateLead'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const PAIN_POINT_MAX = 2000
const TRANSCRIPT_MAX = 20000

const brl = new Intl.NumberFormat('pt-BR')

/** Keep only digits, render as pt-BR grouped thousands. '' stays empty. */
function formatBudget(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return brl.format(Number(digits))
}

export default function IntakePage() {
  const router = useRouter()
  const create = useCreateLead()

  const [clientName, setClientName] = useState('')
  const [decisorName, setDecisorName] = useState('')
  const [painPoint, setPainPoint] = useState('')
  const [declaredDeadline, setDeclaredDeadline] = useState('')
  const [budget, setBudget] = useState('')
  const [mentionedStack, setMentionedStack] = useState('')
  const [transcript, setTranscript] = useState('')

  const budgetValue = useMemo(() => {
    const digits = budget.replace(/\D/g, '')
    return digits ? Number(digits) : undefined
  }, [budget])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedClient = clientName.trim()
    const trimmedPain = painPoint.trim()
    if (!trimmedClient || !trimmedPain) return

    create.mutate(
      {
        clientName: trimmedClient,
        painPoint: trimmedPain,
        declaredDeadline: declaredDeadline.trim() || undefined,
        budget: budgetValue,
        mentionedStack: mentionedStack.trim() || undefined,
        decisorName: decisorName.trim() || undefined,
        transcript: transcript.trim() || undefined,
      },
      {
        onSuccess: (lead) => router.push(`/discovery/${lead.id}`),
      },
    )
  }

  const errorMessage =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? 'Não foi possível registrar o lead. Tente novamente.'
        : null

  const canSubmit = clientName.trim().length > 0 && painPoint.trim().length > 0

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/discovery"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar ao painel
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
            Novo lead
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Registre o lead que chegou. Ao salvar, o agente roda severidade, risco
            e squad sugerida automaticamente — você vai direto para a análise.
          </p>
        </div>
      </header>

      <Card className="border-border/60 ring-foreground/5">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={onSubmit} className="flex flex-col">
            {/* Cliente */}
            <Section
              icon={<Building2 className="size-4" />}
              title="Cliente"
              description="Quem está do outro lado e quem decide."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome do cliente" htmlFor="clientName">
                  <Input
                    id="clientName"
                    required
                    maxLength={200}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Banco Aurora"
                  />
                </Field>
                <Field label="Decisor" htmlFor="decisorName" hint="Opcional">
                  <Input
                    id="decisorName"
                    maxLength={200}
                    value={decisorName}
                    onChange={(e) => setDecisorName(e.target.value)}
                    placeholder="Ex: Maria, Head de Tecnologia"
                  />
                </Field>
              </div>
            </Section>

            <Divider />

            {/* Oportunidade */}
            <Section
              icon={<Target className="size-4" />}
              title="Oportunidade"
              description="A dor do cliente, o prazo declarado e o orçamento."
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Label htmlFor="painPoint">Dor / oportunidade</Label>
                    <span className="text-xs tabular-nums text-muted-foreground/70">
                      {painPoint.length}/{PAIN_POINT_MAX}
                    </span>
                  </div>
                  <Textarea
                    id="painPoint"
                    required
                    maxLength={PAIN_POINT_MAX}
                    rows={4}
                    value={painPoint}
                    onChange={(e) => setPainPoint(e.target.value)}
                    placeholder="O que o cliente precisa resolver? Qual o contexto do negócio?"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Prazo declarado"
                    htmlFor="declaredDeadline"
                    hint="Texto livre — ex: '6 semanas', '90 dias'"
                  >
                    <Input
                      id="declaredDeadline"
                      maxLength={120}
                      value={declaredDeadline}
                      onChange={(e) => setDeclaredDeadline(e.target.value)}
                      placeholder="Ex: 6 semanas"
                    />
                  </Field>

                  <Field label="Orçamento" htmlFor="budget" hint="Opcional">
                    <div className="relative">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >
                        R$
                      </span>
                      <Input
                        id="budget"
                        inputMode="numeric"
                        className="pl-9 tabular-nums"
                        value={budget}
                        onChange={(e) => setBudget(formatBudget(e.target.value))}
                        placeholder="300.000"
                      />
                    </div>
                  </Field>
                </div>
              </div>
            </Section>

            <Divider />

            {/* Contexto técnico */}
            <Section
              icon={<Code2 className="size-4" />}
              title="Contexto técnico"
              description="A stack mencionada e a transcrição da conversa."
            >
              <div className="flex flex-col gap-4">
                <Field
                  label="Stack mencionada"
                  htmlFor="mentionedStack"
                  hint="Opcional — tecnologias, integrações ou sistemas citados"
                >
                  <Input
                    id="mentionedStack"
                    maxLength={500}
                    value={mentionedStack}
                    onChange={(e) => setMentionedStack(e.target.value)}
                    placeholder="Ex: React, NestJS, integração com SAP legado"
                  />
                </Field>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Label htmlFor="transcript">Transcrição da call</Label>
                    <span className="text-xs tabular-nums text-muted-foreground/70">
                      {transcript.length.toLocaleString('pt-BR')}/
                      {TRANSCRIPT_MAX.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <Textarea
                    id="transcript"
                    maxLength={TRANSCRIPT_MAX}
                    rows={9}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Cole aqui a transcrição da reunião com o cliente…"
                    className="min-h-44"
                  />
                  <p className="flex items-center gap-1.5 text-xs text-primary">
                    <Sparkles className="size-3.5 shrink-0" />
                    O agente lê a transcrição e extrai NFRs escondidas que o
                    vendedor pode não ter percebido.
                  </p>
                </div>
              </div>
            </Section>

            {errorMessage ? (
              <div
                role="alert"
                className="mt-8 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/discovery')}
                disabled={create.isPending}
                className="sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit || create.isPending}
                className="sm:w-auto"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analisando lead…
                  </>
                ) : (
                  <>
                    Analisar lead
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-4 flex w-full items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="flex flex-col">
          <span className="font-display text-base font-semibold leading-tight text-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </span>
      </legend>
      {children}
    </fieldset>
  )
}

function Divider({ className }: { className?: string }) {
  return <div className={cn('my-7 h-px bg-border/60', className)} />
}
