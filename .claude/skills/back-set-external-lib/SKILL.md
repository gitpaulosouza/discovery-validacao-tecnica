---
name: back-set-external-lib
description: Integrate a third-party library or external service (SDKs, HTTP clients, queue brokers, mail providers, storage providers, payment gateways, etc.) into this NestJS back-end with a thin adapter layer so the rest of the codebase stays loosely coupled to the vendor. Use when the user asks to add, wrap, or migrate an external dependency.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# set-external-lib

Use this skill whenever the user wants a third-party library or vendor service integrated. The goal is **loose coupling**: feature modules depend on a project-defined interface, not on the vendor SDK directly. This makes the integration testable, swappable, and isolated.

## Step 1 — gather authoritative documentation

Before installing anything, fetch current docs. Use the `context7` MCP tools (`mcp__context7__resolve-library-id` then `mcp__context7__query-docs`) for libraries — your training data may be stale and breaking changes are common.

Confirm:

- Latest stable version compatible with **NestJS 11** and **TypeScript 5.x**. Reject versions that require an older Node/TS than what `package.json` and `tsconfig.json` declare.
- Required env vars / credentials (API keys, secrets, region, project IDs).
- Initialization shape (does it want a singleton client? a factory? a lifecycle hook?).
- Failure modes (retries, timeouts, idempotency).
- Whether an official Nest module exists (`@nestjs/<x>`, `nestjs-<x>`). Prefer it only if it's actively maintained — many community modules are abandoned. If a vendor-official Nest wrapper exists and is current, prefer it; otherwise wrap the raw SDK yourself.

For Microsoft/Azure SDKs, also use `mcp__claude_ai_Microsoft_Learn__microsoft_docs_search`.

If you cannot retrieve docs (offline / no MCP), tell the user before guessing — vendor APIs change often.

## Step 2 — design the adapter

The codebase must depend on a **port** (an interface) defined inside the project. The vendor library is hidden behind an **adapter** that implements the port.

Layout:

```
src/integrations/<vendor-or-capability>/
├── <capability>.module.ts        # @Global() if widely used; otherwise per-feature
├── <capability>.port.ts          # interface + injection token
├── <capability>.service.ts       # adapter — concrete implementation using the SDK
├── <capability>.config.ts        # optional: typed config helper
└── dto/                          # input/output types specific to this integration
```

Naming guidance:

- Group by capability (`mailer`, `storage`, `payments`, `search`) when one capability could be served by multiple vendors. Group by vendor (`stripe`, `s3`, `sendgrid`) when the integration is intrinsically vendor-specific.
- The port file exports both the interface and a unique injection token: `export const MAILER = Symbol('MAILER');`.

Port pattern:

```ts
// mailer.port.ts
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailerPort {
  send(input: SendEmailInput): Promise<{ id: string }>;
}

export const MAILER = Symbol('MAILER');
```

Adapter pattern:

```ts
// mailer.service.ts
@Injectable()
export class SendgridMailerService implements MailerPort, OnModuleInit {
  private client!: SendgridClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new SendgridClient({ apiKey: this.config.getOrThrow('mailer.apiKey') });
  }

  async send(input: SendEmailInput) {
    const res = await this.client.send({ ...mapToVendor(input) });
    return { id: res.headers['x-message-id'] };
  }
}
```

Module wiring (DI by token, not by class):

```ts
@Module({
  providers: [{ provide: MAILER, useClass: SendgridMailerService }],
  exports: [MAILER],
})
export class MailerModule {}
```

Consumers depend on the token + interface, not the vendor class:

```ts
constructor(@Inject(MAILER) private readonly mailer: MailerPort) {}
```

This is the contract: **only files inside `src/integrations/<x>/` may import the vendor SDK.** Everywhere else uses the port. Verify with grep before declaring done.

## Step 3 — configuration

- Add new env vars to `src/config/configuration.ts` under a typed namespace, e.g. `mailer: { apiKey, from }`. Define their TypeScript shape on `AppConfig`.
- Add the same vars to `.env.example` with placeholder values and a one-line comment.
- Read them via `ConfigService` inside the adapter. **Never** read `process.env` directly outside `src/config/`.
- For required-at-boot secrets, use `config.getOrThrow(...)` so misconfiguration fails fast.

## Step 4 — install + register

1. Install with the exact package name you confirmed in Step 1: `npm install <pkg>`. Use `--save-dev` only for type packages.
2. If the vendor SDK ships its own types, no `@types/*` is needed — verify in their README.
3. Register the integration's NestJS module in `src/app.module.ts` `imports`. If many features need it, mark the module `@Global()`; otherwise import it explicitly where used.
4. If the SDK manages connections / sockets / file handles, implement `OnModuleInit` (open) and `OnModuleDestroy` (close) on the adapter so Nest's lifecycle handles it cleanly.

## Step 5 — error mapping

Vendor errors should be translated at the adapter boundary into:

- NestJS `HttpException` subclasses for user-facing failures (`BadRequestException`, `UnauthorizedException`, `ServiceUnavailableException`, etc.), so `AllExceptionsFilter` formats them.
- A small set of **domain errors** if the integration is consumed by multiple features that need to handle failure differently (e.g. `MailerSendFailedError`).

Never let raw vendor exception classes leak into feature code — that defeats the point of the port.

## Step 6 — testing

- Adapter unit test: mock the underlying SDK (Jest module mock or constructor injection of a fake client) and assert the adapter calls the SDK with the right arguments and maps responses correctly.
- Consumer unit tests: provide a fake implementation of the port via Nest's testing module:
  ```ts
  Test.createTestingModule({
    providers: [
      MyService,
      { provide: MAILER, useValue: { send: jest.fn().mockResolvedValue({ id: 'fake' }) } },
    ],
  });
  ```
- Do NOT hit the real third-party service in unit tests. If the user wants a sandbox/integration test, place it under a separate `*.integration.spec.ts` and gate it on env vars.

## Step 7 — verify + document

- `npm run build` and `npm test` must pass.
- `grep -R "<vendor-package>" src --include='*.ts'` should return only files under `src/integrations/<x>/`.
- Update `.env.example`.
- If the integration is significant, suggest invoking `/back-update-docs` to add a `docs/integrations/<x>.md` page covering setup, env vars, error semantics, and how to swap the implementation.

## Don'ts

- Don't import the vendor SDK from controllers, services, or DTOs outside the integration folder.
- Don't bake vendor-specific request/response shapes into the port — translate them.
- Don't store credentials anywhere except env vars + `ConfigService`.
- Don't add a second library that duplicates an existing capability without the user explicitly asking (e.g. don't add a second HTTP client).
- Don't skip context7/docs lookups because you "remember" the API — verify.
