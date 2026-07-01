import { BriefHelper } from './brief.helper';

describe('BriefHelper.build', () => {
  it('routes compliance/security NFRs to Must, integration/perf to Should, rest to Could', () => {
    const brief = BriefHelper.build({
      severity: 'S2',
      extractedNfrs: [
        'Conformidade com LGPD',
        'Integração com sistema legado',
        'Tela de relatórios customizada',
      ],
      topRisks: [],
    });

    expect(brief.scopeMust).toEqual(['Conformidade com LGPD']);
    expect(brief.scopeShould).toEqual(['Integração com sistema legado']);
    expect(brief.scopeCould).toEqual(['Tela de relatórios customizada']);
  });

  it('produces one mitigation per top risk', () => {
    const brief = BriefHelper.build({
      severity: 'S1',
      extractedNfrs: [],
      topRisks: ['Prazo agressivo', 'Sem decisor identificado'],
    });

    expect(brief.risksAndMitigation).toHaveLength(2);
    expect(brief.risksAndMitigation[0].risk).toBe('Prazo agressivo');
    expect(brief.risksAndMitigation[0].mitigation).toMatch(/discovery pago/i);
    expect(brief.risksAndMitigation[1].mitigation).toMatch(/stakeholder/i);
  });

  it('picks the contract model from the severity', () => {
    expect(
      BriefHelper.build({ severity: 'S1', extractedNfrs: [], topRisks: [] })
        .recommendedContractModel,
    ).toMatch(/Target Price com cap/i);
    expect(
      BriefHelper.build({ severity: 'S2', extractedNfrs: [], topRisks: [] })
        .recommendedContractModel,
    ).toMatch(/modelo padrão/i);
    expect(
      BriefHelper.build({ severity: 'S3', extractedNfrs: [], topRisks: [] })
        .recommendedContractModel,
    ).toMatch(/fast-track/i);
  });
});
