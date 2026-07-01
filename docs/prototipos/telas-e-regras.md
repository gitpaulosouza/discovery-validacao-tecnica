# Telas e regras - Discovery e validação técnica

> Documento de produto das telas prototipadas do módulo de Discovery.
> Descreve **o que cada tela tem** e **as regras das funcionalidades**, do ponto de
> vista de produto (o "o quê" e o "porquê"). O "como construir" técnico vive em
> [`discovery-module.md`](../discovery-module.md).

## Os protótipos

Duas telas navegáveis (HTML autocontido, abrem direto no navegador, sem instalar nada):

| Tela | Arquivo | O que é |
|---|---|---|
| Formulário de Intake | [`formulario-intake.html`](./formulario-intake.html) | Construtor editável do formulário: dá pra ligar/desligar, editar rótulo e remover cada pergunta, com preview ao vivo do que o Comercial veria. |
| Painel de Análise | [`painel-analise.html`](./painel-analise.html) | A tela onde o agente entrega a análise e a pessoa valida/edita antes de decidir. |

> São **protótipos de validação de fluxo**, não a aplicação final. As respostas do
> agente e do chat são roteirizadas para demonstrar o comportamento.

---

## Tela 1 - Formulário de Intake

**Objetivo:** capturar um lead novo com o mínimo de atrito para o Comercial.
**Quem usa:** time Comercial, no momento em que um lead chega.

**Princípio central:** existe uma tensão entre "a squad precisa de muita informação"
e "o formulário precisa ser rápido de preencher". A resposta não é enfileirar 20
perguntas técnicas, e sim separar:

- **Campo estruturado:** só o que exclusivamente o Comercial sabe (dado comercial que
  não está na call).
- **Texto livre (dor + transcript + anexos):** tudo que a squad precisa mas que o
  agente consegue extrair sozinho.

### Campos estruturados (Comercial preenche)

| Rótulo | Campo | Tipo | Obrigatório | Por que importa |
|---|---|---|---|---|
| Cliente | `clientName` | texto | Sim | Identifica o lead no painel |
| Dor / pedido do cliente | `painPoint` | texto longo | Sim | Insumo principal da análise; varrido por palavras de compliance |
| Prazo que o cliente pediu | `declaredDeadline` | texto | Não | Expectativa do cliente (não é estimativa). Alimenta o gatilho de prazo agressivo |
| Orçamento (R$) | `budget` | número | Não | >= R$ 300k dispara severidade S1 |
| Stack mencionada | `mentionedStack` | texto | Não | Sugere skills e squad |
| Decisor | `decisorName` | texto | Não | Ausência soma risco |
| O que já foi prometido ao cliente | `alreadyPromised` | texto longo | Não | **Crítico**: causa raiz do problema (o que o Comercial já comprometeu antes do discovery). Sem isso o sistema não ataca o problema central |
| Setor do cliente | `clientSector` | texto | Não | Alimenta risco de compliance |
| Cliente recorrente? | `isReturningClient` | sim/não | Não | Afeta risco e confiança |

### Texto livre e anexos (insumo do agente)

- **Transcript da call** (`transcript`): onde o agente encontra requisitos que o
  vendedor não perguntou (é a base da "NFR escondida").
- **Anexos** (`attachments`): apresentação comercial, proposta, RFP, documentos
  técnicos. Material extra que o agente pode ler.

### O que NÃO vira pergunta (o agente extrai)

Fica de fora do formulário de propósito, porque o agente puxa da dor/transcript:
integrações, NFRs (SLA, volume, segurança), compliance, stakeholder técnico do cliente,
prioridades Must/Should/Could, marcos fixos, plataformas alvo, design system,
greenfield vs legado, critério de sucesso, economic buyer.

### Regras da tela

1. Só **2 campos são obrigatórios** (`clientName` e `painPoint`). O resto é "preencha
   se souber" - quanto mais, melhor a análise, mas o sistema funciona com o mínimo.
2. No submit, o lead é criado e a **análise dispara na hora** (síncrona). A pessoa é
   levada direto para o Painel de Análise.
3. A distinção "prazo que o cliente pediu" (input) vs "esforço estimado" (output do
   agente) precisa ficar clara no rótulo, para o Comercial não confundir.

---

## Tela 2 - Painel de Análise

**Objetivo:** o agente entrega uma análise inicial completa e a pessoa **valida ou
edita** antes de decidir. A pessoa não preenche do zero.
**Quem usa:** quem analisa o lead (Tech Lead / PO / aprovador, conforme roteamento).

**Conceito central (aparece na tela inteira):** cada recomendação vem com o selo
**"Sugerido pelo agente"**. Ao editar qualquer campo, o selo vira **"Editado por você"**.
Isso deixa visível o que é sugestão da IA e o que foi validado por humano.

### 01 - Formulário enviado pelo Comercial

Bloco só-leitura com tudo que chegou no Intake. Serve para o analista **conferir a
análise do agente contra a resposta original**. Pode ser recolhido.

### 02 - Recomendação do agente (editável)

Tudo abaixo é pré-preenchido pelo agente e editável:

- **Severidade** (S1/S2/S3): trocar recalcula SLA, roteamento e prazo de retorno.
- **NFRs extraídas**: lista editável (add/remover). A NFR "escondida na call" vem
  destacada em vermelho.
