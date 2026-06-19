# Discovery & Validação Técnica — Documento de Implementação

> Hackathon Loomi, Desafio 06 — "Discovery e validação técnica: Pré-venda inteligente".
> Este documento é a especificação técnica completa do MVP a ser construído **hoje**, para o
> time dividir e implementar em paralelo. Complementa (não substitui) `solucao-proposta.md` e
> `pesquisa-mercado.md` — aqui o foco é "como construir", não "por que construir".

## 1. Contexto e objetivo

A Loomi vende projetos sem validação técnica (prazos inacessíveis, escopos vagos), gerando
metade dos projetos problemáticos — agravado pela falta de comunicação Comercial × Tech. A
solução proposta é um módulo de 5 componentes — **Intake → Agente IA → Roteamento → Deal Desk →
Handoff** — hoje pensado como parte do "Loomi OS" (plataforma interna real) e do "Hub de
alocação" (também real).

Para o hackathon, **não há integração real disponível** com nenhum dos dois — o módulo inteiro é
construído dentro deste repositório (`discovery-validacao-tecnica`), com dados mockados, e
roda sobre a stack já scaffolded: **NestJS 11 + Prisma/SQLite** no back-end, **Next.js 15 +
Tailwind + TanStack Query** no front-end.

**Prazo: hoje.** O objetivo é sustentar 3 demos ao vivo:

- **Demo A — "O lead chegou"**: Comercial preenche o Intake; o painel de controle mostra o lead
  com severidade, SLA e squad sugerida.
- **Demo B — "O agente expôs o que estava escondido"**: usando um transcript de um projeto que
  deu errado, o agente extrai uma NFR que o vendedor não viu.
- **Demo C — "A decisão registrada"**: Deal Desk com os 4 botões (Go/Conditional/Recycle/Kill);
  decisão persiste; Brief de saída é gerado.

## 2. Decisões assumidas (seção 6 da proposta — ainda não fechadas pelo time)

| Decisão | Default assumido neste doc |
|---|---|
| Go/no-go bloqueante ou consultivo? | Bloqueante em S1/S2; fast-track (consultivo) em S3 — banner informativo, sem travar a tela |
| Quem é o Decider? | Campo livre "Decisor" no momento da decisão (sem RBAC hoje) |
| Discovery paga a partir de quando? | Acima de R$ 300.000 (mesmo valor usado como trigger de severidade S1) |
| Onde mora o agente? | Hoje, standalone neste repo (protótipo); em produção seria plugin do Loomi OS |
| Critérios de Kill | Os 5 da proposta, oferecidos como tag no fluxo de Kill — decisão final é sempre humana |

Se o time fechar essas decisões de outra forma antes do pitch, os pontos de ajuste estão isolados
nas seções 7.1 (severidade/threshold de R$ 300k) e 8.3 (tags de Kill).

## 3. Escopo do dia

**Entra:**
- Formulário de Intake
- Motor de severidade determinístico (S1/S2/S3)
- Agente IA (Claude) com fallback determinístico
- Hub de alocação mockado + sugestão de squad
- Painel de controle (lista de leads + severidade + SLA, com polling)
- Deal Desk (4 botões de decisão)
- Brief de saída (Definition of Ready)

**Não entra (citar como next step no pitch):**
- Integração real com Loomi OS / Hub de alocação de produção
- RBAC real (Comercial vs Tech vs Decider)
- Mudança de modelo de contrato (fica só como texto recomendado no Brief)
- Notificação push real (polling simples resolve)
- Comitê de arquitetura como entidade no sistema

## 4. Arquitetura geral

```
back-end/src/modules/discovery/
  discovery.module.ts
  leads.controller.ts          # 4 endpoints (seção 6)
  leads.service.ts             # CRUD + orquestra severidade/SLA/brief
  agent.service.ts             # severidade determinística + Claude + fallback (seção 7.1, 7.2)
  people.service.ts            # hub mockado + ranking de squad (seção 7.3)
  dto/
    create-lead.dto.ts
    decide-lead.dto.ts

front-end/src/features/discovery/
  api.ts                        # discoveryApi (espelha features/users/api.ts)
  keys.ts                       # discoveryKeys
  hooks/
    useLeads.ts                 # GET /leads (com polling)
    useLead.ts                  # GET /leads/:id
    useCreateLead.ts             # POST /leads
    useDecideLead.ts             # POST /leads/:id/decision
  components/
    SeverityBadge.tsx
    SlaCountdown.tsx
    SquadList.tsx
    DecisionPanel.tsx
    BriefView.tsx

front-end/src/app/(app)/discovery/
  intake/page.tsx                # Demo A (início)
  page.tsx                       # painel de controle — Demo A (fim)
  [leadId]/page.tsx               # Demo B (análise) + Demo C (Deal Desk + Brief)
```

