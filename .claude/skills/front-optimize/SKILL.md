---
name: front-optimize
description: Optimize Next.js (App Router) + TypeScript code for performance and bundle size — Server vs Client components, async data, Suspense + streaming, dynamic imports, next/image, next/font, route segment caching/revalidation, memoization, React Query usage, and Web Vitals. Use whenever the user asks to make pages or components faster, reduce bundle size, fix slow renders, or improve Lighthouse / Core Web Vitals. Also trigger when reviewing newly added components for performance, when adding heavy dependencies, or when introducing new data fetching.
---

> **Scope:** este skill opera sobre o workspace `front-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# nextjs-optimize

Make Next.js App Router code faster and lighter without changing behavior. Apply the smallest change that fixes the measured problem first; avoid speculative optimization.

## Decision order

1. **Render strategy** — does this need to be a Client Component at all?
2. **Data fetching** — is it on the right side (server vs client) and cached correctly?
3. **Bundle** — what's shipping to the client that doesn't need to?
4. **React work** — is the component re-rendering more than it should?

If you can't measure the win, don't merge the change.

## Server vs Client components

Default to Server Components. Only mark a file `'use client'` when it needs:
- React state (`useState`, `useReducer`, `useRef` for live values)
- Effects (`useEffect`, `useLayoutEffect`)
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers attached at the boundary (`onClick`, `onChange`)
- Third-party libs that read browser APIs

Anti-patterns to flag:
- `'use client'` at a route's top-level page when only a leaf needs interactivity. Push the boundary down — keep the page server, extract the interactive bit into a small client component.
- Importing a server-only module (`next/headers`, `next/cache`, secrets) inside a `'use client'` file.
- Passing non-serializable props (functions, classes, Dates as instances) from server to client. Serialize first or move the work.

```tsx
// app/dashboard/page.tsx — Server Component
import { fetchOrders } from '@/features/orders/api'
import { OrdersTable } from './OrdersTable.client'

export default async function DashboardPage() {
  const orders = await fetchOrders()
  return <OrdersTable initialOrders={orders} />
}
```

## Streaming with Suspense

Wrap slow data sub-trees in `<Suspense>` so the rest of the page streams immediately. Co-locate the fallback skeleton next to the suspended component.

```tsx
<Suspense fallback={<OrdersSkeleton />}>
  <OrdersList />
</Suspense>
```

Always wrap any client component that calls `useSearchParams()`, `useSelectedLayoutSegment()`, or other CSR-bailout hooks in a `<Suspense>` boundary — otherwise `next build` fails to prerender that route.

## Data fetching & caching

- **Server fetch**: `fetch()` in Server Components is automatically memoized per request. Use `next: { revalidate: 60 }` for ISR or `cache: 'no-store'` for fully dynamic.
- **Parallel** independent fetches with `Promise.all([...])`. Sequential `await` chains are the most common server-side perf bug.
- **Client fetch**: use TanStack Query. Set `staleTime` so the cache actually deduplicates. The default of `0` causes refetch storms.
- **Mutation invalidation**: scope `queryClient.invalidateQueries({ queryKey })` to the smallest key prefix that needs to refresh — never invalidate `[]`.
- **Server Actions** for mutations from forms; they avoid a custom POST endpoint and integrate with `revalidatePath` / `revalidateTag`.

```ts
// Per-route segment config
export const revalidate = 60       // ISR every 60s
export const dynamic = 'force-static' | 'force-dynamic' | 'auto'
```

## Bundle size

- Run `ANALYZE=true npm run build` (with `@next/bundle-analyzer`) before guessing. Look for big leaves and duplicate libs.
- `dynamic(() => import(...))` (`next/dynamic`) for heavy client-only widgets — charts, editors, maps.
- Prefer named imports from libraries that ship as ES modules so tree-shaking works. Watch out for libs that re-export everything from a barrel and effectively prevent tree-shaking.
- For icon libraries (lucide-react, heroicons), import individually: `import { Loader2 } from 'lucide-react'` — never the whole namespace.
- Avoid `moment` (use `date-fns` or `Intl.DateTimeFormat`); avoid `lodash` full import (use `lodash/fn` or hand-rolled equivalents).

## Images

Always use `next/image`. Required:
- `alt` (empty string for decorative; never omit)
- `width`+`height` OR `fill`+a sized parent
- `sizes` whenever using `fill` or responsive widths — without it, the browser downloads the largest variant
- `priority` only for above-the-fold LCP images (hero, logo). Don't sprinkle.

## Fonts

Use `next/font` (Google or local). It self-hosts, eliminates the FOUT, and avoids a render-blocking external request.

```ts
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
```

## React performance

- Co-locate state. Lifting state too high causes huge re-render trees — keep it as low as possible.
- `useMemo` / `useCallback` only when (a) the value is referenced by another memoized component or hook dep, or (b) the computation is measurable. Wrapping every value is noise.
- `React.memo` on components that re-render with identical props inside a hot list. Otherwise it's a memory cost for nothing.
- For long lists, virtualize (`react-virtual`, `react-window`) past ~200 visible rows.
- Stable keys: never `key={index}` on a list that can reorder or filter.

## Route handlers (`app/api/*`)

- Set `export const runtime = 'edge'` only when the handler is small, doesn't need Node APIs, and benefits from low cold-start. Otherwise `'nodejs'` (default) is fine.
- Prefer Server Actions over route handlers when the consumer is your own UI.

## Web Vitals

Measure on real pages with the production build:

```bash
npm run build && npm run start
# then run Lighthouse / use the Web Vitals tab
```

Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.

Common wins: ship fewer client components, preload the LCP image, eliminate layout shift on font load (`display: swap`), reserve space for async-loaded content.

## What to flag in review

- `'use client'` on the page when only a button needs it.
- Sequential `await`s of independent server fetches.
- `useEffect` doing data fetching that should live in TanStack Query / Server Components.
- Unmemoized `staleTime: 0` on every `useQuery`.
- `<img>` instead of `<Image>`; missing `sizes`.
- `console.log` in production code (CLAUDE.md violation).
- Default-imported giant libraries inside client bundles.
- New dependency added without measuring bundle delta.
