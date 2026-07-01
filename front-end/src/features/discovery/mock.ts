import { severityMeta } from './meta'
import type {
  CreateLeadPayload,
  DecideLeadPayload,
  LeadAnalysis,
  LeadBrief,
  LeadDetail,
  LeadSummary,
  Severity,
  SquadMember,
} from './types'

/**
 * Frontend-only mock for the discovery flow. Holds leads in memory, runs a
 * deterministic stand-in for the analysis agent on create, and attaches a
 * decision + brief on decide. Swap this module for the real API later — the
 * `discoveryApi` surface stays identical.
 */

const LATENCY_MS = 600

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function slaFrom(severity: Severity, fromIso: string): string {
  const base = new Date(fromIso).getTime()
  return new Date(base + severityMeta[severity].slaHours * 3_600_000).toISOString()
}

// ── Deterministic "agent" ─────────────────────────────────────────────────

const NFR_RULES: { match: RegExp; nfr: string }[] = [
  { match: /banc|financ|pagament|pix|cart[aã]o/i, nfr: 'Compliance financeiro (PCI-DSS / BACEN)' },
  { match: /sa[uú]de|paciente|hospital|m[eé]dic/i, nfr: 'LGPD para dados sensíveis de saúde' },
  { match: /sap|legad|legacy|mainframe|cobol/i, nfr: 'Integração com sistema legado' },
  { match: /tempo real|real ?time|streaming|websocket/i, nfr: 'Latência baixa / tempo real' },
  { match: /escal|milh[oõ]es|pico|black ?friday|alta dem/i, nfr: 'Escalabilidade sob pico de carga' },
  { match: /auditori|rastrea|log|complian/i, nfr: 'Auditoria e rastreabilidade' },
  { match: /offline|sincroniz|sync/i, nfr: 'Operação offline e sincronização' },
  { match: /ia|intelig[eê]ncia|llm|gpt|claude|ml\b/i, nfr: 'Pipeline de IA e avaliação de modelo' },
]

const STACK_SKILLS: { match: RegExp; skill: string }[] = [
  { match: /react|next/i, skill: 'React/Next.js' },
  { match: /node|nest|express/i, skill: 'Node.js/NestJS' },
  { match: /python|django|fastapi/i, skill: 'Python' },
  { match: /sap/i, skill: 'Integração SAP' },
  { match: /aws|azure|gcp|cloud/i, skill: 'Cloud/DevOps' },
  { match: /mobile|flutter|react ?native|ios|android/i, skill: 'Mobile' },
  { match: /ia|llm|ml/i, skill: 'AI Engineering' },
]

function analyze(payload: CreateLeadPayload, createdAt: string): LeadAnalysis {
  const haystack = [payload.painPoint, payload.transcript, payload.mentionedStack]
    .filter(Boolean)
    .join('\n')

  const extractedNfrs = NFR_RULES.filter((r) => r.match.test(haystack)).map((r) => r.nfr)
  if (extractedNfrs.length === 0) extractedNfrs.push('Requisitos não-funcionais padrão')

  const suggestedSkills = STACK_SKILLS.filter((r) => r.match.test(haystack)).map((r) => r.skill)
  if (suggestedSkills.length === 0) suggestedSkills.push('Full-stack web')

  // Risk grows with NFR count and tightness of the declared deadline.
  const deadlineWeeks = parseDeadlineWeeks(payload.declaredDeadline)
  const tight = deadlineWeeks != null && deadlineWeeks <= 8
  const riskScore = Math.min(
    95,
    28 + extractedNfrs.length * 14 + (tight ? 22 : 0) + (payload.budget && payload.budget < 150_000 ? 12 : 0),
  )

  const severity: Severity = riskScore >= 70 ? 'S1' : riskScore >= 45 ? 'S2' : 'S3'

  const effortMinWeeks = Math.max(4, extractedNfrs.length * 3 + (suggestedSkills.length > 2 ? 4 : 2))
  const effortMaxWeeks = effortMinWeeks + (severity === 'S1' ? 10 : severity === 'S2' ? 6 : 3)

  const topRisks = buildRisks(extractedNfrs, tight, payload.budget)

  return {
    severity,
    extractedNfrs,
    effortMinWeeks,
    effortMaxWeeks,
    confidenceNote:
      severity === 'S1'
        ? 'Confiança média — premissas dependem de validação técnica com o arquiteto.'
        : 'Confiança alta — escopo aderente a padrões já entregues pela Loomi.',
    riskScore,
    topRisks,
    suggestedSkills,
    suggestedSeniority: severity === 'S1' ? 'Staff + Sênior' : severity === 'S2' ? 'Sênior + Pleno' : 'Pleno',
    slaDeadlineAt: slaFrom(severity, createdAt),
  }
}

