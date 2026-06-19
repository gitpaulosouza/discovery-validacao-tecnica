---
name: front-typescript-strict
description: Apply TypeScript best practices and strict-mode patterns in a Next.js + React codebase — strict tsconfig flags, eliminating any/unknown leaks, discriminated unions, exhaustive checks with never, type narrowing and type predicates, branded/nominal types, the satisfies operator, type-only imports, readonly arrays/tuples, const-assertion + as-const, generic constraints, schema-first typing with Zod inference, idiomatic React typing (props, refs, events), and Result-style error types. Use whenever the user writes new TypeScript, refactors types, fights `any`/`unknown`, designs an API surface, models a state machine or reducer, types a hook, or asks "is this typed correctly?"
---

> **Scope:** este skill opera sobre o workspace `front-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# typescript-strict

The point of TypeScript is correctness, not ceremony. The patterns below are the ones that actually catch bugs; everything else is decoration.

## tsconfig — start here

```jsonc
{
  "compilerOptions": {
    "strict": true,                          // bundles all the flags below
    "noUncheckedIndexedAccess": true,        // a[i] is T | undefined — biggest bug-catcher
    "exactOptionalPropertyTypes": true,      // `{ x?: T }` no longer accepts `{ x: undefined }`
    "noImplicitOverride": true,              // forces `override` keyword
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,      // catch (e: unknown), narrow before use
    "verbatimModuleSyntax": true             // explicit `import type` — better tree-shaking
  }
}
```

`noUncheckedIndexedAccess` is the single biggest upgrade — it forces you to handle the case where an array lookup or `Record<string, T>` access misses.

## The `any` ban

`any` opts out of type checking. It propagates: any function consuming an `any` returns `any`. It should appear in two places only:
1. **Intentional escape hatch** with a `// eslint-disable-next-line` and a comment explaining why.
2. **Never** — replace with `unknown` and narrow.

`unknown` is the safe `any`: you can hold any value but can't use it without proving its shape.

```ts
function parse(input: unknown): User {
  if (typeof input !== 'object' || input === null) throw new Error('not an object')
  if (!('email' in input) || typeof input.email !== 'string') throw new Error('no email')
  return { email: input.email }
}
```

For real validation, use `zod` and infer the type — never duplicate.

```ts
const UserSchema = z.object({ id: z.string().uuid(), email: z.string().email() })
type User = z.infer<typeof UserSchema>
```

## Discriminated unions

The single most useful TS pattern. Model state machines and API responses with a tag field:

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

function divide(a: number, b: number): Result<number, 'DIV_BY_ZERO'> {
  if (b === 0) return { ok: false, error: 'DIV_BY_ZERO' }
  return { ok: true, value: a / b }
}

const r = divide(10, 0)
if (r.ok) {
  r.value // number — narrowed
} else {
  r.error // 'DIV_BY_ZERO'
}
```

For React Query you usually don't need a custom Result type — `useQuery` already gives `data | undefined` plus `isPending`, `isError`, `error`. Don't reinvent.

## Exhaustive checks with `never`

Prove at compile time that you handled every variant of a union:

```ts
function describe(s: 'idle' | 'loading' | 'success' | 'error'): string {
  switch (s) {
    case 'idle':    return '—'
    case 'loading': return 'Loading…'
    case 'success': return 'Done'
    case 'error':   return 'Failed'
    default: {
      const _exhaustive: never = s
      throw new Error(`Unhandled: ${_exhaustive as string}`)
    }
  }
}
```

When you add `'cancelled'` to the union, the compiler points at the switch.

## Type narrowing

- `typeof x === 'string'` for primitives.
- `Array.isArray(x)` for arrays (don't trust `instanceof Array`).
- `'key' in obj` for shape narrowing.
- **Type predicates** for custom narrowing — return `x is T`:

```ts
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x && 'email' in x
}
```

Predicates are an unchecked claim — the runtime check must actually validate the shape.

## Branded (nominal) types

When two `string`s mean different things (UserId vs OrderId), brand them so the compiler refuses to mix them up:

```ts
type Brand<T, B> = T & { readonly __brand: B }
type UserId  = Brand<string, 'UserId'>
type OrderId = Brand<string, 'OrderId'>

function getUser(id: UserId) { /* ... */ }

