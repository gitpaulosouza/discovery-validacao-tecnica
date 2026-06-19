import { computeSeverity, LeadInput } from './agent.service';

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
    expect(computeSeverity({ ...base, painPoint: 'sistema LGPD de dados' })).toBe('S1');
    expect(computeSeverity({ ...base, painPoint: 'app para área de saúde' })).toBe('S1');
    expect(computeSeverity({ ...base, painPoint: 'relatório financeiro' })).toBe('S1');
    expect(computeSeverity({ ...base, painPoint: 'gateway PCI para pagamentos' })).toBe('S1');
    expect(computeSeverity({ ...base, painPoint: 'sistema para banco digital' })).toBe('S1');
  });

  it('returns S1 when transcript contains compliance keyword', () => {
    expect(
      computeSeverity({ ...base, transcript: 'cliente mencionou lgpd no minuto 10' }),
    ).toBe('S1');
  });

  it('returns S1 when mentionedStack contains compliance keyword', () => {
    expect(computeSeverity({ ...base, mentionedStack: 'stack financeiro legacy' })).toBe('S1');
  });

  it('returns S1 when declaredDeadline has number < 4 followed by semanas', () => {
    expect(computeSeverity({ ...base, declaredDeadline: '3 semanas' })).toBe('S1');
    expect(computeSeverity({ ...base, declaredDeadline: '1 semana' })).toBe('S1');
    expect(computeSeverity({ ...base, declaredDeadline: 'precisa em 2 semanas' })).toBe('S1');
  });

  it('returns S1 when declaredDeadline contains dias', () => {
    expect(computeSeverity({ ...base, declaredDeadline: '10 dias' })).toBe('S1');
    expect(computeSeverity({ ...base, declaredDeadline: 'urgente, 3 dias' })).toBe('S1');
  });

  // ── S3 triggers ──────────────────────────────────────────────────────────

  it('returns S3 when no budget, no compliance words, and no recognized deadline', () => {
    expect(computeSeverity({ ...base })).toBe('S3');
    expect(computeSeverity({ ...base, declaredDeadline: 'próximo trimestre' })).toBe('S3');
  });

  // ── S2 default ───────────────────────────────────────────────────────────

  it('returns S2 when budget < 300000 and no compliance words', () => {
    expect(computeSeverity({ ...base, budget: 150000 })).toBe('S2');
  });

  it('returns S2 when deadline is >= 4 semanas (not aggressive)', () => {
    expect(computeSeverity({ ...base, declaredDeadline: '6 semanas' })).toBe('S2');
    expect(computeSeverity({ ...base, declaredDeadline: '4 semanas' })).toBe('S2');
  });

  it('returns S2 when mix of mild signals (budget < 300k + has deadline)', () => {
    expect(
      computeSeverity({ ...base, budget: 100000, declaredDeadline: '8 semanas' }),
    ).toBe('S2');
  });
});
