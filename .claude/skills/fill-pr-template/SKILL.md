---
name: fill-pr-template
description: Analyze the current branch's diff against its base branch and auto-fill `.github/PULL_REQUEST_TEMPLATE.md` in pt-BR for the user to review before opening the PR. Use whenever the user asks to fill, write, generate, or draft a PR description / pull request body / PR template, or asks to "summarize the diff into a PR", even when they don't mention the template by name.
---

# Fill PR Template

Take the changes on the current branch (vs. its base branch) and produce a filled-in version of `.github/PULL_REQUEST_TEMPLATE.md` written in **pt-BR**, ready for the developer to paste into GitHub. Surface it for review — do **not** open the PR.

This is a monorepo with `back-end/` (NestJS) and `front-end/` (Next.js) sub-trees, plus shared root files. Sections of the filled template should reflect that when relevant (e.g. backend module names, frontend route/component names).

## Workflow

1. **Inspect state in parallel** — run these in a single tool batch:
   - `git status --short` — see if there are uncommitted changes the user might also want included.
   - `git rev-parse --abbrev-ref HEAD` — current branch name.
   - `git remote show origin | sed -n '/HEAD branch/s/.*: //p'` — discover the default base branch (usually `main`). Fall back to `main` if this fails.
   - `git log --pretty=format:'%s' <base>..HEAD` — commit subjects on this branch (good source of intent).
   - `git diff --stat <base>...HEAD` — file-level overview.
   - `git diff <base>...HEAD` — full diff to ground the summary.

   If the current branch *is* the base branch (e.g. `main`), stop and tell the user there's nothing to compare — ask which branch / base to diff against.

2. **Decide the scope of the summary.**
   - The PR body should describe the merged-branch diff (`<base>...HEAD`), not just the latest commit.
   - If there are uncommitted changes (`git status` not clean), tell the user they exist and ask whether to include them in the description or commit them first. Don't silently mix them in.

3. **Read the template.** Open `.github/PULL_REQUEST_TEMPLATE.md` and reuse its exact section headings and checkbox options. Do not invent new sections, drop sections, or translate the headings — the goal is a drop-in body for GitHub.

4. **Fill each section in pt-BR.**

   - **O que este PR faz?** — 1–2 frases sobre a motivação e o efeito visível. Foque no *porquê*, não no *o quê*.
   - **O que foi feito?** — 3–6 bullets curtos com as principais mudanças. Agrupe por intenção (ex: "adiciona endpoint X", "atualiza schema do Prisma para Y"), não arquivo por arquivo.
   - **Arquivos alterados** — liste só os arquivos / módulos que ajudam o revisor a se orientar. Para diffs grandes, agrupe por área (ex: `back-end/src/auth/*`, `front-end/src/app/login/*`). Nunca cole o `git diff --stat` cru.
   - **Breaking changes?** — marque `Não` por padrão. Marque `Sim` somente se o diff realmente quebrar consumidores: mudança de contrato de API pública, remoção/renomeação de campo retornado, mudança de migration destrutiva, mudança de variável de ambiente obrigatória, bump major de dependência exposta, etc. Se marcar `Sim`, descreva o impacto e como migrar.
   - **Testes** — marque com base em evidência do diff:
     - Se há arquivos `*.spec.ts` / `*.e2e-spec.ts` / `*.test.ts(x)` adicionados ou alterados, marque "Adicionei / atualizei testes".
     - Sempre marque "Todos os testes estão passando localmente" como **não confirmado** — peça ao usuário para confirmar (ex: deixe `[ ]` e adicione um comentário "confirmar antes de abrir o PR"). Não invente que rodou os testes.
     - Se a mudança não exige testes (ex: docs, ajuste de README, config trivial), marque "Não se aplica" e explique brevemente.

5. **Tom e estilo (pt-BR).**
   - Escreva em português do Brasil, tom técnico e direto, sem floreio.
   - Frases curtas. Verbos no presente do indicativo ("adiciona", "corrige", "remove"), não no infinitivo nem no passado.
   - Não traduza nomes próprios de código (classes, funções, arquivos, libs) — `UserService`, `prisma`, `Next.js` ficam como estão.
   - Não invente contexto que não está no diff ou nos commits. Se algo é incerto, peça ao usuário em vez de chutar.

6. **Apresente o resultado** ao usuário em um único bloco markdown cercado por crases triplas, mantendo as seções do template. Em seguida, liste em uma linha:
   - a branch atual e a branch base usadas;
   - se há mudanças não commitadas que ficaram de fora;
   - quaisquer pontos que precisam de confirmação humana (ex: "confirme se os testes passam localmente").

   **Não** abra o PR, **não** faça push, **não** rode `gh pr create`. A skill termina entregando o texto pronto.

## Format

A saída deve ter exatamente as seções do template, nesta ordem e com estes títulos:

```
## O que este PR faz?
## O que foi feito?
## Arquivos alterados
## Breaking changes?
## Testes
```

