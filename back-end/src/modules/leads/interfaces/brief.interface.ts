export interface RiskMitigation {
  risk: string;
  mitigation: string;
}

export interface Brief {
  scopeMust: string[];
  scopeShould: string[];
  scopeCould: string[];
  risksAndMitigation: RiskMitigation[];
  recommendedContractModel: string;
}

export interface BriefInput {
  severity: string;
  extractedNfrs: string[];
  topRisks: string[];
}
