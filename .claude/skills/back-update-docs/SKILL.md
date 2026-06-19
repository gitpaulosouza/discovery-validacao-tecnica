---
name: back-update-docs
description: Update README.md and add or revise documentation pages under /docs to reflect significant changes — new features, new modules, new integrations, breaking config changes, or new workflows. Use when the user asks to update docs, document a feature, write a how-to, or after work that changes how someone runs, configures, or extends the project.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# update-docs

Use this skill when documentation should change to match the code. Only document things that are **significant** — things a teammate would want to know that they couldn't easily get from `--help` or by reading one file. Documentation that just restates the code is worse than no documentation, because it goes stale.

## When to update what

| Change type                                       | Where it goes                                            |
| ------------------------------------------------- | -------------------------------------------------------- |
| New top-level capability or feature module        | New section in `README.md` (brief) + `docs/<feature>.md` |
| New env var or config knob                        | `README.md` (env table) + `.env.example`                 |
| New workflow / npm script                         | `README.md` (workflows table)                            |
| Third-party integration                           | `docs/integrations/<vendor-or-capability>.md`            |
| Architecture / design decision                    | `docs/architecture/<topic>.md`                           |
| Migration / breaking change for repo users        | `docs/migrations/<date>-<topic>.md` + `README.md` notice |
| New testing pattern or convention                 | `docs/testing.md`                                        |
| Anything that's just code-level documentation     | Code comments / Swagger / `CLAUDE.md` — **not** docs/    |

If `/docs` does not yet exist, create it the first time it's needed. Don't pre-create empty subfolders.

## What goes in README.md

The README is for someone who just cloned the repo. Optimize for **getting the project running** and **finding out what's here**. Keep these sections, in roughly this order:

1. One-paragraph project description.
2. Stack / versions (Node, NestJS, Prisma, SQLite).
3. Setup: clone → `npm install` → `.env` → `npm run prisma:migrate` → `npm run start:dev`.
4. Workflows table — npm scripts users will actually run.
5. Project structure — short. Defer the deep version to `CLAUDE.md`.
6. Env vars table — name, required/optional, default, what it does.
7. API docs — point to `/api/docs` (Swagger) and any base URL conventions.
8. Testing — how to run unit + e2e.
9. Pointers to `docs/` for deeper topics.

**Don't** duplicate `CLAUDE.md` in the README. `CLAUDE.md` is for agents and goes deep into conventions; `README.md` is for humans and stays shallow + actionable. Cross-link between them.

## What goes in /docs

Each page is its own concern. Suggested skeleton:

```
docs/
├── architecture/        # the "why" — design decisions, module boundaries, request lifecycle
├── integrations/        # one page per third-party service (env, error semantics, swap procedure)
├── migrations/          # dated migration / breaking-change notes
├── operations/          # deploy, observability, runbooks (only when relevant)
└── testing.md           # patterns, fixtures, when to use unit vs e2e
```

## Page template — `docs/<topic>.md`

```markdown
# <Topic>

> One-sentence purpose: what this page exists to answer.

## Context

Why this exists. The problem it solves or the thing it explains. 1–3 short paragraphs.

## How it works

The key concepts a reader needs to act. Diagrams as ASCII or Mermaid only when they earn their keep.

## How to <do the thing>

Concrete steps. Code samples small and runnable. Reference real files in the repo with paths (e.g. `src/modules/users/users.service.ts`).

## Gotchas

The things that bit us. Be specific.

## Related

Links to other docs, code, or external references. No dead links.
```

## Style rules

- **Be specific**, not aspirational. If something is half-built, say so. Don't promise behavior the code doesn't have.
- **Link to source**, not screenshots of source. File paths render as plain text and survive renames better than line numbers — include both when stable.
- **Tables for matrices** (env vars, scripts, levels). Prose for narrative.
- **No marketing tone.** No "robust, scalable, modern" filler. State the facts.
- **No emojis** unless the user explicitly wants them.
- **Keep examples runnable.** If you show a curl command, show a real route. If you show a TS snippet, make sure it would compile against the codebase.
- **Date migration / breaking pages** in the filename: `docs/migrations/2026-05-05-rename-user-id.md`. Today is `2026-05-05`.

## Workflow when invoked

1. Identify what changed and **why a future reader would need to know**. If you can't answer that, push back: maybe a code comment or `CLAUDE.md` update is enough and a doc page is overkill.
2. Decide README-only, docs-only, or both, using the table above.
3. For README edits: keep the existing section structure. Edit in place. Don't rewrite sections wholesale.
4. For new docs pages: use the template. Place under the right subfolder. Cross-link from README ("See `docs/integrations/stripe.md` for the Stripe integration.").
5. If env vars changed, also update `.env.example` and `src/config/configuration.ts` (or remind the user to).
6. After writing, re-read each page as a new contributor would. Cut anything that doesn't help them act.
7. Run `git diff` to review your own changes before declaring done.

## Don'ts

- Don't create `docs/` files preemptively for hypothetical features.
- Don't write a doc that just lists exported functions — that's what JSDoc / Swagger is for.
- Don't duplicate `CLAUDE.md`. Link to it instead.
- Don't write a CHANGELOG unless the user asked. The repo doesn't have one yet.
- Don't add `README.md` files inside `src/` subfolders. Conventions live in `CLAUDE.md`.
