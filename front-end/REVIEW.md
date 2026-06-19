# Review instructions

Guidance for Claude Code Review on this repository. These rules override the
default review behavior. Keep them concrete and short — anything longer dilutes
the signal.

## Summary shape

Open the review body with a one-line tally:
`<N> Important, <N> Nit, <N> Pre-existing`.

If there are no Important findings, lead with **"No blocking issues."** and
keep the rest of the summary to two short sentences max.

## What Important means here

This is a Next.js 15 + TypeScript + Tailwind front-end that talks to a NestJS
back-end. Reserve 🔴 **Important** for findings that would:

- **Break behavior in production**: incorrect logic, broken auth flow, race
  conditions, incorrect React Query cache invalidation, incorrect Suspense /
  use-client boundaries that fail prerender, stale closures in hooks.
- **Leak data or weaken security**: secret/token shipped to the client bundle
  (`process.env.SECRET` referenced from a `'use client'` file or a
  `NEXT_PUBLIC_*` containing a secret), JWT verified with the dev fallback
  in a non-test path, `dangerouslySetInnerHTML` from non-trusted input without
  sanitization, redirects from unvalidated `next` query param, missing
  `httpOnly`/`secure`/`sameSite` on auth cookies, missing input validation on
  a Server Action / Route Handler, `Authorization: '*'` CORS on authenticated
  endpoints, stack traces returned to the client.
- **Block a rollback / silently corrupt state**: localStorage schema changes
  without a migration path; backwards-incompatible API contract changes; PII
  written to logs.
- **Crash the build**: `useSearchParams` outside a `<Suspense>` boundary,
  importing `next/headers` from a client component, missing `'use client'` on
  a file using `useState`/`useEffect`.

Style, naming, refactoring suggestions, and missing memoization without a
measured impact are 🟡 **Nit** at most.

## Always check

- New routes in `src/app/(app)/**` must be wrapped by `<RequireAuth>` in their
  layout, or perform an equivalent server-side guard.
- New forms must have `<label htmlFor>` paired with the input `id`, an
  `autoComplete` attribute, and a visible error region with `aria-describedby`.
- New `<Image>` usage must include `alt` and (when `fill` or responsive
  widths) `sizes`.
- New env vars must be added to `.env.example` and must use `NEXT_PUBLIC_`
  **only** if the value is safe to expose publicly.
- New TanStack Query hooks must declare a `staleTime` (default 0 causes
  refetch storms) and must invalidate the smallest key prefix on mutation —
  not the root `[]`.
- New Server Actions / Route Handlers must validate their input (shape and
  bounds) at the entry point before any business logic runs.
- New tests for new features: at minimum one happy-path and one failure-path
  assertion.

## CLAUDE.md violations

The repo's `CLAUDE.md` bans `any` and `console.log` in production code. Treat
**newly introduced** occurrences in `src/**` (excluding tests) as
🔴 **Important** rather than the default Nit — these slip through quickly and
are the kind of thing the team has explicitly committed to keeping out.

`console.log` inside `*.test.ts(x)`, `*.spec.ts(x)`, or files under `test/`
and `e2e/` is allowed.

## Cap the nits

Report at most **5 Nits per review**. If you found more, mention the rest as
"plus N similar items in `<file>`" in the summary instead of posting them
inline. Prefer Nits that are correctness-adjacent (missing dependency in
`useEffect`, missing `key` on a list, missing `alt`) over pure stylistic
preferences.

## Do not report

- Anything CI / tooling already enforces: ESLint rules, Prettier formatting,
  `tsc` errors, Tailwind class ordering.
- Files in:
  - `node_modules/`, `.next/`, `dist/`, `coverage/`
  - `src/app/claude-guide/**` — onboarding content, not production app code
  - `*.lock`, `package-lock.json`
  - `public/**` static assets
  - `.claude/skills/**` — skill instructions, prose-only
- Pure prose/punctuation issues in `*.md` files unless the change ships in
  user-facing UI.
- Suggestions to add memoization (`useMemo`, `useCallback`, `React.memo`)
  without a concrete reason it would matter (referenced by another memoized
  hook dep, or a measurable hot path). Drive-by memoization is noise.
- Suggestions to convert a JS-style import to a Next 15 idiom (`Image`,
  `Link`, `next/font`) on files outside `src/` (e.g., scripts, configs).

For paths under `src/app/claude-guide/**` — if you spot a real bug (e.g., a
broken link, a runtime crash) report it as Nit. Do not flag prose, design,
or copy-editing issues there.

## Verification bar

Before posting any 🔴 **Important** finding:
- Cite the exact `file:line` of the offending code.
- For behavior claims (e.g., "this races with X"), cite the `file:line` of
  the colliding call site too. An inference from naming alone is not
  sufficient — quote the actual code path.
- For security findings, name the threat (XSS, CSRF, open redirect, secret
  leakage, …) and the input vector that triggers it.

If you can't meet the bar, demote to Nit or omit.

## Re-review convergence

After the first review on a PR, on subsequent reviews:
- Suppress new 🟡 **Nit** findings unless they involve correctness
  (logic, security, accessibility, build-breaking).
- Continue to report 🔴 **Important** findings at full fidelity.
- Don't re-post a finding that the author has addressed in a follow-up
  commit, even if the surrounding code moved.

This keeps long-running PRs from drifting into round-seven style debates.
