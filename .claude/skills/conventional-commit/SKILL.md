---
name: conventional-commit
description: Analyze pending changes with `git diff` / `git status` and craft a Conventional Commit (type + scope + short body) for the user to review and commit. Use whenever the user asks to commit, write a commit message, "make a commit", "commit my changes", "create a conventional commit", or anything that implies turning the current working-tree state into a commit. Also trigger when the user asks you to summarize the diff into a commit, even if they don't say the word "conventional".
---

# Conventional Commit

Turn the current working-tree changes into a Conventional Commit message with a meaningful scope and a short body. Then surface it to the user, confirm, and commit.

This is a monorepo with `back-end/` (NestJS) and `front-end/` (Next.js) sub-trees, plus shared root files. Scope choice should reflect that.

## Workflow

1. **Inspect state in parallel** — run these in a single tool batch:
   - `git status --short` — see what's staged vs unstaged vs untracked.
   - `git diff --staged` — staged changes (the ones that will actually be committed if anything is staged).
   - `git diff` — unstaged changes (only relevant if nothing is staged).
   - `git log -n 5 --pretty=format:'%s'` — recent commit subjects, to match the project's tone (lowercase vs Sentence-case, scope style, etc.).

2. **Decide what's being committed.**
   - If anything is staged, the commit will include only staged changes — analyze those.
   - If nothing is staged, analyze the unstaged + untracked changes and tell the user you'll stage specific files before committing (never `git add -A` / `git add .` blindly — see Safety).

3. **Pick the type.** One of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Pick the dominant intent of the change. If the diff is genuinely mixed (e.g. a feature plus unrelated chore), say so and ask whether to split into two commits rather than papering over it with `chore`.

4. **Pick the scope.** The scope is a noun in parentheses, lowercase, no spaces. Choose the most useful one for someone scanning `git log`:
   - If all changes live under `back-end/`, scope is usually a NestJS module name (e.g. `auth`, `users`, `orders`) or `back` if it spans many.
   - If all changes live under `front-end/`, scope is usually a route/feature name (e.g. `dashboard`, `login`, `ui`) or `front` if it spans many.
   - If changes span both halves, scope is often the cross-cutting concept (e.g. `auth`, `api`) or omitted entirely if nothing fits.
   - Root-level changes: `repo`, `docs`, `ci`, `deps`, `claude` (for `.claude/` config), etc.
   - Match existing scope style from `git log` when there is one — don't invent a new convention.
   - Omit the scope (write `feat: ...` with no parens) only when no scope is genuinely informative. Prefer a scope when in doubt.

5. **Write the subject.**
   - Imperative mood, lowercase, no trailing period, ≤ 72 chars including the `type(scope):` prefix.
   - Describe the *change*, not the file. "add password reset endpoint" beats "update auth.controller.ts".
   - If a change is breaking, append `!` before the colon (`feat(api)!: ...`) and mention it in the body.

6. **Write the body.**
   - 1–3 short sentences (or 2–4 short bullets) explaining **why** — the motivation, the constraint, the user-visible effect. Don't restate the diff; the diff is right there.
   - Skip the body only when the change is genuinely self-explanatory (e.g. a typo fix, a one-line dependency bump). When in doubt, write the body.
   - Wrap at ~72 chars per line. Leave one blank line between subject and body.
   - Do not add a `Co-Authored-By` trailer or any other auto-generated trailer unless the user has asked for it.

7. **Show the proposed message** to the user as a fenced block, plus a one-line note about which files will be staged. Wait for confirmation before committing — do not commit on your own. If the user has explicitly told you to operate autonomously in this session, you can skip the confirmation step and go straight to commit.

8. **Commit** with a HEREDOC so multi-line formatting survives:
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): subject line

   Body line 1.
   Body line 2.
   EOF
   )"
   ```
   Then run `git status` to confirm the commit landed cleanly.

## Format

```
<type>(<scope>): <subject>

<body>
```

- Subject ≤ 72 chars, imperative, lowercase, no period.
- Blank line between subject and body.
- Body wraps at ~72 chars, explains *why*.
- Breaking change: `<type>(<scope>)!: <subject>` and call it out in the body.

## Examples

**Example 1 — single-module backend feature**

Diff: new `password-reset` endpoint in `back-end/src/auth/`, plus a Prisma migration for a `passwordResetToken` table.

```
feat(auth): add password reset endpoint

Lets users request a one-time token by email and exchange it for a
new password. Token rows live in a new `password_reset_token` table
with a 30-minute expiry to keep the attack window tight.
```

**Example 2 — frontend bugfix, no body needed**

Diff: a one-line fix in `front-end/src/components/Modal.tsx` correcting the close-button aria-label.

```
fix(ui): correct aria-label on modal close button
```

**Example 3 — cross-cutting refactor**

Diff: rename `User.fullName` to `User.displayName` across Prisma schema, NestJS service, and a Next.js component.

```
refactor(user): rename fullName to displayName

`displayName` matches the field we already use in the auth provider
payload, so consolidating on one name removes a translation layer in
the frontend and clarifies intent in the API response.
```

**Example 4 — breaking API change**

```
feat(api)!: return ISO timestamps instead of unix epochs

All `*_at` fields on the public REST API now serialize as ISO 8601
strings. Frontend already handles both formats; external consumers
need to update their parsers.
```

**Example 5 — chore at the repo root**

```
chore(claude): add conventional-commit skill
```

## Safety

- Never `git add -A` or `git add .` — it can pick up stray local files (`.env`, scratch notes, large binaries). Stage specific paths by name, derived from `git status`.
- Never amend an existing commit unless the user explicitly asks for `--amend`. Create a new commit instead.
- Never use `--no-verify` — let pre-commit hooks run. If a hook fails, surface the error and ask how to proceed; don't bypass it.
- Don't push. Committing and pushing are separate decisions for the user to make.
- If any staged file looks like it might contain secrets (`.env`, `*credentials*`, `*.pem`, `id_rsa`, etc.), stop and warn the user before committing.

## When to push back

- **Mixed-intent diff.** If the diff contains two clearly unrelated changes (e.g. a feature plus an unrelated dependency bump), say so and offer to split into two commits. A single honest commit beats a `chore` that hides what happened.
- **Empty or trivial diff.** If `git diff` and `git diff --staged` are both empty, tell the user there's nothing to commit rather than inventing a message.
- **Massive diff.** If the diff is sprawling (hundreds of files, many unrelated areas), ask whether to split before writing one giant message.