As páginas ficam sob `(app)/discovery/...` (não `app/discovery/...`) para herdar automaticamente
`RequireAuth` + o header do layout já existente em `front-end/src/app/(app)/layout.tsx` — o mesmo
padrão usado por `(app)/account/page.tsx`.

**Reuso obrigatório (não recriar):**
- Back-end: `PrismaService` (`@prisma-svc/prisma.service`, já `@Global()`), `JwtAuthGuard`
  (`@modules/auth/guards/jwt-auth.guard`), `ValidationPipe` global, `TransformInterceptor` (toda
  resposta de sucesso já vem envelopada em `{ success, data, timestamp }` — os controllers
  retornam só o `data`), `AllExceptionsFilter`.
- Front-end: `api.ts` (`front-end/src/lib/api.ts` — já desembrulha o `data` do envelope),
  `Card`/`CardContent`, `Badge`, `Button`, `Field`, `Input`, `Label` de
  `front-end/src/components/ui/`, `RequireAuth` de `features/auth/components/RequireAuth.tsx`.

## 5. Modelo de dados (Prisma)

Adicionar ao `back-end/prisma/schema.prisma` existente (modelos `User`/`RefreshToken` ficam
intactos). Usar **`String`** onde seria enum (severidade, status, tipo de decisão) — SQLite +
Prisma emula enum de forma incerta entre versões; `String` + validação `@IsIn([...])` no DTO é
mais seguro sob prazo curto. Usar `Json` (suportado em SQLite) para campos de lista.

```prisma
model Lead {
  id               String        @id @default(uuid())
  clientName       String
  painPoint        String
  declaredDeadline String?
  budget           Float?
  mentionedStack   String?
  decisorName      String?
  transcript       String?
  status           String        @default("PENDING_ANALYSIS") // PENDING_ANALYSIS | ANALYZED | DECIDED
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  analysis         LeadAnalysis?
  decision         Decision?
}

model LeadAnalysis {
  id                 String   @id @default(uuid())
  leadId             String   @unique
  lead               Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  severity           String   // S1 | S2 | S3
  extractedNfrs      Json     // string[]
  effortMinWeeks     Float
  effortMaxWeeks     Float
  confidenceNote     String
  riskScore          Int      // 0-100
  topRisks           Json     // string[]
  suggestedSkills    Json     // string[]
  suggestedSeniority String
  slaDeadlineAt      DateTime
  createdAt          DateTime @default(now())
}

model Person {
  id        String  @id @default(uuid())
  name      String
  role      String
  skills    Json    // string[]
  seniority String
  available Boolean @default(true)
}

model Decision {
  id              String   @id @default(uuid())
  leadId          String   @unique
  lead            Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  type            String   // GO | CONDITIONAL | RECYCLE | KILL — obrigatório
  deciderName     String   // obrigatório
  remediationNote String?  // opcional — só para CONDITIONAL
  recycleReason   String?  // opcional — só para RECYCLE
  killReason      String?  // opcional — só para KILL
  killTag         String?  // opcional — só para KILL
  createdAt       DateTime @default(now())
}
```

> **Nota de estado:** este schema já foi adicionado a `back-end/prisma/schema.prisma`
> (uncommitted, sem migration gerada ainda) como ponto de partida. Quem pegar a tarefa de
> back-end pode revisar/ajustar livremente antes de rodar `npm run prisma:migrate`.

