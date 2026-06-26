import { SquadMember } from '@modules/people/interfaces';
import { Brief } from './brief.interface';

export interface AnalysisResult {
  severity: string;
  extractedNfrs: string[];
  effortMinWeeks: number;
  effortMaxWeeks: number;
  confidenceNote: string;
  riskScore: number;
  topRisks: string[];
  suggestedSkills: string[];
  suggestedSeniority: string;
  slaDeadlineAt: Date;
}

export interface DecisionResult {
  type: string;
  deciderName: string;
  remediationNote: string | null;
  recycleReason: string | null;
  killReason: string | null;
  killTag: string | null;
  createdAt: Date;
}

// Full GET /leads/:id response contract (section 6.3).
export interface LeadDetailResult {
  id: string;
  clientName: string;
  painPoint: string;
  declaredDeadline: string | null;
  budget: number | null;
  mentionedStack: string | null;
  decisorName: string | null;
  transcript: string | null;
  status: string;
  createdAt: Date;
  analysis: AnalysisResult | null;
  suggestedSquad: SquadMember[];
  decision: DecisionResult | null;
  brief: Brief | null;
}
