---
name: back-add-feature
description: Implement a new feature (module, controller, service, DTOs) in this NestJS 11 + Prisma back-end following the project's conventions and RESTful principles. Use whenever the user asks to add an endpoint, resource, or feature module.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# add-feature

Use this skill when the user asks for a new endpoint, resource, or feature module. Generate a NestJS feature module that matches the conventions in `CLAUDE.md` and the existing `src/modules/users/` reference.

## Step 1 — clarify what you don't know

Before writing code, confirm:

- Resource name (kebab-case folder, PascalCase class root, plural for routes).
- Operations needed (CRUD subset, custom actions).
- Auth: which routes require `JwtAuthGuard` + `@ApiBearerAuth()`?
- Data model: does it touch the DB? If yes, what fields and relations?
- Response shape: bare Prisma model, or a dedicated `*Entity` class with `fromPrisma`?

If the user's request answers these, skip the questions. Otherwise ask in a single round.

## Step 2 — scaffold

Create `src/modules/<feature>/` with this layout (mirror `src/modules/users/`):

```
<feature>.module.ts
<feature>.controller.ts
<feature>.service.ts
<feature>.service.spec.ts        # unit test for the service
dto/
├── create-<feature>.dto.ts
├── update-<feature>.dto.ts      # extends PartialType(Create...Dto)
└── <feature>.entity.ts          # response shape, with fromPrisma()
```

Rules:

- Folder + file names are kebab-case. Class names are PascalCase.
- Controller path is plural (`@Controller('items')`). Do NOT include the global `api` prefix — `main.ts` adds it.
- Inject `PrismaService` directly; `PrismaModule` is `@Global()`, so do NOT import it in the feature module.
- Register the new module in `src/app.module.ts` under `imports: [...]`.

## Step 3 — controller patterns

Always:

- Decorate the class with `@ApiTags('<feature>')`.
- Each handler gets `@ApiOperation({ summary: '...' })` and a `@ApiOkResponse` / `@ApiCreatedResponse` / `@ApiNoContentResponse` describing the response type.
- For protected routes: `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()`.
- Validate `:id` params with `new ParseUUIDPipe()` when IDs are UUIDs.
- `DELETE` returns 204: add `@HttpCode(HttpStatus.NO_CONTENT)` and return `Promise<void>`.
- Controllers stay thin: validate via DTOs, delegate to the service, map Prisma model → entity.

Reference shape (from `users.controller.ts`):

```ts
@Post()
@ApiOperation({ summary: 'Create an item' })
@ApiCreatedResponse({ type: ItemEntity })
async create(@Body() dto: CreateItemDto): Promise<ItemEntity> {
  const item = await this.itemsService.create(dto);
  return ItemEntity.fromPrisma(item);
}
```

## Step 4 — DTO patterns

- Request DTOs: `class-validator` decorators (`@IsString`, `@IsEmail`, `@MinLength`, `@IsOptional`, `@IsUUID`, …) + `@ApiProperty({ example, required, description })` on every field.
- The global `ValidationPipe` runs with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Don't add `@Type()` for primitives — it's handled.
- `Update<X>Dto` extends `PartialType(Create<X>Dto)` from `@nestjs/swagger`.
- Response entity: a class with `@ApiProperty` fields + `static fromPrisma(model): Entity` that strips secrets (e.g. password) and shapes the response.

## Step 5 — service patterns

- `@Injectable()`. Inject `PrismaService` via constructor.
- Throw NestJS exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`). Do not return error envelopes — `AllExceptionsFilter` normalizes them globally and already maps `P2002 → 409`, `P2025 → 404`, `P2003 → 400`.
- For known Prisma errors that need a user-facing message (e.g. unique-constraint copy), catch `Prisma.PrismaClientKnownRequestError` by `code` and rethrow with the right exception. See `users.service.ts:25-33`.
- No business logic in controllers. No `process.env` reads — go through `ConfigService`. New env vars → add to `src/config/configuration.ts` AND `.env.example`.

## Step 6 — RESTful checklist

- `GET /items` → list, 200
- `GET /items/:id` → single, 200, 404 if missing
- `POST /items` → create, 201
- `PATCH /items/:id` → partial update, 200, 404 if missing
- `PUT /items/:id` → full replace (rare here — prefer PATCH)
- `DELETE /items/:id` → 204, 404 if missing
- Sub-resources: `/items/:id/comments` (nested), not `/items-comments`.
- Use plural nouns. Don't put verbs in URLs (`/items/:id/archive` is acceptable for non-CRUD actions; prefer it over `/archive-item`).
- Filtering/pagination → query params, validated via DTO with `@IsOptional` decorators.

## Step 7 — wire-up + verify

1. Add the module to `src/app.module.ts` `imports`.
2. If the feature touches the DB, update `prisma/schema.prisma`, then invoke `/back-prisma-change` (or run `npm run prisma:migrate` followed by `npm run prisma:generate`).
3. Add a `*.spec.ts` unit test for the service (mock `PrismaService`). Suggest invoking `/back-add-tests` for thorough coverage.
4. Annotate Swagger fully — defer to `/back-swagger-docs` for non-trivial controllers.
5. Run `npm run build` and `npm test` before declaring done. Fix lint with `npm run lint`.

## Don'ts (project-specific)

- Don't introduce a second ORM/query builder. Prisma is the only data layer.
- Don't add per-controller error envelopes. Use the global filter.
- Don't import `PrismaModule` in feature modules — it's `@Global()`.
- Don't downgrade `ValidationPipe` settings.
- Don't put the `api` prefix in `@Controller(...)` — `main.ts` sets it globally.
