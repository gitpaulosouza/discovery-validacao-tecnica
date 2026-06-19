---
name: front-ui-ux
description: Apply UI/UX and accessibility best practices to Next.js + React + Tailwind interfaces — semantic HTML, WCAG-level a11y (labels, focus, keyboard, contrast), responsive and mobile-first layout, dark-mode tokens, loading/empty/error states, form ergonomics (autocomplete, inputmode, validation messaging), motion with prefers-reduced-motion, microcopy and error voice. Use whenever the user builds or reviews UI — pages, components, forms, modals, lists, navigation, layouts — or asks to make something more accessible, usable, mobile-friendly, or polished.
---

> **Scope:** este skill opera sobre o workspace `front-end/`. Execute comandos e interprete caminhos relativos a esse diretório.

# nextjs-ui-ux

Build interfaces a real human can use on a 5-year-old phone with a screen reader and a flaky network. Most "design" problems are actually missing states (loading, empty, error) and missing semantics (label, role, focus order).

## Always-deliver checklist

For any new screen or component:
1. Renders correctly at **360px** width (smallest reasonable phone).
2. Reachable and operable with **keyboard only** (Tab, Shift+Tab, Enter, Space, Arrow keys, Esc).
3. Has explicit states: **loading**, **empty**, **error**, **success**.
4. Inputs have **labels**, errors are **announced**, the focused element is **visible**.
5. No layout shift on load; no content-jumping when async data arrives.
6. Color is never the sole carrier of meaning (icons + text alongside).

If any of those is missing, the component isn't done.

## Semantic HTML first

Reach for the right element before `div`. The element does the a11y work for free.

| Use | Don't use |
|---|---|
| `<button>` for actions | `<div onClick>` |
| `<a href>` for navigation | `<button onClick={() => router.push()}>` for nav |
| `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` | `<div className="main">` |
| `<label htmlFor>` + `<input id>` | placeholder-as-label |
| `<dialog>` or modal with focus trap | nested `div` overlay without focus management |
| `<ul><li>` for lists | repeated `<div>`s |

Never disable the native `:focus-visible` outline globally without replacing it with a visible alternative.

## ARIA, sparingly

Rule: **no ARIA is better than wrong ARIA**. Use it to fill gaps the platform leaves:
- `aria-label` for icon-only buttons.
- `aria-live="polite"` regions for async toast/inline notifications.
- `aria-current="page"` on the active nav link.
- `aria-invalid` + `aria-describedby` linking the input to its error message.
- `role="status"` on loading regions so screen readers announce them.

Anti-patterns: `role="button"` on a `<div>` instead of using a `<button>`; `aria-label` that duplicates visible text; `aria-hidden="true"` on focusable elements.

## Forms

The accessibility, error UX, and keyboard handling of a form is 80% of its quality.

```tsx
<label htmlFor="email" className="text-sm font-medium">E-mail</label>
<input
  id="email"
  name="email"
  type="email"
  autoComplete="email"
  inputMode="email"
  required
  aria-invalid={hasError || undefined}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError ? <p id="email-error" className="text-xs text-destructive">{error}</p> : null}
```

Rules:
- Always pair `<label htmlFor>` and `<input id>`. Never rely on placeholder.
- Use `autoComplete` correctly: `email`, `current-password`, `new-password`, `name`, `tel`, `street-address`, `postal-code`, `cc-number`. Browsers and password managers depend on this.
- Use `inputMode` (`numeric`, `decimal`, `tel`, `email`, `url`) so mobile keyboards adapt.
- For passwords: `autoComplete="new-password"` on sign-up/reset, `current-password` on sign-in.
- Submit on Enter. Disable the submit button while the request is pending and show a spinner; never both block AND give no feedback.
- Validate **on blur** for inline feedback, **on submit** for the canonical check. Don't validate on every keystroke (noisy).
- Error messages: name what's wrong and how to fix. "Invalid input" is useless. "E-mail must include @" is actionable.

## States

