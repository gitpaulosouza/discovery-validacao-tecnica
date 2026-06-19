---
name: back-swagger-docs
description: Fully document NestJS controllers, route handlers, and DTOs with @nestjs/swagger decorators so the generated OpenAPI spec is accurate and useful. Use when the user asks to document a controller, write Swagger annotations, improve API docs, or fix mismatched/missing OpenAPI metadata.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# swagger-docs

Use this skill when the user wants Swagger / OpenAPI annotations added or improved. The spec is generated at runtime from decorators in `src/`, so the goal is parity between code and docs.

## What "fully documented" means here

A controller is fully documented when:

1. The controller class has `@ApiTags(...)` (lowercase, kebab — matches the route).
2. Every handler has `@ApiOperation({ summary, description? })`.
3. Every handler has at least one `@Api*Response` decorator describing the success body (`@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiNoContentResponse`, `@ApiAcceptedResponse`).
4. Every realistic error case has an `@Api*Response` (`@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`, `@ApiUnprocessableEntityResponse`).
5. Protected handlers have `@ApiBearerAuth()` paired with `@UseGuards(JwtAuthGuard)`.
6. Path/query parameters are annotated with `@ApiParam` / `@ApiQuery` when they aren't a typed DTO.
7. Bodies are typed DTOs — `@ApiBody` is rarely needed if `@Body() dto: SomeDto` is present, but use it when documenting alternate shapes.

A DTO is fully documented when every field has `@ApiProperty({ ... })` (or `@ApiPropertyOptional`) with:

- `description` — what the field means in business terms.
- `example` — a realistic value, not `'string'`.
- `type` only when TS can't infer (enums, arrays of unions, generics).
- `required` is automatic from `?:` and `!:`; don't set it redundantly. For optional fields, prefer `@ApiPropertyOptional`.
- For enums: `enum: MyEnum`, `enumName: 'MyEnum'`.
- For arrays: `type: [Item]` or `isArray: true`.
- For constrained values: `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format` (e.g. `'uuid'`, `'email'`, `'date-time'`).

## Reference shapes

Controller handler:

```ts
@Post()
@ApiOperation({ summary: 'Create an item', description: 'Creates a new item owned by the caller.' })
@ApiCreatedResponse({ type: ItemEntity })
@ApiBadRequestResponse({ description: 'Validation failed' })
@ApiConflictResponse({ description: 'An item with this slug already exists' })
async create(@Body() dto: CreateItemDto): Promise<ItemEntity> { ... }
```

Protected handler:

```ts
@Get(':id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get an item by id' })
@ApiParam({ name: 'id', format: 'uuid' })
@ApiOkResponse({ type: ItemEntity })
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@ApiNotFoundResponse({ description: 'Item not found' })
async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<ItemEntity> { ... }
```

DTO field:

```ts
@ApiProperty({
  description: 'Display name shown to other users.',
  example: 'Jane Doe',
  maxLength: 120,
})
@IsString()
@MaxLength(120)
name!: string;
```

Optional DTO field:

```ts
@ApiPropertyOptional({ example: 'Jane Doe', maxLength: 120 })
@IsOptional()
@IsString()
name?: string;
```

Response entity (response-only fields, never include secrets):

```ts
export class ItemEntity {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;

  static fromPrisma(item: Item): ItemEntity {
    return Object.assign(new ItemEntity(), { id: item.id, title: item.title, createdAt: item.createdAt });
  }
}
```

## Workflow when invoked

1. Identify the target — a controller, a DTO, or a whole module. If unclear, ask.
2. Read the file(s) and the related DTO/entity classes so types in `@Api*Response` match.
3. For each handler, write decorators in this order: HTTP verb (`@Get`/`@Post`/...), guards, `@HttpCode` if non-default, `@ApiOperation`, `@ApiBearerAuth` (if guarded), `@ApiParam`/`@ApiQuery`, success `@Api*Response`, error `@Api*Response`s. This order is consistent across the codebase — match it.
4. For each DTO field, add or refine `@ApiProperty`. Keep examples realistic and matched to validators (e.g. an `@IsEmail()` field's example must be a valid email).
5. Cross-check that the global response wrapping (`{ success, data, timestamp }` from `TransformInterceptor`) is reflected in docs **only if** the user has indicated they want envelope documentation. The standard Nest pattern documents the `data` payload — keep doing that unless told otherwise.
6. Cross-check that error shapes (`{ statusCode, error, message, path, timestamp }` from `AllExceptionsFilter`) match the response classes if the user is documenting error envelopes.
7. Run `npm run build` to ensure decorators don't break compilation, then mention the user can browse `/api/docs` (or wherever `SwaggerModule.setup` is mounted in `src/main.ts`) to verify.

## Project-specific gotchas

- Don't repeat the global `api` prefix in `@ApiTags` or operation summaries; tags are the resource name.
- `@ApiResponse` with raw status codes is allowed but prefer the named decorators (`@ApiOkResponse`, etc.) — that matches the existing style in `users.controller.ts`.
- For pagination, document `page`, `limit`, etc. via `@ApiQuery` with `required: false` and a sensible `example`.
- For file uploads, use `@ApiConsumes('multipart/form-data')` plus `@ApiBody({ schema: ... })`.
- When adding response examples for the wrapped envelope, use `schema: { allOf: [...] }` patterns from `@nestjs/swagger`.
