# Security Gate (Trivy)

Pipeline de verificação de vulnerabilidades nas dependências (libs) do
**back-end** e do **front-end**. Escaneia os `package-lock.json` contra os
bancos de advisories agregados pelo [Trivy](https://trivy.dev) (GHSA + OSV +
NVD/CVE) e, para cada lib vulnerável, diz **para qual versão atualizar** no
`package.json`.

É *free* e sem conta/token — combina com a filosofia "100% local" do template.

## O que entrega

- **Scan** das dependências de produção dos dois subprojetos (dev deps ficam de
  fora por padrão — menos ruído; veja "Ajustes" para incluí-las).
- **Relatório acionável**: lib · versão instalada · severidade · versão de
  correção · se é dependência **direta** (atualize no `package.json`) ou
  **transitiva** (fixe via `overrides`).
- **Gate**: falha (exit 1) quando há vulnerabilidade no threshold ou acima
  (padrão `HIGH`). É isso que bloqueia o merge no CI.

## Rodando localmente

```bash
make security
```

Pré-requisito: o binário do Trivy. O script procura, nesta ordem,
`$TRIVY_BIN` → `trivy` no PATH → `./bin/trivy`. Se não achar, ele **não instala
nada** — só mostra como instalar:

```bash
# binário local, sem sudo, em ./bin (já no .gitignore)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
  | sh -s -- -b ./bin

# ou via gerenciador
brew install trivy          # macOS
sudo apt-get install trivy  # Debian/Ubuntu
scoop install trivy         # Windows
```

> O primeiro `make security` baixa o banco de vulnerabilidades do Trivy
> (~alguns segundos) e o mantém em cache; as execuções seguintes são rápidas.

### Mudando o rigor do gate

```bash
SECURITY_THRESHOLD=CRITICAL make security   # só bloqueia em CRITICAL
SECURITY_THRESHOLD=MEDIUM   make security   # mais rígido
```

Valores: `LOW` | `MEDIUM` | `HIGH` (padrão) | `CRITICAL`.

## Como ler o relatório

Exemplo real, rodando `make security` neste projeto:

```
═══ Security Gate (Trivy) ═══
threshold de bloqueio: HIGH ou superior

▸ back-end
  HIGH     multer@2.1.1   →  2.2.0    (transitive, 2 CVE)
  MEDIUM   js-yaml@4.1.1  →  4.2.0    (transitive, 1 CVE)
  MEDIUM   qs@6.15.1      →  6.15.2   (transitive, 1 CVE)

▸ front-end
  HIGH     next@15.5.15   →  15.5.18  (direct, 13 CVE)
  HIGH     hono@4.12.16   →  4.12.25  (transitive, 12 CVE)
  MEDIUM   postcss@8.4.31 →  8.5.10   (direct, 1 CVE)
  ...

─── Como corrigir (package.json) ───
Dependências diretas — atualize a versão:
  [front-end] next: atualizar para "^15.5.18" (atual 15.5.15)
  [front-end] postcss: atualizar para "^8.5.10" (atual 8.4.31)

Dependências transitivas — fixe via "overrides":
  [back-end] adicione ao package.json:
    { "overrides": { "multer": ">=2.2.0", "js-yaml": ">=4.2.0", "qs": ">=6.15.2" } }

─── Resumo ───
  vulnerabilidades encontradas: 12
  no/acima do threshold (HIGH): 4

✗ Security Gate FALHOU — 4 vulnerabilidade(s) >= HIGH
```

A seção **"Como corrigir"** sugere, para cada lib, **a versão exata** a usar:

- **direct, faixa já cobre o fix** → a versão declarada (ex: `"^15.0.0"`) já
  permite a versão corrigida; basta atualizar o lockfile:
  `cd <proj> && npm update <lib>` (opcionalmente travar o piso em `"^<fix>"`).
- **direct, faixa não cobre** → o relatório mostra `"<faixa atual>" → "^<fix>"`;
  altere a linha no `package.json` e rode `npm install`.
