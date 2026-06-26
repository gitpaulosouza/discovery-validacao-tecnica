import { Brief, BriefInput } from '@modules/leads/interfaces';

export class BriefHelper {
  private static readonly MUST_KEYWORDS = [
    'lgpd',
    'compliance',
    'conformidade',
    'regulat',
    'segurança',
    'security',
    'autenticação',
    'auth',
    'pci',
  ];

  private static readonly SHOULD_KEYWORDS = [
    'integração',
    'integration',
    'sla',
    'disponibilidade',
    'performance',
    'observabilidade',
    'legado',
    'sap',
    'multi-tenant',
  ];

  private static readonly CONTRACT_MODEL: Record<string, string> = {
    S1: 'Discovery pago abatível (8-15%) + Target Price com cap — deal estratégico, proteger margem e prazo.',
    S2: 'Discovery pago abatível + Target Price — modelo padrão recomendado.',
    S3: 'Discovery interno gratuito, fast-track — deal especulativo, sem necessidade de gate formal completo.',
  };

  static build(input: BriefInput): Brief {
    const scopeMust: string[] = [];
    const scopeShould: string[] = [];
    const scopeCould: string[] = [];

    for (const nfr of input.extractedNfrs) {
      if (this.matches(nfr, this.MUST_KEYWORDS)) scopeMust.push(nfr);
      else if (this.matches(nfr, this.SHOULD_KEYWORDS)) scopeShould.push(nfr);
      else scopeCould.push(nfr);
    }

    return {
      scopeMust,
      scopeShould,
      scopeCould,
      risksAndMitigation: input.topRisks.map((risk) => ({
        risk,
        mitigation: this.mitigationFor(risk),
      })),
      recommendedContractModel:
        this.CONTRACT_MODEL[input.severity] ?? this.CONTRACT_MODEL.S2,
    };
  }

  private static matches(text: string, keywords: string[]): boolean {
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  }

  private static mitigationFor(risk: string): string {
    const lower = risk.toLowerCase();
    if (lower.includes('prazo')) {
      return 'Negociar prazo via discovery pago antes de fechar o escopo.';
    }
    if (lower.includes('decisor') || lower.includes('stakeholder')) {
      return 'Exigir indicação de stakeholder técnico antes do kickoff.';
    }
    if (lower.includes('compliance') || lower.includes('regulat')) {
      return 'Envolver arquiteto/segurança já no discovery para dimensionar o esforço de conformidade.';
    }
    if (lower.includes('stack')) {
      return 'Validar a stack com uma PoC técnica antes de assumir prazo.';
    }
    return 'Mitigar via discovery técnico antes de assinar o contrato.';
  }
}