const orderId = '123' as OrderId
getUser(orderId) // ❌ Argument of type 'OrderId' is not assignable to 'UserId'
```

Use a constructor that validates: `function asUserId(s: string): UserId { ...validate...; return s as UserId }`.

## `satisfies` vs annotation vs cast

```ts
// Annotation: widens to the type, you lose literal precision
const config: Record<string, string> = { home: '/', signIn: '/login' }
config.home // string (lost the literal '/')

// satisfies: validates the shape AND keeps the precise type
const config = { home: '/', signIn: '/login' } satisfies Record<string, string>
config.home // '/'

// `as`: cast — last resort, no validation. Avoid.
```

Reach for `satisfies` whenever you want both checking and inference. Reserve `as` for proven-safe escape hatches (DOM casts, validated parses).

## `as const` and literal preservation

```ts
const sections = [
  { id: 'home',   label: 'Home' },
  { id: 'about',  label: 'About' },
] as const

type SectionId = typeof sections[number]['id'] // 'home' | 'about'
```

Pair with `satisfies` for typed-const tables. This pattern eliminates ~80% of the cases people reach for `enum`.

## Don't use `enum`

Numeric enums are surprising; string enums add a runtime construct that doesn't tree-shake well and can't be merged with other constants. Use `as const` objects + a derived type:

```ts
const Status = { Idle: 'idle', Loading: 'loading', Done: 'done' } as const
type Status = typeof Status[keyof typeof Status] // 'idle' | 'loading' | 'done'
```

## Readonly by default

`readonly T[]` and `Readonly<T>` are not just docs — they prevent accidental mutation:

```ts
function summarize(items: readonly Item[]) {
  items.push(...)  // ❌ compile error
}
```

For tuples: `readonly [number, number]`. For object props: `Readonly<Props>` or mark fields with `readonly`.

## Generics

Use generics when types relate to each other. Don't use them for "make it any" — that's `unknown` or just typing the actual shape.

```ts
function first<T>(xs: readonly T[]): T | undefined { return xs[0] }

// Constrain when you need a property
function pluck<T, K extends keyof T>(xs: readonly T[], key: K): T[K][] {
  return xs.map((x) => x[key])
}
```

Default type parameters: `function get<T = unknown>(...)`. Avoid the bare default when callers should be explicit.

## React typing

```tsx
// Props: interface or type, both fine. Prefer `type` for unions.
type ButtonProps = {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

// forwardRef
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', ...props }, ref) {
    return <button ref={ref} {...props} />
  },
)

// Event handlers: type the handler, not the event
const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => { /* e is typed */ }

// useState with explicit type when the initial value can't infer it
const [user, setUser] = useState<User | null>(null)

// useRef
const inputRef = useRef<HTMLInputElement>(null)
```

Avoid `React.FC` — it implicitly adds `children` you may not want and breaks generics.

## `import type`

```ts
import type { User } from '@/types/user'
```

With `verbatimModuleSyntax: true` this is enforced — type-only imports are erased at build time, helping bundle size and preventing accidental side-effect imports.

## Errors

Catch is `unknown`. Narrow before using:

```ts
try { ... } catch (err) {
  if (err instanceof ApiError) { ... }
  else if (err instanceof Error) { ... }
  else { /* something weird was thrown */ }
}
```

Define a typed error class for your domain (`ApiError`, `ValidationError`) so callers can branch on `instanceof`.

## Schema-first

For anything crossing a boundary (HTTP, env, localStorage, URL params), define the schema once in Zod, infer the type, and validate at the entry point. Don't write `interface User` and `userSchema` separately — they will drift.

```ts
const Env = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
})
export const env = Env.parse(process.env)
```

## What to flag in review

- `any` (explicit or implicit). Replace with `unknown` + narrowing or a real type.
- Type assertions (`as Foo`) where validation should run instead.
- Duplicate type + schema definitions for the same shape.
- `if (x)` truthy-checks on possibly-`0` / `''` numbers and strings.
- `enum` (use `as const` + derived type).
- React `useState` without explicit type when the initial value is `null` / `[]`.
- `catch (err)` accessing `err.message` without narrowing.
- Switch over a union with no exhaustiveness check.
- `// @ts-ignore` instead of `// @ts-expect-error <reason>`.
- Mutating a function parameter that's logically input-only (mark `readonly`).
- `function foo(x: string | undefined)` where `x?: string` would be cleaner — and vice versa, mixing them inconsistently.
