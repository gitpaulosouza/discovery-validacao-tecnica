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

export function analyzeDeterministic(
  _lead: LeadInput,
  _severity: string,
): AnalysisResult {
  return {
    extractedNfrs: [],
    effortMinWeeks: 4,
    effortMaxWeeks: 8,
    confidenceNote: 'stub',
    riskScore: 0,
    topRisks: [],
    suggestedSkills: [],
    suggestedSeniority: 'Pleno',
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
