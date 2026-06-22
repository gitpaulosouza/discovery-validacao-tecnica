import { Injectable, Logger } from '@nestjs/common';
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

// Single source of truth — shared by computeSeverity and analyzeDeterministic
const COMPLIANCE_TERMS = ['lgpd', 'saúde', 'financeiro', 'pci', 'banco'];

// Cap transcript so the prompt stays well within the 8 s timeout budget
const MAX_TRANSCRIPT_CHARS = 3_000;

export function computeSeverity(lead: LeadInput): 'S1' | 'S2' | 'S3' {
  const text = [lead.painPoint, lead.transcript, lead.mentionedStack]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hasCompliance = COMPLIANCE_TERMS.some((kw) => text.includes(kw));
  const hasHighBudget = (lead.budget ?? 0) >= 300_000;
  const hasAggressiveDeadline = detectAggressiveDeadline(lead.declaredDeadline);

  if (hasCompliance || hasHighBudget || hasAggressiveDeadline) return 'S1';

  const hasBudget = lead.budget != null && lead.budget > 0;
  const hasRecognizedDeadline = detectRecognizedDeadline(lead.declaredDeadline);

  if (!hasBudget && !hasCompliance && !hasRecognizedDeadline) return 'S3';

  return 'S2';
}

function detectAggressiveDeadline(
  deadline: string | null | undefined,
): boolean {
  if (!deadline) return false;
  const lower = deadline.toLowerCase();
  if (/\bdias?\b/.test(lower)) return true;
  const weeksMatch = /(\d+)\s*semanas?/i.exec(lower);
  if (weeksMatch && parseInt(weeksMatch[1], 10) < 4) return true;
  return false;
}

