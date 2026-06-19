# Agent Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar `agent.service.ts` com motor de severidade determinístico (S1/S2/S3), fallback determinístico de análise, e integração opcional com Claude via `@anthropic-ai/sdk`.

**Architecture:** O serviço exporta duas funções puras testáveis (`computeSeverity`, `analyzeDeterministic`) e uma classe `AgentService` (NestJS `@Injectable`) que orquestra a chamada ao Claude com fallback automático. A chave da API é lida via `ConfigService` (nunca `process.env` diretamente); se ausente ou em erro, o fluxo cai silenciosamente para o fallback determinístico.

**Tech Stack:** NestJS 11, `@anthropic-ai/sdk`, ConfigService, Jest (TDD). Sem Docker, sem DB — este serviço não acessa o Prisma.

**Branch:** `feat/discovery-agent-service`

## Global Constraints

- Nunca ler `process.env` diretamente — sempre via `ConfigService<AppConfig, true>`.
- Imports sempre via path aliases (`@config/`, `@modules/`); nunca `../../`.
- `@anthropic-ai/sdk` só pode ser adicionado como dependência de produção (`dependencies`, não `devDependencies`).
- Modelo Claude: `claude-opus-4-8`.
- Timeout da chamada Claude: 8 000 ms.
- O serviço nunca lança exceção para o controller — qualquer falha cai no fallback.
- `npm run lint` e `npm run build` devem passar ao final de cada task.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `back-end/src/config/configuration.ts` | Modificar | Adicionar campo `anthropicApiKey` ao `AppConfig` |
| `back-end/.env.example` | Modificar | Adicionar `ANTHROPIC_API_KEY=` comentada |
| `back-end/src/modules/discovery/agent.service.ts` | Criar | Funções puras + `AgentService` |
| `back-end/src/modules/discovery/agent.service.spec.ts` | Criar | Testes Jest para `computeSeverity` e `analyzeDeterministic` |

> `back-end/src/modules/discovery/` ainda não existe — esta task cria o diretório. O `discovery.module.ts` (feito por Carlos) irá importar `AgentService` depois; por ora é suficiente criar o arquivo.

---

## Task 1: Instalar SDK e expor chave no config

**Files:**
- Modify: `back-end/package.json` (via npm install)
- Modify: `back-end/src/config/configuration.ts`
- Modify: `back-end/.env.example`

**Interfaces:**
- Produces: campo `anthropicApiKey: string` em `AppConfig` (usado em Task 3)

- [ ] **Step 1: Instalar `@anthropic-ai/sdk`**

```bash
cd back-end
npm install @anthropic-ai/sdk
```

Verificar que aparece em `dependencies` (não `devDependencies`) no `package.json`.

- [ ] **Step 2: Adicionar `anthropicApiKey` ao `AppConfig`**

Editar `back-end/src/config/configuration.ts`:

```ts
export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string;
  swaggerPath: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  anthropicApiKey: string; // vazio string = sem integração Claude
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-only-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
});
```

- [ ] **Step 3: Documentar a variável no `.env.example`**

Adicionar ao final de `back-end/.env.example`:

```
# Anthropic API (opcional — sem a chave o agente usa fallback determinístico)
# ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 4: Verificar build**

```bash
cd back-end
npm run build
```

Resultado esperado: `Found 0 errors. Watching for file changes.` (ou saída limpa sem erros).

- [ ] **Step 5: Commit**

```bash
git add back-end/package.json back-end/package-lock.json \
        back-end/src/config/configuration.ts back-end/.env.example
git commit -m "feat(config): add anthropicApiKey to AppConfig and install sdk"
```

---

## Task 2: TDD — `computeSeverity`

**Files:**
- Create: `back-end/src/modules/discovery/agent.service.spec.ts`
- Create: `back-end/src/modules/discovery/agent.service.ts` (esqueleto mínimo)

**Interfaces:**
- Produces:
  ```ts
  export interface LeadInput {
    painPoint: string;
    transcript?: string | null;
    mentionedStack?: string | null;
    budget?: number | null;
    declaredDeadline?: string | null;
    decisorName?: string | null;
  }
  export function computeSeverity(lead: LeadInput): 'S1' | 'S2' | 'S3'
  ```

- [ ] **Step 1: Criar o diretório e o arquivo de spec com os testes**

Criar `back-end/src/modules/discovery/agent.service.spec.ts`:

```ts
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
```

- [ ] **Step 2: Criar `agent.service.ts` com esqueleto mínimo para o teste compilar**

Criar `back-end/src/modules/discovery/agent.service.ts`:

```ts
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

