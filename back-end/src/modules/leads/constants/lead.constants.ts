// SQLite + Prisma emulate enums inconsistently across versions (section 5), so we
// keep these as String columns and validate against these lists at the DTO layer.

export const SEVERITIES = ['S1', 'S2', 'S3'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const LEAD_STATUSES = [
  'PENDING_ANALYSIS',
  'ANALYZED',
  'DECIDED',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DECISION_TYPES = ['GO', 'CONDITIONAL', 'RECYCLE', 'KILL'] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

// The 5 Kill criteria (section 2). The proposal that names them is not in this
// repo, so these are the assumed values — single source of truth, adjust freely.
export const KILL_TAGS = [
  'PRAZO_INVIAVEL',
  'BUDGET_INCOMPATIVEL',
  'SEM_FIT_TECNICO',
  'RISCO_COMPLIANCE',
  'SEM_DECISOR',
] as const;
export type KillTag = (typeof KILL_TAGS)[number];