function detectRecognizedDeadline(
  deadline: string | null | undefined,
): boolean {
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

interface RiskItem {
  score: number;
  label: string;
}

export function analyzeDeterministic(
  lead: LeadInput,
  severity: 'S1' | 'S2' | 'S3',
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
  const risks: RiskItem[] = [];

  const hasCompliance = COMPLIANCE_TERMS.some((kw) => corpus.includes(kw));
  if (hasCompliance)
    risks.push({
      score: 30,
      label: 'Requisitos de compliance/regulatório identificados',
    });

  const hasAggressiveDeadline = detectAggressiveDeadline(lead.declaredDeadline);
  if (hasAggressiveDeadline)
    risks.push({
      score: 25,
      label: 'Prazo agressivo — risco de escopo mal dimensionado',
    });

  const hasHighBudget = (lead.budget ?? 0) >= 300_000;
  const hasDecisaor = Boolean(lead.decisorName);
  if (hasHighBudget && !hasDecisaor) {
    risks.push({
      score: 20,
      label: 'Deal de alto valor sem stakeholder técnico identificado',
    });
  }

  const knownStacks = [
    'react',
    'next',
    'nestjs',
    'node',
    'vue',
    'angular',
    'django',
    'rails',
  ];
  const stackLower = (lead.mentionedStack ?? '').toLowerCase();
  const unknownStack =
    stackLower.length > 0 && !knownStacks.some((s) => stackLower.includes(s));
  if (unknownStack)
    risks.push({
      score: 15,
      label: 'Stack técnica não reconhecida — risco de estimativa',
    });

  if (!hasDecisaor && severity !== 'S3')
    risks.push({
      score: 10,
      label: 'Sem decisor identificado — risco de paralisia de aprovação',
    });

  risks.sort((a, b) => b.score - a.score);
  const rawScore = risks.reduce((sum, r) => sum + r.score, 0);
  const riskScore = Math.min(rawScore, 100);
  const topRisks = risks.slice(0, 3).map((r) => r.label);

  // Suggested skills
  const suggestedSkills: string[] = [];
  if (/react|next|vue|angular|svelte/.test(stackLower))
    suggestedSkills.push('Front-end');
  if (/nest|node|express|django|rails|spring/.test(stackLower))
    suggestedSkills.push('Back-end');
  if (/react\s*native|reactnative|flutter|expo/.test(stackLower))
    suggestedSkills.push('Mobile');
  if (hasCompliance) suggestedSkills.push('Arquiteto');
  if (suggestedSkills.length === 0) suggestedSkills.push('Full-stack');

  const suggestedSeniority =
    severity === 'S1' ? 'Senior' : severity === 'S2' ? 'Pleno' : 'Júnior/Pleno';

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

function parseClaudeResult(input: unknown): AnalysisResult {
  if (!input || typeof input !== 'object') {
    throw new Error('Claude tool input is not an object');
  }
  const raw = input as Record<string, unknown>;

  const extractedNfrs = Array.isArray(raw.extractedNfrs)
    ? raw.extractedNfrs.filter((x): x is string => typeof x === 'string')
    : [];
  const effortMinWeeks =
    typeof raw.effortMinWeeks === 'number' ? raw.effortMinWeeks : 4;
  const effortMaxWeeks =
    typeof raw.effortMaxWeeks === 'number' ? raw.effortMaxWeeks : 8;
  const confidenceNote =
    typeof raw.confidenceNote === 'string' ? raw.confidenceNote : '';
  const riskScore =
    typeof raw.riskScore === 'number'
      ? Math.min(100, Math.max(0, raw.riskScore))
      : 0;
  const topRisks = Array.isArray(raw.topRisks)
    ? raw.topRisks.filter((x): x is string => typeof x === 'string').slice(0, 3)
    : [];
  const suggestedSkills = Array.isArray(raw.suggestedSkills)
    ? raw.suggestedSkills.filter((x): x is string => typeof x === 'string')
    : [];
  const suggestedSeniority =
    typeof raw.suggestedSeniority === 'string'
      ? raw.suggestedSeniority
      : 'Pleno';

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
  private readonly logger = new Logger(AgentService.name);
  private readonly anthropic: Anthropic | null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const apiKey = config.get('anthropicApiKey', { infer: true });
    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async analyze(
    lead: LeadInput,
    severity: 'S1' | 'S2' | 'S3',
  ): Promise<AnalysisResult> {
    if (!this.anthropic) return analyzeDeterministic(lead, severity);

    try {
      return await this.callClaude(lead, severity);
    } catch (err) {
      this.logger.warn(
        'Claude analysis failed, falling back to deterministic',
        err instanceof Error ? err.message : String(err),
      );
      return analyzeDeterministic(lead, severity);
    }
  }

  private async callClaude(
    lead: LeadInput,
    severity: 'S1' | 'S2' | 'S3',
  ): Promise<AnalysisResult> {
    const transcript = lead.transcript
      ? lead.transcript.slice(0, MAX_TRANSCRIPT_CHARS)
      : null;

    const prompt = `Você é um assistente técnico especializado em pré-venda de software.
Analise o lead abaixo e preencha a ferramenta com sua análise.

Severidade pré-calculada: ${severity}

Cliente: ${lead.painPoint}
Prazo declarado: ${lead.declaredDeadline ?? 'não informado'}
Budget: ${lead.budget != null ? `R$ ${lead.budget.toLocaleString('pt-BR')}` : 'não informado'}
Stack mencionada: ${lead.mentionedStack ?? 'não informada'}
Decisor: ${lead.decisorName ?? 'não informado'}
${transcript ? `\nTranscript da call:\n${transcript}` : ''}

Instrução: extraia NFRs implícitos que o vendedor pode não ter notado explicitamente, estime esforço em banda (min/max semanas), calcule um risk score de 0 a 100, e sugira skills e senioridade necessárias para o projeto.`;

    const response = await this.anthropic!.withOptions({
      timeout: 8_000,
    }).messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1_024,
      tools: [
        {
          name: 'submit_analysis',
          description: 'Submete o resultado da análise técnica do lead',
          input_schema: {
            type: 'object' as const,
            properties: {
              extractedNfrs: {
                type: 'array',
                items: { type: 'string' },
                description: 'NFRs implícitos não mencionados pelo vendedor',
              },
              effortMinWeeks: {
                type: 'number',
                description: 'Estimativa mínima em semanas',
              },
              effortMaxWeeks: {
                type: 'number',
                description: 'Estimativa máxima em semanas',
              },
              confidenceNote: {
                type: 'string',
                description: 'Nota de confiança da estimativa',
              },
              riskScore: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Score de risco de 0 a 100',
              },
              topRisks: {
                type: 'array',
                items: { type: 'string' },
                description: 'Os 3 principais riscos identificados',
              },
              suggestedSkills: {
                type: 'array',
                items: { type: 'string' },
                description: 'Skills recomendadas para o squad',
              },
              suggestedSeniority: {
                type: 'string',
                description: 'Senioridade recomendada (ex: Senior, Pleno)',
              },
            },
            required: [
              'extractedNfrs',
              'effortMinWeeks',
              'effortMaxWeeks',
              'confidenceNote',
              'riskScore',
              'topRisks',
              'suggestedSkills',
              'suggestedSeniority',
            ],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude did not return tool_use block');
    }

    return parseClaudeResult(toolUse.input);
  }
}