function parseDeadlineWeeks(text?: string): number | null {
  if (!text) return null
  const weeks = text.match(/(\d+)\s*sem/i)
  if (weeks) return Number(weeks[1])
  const days = text.match(/(\d+)\s*dia/i)
  if (days) return Math.round(Number(days[1]) / 7)
  const months = text.match(/(\d+)\s*m[eê]s/i)
  if (months) return Number(months[1]) * 4
  return null
}

function buildRisks(nfrs: string[], tight: boolean, budget?: number): string[] {
  const risks: string[] = []
  if (tight) risks.push('Prazo declarado incompatível com a banda de esforço estimada.')
  nfrs.slice(0, 2).forEach((nfr) => risks.push(`${nfr} ainda não validada com o cliente.`))
  if (budget != null && budget < 150_000) risks.push('Orçamento abaixo da faixa típica para o escopo.')
  if (risks.length === 0) risks.push('Sem riscos críticos identificados — manter escopo controlado.')
  return risks
}

function squadFor(analysis: LeadAnalysis): SquadMember[] {
  const pool: SquadMember[] = [
    { id: 'm1', name: 'Marina Alencar', role: 'Tech Lead', seniority: 'Staff', matchedSkills: ['React/Next.js', 'AI Engineering'] },
    { id: 'm2', name: 'Caio Ribeiro', role: 'Back-end', seniority: 'Sênior', matchedSkills: ['Node.js/NestJS', 'Integração SAP'] },
    { id: 'm3', name: 'Júlia Tavares', role: 'Front-end', seniority: 'Pleno', matchedSkills: ['React/Next.js'] },
    { id: 'm4', name: 'Diego Nunes', role: 'Cloud/DevOps', seniority: 'Sênior', matchedSkills: ['Cloud/DevOps'] },
    { id: 'm5', name: 'Bianca Rocha', role: 'Mobile', seniority: 'Pleno', matchedSkills: ['Mobile'] },
  ]
  const skills = new Set(analysis.suggestedSkills)
  const matched = pool
    .map((m) => ({ ...m, matchedSkills: m.matchedSkills.filter((s) => skills.has(s)) }))
    .filter((m) => m.matchedSkills.length > 0)
  return matched.length > 0 ? matched.slice(0, 3) : pool.slice(0, 2)
}

function briefFor(lead: LeadDetail): LeadBrief {
  const a = lead.analysis
  return {
    scopeMust: [
      `Resolver: ${lead.painPoint.slice(0, 80)}${lead.painPoint.length > 80 ? '…' : ''}`,
      ...(a?.extractedNfrs.slice(0, 2) ?? []),
    ],
    scopeShould: a?.extractedNfrs.slice(2) ?? [],
    scopeCould: ['Painel de métricas pós-entrega', 'Documentação de handoff para o time do cliente'],
    risksAndMitigation:
      a?.topRisks.map((risk) => ({
        risk,
        mitigation: 'Spike de validação técnica na primeira sprint.',
      })) ?? [],
    recommendedContractModel:
      a && a.severity === 'S1' ? 'Time & Materials com fase de discovery paga' : 'Escopo fechado por entrega',
  }
}

// ── Seed ────────────────────────────────────────────────────────────────────

function seedLead(input: {
  clientName: string
  painPoint: string
  declaredDeadline?: string
  budget?: number
  mentionedStack?: string
  decisorName?: string
  transcript?: string
  ageHours: number
  decided?: DecideLeadPayload
}): LeadDetail {
  const createdAt = new Date(Date.now() - input.ageHours * 3_600_000).toISOString()
  const analysis = analyze(input, createdAt)
  const base: LeadDetail = {
    id: uid(),
    clientName: input.clientName,
    painPoint: input.painPoint,
    declaredDeadline: input.declaredDeadline ?? null,
    budget: input.budget ?? null,
    mentionedStack: input.mentionedStack ?? null,
    decisorName: input.decisorName ?? null,
    transcript: input.transcript ?? null,
    status: 'ANALYZED',
    createdAt,
    analysis,
    suggestedSquad: squadFor(analysis),
    decision: null,
    brief: null,
  }
  if (input.decided) return applyDecision(base, input.decided)
  return base
}

