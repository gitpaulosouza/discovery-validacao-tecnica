---
name: front-security
description: Apply security best practices to Next.js (App Router) + TypeScript code — secrets/env hygiene, server-only modules, XSS / CSRF / open-redirect / SSRF prevention, secure cookies, CSP and HTTP security headers, route-handler and Server Action input validation, auth/session handling, dependency hygiene. Use whenever the user adds an API route or Server Action, handles user input, sets cookies, integrates auth, configures middleware/headers, or asks for a security review of changes. Also trigger when reviewing diffs that touch authentication, redirects, file uploads, or anything reflecting user input into HTML/URLs.
---

> **Scope:** este skill opera sobre o workspace `front-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# nextjs-security

Defensive checklist for Next.js + TypeScript apps. Trust nothing from the client. Validate at the boundary; never inside a deeply nested helper.

## Threat model in one paragraph

Front-end code runs in two trust zones: the **server** (Server Components, Route Handlers, Server Actions, middleware) is trusted by the client; everything in `'use client'` files **runs on the user's machine and is publicly readable**. Anything you import into a client component, any string starting with `NEXT_PUBLIC_`, and any prop you pass from a Server Component to a Client Component is shipped as plaintext. Treat the client/server boundary as a hostile network.

## Secrets and environment variables

- Server-only secrets: name them without `NEXT_PUBLIC_`. They are stripped from the client bundle.
- `NEXT_PUBLIC_*` values are public — never put API keys, tokens, or DB URLs there.
- Never read `process.env` from inside a `'use client'` file for sensitive data; use a typed config module loaded only on the server.
- Keep an `.env.example` with placeholder values and document each var. Real secrets live in `.env.local` (gitignored).
- Use `import 'server-only'` at the top of files that must never be bundled into the client. The build will fail loudly if a Client Component imports them.

```ts
// src/lib/server-config.ts
import 'server-only'

export const config = {
  jwtSecret: process.env.JWT_SECRET ?? throwMissing('JWT_SECRET'),
}
```

## Input validation

- Validate **every** payload at the entry point (Server Action body, Route Handler body/query/params, middleware request). Use `zod` or equivalent. The validated value is the only thing downstream code touches.
- Don't trust types: TypeScript types are not runtime validation. A `string` may be `undefined`, an array, or 10MB.
- Reject unknown fields. Schemas should be `.strict()` so silent over-posting is caught.
- Validate URLs you redirect to (see open-redirects).
- Validate file uploads: type, size, magic bytes — not just MIME header.

```ts
const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
}).strict()

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return new Response('Bad Request', { status: 400 })
  // use parsed.data only
}
```

## XSS

- React escapes by default. The escape hatches are the danger.
- `dangerouslySetInnerHTML` requires the input to come from a trusted source or be sanitized with a vetted library (`DOMPurify`, `sanitize-html`). Never set it from user input directly.
- `href={value}` and `src={value}` with user input must not allow `javascript:` URLs. Validate with `new URL(value)` and check `.protocol === 'http:' || 'https:'`.
- Don't write user content to a `<style>` tag or a CSS variable that gets passed to `style` without sanitization.
- For Markdown rendering, use `react-markdown` with the default sanitizing pipeline; never disable `rehype-sanitize` without auditing the schema.

## CSRF

- **Server Actions**: Next builds CSRF protection in via the framework — but only if you keep them as Server Actions invoked through forms or `useFormState`. Don't expose them as raw POST endpoints behind custom proxies.
- **Route Handlers** with cookie-based auth: enforce `SameSite=Lax` (default) or `Strict` cookies, and either:
  - Require an `Origin` / `Referer` check matching your origin, or
  - Use a double-submit CSRF token, or
  - Require an `Authorization: Bearer` header (immune to CSRF since browsers don't auto-send it cross-site).

## Cookies and sessions

When you control them via `cookies()` (server) or response headers:
- `httpOnly: true` for any session/auth token — never read from JS.
- `secure: true` in production.
- `sameSite: 'lax'` (default) or `'strict'`. Use `'none'` only for legitimate cross-site needs and combine with `secure: true`.
- `path: '/'` unless scoped narrower.
- Short `maxAge` for access cookies; long for refresh, with rotation.
- Rotate the session cookie on login and privilege change.

If you must store tokens on the client, prefer in-memory (lost on refresh, harmless XSS impact). `localStorage` is XSS-exposed — call this out explicitly when reviewing.

## Open redirects and SSRF

- Redirects: never `redirect(req.searchParams.get('next'))` directly. Allow only same-origin paths starting with `/` and not `//` (protocol-relative). Validate or whitelist.
- Server-side `fetch(userProvidedUrl)` is SSRF — block private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `127.0.0.0/8`, `::1`) and follow-redirect protocol changes.

```ts
const next = params.get('next') ?? '/'
const safe = next.startsWith('/') && !next.startsWith('//')
redirect(safe ? next : '/')
```

## Auth

- Verify JWTs with the library's verify (`jsonwebtoken.verify`, `jose.jwtVerify`) — never decode-only.
- Pin `alg` to a specific value. Allowing `alg: 'none'` or unrestricted alg is a known historical CVE class.
- Check `exp`, `iss`, `aud` claims.
- Always re-validate the user against the DB on the server before returning user data. Don't trust the JWT payload as the source of truth for permissions.
- Rate-limit `/login` and `/refresh-token` per IP/account to mitigate credential stuffing and refresh abuse.

## HTTP security headers

Set in `next.config.ts` `headers()` or middleware:

```ts
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },               // or use frame-ancestors in CSP
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: csp },
  ],
}]
```

CSP starting point (tighten before prod):
```
default-src 'self';
script-src 'self' 'nonce-XYZ';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.example.com;
font-src 'self' data:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```
Use a nonce in middleware and pass it through to inline scripts. Avoid `'unsafe-eval'` and `'unsafe-inline'` in `script-src`.

## Logging and error handling

- Never log secrets, tokens, full request bodies, or PII. Mask emails, IDs.
- Don't return raw error messages or stack traces from server endpoints — return a generic message; log the detail server-side.
- Don't expose internal IDs that imply structure (sequential integers leaking record counts). Prefer opaque IDs (UUID, ULID) at the API boundary.

## Dependencies

- `npm audit --omit=dev` (or `npm audit fix`) before each release. Triage HIGH+ promptly.
- Pin major versions. Use Dependabot or Renovate for updates so they're reviewed, not surprises.
- Be skeptical of new packages — small download counts, single-maintainer, no recent activity. Supply-chain attacks live here.

## Cross-origin (CORS)

If a Route Handler must accept cross-origin requests, set `Access-Control-Allow-Origin` to a specific origin (or a strict allowlist), never `*` for authenticated endpoints. Reflect the `Origin` only after matching it against the allowlist.

## What to flag in review

- A Client Component reading `process.env.SOMETHING_SECRET`.
- Validation skipped on a Server Action / Route Handler input.
- `dangerouslySetInnerHTML` from non-trusted source without a sanitizer.
- `redirect()` or `<a href={x}>` with unvalidated user input.
- Cookies missing `httpOnly` / `secure` / `sameSite`.
- JWT verified with a hardcoded fallback secret like `'dev-only-change-me'` in production code paths.
- `fetch(userInput)` server-side without an allowlist.
- Catch-all `Authorization: '*'` CORS headers on authenticated endpoints.
- Stack traces / raw error messages returned to the client.