- **Banda de esforço**: min a max semanas (banda, nunca ponto único).
- **Risco**: score 0-100 com barra + lista de top risks, ambos editáveis.
- **Squad de execução sugerida**: quem tocaria a entrega (não confundir com aprovador).

### 03 - Escopo por funcionalidade (go/no-go)

O agente quebra o pedido em funcionalidades. Cada uma tem:

- Botões **Go / No-go** (o agente já sugere; a pessoa ajusta).
- **Campo de anotação** para justificar a escolha (fica registrado).
- Só as marcadas **go** entram na proposta.

### 04 - Roteamento

Mostra para quem a análise vai, definido pela severidade (é sugestão, não trava por
permissão hoje):

| Severidade | Roteado para | Modo |
|---|---|---|
| S1 | Comitê de Arquitetura + Head de Delivery | Bloqueante |
| S2 | Tech Lead da conta | Bloqueante |
| S3 | Fast-track (revisão consultiva) | Consultivo (não trava) |

### 05 - Deal Desk (decisão do lead)

Decisão final do lead inteiro (além do go/no-go por funcionalidade). Sempre humana.
Quatro botões, sempre registram uma decisão com tipo + decisor:

- **Go** - seguir.
- **Conditional** - seguir com ressalva (campo de condição).
- **Recycle** - voltar para reanálise (campo de motivo).
- **Kill** - encerrar (campo de motivo + um dos 5 critérios de kill).

### 06 - Proposta (dois documentos gerados)

Montados a partir da análise e das funcionalidades marcadas go. Regeneram sozinhos
quando muda severidade, escopo ou esforço:

- **Brief interno (Definition of Ready)**: escopo aprovado com justificativas,
  fora-de-escopo, esforço, riscos, roteamento e modelo de contrato. Uso interno.
- **Proposta comercial (cliente)**: entendimento, escopo proposto, prazo, forma de
  trabalho e próximos passos com data de retorno. Sem risco interno nem critério de kill.

### Aviso de retorno ao cliente

Faixa no topo com "Retorno ao cliente até <data>", que o agente calcula a partir da
severidade. É o compromisso a comunicar ao cliente sobre quando o time volta com um
posicionamento. Tem botão para copiar o aviso pronto.

### Chat com o agente

Botão "Perguntar ao agente" abre um assistente onde o analista confere o raciocínio
das recomendações (por que a severidade, de onde veio a NFR, como calculou o risco,
por que o no-go de uma funcionalidade) e compara com projetos passados parecidos.

---

## Regras de negócio transversais

### Motor de severidade (determinístico)

- **S1** se QUALQUER um for verdadeiro:
  - orçamento >= R$ 300.000;
  - dor, transcript ou stack contém palavra de compliance (`lgpd`, `saúde`,
    `financeiro`, `pci`, `banco`);
  - prazo agressivo (menos de 4 semanas, ou qualquer prazo em dias).
- **S3** se TODOS: sem orçamento, sem palavra de compliance, sem prazo reconhecido.
- **S2**: qualquer outro caso (default).

### SLA por severidade

| Severidade | Prazo |
|---|---|
| S1 | 24h |
| S2 | 72h |
| S3 | 120h (~5 dias úteis) |

Hoje o prazo de decisão interno e o prazo de retorno ao cliente usam o mesmo valor.
Decisão em aberto: o retorno ao cliente pode ser maior que a decisão interna.

### Modelo de contrato recomendado por severidade

- **S1**: Discovery pago abatível (8-15%) + Target Price com cap. Deal estratégico.
- **S2**: Discovery pago abatível + Target Price. Modelo padrão.
- **S3**: Discovery interno gratuito, fast-track. Deal especulativo.

### Critérios de kill (exemplo, os 5 da proposta)

Sem stakeholder técnico do cliente; prazo tecnicamente inviável; escopo indefinido
demais; orçamento incompatível com o escopo; fora da competência técnica atual.
A decisão final de kill é sempre humana.

---

## MVP de hoje vs próximo passo

Nem tudo que está nos protótipos cabe no escopo do dia. Separação para decisão do time:

| Funcionalidade | Hoje (MVP) | Próximo passo |
|---|---|---|
| Formulário de Intake | Sim | - |
| Severidade + SLA determinísticos | Sim | - |
| Análise do agente (com fallback) | Sim | - |
| Recomendação editável (validar/editar) | Sim | - |
| Roteamento por severidade | Sim (sugestão) | RBAC real (papéis/permissões) |
| Deal Desk (4 botões) | Sim | - |
| Aviso de retorno ao cliente | Sim (aviso na tela) | Notificação real (e-mail/Slack) |
| Go/no-go por funcionalidade + anotação | A confirmar | Model próprio no banco |
| Proposta comercial (cliente) | A confirmar | - |
| Chat sobre a análise | A confirmar | Base de projetos passados (para comparação real) |
| Anexos (upload) | A confirmar | Persistência real do arquivo |

> Campos "A confirmar" surgiram no protótipo e ainda não estão na spec técnica de hoje
> ([`discovery-module.md`](../discovery-module.md)). Precisam de decisão explícita do
> time antes de virar schema/código.
