---
name: back-standardize-code
description: Clean up TypeScript / NestJS code — extract duplication into reusable units when warranted, replace relative imports with path aliases, simplify per KISS, and apply the patterns recommended by current NestJS and TypeScript docs (use context7 to verify before relying on memory). Use when the user asks to standardize, clean up, refactor, deduplicate, or modernize code.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# standardize-code

Use this skill when the user asks to clean, standardize, refactor for clarity, or modernize TypeScript / NestJS code. The goal is **lower complexity at the same behavior**, not a stylistic rewrite. Do not change behavior unless the user explicitly asked for it; if you find a bug while cleaning, surface it as a separate question.

## Operating principles

- **KISS first.** Three similar lines beat a premature abstraction. Don't extract a helper for a single caller. Don't introduce a generic for a single concrete type.
- **Don't change behavior.** A standardization pass should produce the same observable outputs. If a rename or extraction risks a behavior change, call it out.
- **Verify, don't recite.** When applying NestJS / TypeScript "recommended patterns," verify against current docs via `context7` (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`). Training data drifts; recommendations don't.
- **Match the codebase you're in.** Existing conventions in `src/modules/users/`, `src/modules/auth/`, `src/common/` are the source of truth. New code should look like its neighbors. `CLAUDE.md` documents the rules — re-read it before sweeping changes.
- **Minimal diffs.** Touch only what's relevant. A cleanup PR full of unrelated reflow churn is a bad cleanup PR.

## What to look for (and how to fix)

### 1. Duplication — extract only when the duplication is real

Three near-identical blocks across two files often *aren't* duplication; they're coincidence. Real duplication shares **intent**, not just shape. Heuristics:

- Same Prisma error mapping copy-pasted across services → already centralized in `AllExceptionsFilter.resolvePrismaKnown`. Don't add a second copy.
- Identical DTO validators on a shared field across multiple DTOs → consider a small base class only if the field truly always means the same thing; otherwise leave them.
- Repeated `UserEntity.fromPrisma`-style mappers → keep them as static methods on the entity. Don't centralize into a generic mapper utility.

If you do extract: place it in the closest reasonable scope.

- Used in one feature → keep inside that module's folder.
- Used by two+ features → `src/common/` (filters, interceptors, dto, helpers) or, for cross-cutting infra, a dedicated module under `src/common/<topic>/`.

### 2. Imports — use path aliases, not deep relative paths

`tsconfig.json` currently sets `baseUrl: "./"` without `paths`. **Before replacing relative imports with aliases, the aliases must exist.** Two-step plan:

