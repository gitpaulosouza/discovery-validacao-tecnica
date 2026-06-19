# Front-end

Aplicação web construída com **Next.js 15** (App Router), **TypeScript** (strict), **Tailwind CSS** e **TanStack Query v5** para estado de servidor.

## Arquitetura

A organização separa **rotas**, **features de domínio** e **UI reutilizável**:

- **`src/app/`** — rotas e layouts do App Router. Aqui ficam *somente* páginas, layouts e composição. A lógica de domínio é importada de `features/`.
- **`src/features/<dominio>/`** — módulos auto-contidos por domínio (ex: `auth`, `users`). Cada feature dona dos seus componentes, hooks de dados e chamadas de API.
- **`src/components/`** — componentes compartilhados entre features. `components/ui/` guarda primitivos genéricos (button, input, etc.) sem regra de negócio.
- **`src/lib/`** — utilitários compartilhados: cliente HTTP (`api.ts`), armazenamento de token, helpers.
- **`src/types/`** — tipos TypeScript compartilhados.
- **`src/styles/`** — CSS global e tokens de tema.

Toda chamada à API passa por hooks do React Query dentro de `features/<dominio>/hooks/` — nunca chame `fetch` direto de uma página.

Grupos de rota delimitam áreas de layout sem afetar a URL:

- `(auth)/` — telas públicas (login, sign-up). Layout próprio.
- `(app)/` — telas autenticadas. Usa `RequireAuth` no layout para proteger as rotas.

## Estrutura de pastas

```
front-end/
├── public/                     # assets estáticos (logos, imagens)
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # layout raiz (providers globais)
│   │   ├── page.tsx            # home
│   │   ├── (auth)/             # grupo de rotas públicas
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   └── sign-up/
│   │   └── (app)/              # grupo de rotas autenticadas
│   │       ├── layout.tsx      # exige autenticação
│   │       ├── _components/    # componentes locais do grupo
│   │       └── account/
│   ├── components/             # UI compartilhada entre features
│   │   ├── ui/                 # primitivos (sem regra de negócio)
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── features/               # módulos por domínio
│   │   ├── auth/
│   │   │   ├── api.ts          # chamadas HTTP da feature
│   │   │   ├── components/     # ex: RequireAuth, formulários
│   │   │   ├── hooks/          # hooks do React Query
│   │   │   └── keys.ts         # query keys
│   │   └── users/
│   ├── lib/
│   │   ├── api.ts              # cliente HTTP base
│   │   ├── token-store.ts      # armazenamento do token
│   │   └── utils.ts
│   ├── styles/                 # CSS global
│   └── types/                  # tipos compartilhados
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Convenções

- **Server vs Client Components:** prefira Server Components por padrão. Use `'use client'` apenas onde há interatividade, hooks de estado/efeito ou React Query.
- **Dados:** todo acesso a API passa por hooks em `features/<dominio>/hooks/`. Defina `query keys` em `features/<dominio>/keys.ts` para invalidação consistente.
- **Imagens:** sempre via `<Image>` do Next.js, com `alt` e `sizes` definidos.
- **Tipos:** sem `any`. Sem `console.log` em produção.
- **Moeda:** formate com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **UI primitiva:** componentes em `components/ui/` são genéricos — não importem de `features/`.
- **Features são auto-contidas:** uma feature pode importar de `components/` e `lib/`, mas **não** de outra feature. Se duas features compartilham algo, suba para `components/` ou `lib/`.

## Fluxo de dados

```
Página (Server) → Componente (Client) → hook React Query → features/<x>/api.ts → lib/api.ts → API back-end
```

O cache do React Query é a fonte da verdade para dados de servidor no cliente. Mutations invalidam as `query keys` afetadas — não atualize cache manualmente quando uma invalidação resolve.
