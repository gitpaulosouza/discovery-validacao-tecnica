# Product

## Register

product

## Users

Times internos da Loomi no fluxo de pré-venda:

- **Comercial** — preenche o Intake quando um lead chega; quer registrar o lead
  rápido e ver severidade, SLA e squad sugerida sem fricção.
- **Tech / Arquitetura** — lê a análise do agente (NFRs extraídas, esforço, risco)
  para validar viabilidade técnica antes do compromisso comercial.
- **Decider** — usa o Deal Desk para registrar a decisão go/no-go
  (Go / Conditional / Recycle / Kill) e gerar o Brief de handoff.

Contexto de uso: desktop, durante o dia de trabalho, sob pressão de tempo
(há SLA correndo). A tarefa é sempre concreta: cadastrar um lead, ler uma
análise, ou tomar/registrar uma decisão.

## Product Purpose

Módulo de **Discovery e validação técnica** ("pré-venda inteligente") que evita
a Loomi vender projetos sem validação — prazos inviáveis, escopos vagos,
compliance ignorado. Liga Comercial e Tech num único fluxo:
**Intake → Agente IA → Roteamento → Deal Desk → Handoff**.

Sucesso = o lead certo chega ao decisor certo com severidade, risco e squad já
calculados, e a decisão fica registrada com um Brief acionável. Hoje é o MVP de
hackathon (dados mockados, Claude com fallback determinístico); em produção
seria plugin do Loomi OS.

## Brand Personality

**Confiável, técnico, ágil.** Voz de ferramenta interna séria — confiança de
especialista, não marketing. Mostra o que estava escondido (a NFR que o vendedor
não viu) com clareza, sem dramatizar. Tom direto, em pt-BR, orientado à decisão.
Carrega a identidade Loomi (roxo `#5b2dc4`) com sobriedade: cor de marca como
sinal, não como ruído.

## Anti-references

- **SaaS-cream / AI slop** — sem fundos bege/creme, sem eyebrows tracked em toda
  seção, sem hero-metric template, sem grades de cards idênticos. (Ver bans no
  guia do impeccable.)
- **Landing chamativa** — sem gradientes decorativos, sem animações grandes, sem
  copy de marketing. É ferramenta de trabalho, não peça de venda.
- **CRM genérico / Jira** — evitar cinza-sobre-cinza sem hierarquia; densidade
  serve a tarefa, não a imita por inércia corporativa.

## Design Principles

1. **Mostrar o que estava escondido.** O valor do produto é expor risco/NFR que
   passariam batido. A UI dá destaque ao insight do agente, não o enterra.
2. **A severidade guia a hierarquia.** S1/S2/S3 e o SLA são o eixo visual de cada
   tela — o usuário sabe em 1 segundo o que é urgente.
3. **Decisão sem fricção.** Os 4 botões do Deal Desk são sempre claros e
   acessíveis; registrar uma decisão é o caminho mais curto da tela.
4. **Confiança de especialista.** Densidade de informação a serviço da tarefa,
   com clareza — nunca ruído. Cada número vem com contexto (banda de esforço,
   nota de confiança), não como certeza falsa.
5. **Identidade Loomi sóbria.** Roxo de marca como acento de sinal e foco, sobre
   base neutra. Cor significa algo (severidade, estado), não enfeita.

## Accessibility & Inclusion

WCAG 2.1 **AA**. Contraste de corpo ≥ 4.5:1 (atenção aos badges de severidade e
texto muted sobre tinta). Foco visível e navegação por teclado em formulários e
nos botões de decisão. `prefers-reduced-motion` respeitado em qualquer animação.
Cor nunca é o único portador de significado — severidade e estado sempre têm
rótulo textual além da cor.