### Loading
- Use `<Suspense>` with skeletons that match the final layout — same height/width — to prevent CLS.
- For mutations, disable the button + show `<Loader2 className="animate-spin" />` + status text ("Salvando…").
- For long ops (>2s), show progress; for very long (>10s), show what's happening and offer cancel.

### Empty
- Empty list ≠ blank page. Show: title ("No orders yet"), description, illustration (optional), primary action ("Create one").

### Error
- Inline (failed save) and full-screen (page crash) variants.
- Show: what failed, what to do next, and — for transient errors — a "Try again" button. Don't surface raw stack traces.
- Use Next's `error.tsx` for the route-level boundary; throw nothing past it.

### Success
- Confirm changes with a brief, unobtrusive notification. Then **return focus** to where it makes sense (the saved item, or back to the list).

## Responsive design

Mobile-first. Start with the small layout, layer up with breakpoints.

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

- Tap targets ≥ **44×44 px** (iOS) / **48×48** (Material).
- Don't hide critical actions behind hover. Hover doesn't exist on touch.
- Use `clamp()` or fluid typography for headings: `text-[clamp(1.5rem,3vw,2.25rem)]`.
- Test at 360, 768, 1024, 1440. Browser devtools → mobile mode.
- Avoid horizontal scroll. `overflow-x-auto` on intentional scrollers only.

## Dark mode

If the design system supports both, expose them as CSS variables on `:root` and `.dark` (already the convention here). Components should read tokens (`bg-background`, `text-foreground`), never hex values. Test contrast in both modes — purple-on-purple looks different in dark.

## Color & contrast

- WCAG AA: **4.5:1** for body text, **3:1** for large text and UI components.
- Don't use color alone for state. Pair red errors with an icon + text.
- Avoid pure `#000000` on `#FFFFFF` — too harsh. The repo's tokens use OKLCH which gives perceptually even contrast.

## Motion

- Respect `prefers-reduced-motion`. With Framer Motion, gate animations:

```tsx
import { useReducedMotion } from 'framer-motion'
const reduce = useReducedMotion()
<motion.div animate={reduce ? {} : { y: [0, -4, 0] }} />
```

- Prefer **opacity + transform** (composited, cheap) over `width`/`height` (layout-thrashing) for transitions.
- Animations should serve a purpose: orient the user, reveal content, confirm an action. No idle bling.

## Navigation & focus

- Active route should be visually **and** programmatically distinct (`aria-current="page"`).
- After a route change, move focus to the new `<h1>` (or the main landmark) so screen readers announce the new page.
- Modal/dialog: trap focus inside, restore to the trigger on close. `<dialog>` element does this natively.
- Esc closes the topmost dismissible thing (modal, popover, command palette).

## Keyboard map

For interactive composites (combobox, listbox, tabs, menu), follow the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) keyboard model. Don't invent your own. Or — better — use a vetted primitive (Base UI, Radix, Headless UI) which already implements them.

## Microcopy

- **Voice**: human, brief, specific. Match the project's language (this app is `pt-BR`).
- **Buttons** are verbs: "Salvar", "Excluir conta", "Criar". Not "OK".
- **Errors** state the problem and the next step.
- **Empty states** suggest action: "Você ainda não tem pedidos. Criar o primeiro?"
- Avoid jargon, exclamation points, and "Oops!" — they undermine trust on serious errors.

## Images and icons

- `next/image` with `alt` (empty string only when purely decorative). Always set `sizes` for responsive.
- Icon-only buttons need `aria-label`. Decorative icons can be `aria-hidden="true"`.
- Logos are images, not background CSS — they need `alt`.

## What to flag in review

- `<div onClick>` where a `<button>` belongs.
- Inputs without `<label htmlFor>` or `aria-label`.
- Missing `autoComplete` / `inputMode` on text inputs.
- No loading / empty / error state for an async list.
- Color used as the sole indicator of state.
- Focus styles disabled (`outline-none`) without a replacement.
- Animations that ignore `prefers-reduced-motion`.
- Text below 14px for body copy or contrast under 4.5:1.
- Buttons disabled with no spinner/explanation while a mutation is pending.
- Tap targets smaller than 44px on touch UIs.
- Modal without focus trap or Esc-to-close.