- **transitive** → veio por outra dependência. O relatório já entrega o bloco
  [`overrides`](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
  pronto para forçar a versão corrigida.
- **no fix available** → ainda não há versão corrigida; avalie o risco, troque
  de lib ou acompanhe o advisory.

Quando uma lib tem vários CVEs, a ferramenta consolida na **maior** versão de
correção, para um único bump resolver todos.

## Relatório detalhado (por CVE)

Por padrão o `make security` também imprime uma seção **"Detalhes das
vulnerabilidades"**, com, para cada CVE: severidade, **CVSS**, **CWE**, título,
**descrição** do que é a falha, data de publicação, versão de correção e link
para o advisory:

```
▸ front-end
  fast-uri@3.1.0 (transitive) — corrigir em: 3.1.2
    • [HIGH CVSS 7.5] CVE-2026-6322 CWE-436
      fast-uri: URI authority bypass due to improper delimiter handling
      fix 3.1.2 · publicado 2026-05-05
      https://avd.aquasec.com/nvd/cve-2026-6322
```

- Desativar a seção detalhada no console: `SECURITY_DETAILED=0 make security`.

## Documento gerado localmente

A cada `make security` é gerado **`.security/report.md`** — o relatório completo
(metadados + tabela por subprojeto + `<details>` com todos os CVEs + seção
"Como corrigir"). É gitignored (artefato regenerado a cada run).

O documento é **descritivo e auto-explicativo**: abre com um banner de
status, uma legenda (📖 *Como ler este relatório*) que explica severidade /
CVSS / CWE / escopo, e para cada CVE traz o **texto completo do advisory**
(Summary / Details / Impact), a **fraqueza (CWE)** com link para o MITRE e as
**referências** oficiais — além da seção final "Como corrigir".

### Por que Markdown (e não `.txt` ou `.json`)?

| Formato | Veredito |
| --- | --- |
| **`.md`** ✅ | **Escolhido.** Legível como texto puro no terminal **e** renderiza tabelas, links clicáveis e seções colapsáveis no editor/GitHub. Pronto pra colar numa PR/issue. Equilíbrio ideal humano × estrutura. |
| `.txt` | Legível, mas sem links, tabelas ou hierarquia — perde os CVSS/CWE/URLs na leitura. |
| `.json` | Ótimo para máquina, ruim para humano ler. **Já existe**: o JSON cru do Trivy fica em `back-end/.security/trivy-report.json` e `front-end/.security/trivy-report.json` para automação/diff. |

Ou seja: **`.md` para humanos** (o documento), **`.json` para máquinas** (já
disponível). Não há ganho em manter um `.txt`.

## No CI (Security Gate)

`.github/workflows/security-gate.yml` roda em `push`/`pull_request` na `main`,
semanalmente (cron) e sob demanda. Para cada subprojeto:

1. **Scan** — `aquasecurity/trivy-action` gera o JSON cru (sem falhar aqui).
2. **Gate** — o **mesmo** parser do `make security`
   (`scripts/lib/security-report.mjs`) processa o JSON, aplica o threshold e
   **falha o job** (exit 1) em HIGH/CRITICAL. Lógica idêntica local e no CI.

Quando o gate **falha**, o relatório é apresentado de forma descritiva em três
lugares:

- **Job Summary** — relatório completo (tabela + CVEs + como corrigir), sempre.
- **Anotação de erro** — `::error::` no topo do run apontando para os detalhes.
- **Comentário na Pull Request** — o `report-<proj>.md` é postado/atualizado na
  PR (sticky por subprojeto), com CVEs e as versões a atualizar.

Além disso, o resultado vai para a aba **Security → Code scanning** via **SARIF**
(roda sempre, não falha o job).

## Ajustes

- **Incluir devDependencies**: adicione `--include-dev-deps` à chamada do
  `trivy fs` em `scripts/security-scan.sh` (e no workflow).
- **Ignorar um CVE específico** (com justificativa): crie um `.trivyignore` na
  raiz com o `CVE-...`/`GHSA-...` por linha.
- **Trocar a engine depois**: o gate é isolado em `scripts/security-scan.*` +
  o parser `scripts/lib/security-report.mjs`. Dá para plugar Snyk/OSV-Scanner
  sem mexer no resto.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `scripts/security-scan.sh` / `.ps1` | orquestra o Trivy nos dois subprojetos |
| `scripts/lib/security-report.mjs` | parseia o JSON, monta o relatório (resumo + detalhado + markdown) e aplica o gate |
| `.github/workflows/security-gate.yml` | Security Gate no CI |
| `.security/report.md` | relatório Markdown detalhado gerado a cada run (gitignored) |
| `make security` | atalho local |