Mantenha os checkboxes (`- [ ]` / `- [x]`) do template — só altere o estado quando houver evidência clara no diff.

## Examples

**Exemplo 1 — feature de back-end com testes**

Branch `feat/password-reset` vs `main`. Diff: novo endpoint `POST /auth/password-reset` em `back-end/src/auth/`, migration Prisma para tabela `password_reset_token`, specs novas em `auth.service.spec.ts`.

```
## O que este PR faz?

Adiciona o fluxo de recuperação de senha por e-mail, permitindo que o usuário solicite um token de uso único e troque por uma nova senha.

## O que foi feito?

- Adiciona endpoint `POST /auth/password-reset` para solicitar o token
- Adiciona endpoint `POST /auth/password-reset/confirm` para trocar a senha
- Cria a tabela `password_reset_token` com expiração de 30 minutos
- Cobre o `AuthService` com testes unitários para os dois fluxos

## Arquivos alterados

- `back-end/src/auth/auth.controller.ts`
- `back-end/src/auth/auth.service.ts`
- `back-end/src/auth/dto/*`
- `back-end/prisma/schema.prisma` + nova migration
- `back-end/src/auth/auth.service.spec.ts`

## Breaking changes?

- [x] Não
- [ ] Sim — descreva abaixo o impacto e como migrar:

## Testes

- [ ] Todos os testes estão passando localmente <!-- confirmar antes de abrir o PR -->
- [x] Adicionei / atualizei testes para esta mudança
- [ ] Não se aplica (explicar abaixo):
```

**Exemplo 2 — fix pequeno de front-end, sem testes**

Branch `fix/modal-aria` vs `main`. Diff: 1 linha em `front-end/src/components/Modal.tsx` corrigindo o `aria-label`.

```
## O que este PR faz?

Corrige o `aria-label` do botão de fechar do `Modal`, que estava em inglês e quebrava a leitura em PT-BR por leitores de tela.

## O que foi feito?

- Ajusta o `aria-label` do botão de fechar do `Modal` para "Fechar"

## Arquivos alterados

- `front-end/src/components/Modal.tsx`

## Breaking changes?

- [x] Não
- [ ] Sim — descreva abaixo o impacto e como migrar:

## Testes

- [ ] Todos os testes estão passando localmente <!-- confirmar antes de abrir o PR -->
- [ ] Adicionei / atualizei testes para esta mudança
- [x] Não se aplica (explicar abaixo): correção de string de acessibilidade, sem lógica nova.
```

**Exemplo 3 — breaking change de API**

```
## O que este PR faz?

Padroniza a serialização de datas da API REST pública para ISO 8601, removendo o formato unix epoch que ainda era retornado em alguns endpoints.

## O que foi feito?

- Substitui o serializer dos campos `*_at` por ISO 8601 em todos os controllers
- Atualiza o front-end para parsear ambos os formatos durante a transição
- Atualiza o Swagger para refletir o novo contrato

## Arquivos alterados

- `back-end/src/common/serializers/*`
- `back-end/src/**/dto/*`
- `front-end/src/lib/api/parse-dates.ts`

## Breaking changes?

- [ ] Não
- [x] Sim — descreva abaixo o impacto e como migrar:

Consumidores externos que esperavam `*_at` como número (epoch em segundos) precisam atualizar o parser para ISO 8601 (`new Date(value)` em JS, `datetime.fromisoformat` em Python). O front-end já trata ambos os formatos.

## Testes

- [ ] Todos os testes estão passando localmente <!-- confirmar antes de abrir o PR -->
- [x] Adicionei / atualizei testes para esta mudança
- [ ] Não se aplica (explicar abaixo):
```

## Safety

- Não rode `gh pr create`, `git push`, `git commit` ou qualquer comando que altere estado remoto. Esta skill só lê e produz texto.
- Não inclua secrets que apareçam no diff (chaves, tokens, senhas, `.env`). Se aparecerem, pare e avise o usuário antes de imprimir o resumo.
- Não invente que os testes passam — sempre deixe a confirmação dos testes locais para o usuário.
- Não traduza títulos / checkboxes do template. O template é a fonte da verdade; espelhe-o.

## When to push back

- **Branch idêntica à base.** `git diff <base>...HEAD` vazio: avise que não há nada para descrever e pergunte se a branch correta foi escolhida.
- **Diff gigante e heterogêneo.** Se o PR tem dezenas de áreas não relacionadas, sugira dividir em PRs menores antes de escrever a descrição — uma descrição honesta de um PR confuso continua sendo um PR confuso.
- **Mudanças não commitadas relevantes.** Se `git status` mostra alterações locais que parecem fazer parte do PR, pergunte se devem ser commitadas antes (e ofereça invocar a skill `conventional-commit`).
- **Template ausente.** Se `.github/PULL_REQUEST_TEMPLATE.md` não existe, avise o usuário e ofereça criá-lo antes de seguir.
