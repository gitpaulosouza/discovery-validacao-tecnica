import { ConfigService } from '@nestjs/config';
import {
  AgentService,
  computeSeverity,
  analyzeDeterministic,
  LeadInput,
} from './agent.service';

const base: LeadInput = {
  painPoint: 'portal de clientes simples',
  transcript: null,
  mentionedStack: null,
  budget: null,
  declaredDeadline: null,
  decisorName: null,
};

describe('computeSeverity', () => {
  // ── S1 triggers ──────────────────────────────────────────────────────────

  it('returns S1 when budget >= 300000', () => {
    expect(computeSeverity({ ...base, budget: 300000 })).toBe('S1');
    expect(computeSeverity({ ...base, budget: 500000 })).toBe('S1');
  });

  it('returns S1 when painPoint contains compliance keyword (case-insensitive)', () => {
    expect(
      computeSeverity({ ...base, painPoint: 'sistema LGPD de dados' }),
    ).toBe('S1');
    expect(
      computeSeverity({ ...base, painPoint: 'app para área de saúde' }),
    ).toBe('S1');
    expect(
      computeSeverity({ ...base, painPoint: 'relatório financeiro' }),
    ).toBe('S1');
    expect(
      computeSeverity({ ...base, painPoint: 'gateway PCI para pagamentos' }),
    ).toBe('S1');
    expect(
      computeSeverity({ ...base, painPoint: 'sistema para banco digital' }),
    ).toBe('S1');
  });

  it('returns S1 when transcript contains compliance keyword', () => {
    expect(
      computeSeverity({
        ...base,
        transcript: 'cliente mencionou lgpd no minuto 10',
      }),
    ).toBe('S1');
  });

  it('returns S1 when mentionedStack contains compliance keyword', () => {
    expect(
      computeSeverity({ ...base, mentionedStack: 'stack financeiro legacy' }),
    ).toBe('S1');
  });

  it('returns S1 when declaredDeadline has number < 4 followed by semanas', () => {
    expect(computeSeverity({ ...base, declaredDeadline: '3 semanas' })).toBe(
      'S1',
    );
    expect(computeSeverity({ ...base, declaredDeadline: '1 semana' })).toBe(
      'S1',
    );
    expect(
      computeSeverity({ ...base, declaredDeadline: 'precisa em 2 semanas' }),
    ).toBe('S1');
  });

  it('returns S1 when declaredDeadline contains dias', () => {
    expect(computeSeverity({ ...base, declaredDeadline: '10 dias' })).toBe(
      'S1',
    );
    expect(
      computeSeverity({ ...base, declaredDeadline: 'urgente, 3 dias' }),
    ).toBe('S1');
  });

  // ── S3 triggers ──────────────────────────────────────────────────────────

  it('returns S3 when no budget, no compliance words, and no recognized deadline', () => {
    expect(computeSeverity({ ...base })).toBe('S3');
    expect(
      computeSeverity({ ...base, declaredDeadline: 'próximo trimestre' }),
    ).toBe('S3');
  });

  // ── S2 default ───────────────────────────────────────────────────────────

  it('returns S2 when budget < 300000 and no compliance words', () => {
    expect(computeSeverity({ ...base, budget: 150000 })).toBe('S2');
  });

  it('returns S2 when deadline is >= 4 semanas (not aggressive)', () => {
    expect(computeSeverity({ ...base, declaredDeadline: '6 semanas' })).toBe(
      'S2',
    );
    expect(computeSeverity({ ...base, declaredDeadline: '4 semanas' })).toBe(
      'S2',
    );
  });

  it('returns S2 when mix of mild signals (budget < 300k + has deadline)', () => {
    expect(
      computeSeverity({
        ...base,
        budget: 100000,
        declaredDeadline: '8 semanas',
      }),
    ).toBe('S2');
  });
});

