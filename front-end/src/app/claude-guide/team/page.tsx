import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/CodeBlock'
import { TerminalDemo } from '@/components/TerminalDemo'
import { NavArrows } from '@/components/NavArrows'

const checklist = [
  'Nenhum tipo any introduzido em arquivos TypeScript',
  'Nenhum console.log deixado em código de produção',
  'Estados de loading e erro tratados onde dados são buscados',
  'Elementos interativos são acessíveis por teclado e têm labels',
  'Sem inline styles — use o sistema de estilos do projeto',
  '.env.example atualizado se novas variáveis de ambiente foram adicionadas',
]

const tips = [
  ['Explore antes de mudar', 'Peça ao Claude para explicar o código relevante antes de pedir para mudá-lo. Menos edições erradas.'],
  ['Seja específico no escopo', '"Corrija auth.ts:42" é mais rápido que "corrija o bug de auth". Arquivo + linha supera descrição vaga.'],
  ['Interrompa cedo', 'Se o Claude começar a ir na direção errada, pressione Escape imediatamente. Quanto mais esperar, mais para desfazer.'],
  ['Mantenha o CLAUDE.md atual', 'Ao tomar uma decisão de arquitetura ou encontrar uma nova convenção, adicione. Sessões futuras e futuros colegas se beneficiam.'],
  ['Deixe ele rodar os testes', 'Após qualquer alteração de código, diga "rode os testes relacionados". O Claude encontra o comando e reporta as falhas.'],
]

export default function TeamPage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 7
      </Badge>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Fluxo do Time</h1>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
        Como o time de produto da Loomi usa o Claude Code no dia a dia — o skill customizado,
        o fluxo de PR e as dicas que mais economizam tempo.
      </p>

      <h2 className="mb-4 text-2xl font-bold">O skill /frontend</h2>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        O comando customizado do time está em{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          .claude/commands/frontend.md
        </code>
        . Ele detecta automaticamente qual modo usar baseado no seu prompt.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="ring-0 border-primary/20 bg-primary/5">
          <CardHeader>
            <Badge className="mb-1 w-fit bg-primary/15 text-primary border-0 text-xs font-mono">
              MODO 1
            </Badge>
            <CardTitle className="text-lg font-bold text-foreground">
              Scaffold de Projeto
            </CardTitle>
            <CardDescription className="leading-relaxed">
              Ativado por palavras como &ldquo;criar projeto&rdquo;, &ldquo;scaffold&rdquo;,
              &ldquo;init&rdquo;. O Claude pergunta sobre sua stack, depois gera a estrutura
              completa de pastas, arquivos de config e código inicial. Roda{' '}
              <code className="font-mono text-xs">npm install</code> +{' '}
              <code className="font-mono text-xs">npm run build</code> para verificar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock language="exemplo">{`/frontend criar uma view de produtos
com Next.js, Tailwind e React Query`}</CodeBlock>
          </CardContent>
        </Card>

        <Card className="ring-0 border-border">
          <CardHeader>
            <Badge variant="secondary" className="mb-1 w-fit text-xs font-mono">
              MODO 2
            </Badge>
            <CardTitle className="text-lg font-bold">Feature / Correção / Refatoração</CardTitle>
            <CardDescription className="leading-relaxed">
              Modo padrão para tarefas em base de código existente. Lê os arquivos
              relevantes primeiro, implementa a mudança seguindo as convenções, depois
              roda o pipeline de qualidade automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock language="exemplos">{`/frontend adicionar skeleton loading no ProductList
/frontend corrigir layout mobile no ProductCard.tsx
/frontend refatorar useCart para usar Zustand`}</CodeBlock>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-xl font-bold">Checklist de qualidade automático</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Toda tarefa <code className="font-mono text-xs rounded bg-muted px-1.5 py-0.5">/frontend</code>{' '}
        roda este checklist automaticamente antes de reportar como concluída:
      </p>
      <div className="mb-8 grid gap-2">
        {checklist.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
              ✓
            </span>
            <span className="text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>

      <TerminalDemo
        title="Ritual pré-PR com /review"
        description="Revisão multi-agente da branch atual — o Claude audita lógica, segurança e estilo antes do PR chegar nos colegas."
        steps={[
          { role: 'user',   text: '/review' },
          { role: 'claude', text: 'Reviewing branch feat/dark-mode (3 commits)...' },
          { role: 'claude', text: '[Logic]    ThemeContext updates correctly on toggle ✓' },
          { role: 'claude', text: '[Security] No new attack surface introduced ✓' },
          { role: 'claude', text: '[Style]    Missing aria-label on toggle in settings/page.tsx:47' },
          { role: 'claude', text: '[Style]    Button lacks keyboard focus ring — add focus-visible:ring-2' },
          { role: 'claude', text: 'Review complete. Fix 2 accessibility issues before merging.' },
        ]}
      />

      <h2 className="mb-3 text-xl font-bold">Antes de cada PR</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Execute <code className="font-mono text-xs rounded bg-muted px-1.5 py-0.5">/review</code>{' '}
        antes de abrir um PR. Ele encontra problemas que você perde depois de olhar para o próprio código.
      </p>
      <CodeBlock language="ritual pré-PR">{`# Após suas alterações estarem commitadas em uma branch
/review

# Ou para um PR específico
/review 42`}</CodeBlock>

      <h2 className="mb-4 mt-8 text-xl font-bold">Dicas do time</h2>
      <div className="grid gap-3">
        {tips.map(([title, tip]) => (
          <Card key={title as string} size="sm" className="ring-0 border-border transition-shadow hover:shadow-sm">
            <CardContent className="pt-3">
              <p className="mb-1 text-sm font-semibold">{title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{tip}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <NavArrows current="/claude-guide/team" />
    </div>
  )
}
