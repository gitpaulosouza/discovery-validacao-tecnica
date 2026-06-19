import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CodeBlock } from '@/components/CodeBlock'
import { NavArrows } from '@/components/NavArrows'

function Inline({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
      {children}
    </code>
  )
}

export default function ClaudeMdPage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 6
      </Badge>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">CLAUDE.md</h1>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
        A única coisa mais impactante que você pode fazer para melhorar cada sessão do Claude Code no seu repositório.
      </p>

      <h2 className="mb-3 text-xl font-bold">O que é</h2>
      <p className="mb-6 leading-relaxed text-muted-foreground text-sm">
        <Inline>CLAUDE.md</Inline> é um arquivo markdown na raiz do repositório. O Claude Code
        o lê automaticamente no início de cada sessão — antes de você digitar qualquer mensagem.
        É como você dá ao Claude contexto permanente sobre o projeto sem precisar re-explicar
        as coisas toda vez.
      </p>

      <Separator className="my-6" />

      <h2 className="mb-3 text-xl font-bold">O que colocar</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Tudo que o Claude precisaria redescobrir a cada sessão:
      </p>
      <div className="mb-6 space-y-2">
        {[
          ['Stack e versões',       'Next.js 15, TypeScript strict, Tailwind v3, TanStack Query v5'],
          ['Comandos de execução',  'Como rodar dev, build, typecheck, lint e testes'],
          ['Convenções de pastas',  'O que fica em features/, lib/, components/ui/'],
          ['Regras de código',      'Sem tipos any, sem console.log em produção, padrão de formatação de moeda'],
          ['O que evitar',          'Não mexa em legacy/, nunca faça commit do .env, sempre atualize o .env.example'],
        ].map(([label, detail]) => (
          <Card key={label as string} size="sm" className="ring-0 border-border">
            <CardContent className="flex items-start gap-3 pt-3">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <p className="text-sm text-muted-foreground">
                <strong className="font-semibold text-foreground">{label}:</strong>{' '}{detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-6" />

      <h2 className="mb-3 text-xl font-bold">Gere com /init</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Execute <Inline>/init</Inline> na primeira sessão em qualquer repositório. O Claude
        escaneia o projeto e escreve um <Inline>CLAUDE.md</Inline> inicial. Depois edite —
        adicione tudo específico do seu fluxo que o Claude errou ou ainda não sabe.
      </p>
      <CodeBlock language="primeira sessão em qualquer repositório">{`cd seu-repo
claude
/init
# Edite CLAUDE.md para adicionar contexto específico do time`}</CodeBlock>

      <Separator className="my-6" />

      <h2 className="mb-3 text-xl font-bold">Mantenha atualizado</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        O CLAUDE.md tem mais valor quando reflete a realidade atual. Atualize sempre que
        tomar decisões de arquitetura, adicionar novas convenções, ou perceber que o Claude
        continua cometendo o mesmo erro — esse erro é sinal de que algo precisa ser documentado.
      </p>

      <Card className="ring-0 border-border">
        <CardContent className="pt-4">
          <p className="mb-4 font-semibold text-sm">Este projeto cobre em seu CLAUDE.md:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {[
              'Stack: Next.js 15, TypeScript strict, Tailwind v3, TanStack Query v5',
              'Estrutura de pastas: app/, components/ui/, features/, lib/, types/, styles/',
              'Comandos: dev, build, typecheck, lint',
              'Convenções: sem any, sem console.log, moeda em BRL via Intl.NumberFormat',
              'Comandos customizados: localização e uso do skill /frontend',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <NavArrows current="/claude-guide/claude-md" />
    </div>
  )
}
