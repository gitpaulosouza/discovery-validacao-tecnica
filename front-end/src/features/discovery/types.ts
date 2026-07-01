export type LeadStatus = 'PENDING_ANALYSIS' | 'ANALYZED' | 'DECIDED'
export type Severity = 'S1' | 'S2' | 'S3'
export type DecisionType = 'GO' | 'CONDITIONAL' | 'RECYCLE' | 'KILL'

export interface CreateLeadPayload {
  clientName: string
  painPoint: string
  declaredDeadline?: string
  budget?: number
  mentionedStack?: string
  decisorName?: string
  transcript?: string
}

export interface DecideLeadPayload {
  type: DecisionType
  deciderName: string
  remediationNote?: string
  recycleReason?: string
  killReason?: string
  killTag?: string
}

export interface LeadSummary {
  id: string
  clientName: string
  status: LeadStatus
  severity: Severity | null
  slaDeadlineAt: string | null
  decisionType: DecisionType | null
  createdAt: string
}

export interface LeadAnalysis {
  severity: Severity
  extractedNfrs: string[]
  effortMinWeeks: number
  effortMaxWeeks: number
  confidenceNote: string
  riskScore: number
  topRisks: string[]
  suggestedSkills: string[]
  suggestedSeniority: string
  slaDeadlineAt: string
}

export interface SquadMember {
  id: string
  name: string
  role: string
  seniority: string
  matchedSkills: string[]
}

export interface LeadDecision {
  type: DecisionType
  deciderName: string
  remediationNote: string | null
  recycleReason: string | null
  killReason: string | null
  killTag: string | null
  createdAt: string
}

export interface LeadBrief {
  scopeMust: string[]
  scopeShould: string[]
  scopeCould: string[]
  risksAndMitigation: { risk: string; mitigation: string }[]
  recommendedContractModel: string
}

export interface LeadDetail {
  id: string
  clientName: string
  painPoint: string
  declaredDeadline: string | null
  budget: number | null
  mentionedStack: string | null
  decisorName: string | null
  transcript: string | null
  status: LeadStatus
  createdAt: string
  analysis: LeadAnalysis | null
  suggestedSquad: SquadMember[]
  decision: LeadDecision | null
  brief: LeadBrief | null
}