**Seed** (`back-end/prisma/seed.ts` ou script equivalente): ~8 `Person` mockadas cobrindo
PO/Tech Lead/Arquiteto/Backend/Frontend/QA com `skills` e `seniority` variadas; 1 `Lead` de
exemplo com `transcript` "deu errado" contendo uma NFR escondida (ex.: *"cliente mencionou ANS
de 99.9% no minuto 17"*) — usado na Demo B.

## 6. Contrato de API

Prefixo global `api` já configurado em `main.ts` — controller declara `@Controller('discovery/leads')`,
rotas reais ficam em `/api/discovery/leads...`. Todas as rotas usam `@UseGuards(JwtAuthGuard)`
(usuário já autenticado via o fluxo de login existente — sem RBAC extra hoje). Todo `data` abaixo
é o que o controller retorna; o envelope `{ success, data, timestamp }` é automático via
`TransformInterceptor`.

### 6.1 `POST /api/discovery/leads`

Cria o lead **e já dispara a análise síncrona** (severidade + agente) antes de responder — assim
o front-end pode navegar direto para a tela de detalhe.

Body (`CreateLeadDto`):

```json
{
  "clientName": "string, obrigatório, 1-200 chars",
  "painPoint": "string, obrigatório, 1-2000 chars",
  "declaredDeadline": "string, opcional, texto livre (ex: '6 semanas')",
  "budget": "number, opcional, >= 0",
  "mentionedStack": "string, opcional",
  "decisorName": "string, opcional",
  "transcript": "string, opcional, até ~20000 chars"
}
```

Resposta `201` — `data`: objeto `LeadDetail` completo (mesma shape do item 6.3).

### 6.2 `GET /api/discovery/leads`

Lista para o painel de controle, ordenada por `createdAt desc`. Sem paginação (volume é mínimo
para a demo).

Resposta `200` — `data`: array de `LeadSummary`:

```json
[
  {
    "id": "uuid",
    "clientName": "string",
    "status": "PENDING_ANALYSIS | ANALYZED | DECIDED",
    "severity": "S1 | S2 | S3 | null",
    "slaDeadlineAt": "ISO string | null",
    "decisionType": "GO | CONDITIONAL | RECYCLE | KILL | null",
    "createdAt": "ISO string"
  }
]
```

Front-end consome com `refetchInterval: 5000` (efeito "notificação chegou").

### 6.3 `GET /api/discovery/leads/:id`

Resposta `200` — `data`: `LeadDetail`:

```json
{
  "id": "uuid",
  "clientName": "string",
  "painPoint": "string",
  "declaredDeadline": "string | null",
  "budget": "number | null",
  "mentionedStack": "string | null",
  "decisorName": "string | null",
  "transcript": "string | null",
  "status": "PENDING_ANALYSIS | ANALYZED | DECIDED",
  "createdAt": "ISO string",
  "analysis": {
    "severity": "S1 | S2 | S3",
    "extractedNfrs": ["string"],
    "effortMinWeeks": 0,
    "effortMaxWeeks": 0,
    "confidenceNote": "string",
    "riskScore": 0,
    "topRisks": ["string"],
    "suggestedSkills": ["string"],
    "suggestedSeniority": "string",
    "slaDeadlineAt": "ISO string"
  },
  "suggestedSquad": [
    { "id": "uuid", "name": "string", "role": "string", "seniority": "string", "matchedSkills": ["string"] }
  ],
  "decision": {
    "type": "GO | CONDITIONAL | RECYCLE | KILL",
    "deciderName": "string",
    "remediationNote": "string | null",
    "recycleReason": "string | null",
    "killReason": "string | null",
    "killTag": "string | null",
    "createdAt": "ISO string"
  },
  "brief": {
    "scopeMust": ["string"],
    "scopeShould": ["string"],
    "scopeCould": ["string"],
    "risksAndMitigation": [{ "risk": "string", "mitigation": "string" }],
    "recommendedContractModel": "string"
  }
}
```

`analysis`, `decision` e `brief` são `null` quando ainda não existem (na prática, `analysis`
sempre existe após o `POST`, já que a análise é síncrona). `brief` é **computado em runtime** a
partir de `analysis` + `decision` — não é uma tabela própria (ver 7.4).

### 6.4 `POST /api/discovery/leads/:id/decision`

Body (`DecideLeadDto`):

```json
{
  "type": "GO | CONDITIONAL | RECYCLE | KILL",
  "deciderName": "string, obrigatório",
  "remediationNote": "string, opcional — usado só se type=CONDITIONAL",
  "recycleReason": "string, opcional — usado só se type=RECYCLE",
  "killReason": "string, opcional — usado só se type=KILL",
  "killTag": "string, opcional — usado só se type=KILL; um dos 5 valores da seção 8.3"
}
```

Validação: 404 se o lead não existe; 400 se o lead ainda não tem `analysis` (não é possível
decidir sobre algo não analisado). Se já existe uma `Decision` para o lead, **sobrescreve**
(é só uma demo, sem necessidade de histórico de decisões).

Resposta `200` — `data`: `LeadDetail` atualizado (mesma shape de 6.3), com `status: "DECIDED"`.

## 7. Especificação dos componentes de negócio

### 7.1 Motor de severidade / SLA (determinístico — sempre roda, independe de LLM)

Implementado em `agent.service.ts`, função pura `computeSeverity(lead): 'S1' | 'S2' | 'S3'`
(candidata a TDD — é lógica de negócio pura e crítica):

- **S1** se QUALQUER um for verdadeiro:
  - `budget >= 300000`
  - `painPoint` OU `transcript` OU `mentionedStack` contém (case-insensitive) uma das palavras:
    `lgpd`, `saúde`, `financeiro`, `pci`, `banco`
  - `declaredDeadline` indica prazo agressivo — heurística simples: contém um número seguido de
    "semana(s)" com valor `< 4`, ou contém "dia(s)" (qualquer prazo em dias é tratado como
    agressivo)
- **S3** se TODOS forem verdadeiros: sem `budget` informado, nenhuma palavra de compliance
  encontrada, `declaredDeadline` vazio ou não casa com nenhum padrão de prazo reconhecido
- **S2**: caso contrário (default)

SLA (`slaDeadlineAt = now() + N horas`):

| Severidade | Horas |
|---|---|
| S1 | 24 |
| S2 | 72 |
| S3 | 120 (~5 dias úteis, aproximado) |

### 7.2 Agente IA (`agent.service.ts`)

Função `analyze(lead, severity): AnalysisResult` onde:

```ts
interface AnalysisResult {
  extractedNfrs: string[]
  effortMinWeeks: number
  effortMaxWeeks: number
  confidenceNote: string
  riskScore: number // 0-100
  topRisks: string[]
  suggestedSkills: string[]
  suggestedSeniority: string
}
```

**Fluxo:**
1. `severity` já vem calculada deterministicamente (7.1) — é passada para o prompt para manter
   consistência entre o que a tela mostra e o que o agente "sabe".
2. Se `ANTHROPIC_API_KEY` configurada (via `ConfigService`, **nunca** `process.env` direto — ver
   `back-end/CLAUDE.md`): chama `@anthropic-ai/sdk`, modelo `claude-opus-4-8`, chamada
   **não-streaming, sem `thinking`** (latência baixa é prioridade na demo), com
   `output_config: { format: { type: 'json_schema', schema: <schema do AnalysisResult> } }` —
   garante JSON válido sem parsing manual frágil. Timeout curto (`client.withOptions({ timeout: 8000 })`).
3. Em qualquer falha (sem key, timeout, erro de rede, schema inesperado): cai para
   `analyzeDeterministic(lead, severity)` — nunca lança erro para o controller.
4. `analyzeDeterministic` (candidata a TDD):
   - `extractedNfrs`: varre `painPoint` + `transcript` + `mentionedStack` por palavras-chave —
     `lgpd`, `sla`, `integração`, `legado`, `autenticação`, `multi-tenant`, `observabilidade`,
     `sap` (ou outro nome de sistema legado citado) — cada match vira uma entrada no array.
   - `effortMinWeeks`/`effortMaxWeeks`: base 4–8 semanas, +2 semanas de banda por palavra-chave
     de complexidade encontrada (mesma lista acima).
   - `riskScore`: soma de pontos por trigger presente (compliance +30, prazo agressivo +25,
     budget alto sem stakeholder técnico +20, stack desconhecida +15, sem decisor +10),
     capado em 100.
   - `topRisks`: as 3 frases correspondentes aos triggers que mais pontuaram.
   - `suggestedSkills`/`suggestedSeniority`: mapeamento fixo simples a partir de `mentionedStack`
     (ex.: stack menciona "React"/"Next" → front-end; "NestJS"/"Node" → back-end; presença de
     qualquer keyword de compliance → adicionar "Arquiteto" como skill sugerida).

**Prompt** (quando há API key): inclui os campos do lead + a severidade calculada + instrução
para extrair NFRs que o vendedor não mencionou explicitamente, estimar esforço em banda
(min/max, não ponto único), calcular risk score e sugerir skills/senioridade — pedindo
explicitamente o schema JSON acima via `output_config.format`.

### 7.3 Hub de alocação (`people.service.ts`)

`suggestSquad(analysis): SquadMember[]` (candidata a TDD — ranking puro):

1. Filtra `Person` com `available = true`.
2. Para cada pessoa, conta interseção entre `Person.skills` e `analysis.suggestedSkills`
   (`matchedSkills`).
3. Ordena por (a) nº de `matchedSkills` desc, (b) bônus se `Person.seniority` casa com
   `analysis.suggestedSeniority`.
4. Retorna os 3–5 primeiros.

Chamado dentro do `GET /leads/:id` (e do `POST /leads` inicial) — não precisa de endpoint
próprio.

### 7.4 Brief / handoff (computado em runtime, não persistido)

A partir de `lead` + `analysis` + `decision` (quando existir):

- `scopeMust`/`scopeShould`/`scopeCould`: derivados das `extractedNfrs` — NFRs ligadas a
  compliance/segurança vão para Must; NFRs de integração/performance vão para Should; o resto
  vai para Could. (Regra simples para a demo; pode ser refinada por quem pegar essa tarefa.)
- `risksAndMitigation`: um item por entrada de `topRisks`, com uma frase de mitigação genérica
  por categoria de risco (ex.: risco de prazo → "negociar prazo via discovery pago"; risco de
  stakeholder → "exigir indicação de stakeholder técnico antes do kickoff").
- `recommendedContractModel`, por severidade:
  - S1 → "Discovery pago abatível (8-15%) + Target Price com cap — deal estratégico, proteger
    margem e prazo."
  - S2 → "Discovery pago abatível + Target Price — modelo padrão recomendado."
  - S3 → "Discovery interno gratuito, fast-track — deal especulativo, sem necessidade de gate
    formal completo."

## 8. Especificação de telas (front-end)

Todas sob `front-end/src/app/(app)/discovery/...` (herdam `RequireAuth` + header do layout
`(app)`). Usar os componentes existentes de `components/ui/` — não criar componentes de UI
genéricos novos, só os específicos do domínio listados em `features/discovery/components/`.

### 8.1 `intake/page.tsx` — Demo A (início)

Formulário com os campos do `CreateLeadDto` (seção 6.1): `clientName`, `painPoint` (textarea),
`declaredDeadline`, `budget` (number), `mentionedStack`, `decisorName`, `transcript` (textarea
grande, para colar a call). Usa `Field`/`Input`/`Label`/`Button` existentes. No submit, chama
`useCreateLead()` e redireciona para `/discovery/[id]` (o id vem da resposta do `POST`).

### 8.2 `page.tsx` — painel de controle — Demo A (fim)

Lista de leads (`useLeads()` com `refetchInterval: 5000`) em `Card`s: `clientName`,
`SeverityBadge` (S1=vermelho/destructive, S2=âmbar, S3=cinza/`muted`, espelhando o padrão de
cores já usado em `(app)/account/page.tsx`), `SlaCountdown` (calculado no client a partir de
`slaDeadlineAt`), `decisionType` se já decidido. Clique navega para `/discovery/[id]`. Botão
"Novo lead" linka para `/discovery/intake`.

### 8.3 `[leadId]/page.tsx` — Demo B (análise) + Demo C (Deal Desk + Brief)

Três seções na mesma página, na ordem da narrativa do pitch (`useLead(id)`):

1. **Análise do agente** (Demo B) — `SeverityBadge`, lista de `extractedNfrs`, banda de esforço
   (`effortMinWeeks`–`effortMaxWeeks` semanas), `riskScore` + `topRisks`, `SquadList` com
   `suggestedSquad`.
2. **Deal Desk** (Demo C) — `SlaCountdown`, banner de fast-track se `severity === 'S3'`, e
   `DecisionPanel` com os 4 botões: **Go / Conditional / Recycle / Kill**. Isso é **fixo e
   obrigatório** — qualquer um dos 4 sempre persiste uma `Decision` com `type` + `deciderName`.

   Os campos extras de cada botão são **itens independentes e cortáveis** — confirmar no
   kickoff quais entram hoje (custo de incluir é baixo, mas listados separados para decisão
   explícita do time):
   - Conditional → campo `remediationNote`
   - Recycle → campo `recycleReason`
   - Kill → campo `killReason` + seleção de uma `killTag` entre as 5 da seção 2 ("Critérios de
     Kill")

   Se algum campo extra for cortado, o botão correspondente continua funcionando — só registra
   a decisão sem aquele campo.
3. **Brief de saída** — `BriefView` renderizando `brief.scopeMust/Should/Could`,
   `risksAndMitigation` e `recommendedContractModel`.

## 9. Divisão de tarefas e arquivos por pessoa

**Fase 1 — manhã (schema + scaffolding):**
- **Carlos Alberto + Carlos Henrique** — `back-end/prisma/schema.prisma` (seção 5, já
  rascunhado), `npm run prisma:migrate`, seed (`back-end/prisma/seed.ts`), scaffold do módulo
  `back-end/src/modules/discovery/` (DTOs + `discovery.module.ts` registrado em
  `src/app.module.ts`).
- **Pedro (IA)** — `agent.service.ts` completo (seção 7.1 + 7.2), incluindo a integração real
  com `@anthropic-ai/sdk` (adicionar a dependência, expor `ANTHROPIC_API_KEY` via
  `src/config/configuration.ts` + `.env.example`, nunca via `process.env` direto).
- **Ana Paula (PO)** — copy final das telas de Intake e nomes/labels exatos dos campos.
- **Moara (PO)** — regras de geração do Brief (seção 7.4) e o texto de cada modelo de contrato
  por severidade.
- **Céu (PO)** — roteiro das 3 demos + transcript anonimizado "deu errado" (seed do Lead de
  exemplo, seção 5).

**Fase 2 — tarde (build):**
- **Carlos Alberto** — `POST /discovery/leads`, `GET /discovery/leads` (seção 6.1, 6.2).
- **Carlos Henrique** — `GET /discovery/leads/:id`, `POST /discovery/leads/:id/decision`
  (seção 6.3, 6.4), incluindo `people.service.ts` (seção 7.3).
- **Igarzabal (FE Web)** — `[leadId]/page.tsx` completa (seção 8.3); confirmar no kickoff quais
  campos extras do Deal Desk entram hoje.
- **Paulo (FE)** — `intake/page.tsx` e `page.tsx` (painel de controle) (seção 8.1, 8.2).
- **Sophia (QA)** — testes Jest de `computeSeverity`, `analyzeDeterministic` e `suggestSquad`
  (as 3 funções puras das seções 7.1–7.3); checklist manual do agente contra os transcripts seed.

**Fase 3 — final:** Céu narra; time roda Demo A → B → C ponta a ponta via `make dev`.

## 10. Critérios de aceite (checklist por demo)

- [ ] `make dev` sobe back-end (`:3001`) e front-end (`:3000`) sem erro.
- [ ] **Demo A**: criar lead em `/discovery/intake` → aparece em `/discovery` com severidade,
      SLA e squad em até 5s (polling).
- [ ] **Demo B**: lead seed com transcript "deu errado" → NFR escondida aparece em
      "NFRs extraídas"; há banda de esforço e risk score.
- [ ] **Demo C**: os 4 botões de decisão funcionam, persistem (sobrevivem a refresh), e o Brief
      é gerado com o modelo de contrato correto para a severidade.
- [ ] `npm run lint` + `npm run build` passam em back-end e front-end (gate do `make verify`).
- [ ] `npm test` passa para `computeSeverity`, `analyzeDeterministic`, `suggestSquad`.
- [ ] **Sem `ANTHROPIC_API_KEY` configurada, o fluxo completo ainda funciona** (fallback
      determinístico) — crítico para não depender de internet/chave durante a apresentação.

## 11. Riscos e plano B

| Risco | Mitigação |
|---|---|
| Sem internet/API key no momento do pitch | Fallback determinístico (seção 7.2, passo 4) garante que a Demo B sempre tem conteúdo |
| Schema Prisma com enum quebrando em SQLite | Usar `String` + `@IsIn` no DTO, não `enum` do Prisma (já refletido na seção 5) |
| Tempo curto para os campos extras do Deal Desk | São cortáveis individualmente (seção 8.3) sem quebrar os 4 botões |
| Squad mockada não convencer no pitch | Seed de `Person` deve ter nomes/skills plausíveis (ver Fase 1, Carlos Alberto/Henrique) |
