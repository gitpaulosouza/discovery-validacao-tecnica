---
name: back-add-logs
description: Add structured logging to NestJS code using the built-in Logger class — at the right places, at the right levels, without being noisy. Use when the user asks to add logs, instrument a feature, debug via logs, or audit existing logging.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# add-logs

Use this skill when the user asks to add or improve logging. The bar is **signal, not noise** — every log line must answer a question someone will ask in production. If it won't, don't write it.

## Tooling

This project uses NestJS's built-in `Logger` from `@nestjs/common`. Do **not** introduce winston / pino / etc. unless the user explicitly asks (and if they do, route the request through `/back-set-external-lib`).

Pattern — one logger per class, named after the class:

```ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async place(orderId: string): Promise<void> {
    this.logger.log(`placing order ${orderId}`);
    // ...
  }
}
```

The `Logger.name` argument becomes the context prefix in every line — that's what makes the output greppable. Always pass `ClassName.name`.

## Where to log (and where NOT to)

Log at the **boundaries** of meaningful work and at branches that change the outcome:

- **Service boundaries** — entering / leaving a non-trivial operation (background job kicks off, external API call, batch process).
- **Errors** — every `catch` that doesn't immediately rethrow without modification. Use `logger.error(message, error.stack)`.
- **Notable state changes** — user signed up, payment captured, refund issued, scheduled job ran.
- **Calls to third-party services** — request initiated, response received (status, duration), failure with vendor error code.
- **Surprising branches** — a fallback path was taken, a cache miss for a key that's usually hot, a retry was attempted.
- **Startup-time configuration** — once, at `OnModuleInit`, log the resolved config that affects behavior (without secrets).

Do **NOT** log:

- Inside tight loops, per-iteration. Aggregate and log once.
- Trivial pass-through methods (a getter that returns a field).
- Inside controllers for "request received / response sent" — Nest already logs requests via its built-in middleware, and `AllExceptionsFilter` logs unhandled errors. Adding controller-level entry/exit logs is duplication.
- Validation failures handled by `ValidationPipe` — they're already surfaced in the error filter.
- Successful happy-path lines that just say "doing the obvious thing" (`logger.log('starting create')`). If the function name says it, the log adds nothing.
- Anything that would log on **every** request at info level. That's not logging, that's traffic.

## Levels — pick one deliberately

- `logger.error(message, stack?)` — something failed and humans care. Always include the stack/cause.
- `logger.warn(message)` — degraded but recoverable. Fallback engaged, retry succeeded after N attempts, deprecated path hit.
- `logger.log(message)` — notable success, runs at info level. Default for one-shot business events.
- `logger.debug(message)` — only useful while diagnosing. Off in production.
- `logger.verbose(message)` — extremely fine-grained, almost never needed. Avoid.

Default: prefer `debug` over `log` when in doubt. Production noise is the enemy.

## Message format

- Lowercase, present tense, action-first: `'sending welcome email to user 7e2b...'`.
- Include identifiers (ids, not whole entities) so you can grep across services: `userId=...`, `orderId=...`. Stick to one style consistently inside a file.
- For external calls, log the operation and outcome together when feasible: `'stripe.charges.create succeeded id=ch_... duration=412ms'`.
- For errors, include the **stack** as the second arg to `logger.error`. Never just log `error.message` — you'll lose the trace.

```ts
} catch (e) {
  this.logger.error(`failed to deliver email to ${input.to}`, e instanceof Error ? e.stack : String(e));
  throw new ServiceUnavailableException('Email delivery failed');
}
```

## Sensitive data — never log it

Strip / never include:

- Passwords, password hashes, tokens (JWTs, refresh tokens, API keys), session IDs.
- Full credit card numbers, CVVs, full bank account numbers.
- Personally identifiable info beyond what's needed (full street address, phone, government IDs). Prefer `userId` over `email` in routine logs.
- Request bodies for auth endpoints. Ever.

If you genuinely need to log a sensitive value to debug, log a **fingerprint** (length, first/last char, hash prefix) and remove the line before merging.

## Workflow when invoked

1. Read the target file(s). Identify the boundaries listed above.
2. Add `private readonly logger = new Logger(ClassName.name);` once per class. Reuse — don't `new Logger()` per call.
3. Insert log calls at boundaries / errors / notable branches. Pick the level deliberately using the table above. Default toward `debug` for routine progress, `log` for business events, `warn` for degraded paths, `error` for failures.
4. For each `catch` you find that swallows or transforms the error, add `logger.error(message, stack)` *before* the rethrow.
5. Sanity-check: count the log lines you added. If you've added more than ~one per non-trivial method, you're probably being noisy — re-read and cut.
6. Run `npm run build` and `npm test` (existing tests should still pass; logger calls don't break tests).

## Don'ts

- Don't use `console.log` / `console.error`. Always go through `Logger`.
- Don't introduce a logging library. Built-in `Logger` is the standard here.
- Don't log inside `forEach` / `map` callbacks operating on user-sized collections.
- Don't log secrets or full tokens. Ever.
- Don't add per-request "controller hit" logs — Nest already does this.