export function computeSeverity(_lead: LeadInput): 'S1' | 'S2' | 'S3' {
  return 'S3'; // stub — será implementado no Step 4
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
```

- [ ] **Step 3: Rodar os testes e confirmar que falham (exceto S3 base)**

```bash
cd back-end
npm test -- --testPathPattern="agent.service.spec" --verbose
```

Resultado esperado: maioria **FAIL** (o stub retorna sempre S3). O caso "returns S3 when no budget..." deve passar.

- [ ] **Step 4: Implementar `computeSeverity` de verdade**

Substituir o stub `computeSeverity` em `agent.service.ts`:

```ts
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
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
cd back-end
npm test -- --testPathPattern="agent.service.spec" --verbose
```

Resultado esperado: todos os casos de `computeSeverity` **PASS**.

- [ ] **Step 6: Commit**

```bash
git add back-end/src/modules/discovery/agent.service.ts \
        back-end/src/modules/discovery/agent.service.spec.ts
git commit -m "feat(discovery): implement computeSeverity with TDD"
```

---

## Task 3: TDD — `analyzeDeterministic`

**Files:**
- Modify: `back-end/src/modules/discovery/agent.service.spec.ts` (adicionar suite)
- Modify: `back-end/src/modules/discovery/agent.service.ts` (implementar função)

**Interfaces:**
- Consumes: `LeadInput`, `computeSeverity` (Task 2)
- Produces:
  ```ts
  export function analyzeDeterministic(lead: LeadInput, severity: string): AnalysisResult
  ```

- [ ] **Step 1: Adicionar suite de testes para `analyzeDeterministic` no spec**

Adicionar ao final de `agent.service.spec.ts` (após o `describe('computeSeverity', ...)`):

```ts
import { analyzeDeterministic } from './agent.service';

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
    expect(result.extractedNfrs.some((n) => n.toLowerCase().includes('lgpd'))).toBe(true);
  });

  it('extracts nfrs from transcript too', () => {
    const result = analyzeDeterministic(
      { ...base, transcript: 'cliente pediu sla de 99.9% e multi-tenant' },
      'S2',
    );
    expect(result.extractedNfrs.some((n) => /sla/i.test(n))).toBe(true);
    expect(result.extractedNfrs.some((n) => /multi.tenant/i.test(n))).toBe(true);
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
```

- [ ] **Step 2: Rodar os testes e confirmar que os novos falham**

```bash
cd back-end
npm test -- --testPathPattern="agent.service.spec" --verbose
```

Resultado esperado: suites de `computeSeverity` continuam **PASS**; os novos casos de `analyzeDeterministic` **FAIL**.

- [ ] **Step 3: Implementar `analyzeDeterministic` de verdade**

Substituir o stub em `agent.service.ts`:

```ts
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

const COMPLIANCE_WORDS = ['lgpd', 'financeiro', 'pci', 'banco', 'saúde'];

interface RiskScore {
  score: number;
  label: string;
}

export function analyzeDeterministic(
  lead: LeadInput,
  severity: string,
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
  const risks: RiskScore[] = [];

  const hasCompliance = COMPLIANCE_WORDS.some((kw) => corpus.includes(kw));
  if (hasCompliance) risks.push({ score: 30, label: 'Requisitos de compliance/regulatório identificados' });

  const hasAggressiveDeadline = detectAggressiveDeadline(lead.declaredDeadline);
  if (hasAggressiveDeadline) risks.push({ score: 25, label: 'Prazo agressivo — risco de escopo mal dimensionado' });

  const hasHighBudget = (lead.budget ?? 0) >= 300_000;
  const hasDecisaor = Boolean(lead.decisorName);
  if (hasHighBudget && !hasDecisaor) {
    risks.push({ score: 20, label: 'Deal de alto valor sem stakeholder técnico identificado' });
  }

  const knownStacks = ['react', 'next', 'nestjs', 'node', 'vue', 'angular', 'django', 'rails'];
  const stackLower = (lead.mentionedStack ?? '').toLowerCase();
  const unknownStack = stackLower.length > 0 && !knownStacks.some((s) => stackLower.includes(s));
  if (unknownStack) risks.push({ score: 15, label: 'Stack técnica não reconhecida — risco de estimativa' });

  if (!hasDecisaor) risks.push({ score: 10, label: 'Sem decisor identificado — risco de paralisia de aprovação' });

  risks.sort((a, b) => b.score - a.score);
  const rawScore = risks.reduce((sum, r) => sum + r.score, 0);
  const riskScore = Math.min(rawScore, 100);
  const topRisks = risks.slice(0, 3).map((r) => r.label);

  // Suggested skills
  const suggestedSkills: string[] = [];
  const stack = (lead.mentionedStack ?? '').toLowerCase();
  if (/react|next|vue|angular|svelte/.test(stack)) suggestedSkills.push('Front-end');
  if (/nest|node|express|django|rails|spring/.test(stack)) suggestedSkills.push('Back-end');
  if (/react native|flutter|expo/.test(stack)) suggestedSkills.push('Mobile');
  if (hasCompliance) suggestedSkills.push('Arquiteto');
  if (suggestedSkills.length === 0) suggestedSkills.push('Full-stack');

  const suggestedSeniority = severity === 'S1' ? 'Senior' : severity === 'S2' ? 'Pleno' : 'Júnior/Pleno';

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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
cd back-end
npm test -- --testPathPattern="agent.service.spec" --verbose
```

Resultado esperado: todos os testes de `computeSeverity` e `analyzeDeterministic` **PASS**.

- [ ] **Step 5: Commit**

```bash
git add back-end/src/modules/discovery/agent.service.ts \
        back-end/src/modules/discovery/agent.service.spec.ts
git commit -m "feat(discovery): implement analyzeDeterministic with TDD"
```

---

## Task 4: Implementar `AgentService.analyze` com integração Claude

**Files:**
- Modify: `back-end/src/modules/discovery/agent.service.ts`

**Interfaces:**
- Consumes: `ConfigService<AppConfig, true>` (campo `anthropicApiKey`), `analyzeDeterministic` (Task 3)
- Produces:
  ```ts
  class AgentService {
    async analyze(lead: LeadInput, severity: string): Promise<AnalysisResult>
  }
  ```

- [ ] **Step 1: Substituir o stub `AgentService` pela implementação completa**

Substituir a classe `AgentService` em `agent.service.ts`:

```ts
@Injectable()
export class AgentService {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async analyze(lead: LeadInput, severity: string): Promise<AnalysisResult> {
    const apiKey = this.config.get('anthropicApiKey', { infer: true });
    if (!apiKey) return analyzeDeterministic(lead, severity);

    try {
      return await this.callClaude(lead, severity, apiKey);
    } catch {
      return analyzeDeterministic(lead, severity);
    }
  }

  private async callClaude(
    lead: LeadInput,
    severity: string,
    apiKey: string,
  ): Promise<AnalysisResult> {
    const client = new Anthropic({ apiKey });

    const prompt = `Você é um assistente técnico especializado em pré-venda de software.
Analise o lead abaixo e preencha a ferramenta com sua análise.

Severidade pré-calculada: ${severity}

Cliente: ${lead.painPoint}
Prazo declarado: ${lead.declaredDeadline ?? 'não informado'}
Budget: ${lead.budget != null ? `R$ ${lead.budget.toLocaleString('pt-BR')}` : 'não informado'}
Stack mencionada: ${lead.mentionedStack ?? 'não informada'}
Decisor: ${lead.decisorName ?? 'não informado'}
${lead.transcript ? `\nTranscript da call:\n${lead.transcript}` : ''}

Instrução: extraia NFRs implícitos que o vendedor pode não ter notado explicitamente, estime esforço em banda (min/max semanas), calcule um risk score de 0 a 100, e sugira skills e senioridade necessárias para o projeto.`;

    const response = await client
      .withOptions({ timeout: 8_000 })
      .messages.create({
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
                effortMinWeeks: { type: 'number', description: 'Estimativa mínima em semanas' },
                effortMaxWeeks: { type: 'number', description: 'Estimativa máxima em semanas' },
                confidenceNote: { type: 'string', description: 'Nota de confiança da estimativa' },
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

    return toolUse.input as AnalysisResult;
  }
}
```

- [ ] **Step 2: Garantir que o import do Anthropic está no topo do arquivo**

O arquivo deve começar com (na ordem):

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import type { AppConfig } from '@config/configuration';
```

- [ ] **Step 3: Rodar build para garantir que compila sem erros de tipo**

```bash
cd back-end
npm run build
```

Resultado esperado: sem erros de TypeScript.

- [ ] **Step 4: Rodar todos os testes para confirmar regressão zero**

```bash
cd back-end
npm test -- --verbose
```

Resultado esperado: todos os testes passam (os testes de `computeSeverity` e `analyzeDeterministic` continuam verdes; `analyze` não tem unit test pois envolve side effects de rede — o fallback é coberto indiretamente).

- [ ] **Step 5: Rodar lint**

```bash
cd back-end
npm run lint
```

Resultado esperado: 0 erros, 0 warnings.

- [ ] **Step 6: Commit final**

```bash
git add back-end/src/modules/discovery/agent.service.ts
git commit -m "feat(discovery): implement AgentService.analyze with Claude + deterministic fallback"
```

---

## Self-Review

### Spec coverage

| Requisito (doc) | Coberto? |
|---|---|
| `computeSeverity` determinístico (seção 7.1) | ✅ Task 2 |
| S1 por budget ≥ 300k | ✅ |
| S1 por keyword de compliance | ✅ |
| S1 por prazo agressivo (dias / semanas < 4) | ✅ |
| S3 quando sem budget, sem compliance, sem deadline reconhecido | ✅ |
| S2 default | ✅ |
| SLA por severidade | ⚠️ **Fora do escopo** — `slaDeadlineAt` é calculado em `leads.service.ts` usando o `severity` retornado; não pertence ao `agent.service.ts` |
| `analyzeDeterministic` com NFR keywords (seção 7.2 passo 4) | ✅ Task 3 |
| Esforço base 4–8 + 2 semanas por keyword | ✅ |
| riskScore com os 5 triggers da spec | ✅ |
| topRisks (3 itens) | ✅ |
| suggestedSkills/Seniority por stack | ✅ |
| Integração Claude com `@anthropic-ai/sdk` (seção 7.2 passo 2) | ✅ Task 4 |
| Modelo `claude-opus-4-8` | ✅ |
| Timeout 8000ms via `withOptions` | ✅ |
| JSON garantido via tool_use (equivalente ao `output_config.format`) | ✅ |
| Fallback em qualquer falha (seção 7.2 passo 3) | ✅ |
| `ANTHROPIC_API_KEY` via `ConfigService`, nunca `process.env` | ✅ Task 1 |
| `ANTHROPIC_API_KEY` em `.env.example` | ✅ Task 1 |

### Pontos de atenção para a integração com Carlos

Quando Carlos criar `discovery.module.ts`, ele precisa:

```ts
// back-end/src/modules/discovery/discovery.module.ts
import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
// ...
@Module({
  providers: [AgentService, LeadsService, PeopleService],
  controllers: [LeadsController],
})
export class DiscoveryModule {}
```

E em `leads.service.ts`, injetar `AgentService` normalmente:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly agent: AgentService,
  // ...
) {}
```

O SLA é computado em `leads.service.ts` assim (para referência):

```ts
const SLA_HOURS: Record<string, number> = { S1: 24, S2: 72, S3: 120 };
const slaDeadlineAt = new Date(Date.now() + (SLA_HOURS[severity] ?? 72) * 3_600_000);
```
