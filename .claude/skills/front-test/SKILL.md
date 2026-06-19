---
name: front-test
description: Set up and write tests for a Next.js (App Router) + TypeScript app — Vitest + React Testing Library for unit/component tests, Playwright for end-to-end, MSW for HTTP mocking, axe for a11y, and TanStack Query test patterns. Use whenever the user asks to add tests, set up a testing stack, increase coverage, fix flaky tests, write E2E for a flow, mock APIs, or test a specific component/hook/page. Also trigger when reviewing PRs that add features without tests, or when refactoring tests.
---

> **Scope:** este skill opera sobre o workspace `front-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# nextjs-test

Test what would burn you in production: behavior, not implementation. Prefer Testing Library queries that mirror what a user does (`getByRole`, `getByLabelText`) over selectors that leak structure (`getByTestId`, `container.querySelector`).

## Test pyramid for this stack

| Layer | Tool | What goes here |
|---|---|---|
| Unit | Vitest | Pure functions, helpers, hooks (with renderHook), reducers |
| Component | Vitest + React Testing Library | Single component behavior, accessibility, edge cases |
| Integration | Vitest + RTL + MSW | A page or feature with real React Query, mocked HTTP |
| E2E | Playwright | Critical user journeys end-to-end against `npm run dev` or `npm run start` |

Keep ~70% unit/component, ~20% integration, ~10% E2E. E2E is slow and flakey — reserve for the flows you'd refuse to ship without.

## Stack setup

Install:
```bash
npm i -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw @playwright/test \
  vitest-axe
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/app/**/layout.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
```

`test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`package.json` scripts:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test"
}
```

## Component tests

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoginForm } from './LoginForm'

describe('<LoginForm>', () => {
  it('submits with the typed credentials', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'sup3rsecret')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com', password: 'sup3rsecret' })
  })

  it('disables the submit button while pending', () => {
    render(<LoginForm pending />)
    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled()
  })
})
```

Rules:
- Query by role/label first. Reach for `getByText` for prose, `getByTestId` only when nothing else fits.
- Use `userEvent` (not `fireEvent`) — it simulates real interaction including focus and keyboard.
- Assert visible behavior (buttons disabled, text shown), not internal state.

## Hook tests

```ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCurrentUser } from './useCurrentUser'

function withQuery(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

it('returns user when authenticated', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { result } = renderHook(() => useCurrentUser(), { wrapper: withQuery(client) })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.email).toBe('a@b.com')
})
```

Always pass a fresh `QueryClient` per test with `retry: false` — otherwise failed mutations retry and tests time out.

## HTTP mocking with MSW

```ts
// test/msw/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('http://localhost:3001/api/auth/login', async () => {
    return HttpResponse.json({
      success: true,
      data: { accessToken: 'a', refreshToken: 'r' },
      timestamp: new Date().toISOString(),
    })
  }),
]
```

Override per-test with `server.use(...)` for error cases. `onUnhandledRequest: 'error'` ensures every test mocks what it touches.

## Accessibility tests

```ts
import { axe } from 'vitest-axe'
import { render } from '@testing-library/react'

it('has no a11y violations', async () => {
  const { container } = render(<LoginPage />)
  expect(await axe(container)).toHaveNoViolations()
})
```

Run on each top-level page and complex component. Catches missing labels, contrast issues, role mismatches.

## Server Component tests

Server Components are async. Call the function and assert on the returned tree:
```ts
import DashboardPage from '@/app/dashboard/page'
const ui = await DashboardPage({})
render(ui)
```
For data dependencies, mock the imported fetch helper — don't try to spin up the App Router.

## Playwright E2E

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
```

E2E test:
```ts
import { test, expect } from '@playwright/test'

test('user signs up and lands on /account', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel(/e-mail/i).fill(`u${Date.now()}@e2e.test`)
  await page.getByLabel(/senha/i).fill('sup3rsecret')
  await page.getByRole('button', { name: /criar conta/i }).click()
  await expect(page).toHaveURL(/\/account/)
  await expect(page.getByRole('heading', { name: /olá/i })).toBeVisible()
})
```

E2E hygiene:
- Reset the database between runs (script that truncates / re-seeds).
- Use unique emails per test (`Date.now()` or `crypto.randomUUID()`).
- Avoid `page.waitForTimeout(...)` — use `expect(...).toBeVisible()` which auto-retries.

## What to flag in review

- New feature without a test for the happy path and the failure path.
- `expect(...).toBe(true)` on internal state — assert visible behavior instead.
- Tests that pass with `.skip()` or `it.only(...)` left in.
- `setTimeout`/`waitForTimeout` to "let things settle" — replace with `waitFor` or a real assertion.
- `getByTestId` where a role/label query exists.
- Snapshot tests of large trees: brittle and review-noisy. Prefer focused assertions.
- Missing `onUnhandledRequest: 'error'` in MSW setup, hiding accidental real network calls.
- Tests that share state across files (global mutable mocks, no resetHandlers).
