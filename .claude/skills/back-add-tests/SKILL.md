---
name: back-add-tests
description: Write or improve Jest unit tests (`*.spec.ts`) and Supertest e2e tests (`test/*.e2e-spec.ts`) for this NestJS back-end. Use when the user asks to add tests, improve coverage, fix flakey tests, or test a specific service/controller/module.
---

> **Scope:** este skill opera sobre o workspace `back-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# add-tests

Use this skill when the user wants tests added or improved. The repo uses **Jest** for unit tests and **Supertest** for e2e tests, both already configured (`npm test`, `npm run test:e2e`).

## Layout

- **Unit tests** — `*.spec.ts` next to the file under test. One file per class.
  Example: `src/modules/users/users.service.spec.ts` next to `users.service.ts`.
- **E2E tests** — `test/*.e2e-spec.ts`, configured by `test/jest-e2e.json`.
  Each file boots the full app via `Test.createTestingModule(...).compile()` and exercises HTTP routes through Supertest.

## When to write a unit test vs an e2e test

Unit test the thing if:

- The class has business logic worth covering in isolation (services, guards, interceptors, complex DTO transformations).
- You need to assert behavior on errors / branches that are awkward to trigger end-to-end.

E2E test the thing if:

- It's a public route. Cover the **happy path of every new HTTP route** plus its main failure modes (401 when unauth'd, 404 when missing, 400 when invalid).
- The contract spans Nest pipes/filters/interceptors/guards (validation, error envelope, response envelope, auth) — only e2e proves these wire together correctly.

Don't unit test things with no logic (a controller method that just calls one service method and maps the result — let e2e cover it).

## Unit test pattern (service with Prisma)

Mock `PrismaService` shape-by-shape — only the methods the unit under test actually calls.

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('throws ConflictException when email already exists', async () => {
    const err = Object.assign(new Error('unique'), { code: 'P2002' });
    Object.setPrototypeOf(err, require('@prisma/client').Prisma.PrismaClientKnownRequestError.prototype);
    prisma.user.create.mockRejectedValueOnce(err);

    await expect(
      service.create({ email: 'a@b.c', password: 'pw12345678' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

Notes:

- Use `Test.createTestingModule(...).compile()` — it wires DI exactly like production.
- Replace dependencies with `{ provide: Class, useValue: mock }`. Don't try to instantiate `PrismaClient`.
- Assert on **behavior** (was the right method called with the right args, was the right exception thrown), not on internal state.
- For Prisma known-error branches, instantiate a real `Prisma.PrismaClientKnownRequestError` so `instanceof` checks in the service code match.

## Unit test pattern (controller with guard)

Override the guard via Nest's testing utilities so you don't need real JWTs.

```ts
const moduleRef = await Test.createTestingModule({
  controllers: [ItemsController],
  providers: [{ provide: ItemsService, useValue: itemsServiceMock }],
})
  .overrideGuard(JwtAuthGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

## E2E test pattern

E2E tests **must** apply the same global wiring as `main.ts` (ValidationPipe, global filter, global interceptor, `setGlobalPrefix('api')`). Otherwise tests don't reflect production. Extract a `setupApp` helper if you find yourself copying it around.

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Items (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /api/items returns wrapped envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/items').expect(200);
    expect(res.body).toMatchObject({ success: true, data: expect.any(Array) });
  });

  it('POST /api/items rejects unknown fields with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/items')
      .send({ title: 'ok', extra: 'nope' })
      .expect(400);
  });
});
```

## Database in e2e

Two options, in order of preference:

1. **Stub the data layer** — provide a fake `PrismaService` via `.overrideProvider(PrismaService).useValue(...)`. Fast, deterministic, no external deps. Prefer this for route-level contract tests.
2. **Talk to a throwaway SQLite file** — only if the user asks for true integration coverage. Use a separate `DATABASE_URL=file:./test.db` via `.env.test`, run `npx prisma migrate deploy` against it, wrap each test in a transaction or truncate between tests, and delete the file in `afterAll`.

Do **not** point e2e tests at the dev database (`prisma/dev.db`). Lost work has happened that way.

## Conventions

- One `describe` per class / route group; nested `describe` per method / verb.
- Test names start with the behavior, not the method: `'returns 404 when item is missing'`, not `'findOne'`.
- Use `it.each` for table-driven cases.
- Avoid snapshot tests for API responses unless the response shape is genuinely large and stable — they rot quickly.
- Don't test framework behavior (Nest's pipe behavior, Prisma's query syntax). Test your code.
- Don't share state between tests via module-level `let`. Reset in `beforeEach`.

## Workflow when invoked

1. Identify the unit-under-test from the user's request.
2. Decide unit vs e2e (or both) using the table above.
3. Read the file under test plus its dependencies' types so mocks match real signatures.
4. Write tests covering: happy path, every thrown exception, every guarded branch, every non-trivial conditional.
5. Run `npm test` (or `npm run test:e2e`) and iterate until green.
6. If coverage is the goal, run `npm run test:cov` and target the uncovered branches the user cares about — don't chase 100%.

## Don'ts

- Don't mock `PrismaClient` directly — mock `PrismaService`.
- Don't bypass global pipes/filters/interceptors in e2e tests; replicate them.
- Don't use real network in unit tests.
- Don't write tests that pass without an assertion (`expect` must be reached).
- Don't seed the dev DB from a test.