describe('analyzeDeterministic', () => {
  it('returns empty nfrs when no keywords present', () => {
    const result = analyzeDeterministic({ ...base }, 'S3');
    expect(result.extractedNfrs).toEqual([]);
  });

  it('extracts nfr for each matched keyword in painPoint', () => {
    const result = analyzeDeterministic(
      { ...base, painPoint: 'sistema com lgpd e integração com legado' },
      'S2',
    );
    expect(result.extractedNfrs.length).toBeGreaterThanOrEqual(2);
    expect(
      result.extractedNfrs.some((n) => n.toLowerCase().includes('lgpd')),
    ).toBe(true);
  });

  it('extracts nfrs from transcript too', () => {
    const result = analyzeDeterministic(
      { ...base, transcript: 'cliente pediu sla de 99.9% e multi-tenant' },
      'S2',
    );
    expect(result.extractedNfrs.some((n) => /sla/i.test(n))).toBe(true);
    expect(result.extractedNfrs.some((n) => /multi.tenant/i.test(n))).toBe(
      true,
    );
  });

  it('base effort is 4-8 weeks without keywords', () => {
    const result = analyzeDeterministic({ ...base }, 'S3');
    expect(result.effortMinWeeks).toBe(4);
    expect(result.effortMaxWeeks).toBe(8);
  });

  it('increases effort by 2 weeks per keyword found', () => {
    const result = analyzeDeterministic(
      { ...base, painPoint: 'lgpd integração legado' },
      'S1',
    );
    expect(result.effortMinWeeks).toBe(10); // 4 + 3*2
    expect(result.effortMaxWeeks).toBe(14); // 8 + 3*2
  });

  it('riskScore is 0 for a blank lead', () => {
    const result = analyzeDeterministic({ ...base }, 'S3');
    expect(result.riskScore).toBe(0);
  });

  it('riskScore adds 30 for compliance keyword', () => {
    const result = analyzeDeterministic(
      { ...base, painPoint: 'sistema lgpd' },
      'S1',
    );
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
  });

  it('riskScore adds 10 when no decisor informed', () => {
    const result = analyzeDeterministic({ ...base, decisorName: null }, 'S2');
    expect(result.riskScore).toBeGreaterThanOrEqual(10);
  });

  it('riskScore is capped at 100', () => {
    const result = analyzeDeterministic(
      {
        painPoint: 'lgpd financeiro pci banco saúde',
        budget: 400000,
        declaredDeadline: '2 semanas',
        decisorName: null,
        mentionedStack: 'SAP legado',
        transcript: null,
      },
      'S1',
    );
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it('suggestedSkills includes front-end for React/Next mention', () => {
    const result = analyzeDeterministic(
      { ...base, mentionedStack: 'React e Next.js' },
      'S2',
    );
    expect(result.suggestedSkills.some((s) => /front.end/i.test(s))).toBe(true);
  });

  it('suggestedSkills includes back-end for NestJS mention', () => {
    const result = analyzeDeterministic(
      { ...base, mentionedStack: 'NestJS com Node' },
      'S2',
    );
    expect(result.suggestedSkills.some((s) => /back.end/i.test(s))).toBe(true);
  });

  it('suggestedSkills includes Arquiteto when compliance keyword present', () => {
    const result = analyzeDeterministic(
      { ...base, painPoint: 'sistema lgpd' },
      'S1',
    );
    expect(result.suggestedSkills.some((s) => /arquiteto/i.test(s))).toBe(true);
  });

  it('returns at most 3 topRisks', () => {
    const result = analyzeDeterministic(
      {
        painPoint: 'lgpd financeiro',
        budget: 400000,
        declaredDeadline: '2 semanas',
        decisorName: null,
        mentionedStack: 'SAP',
        transcript: null,
      },
      'S1',
    );
    expect(result.topRisks.length).toBeLessThanOrEqual(3);
  });
});

describe('AgentService.analyze — fallback determinístico (sem chave)', () => {
  let service: AgentService;

  beforeEach(() => {
    const configMock = { get: () => '' } as unknown as ConfigService;
    service = new AgentService(configMock);
  });

  it('retorna resultado via fallback quando não há chave de API', async () => {
    const lead: LeadInput = {
      painPoint: 'sistema LGPD para banco digital',
      budget: 400_000,
      declaredDeadline: '3 semanas',
      transcript: null,
      mentionedStack: null,
      decisorName: null,
    };
    const severity = computeSeverity(lead);
    expect(severity).toBe('S1');

    const result = await service.analyze(lead, severity);
    expect(result.extractedNfrs.some((n) => /lgpd/i.test(n))).toBe(true);
    expect(result.riskScore).toBeGreaterThan(50);
    expect(result.effortMinWeeks).toBeGreaterThanOrEqual(4);
    expect(result.topRisks.length).toBeGreaterThan(0);
  });
});