1. Add `paths` to `tsconfig.json`. Suggested mapping (proposes, doesn't impose — confirm with the user the first time):

   ```json
   "paths": {
     "@/*": ["src/*"],
     "@common/*": ["src/common/*"],
     "@config/*": ["src/config/*"],
     "@prisma-svc/*": ["src/prisma/*"],
     "@modules/*": ["src/modules/*"]
   }
   ```

   Use `@prisma-svc/*` (not `@prisma/*`) because `@prisma/*` collides with the published `@prisma/client` package.

2. Make Jest resolve the same aliases. Add `moduleNameMapper` to the `jest` block in `package.json` and to `test/jest-e2e.json`:

   ```json
   "moduleNameMapper": {
     "^@/(.*)$": "<rootDir>/src/$1",
     "^@common/(.*)$": "<rootDir>/src/common/$1",
     "^@config/(.*)$": "<rootDir>/src/config/$1",
     "^@prisma-svc/(.*)$": "<rootDir>/src/prisma/$1",
     "^@modules/(.*)$": "<rootDir>/src/modules/$1"
   }
   ```

   For the unit-test config inside `package.json`, `<rootDir>` is the project root. For `test/jest-e2e.json`, `<rootDir>` is `test/` — adjust to `<rootDir>/../src/...`.

3. Replace `..`/`../..` imports with the alias. Keep **same-folder** and one-level-down relative imports as-is — `./foo` and `./dto/bar.dto` are clearer than `@modules/users/dto/bar.dto` from inside that very folder.

4. Verify with `npm run build` and `npm test`. Both must pass; otherwise the alias mapping is wrong (most often the e2e mapper).

If `paths` already exist in `tsconfig.json`, just use them — don't redesign.

### 3. KISS / clarity wins

- **Early return** over deep nesting. `if (!user) throw new NotFoundException(...)` then continue, instead of `if (user) { ... } else { throw ... }`.
- **Replace ternary chains** of length ≥ 3 with `if/else` or a lookup map.
- **Inline single-use private helpers** that obscure more than they clarify, *unless* the name carries real meaning.
- **Drop dead code.** Unused exports, unused params, commented-out blocks, unreachable branches. (Confirm with `grep` before deleting an export — agents misread "unused" often.)
- **Trust the framework.** Validation belongs in DTOs; auth in guards; response shaping in entities/interceptors; error formatting in `AllExceptionsFilter`. Remove ad-hoc reimplementations of these.

### 4. TypeScript discipline

- Prefer `unknown` over `any` at boundaries. Inside the codebase, use the actual type.
- Use `readonly` for fields that aren't reassigned after construction. Constructors with `private readonly foo: Foo` are the project's idiom — match it.
- Replace `as Type` casts with type guards or proper typing when you can; preserve casts only at genuine boundaries (parsing JSON, narrowing `unknown`, third-party return types).
- Use `const` for things that don't reassign. No `var`.
- Use `?.` and `??` instead of `&&` chains for null-safety.
- Discriminated unions over enums of magic strings when the values carry behavior.
- Avoid non-null `!` outside DTO field declarations (where it's the project's idiom for required fields with class-validator). In runtime code, narrow instead.

### 5. NestJS-recommended patterns

Verify each of these against current Nest 11 docs via context7 if uncertain:

- **DI by class token** for first-party services; **by symbol/string token** when the dependency is a port/interface. Prefer constructor injection — avoid `@Inject()` on concrete classes.
- **Controllers stay thin.** Validation via DTO + ValidationPipe (already global), error throwing via `HttpException` subclasses (already normalized by the global filter), response shaping via entity classes.
- **Pipes for parameter coercion** (`ParseUUIDPipe`, `ParseIntPipe`, `ParseBoolPipe`, `ParseEnumPipe`) instead of in-handler conversions.
- **Guards for auth** (`@UseGuards(JwtAuthGuard)`) — never check tokens manually inside a controller.
- **Interceptors for cross-cutting response transforms** — already covered by `TransformInterceptor`. Don't add a second.
- **`@Global()` only when truly global.** `PrismaModule` is global; don't make every module global.
- **Lifecycle hooks** (`OnModuleInit`, `OnModuleDestroy`) for resource setup/teardown, not constructors. The constructor runs before DI is fully resolved for some patterns.
- **Async providers** via `useFactory` when initialization needs awaited work.
- **Avoid circular imports** between modules — use `forwardRef` only as a last resort, after considering whether the modules should merge or share a third module.

### 6. NestJS organization smells

- A controller importing a service from another module without that module being in `imports` → fix the imports, don't shortcut by re-providing.
- A service injecting `ConfigService` to read a single value used at boot → consider an async factory provider that resolves once.
- DTOs leaking Prisma types into HTTP responses → use a response entity with `fromPrisma` (matches `UserEntity`).

## Workflow when invoked

1. **Scope.** Ask the user what to standardize: a single file, a module, "the whole `src/`," or a specific concern (just imports, just duplication, just KISS). Don't rewrite the whole codebase silently.
2. **Read first.** Before changing anything, read the target files and `CLAUDE.md`. Note existing conventions; don't fight them.
3. **Plan in passes.** Each pass is one concern (imports → duplication → KISS → TS strictness → Nest patterns). Fewer concerns per diff = easier review.
4. **Verify recommendations.** When applying a "best practice," check current docs via context7 if there's any doubt. State what doc you used in the user-facing summary if it changed your approach.
5. **Path-alias migration is the most error-prone pass.** Do it as its own commit-worthy chunk. After adding `paths`, run `npm run build` *first*; only then sweep imports. If e2e tests break, the e2e Jest `moduleNameMapper` likely needs `<rootDir>/../src/...` adjustment.
6. **Run the full check** before declaring done: `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e`. All four must pass.
7. **Summarize the diff.** Tell the user: what changed, what was *not* changed and why (e.g., "kept the per-service Prisma error catch in `users.service` because the user-facing message differs from the global default"), and any behavior risks (`there should be none, but verify the auth flow manually`).

## Don'ts

- Don't extract abstractions for hypothetical future callers. Wait for the third real caller.
- Don't reformat unrelated files. Stay scoped.
- Don't replace same-folder relative imports with aliases (`./foo` is fine).
- Don't add `index.ts` barrel files unless the user asked — they hurt tree-shaking and obscure imports.
- Don't enable stricter `tsconfig` flags (`strict`, `noImplicitAny`, `strictBindCallApply`) without the user's go-ahead — flipping them on cascades into many fixes.
- Don't introduce ESLint rule changes as part of a cleanup pass; that's its own conversation.
- Don't apply a "recommended" pattern from memory if it would touch many files. Verify via context7, then proceed.
- Don't change runtime behavior (error messages, status codes, response shapes) under the banner of "cleanup." If a behavior change is warranted, surface it and ask.
