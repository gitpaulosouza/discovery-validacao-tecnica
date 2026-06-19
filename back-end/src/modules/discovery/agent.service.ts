import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import type { AppConfig } from '@config/configuration';

export interface LeadInput {
  painPoint: string;
  transcript?: string | null;
  mentionedStack?: string | null;
  budget?: number | null;
  declaredDeadline?: string | null;
  decisorName?: string | null;
}

export interface AnalysisResult {
  extractedNfrs: string[];
  effortMinWeeks: number;
  effortMaxWeeks: number;
  confidenceNote: string;
  riskScore: number;
  topRisks: string[];
  suggestedSkills: string[];
  suggestedSeniority: string;
}

const COMPLIANCE_KEYWORDS = ['lgpd', 'saúde', 'financeiro', 'pci', 'banco'];

export function computeSeverity(lead: LeadInput): 'S1' | 'S2' | 'S3' {
  const text = [lead.painPoint, lead.transcript, lead.mentionedStack]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hasCompliance = COMPLIANCE_KEYWORDS.some((kw) => text.includes(kw));
  const hasHighBudget = (lead.budget ?? 0) >= 300_000;
  const hasAggressiveDeadline = detectAggressiveDeadline(lead.declaredDeadline);

  if (hasCompliance || hasHighBudget || hasAggressiveDeadline) return 'S1';

  const hasBudget = lead.budget != null && lead.budget > 0;
  const hasRecognizedDeadline = detectRecognizedDeadline(lead.declaredDeadline);

  if (!hasBudget && !hasCompliance && !hasRecognizedDeadline) return 'S3';

  return 'S2';
}

function detectAggressiveDeadline(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const lower = deadline.toLowerCase();
  if (/\bdias?\b/.test(lower)) return true;
  const weeksMatch = /(\d+)\s*semanas?/i.exec(lower);
  if (weeksMatch && parseInt(weeksMatch[1], 10) < 4) return true;
  return false;
}

function detectRecognizedDeadline(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const lower = deadline.toLowerCase();
  return /\d+\s*semanas?/i.test(lower) || /\bdias?\b/.test(lower);
}

const NFR_KEYWORDS: Record<string, string> = {
  lgpd: 'Conformidade com LGPD',
  sla: 'SLA / disponibilidade comprometida',
  integração: 'Integração com sistemas externos',
  legado: 'Migração / integração com sistema legado',
  autenticação: 'Requisitos avançados de autenticação',
  'multi-tenant': 'Arquitetura multi-tenant',
  observabilidade: 'Observabilidade e monitoramento',
  sap: 'Integração com SAP',
};

const COMPLIANCE_WORDS = ['lgpd', 'financeiro', 'pci', 'banco', 'saúde'];

interface RiskScore {
  score: number;
  label: string;
}

export function analyzeDeterministic(
  lead: LeadInput,
  severity: string,
): AnalysisResult {
  const corpus = [lead.painPoint, lead.transcript, lead.mentionedStack]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // NFRs
  const extractedNfrs: string[] = [];
  for (const [kw, label] of Object.entries(NFR_KEYWORDS)) {
    if (corpus.includes(kw)) extractedNfrs.push(label);
  }

  // Effort
  const keywordCount = extractedNfrs.length;
  const effortMinWeeks = 4 + keywordCount * 2;
  const effortMaxWeeks = 8 + keywordCount * 2;

  // Risk scores
  const risks: RiskScore[] = [];

  const hasCompliance = COMPLIANCE_WORDS.some((kw) => corpus.includes(kw));
  if (hasCompliance) risks.push({ score: 30, label: 'Requisitos de compliance/regulatório identificados' });

  const hasAggressiveDeadline = detectAggressiveDeadline(lead.declaredDeadline);
  if (hasAggressiveDeadline) risks.push({ score: 25, label: 'Prazo agressivo — risco de escopo mal dimensionado' });

  const hasHighBudget = (lead.budget ?? 0) >= 300_000;
  const hasDecisaor = Boolean(lead.decisorName);
  if (hasHighBudget && !hasDecisaor) {
    risks.push({ score: 20, label: 'Deal de alto valor sem stakeholder técnico identificado' });
  }

  const knownStacks = ['react', 'next', 'nestjs', 'node', 'vue', 'angular', 'django', 'rails'];
  const stackLower = (lead.mentionedStack ?? '').toLowerCase();
  const unknownStack = stackLower.length > 0 && !knownStacks.some((s) => stackLower.includes(s));
  if (unknownStack) risks.push({ score: 15, label: 'Stack técnica não reconhecida — risco de estimativa' });

  if (!hasDecisaor && severity !== 'S3') risks.push({ score: 10, label: 'Sem decisor identificado — risco de paralisia de aprovação' });

  risks.sort((a, b) => b.score - a.score);
  const rawScore = risks.reduce((sum, r) => sum + r.score, 0);
  const riskScore = Math.min(rawScore, 100);
  const topRisks = risks.slice(0, 3).map((r) => r.label);

  // Suggested skills
  const suggestedSkills: string[] = [];
  const stack = (lead.mentionedStack ?? '').toLowerCase();
  if (/react|next|vue|angular|svelte/.test(stack)) suggestedSkills.push('Front-end');
  if (/nest|node|express|django|rails|spring/.test(stack)) suggestedSkills.push('Back-end');
  if (/react native|flutter|expo/.test(stack)) suggestedSkills.push('Mobile');
  if (hasCompliance) suggestedSkills.push('Arquiteto');
  if (suggestedSkills.length === 0) suggestedSkills.push('Full-stack');

  const suggestedSeniority = severity === 'S1' ? 'Senior' : severity === 'S2' ? 'Pleno' : 'Júnior/Pleno';

  const confidenceNote =
    severity === 'S1'
      ? 'Análise determinística — confiança média, recomenda-se revisão técnica.'
      : 'Análise determinística — use como ponto de partida para a conversa com o cliente.';

  return {
    extractedNfrs,
    effortMinWeeks,
    effortMaxWeeks,
    confidenceNote,
    riskScore,
    topRisks,
    suggestedSkills,
    suggestedSeniority,
  };
}

@Injectable()
export class AgentService {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async analyze(lead: LeadInput, severity: string): Promise<AnalysisResult> {
    return analyzeDeterministic(lead, severity);
  }
}