const store: LeadDetail[] = [
  seedLead({
    clientName: 'Banco Aurora',
    painPoint:
      'Precisam de um app de pagamentos instantâneos via Pix com antifraude em tempo real, integrando ao core bancário legado em mainframe.',
    declaredDeadline: '6 semanas',
    budget: 280_000,
    mentionedStack: 'React Native, NestJS, integração com mainframe COBOL',
    decisorName: 'Helena Prado, Head de Pagamentos',
    transcript:
      'Cliente enfatizou compliance BACEN, auditoria de cada transação e pico de carga em datas de salário. Espera tempo real no antifraude.',
    ageHours: 1,
  }),
  seedLead({
    clientName: 'Clínica Vitalis',
    painPoint:
      'Portal do paciente com agendamento e prontuário, precisa funcionar offline nas unidades com internet instável.',
    declaredDeadline: '12 semanas',
    budget: 190_000,
    mentionedStack: 'Next.js, Python, sincronização offline',
    decisorName: 'Dr. Renato Lima',
    ageHours: 20,
  }),
  seedLead({
    clientName: 'Mercado Onda',
    painPoint:
      'Site institucional novo com blog e área de carreiras. Stack moderna, sem integrações complexas.',
    declaredDeadline: '10 semanas',
    budget: 120_000,
    mentionedStack: 'Next.js',
    decisorName: 'Paula Castro, Marketing',
    ageHours: 50,
  }),
  seedLead({
    clientName: 'LogTech Cargo',
    painPoint:
      'Plataforma de rastreamento de frota em tempo real com previsão de rota por IA e alta escala em horários de pico.',
    declaredDeadline: '8 semanas',
    budget: 420_000,
    mentionedStack: 'React, Node.js, AWS, LLM para previsão',
    decisorName: 'Marcos Vieira, CTO',
    transcript: 'Precisa escalar para milhões de eventos. Auditoria de entregas é obrigatória.',
    ageHours: 30,
    decided: {
      type: 'CONDITIONAL',
      deciderName: 'Bruno (Deal Desk)',
      remediationNote: 'Discovery pago de 2 semanas para validar volume de eventos e custo de IA antes do escopo fechado.',
    },
  }),
]

function applyDecision(lead: LeadDetail, payload: DecideLeadPayload): LeadDetail {
  const withDecision: LeadDetail = {
    ...lead,
    status: 'DECIDED',
    decision: {
      type: payload.type,
      deciderName: payload.deciderName,
      remediationNote: payload.remediationNote ?? null,
      recycleReason: payload.recycleReason ?? null,
      killReason: payload.killReason ?? null,
      killTag: payload.killTag ?? null,
      createdAt: new Date().toISOString(),
    },
    brief: null,
  }
  if (payload.type === 'GO' || payload.type === 'CONDITIONAL') {
    withDecision.brief = briefFor(withDecision)
  }
  return withDecision
}

function toSummary(lead: LeadDetail): LeadSummary {
  return {
    id: lead.id,
    clientName: lead.clientName,
    status: lead.status,
    severity: lead.analysis?.severity ?? null,
    slaDeadlineAt: lead.analysis?.slaDeadlineAt ?? null,
    decisionType: lead.decision?.type ?? null,
    createdAt: lead.createdAt,
  }
}

// ── Public mock surface ───────────────────────────────────────────────────

export const discoveryMock = {
  list(): Promise<LeadSummary[]> {
    const summaries = [...store]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toSummary)
    return delay(summaries)
  },

  getOne(id: string): Promise<LeadDetail> {
    const lead = store.find((l) => l.id === id)
    if (!lead) return Promise.reject(new Error('Lead não encontrado'))
    return delay(structuredClone(lead))
  },

  create(payload: CreateLeadPayload): Promise<LeadDetail> {
    const lead = seedLead({ ...payload, ageHours: 0 })
    store.unshift(lead)
    return delay(structuredClone(lead), 1100)
  },

  decide(id: string, payload: DecideLeadPayload): Promise<LeadDetail> {
    const index = store.findIndex((l) => l.id === id)
    if (index === -1) return Promise.reject(new Error('Lead não encontrado'))
    store[index] = applyDecision(store[index], payload)
    return delay(structuredClone(store[index]), 800)
  },
}
