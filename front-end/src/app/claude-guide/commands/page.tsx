import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/CodeBlock'
import { TerminalDemo } from '@/components/TerminalDemo'
import { NavArrows } from '@/components/NavArrows'

const commands = [
  {
    name: '/frontend',
    tag: 'Loomi',
    tagVariant: 'default' as const,
    description:
      'O skill customizado do time. Dois modos: scaffolda um novo layout de projeto do zero (detecta palavras como "criar projeto", "scaffold", "init"), ou executa qualquer tarefa de feature/correção/refatoração em uma base de código existente. Roda typecheck → lint → testes relacionados → build automaticamente.',
    usage: `/frontend criar uma nova página Next.js com Tailwind para listagem de produtos
/frontend corrigir o layout mobile quebrando em ProductList.tsx`,
  },
  {
    name: '/init',
    tag: null,
    tagVariant: 'secondary' as const,
    description:
      'Escaneia o repositório e gera o CLAUDE.md — um arquivo de contexto persistente que o Claude lê no início de cada sessão. Captura stack, estrutura de pastas, comandos e convenções. Execute na primeira sessão de qualquer repositório novo.',
    usage: '/init',
  },
  {
    name: '/review',
    tag: null,
    tagVariant: 'secondary' as const,
    description:
      'Revisão de código multi-agente da branch atual ou de um PR específico do GitHub. Revisa lógica, segurança, estilo e cobertura de testes. Execute antes de abrir um PR — ele encontra o que você perde depois de olhar para o próprio código.',
    usage: `/review           # revisar branch atual
/review 42        # revisar PR #42`,
  },
  {
    name: '/security-review',
    tag: null,
    tagVariant: 'secondary' as const,
    description:
      'Auditoria de segurança focada nas alterações pendentes. Verifica problemas da classe OWASP top-10: injeção, falhas de auth, exposição de dados, dependências mal configuradas. Ideal rodar antes de fazer merge na main.',
    usage: '/security-review',
  },
  {
    name: '/compact',
    tag: null,
    tagVariant: 'secondary' as const,
    description:
      'Resume e compacta a conversa atual quando o contexto fica longo. Mantém as respostas rápidas. Use quando perceber que as respostas do Claude começam a ficar lentas ou imprecisas em sessões longas.',
    usage: '/compact',
  },
]

export default function CommandsPage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 5
      </Badge>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Comandos</h1>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
        Fluxos de trabalho pré-prontos invocados com uma única linha em qualquer prompt do Claude Code.
      </p>

      <div className="mb-8 grid gap-4">
        {commands.map(({ name, tag, description, usage }) => (
          <Card key={name} className="ring-0 border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <code className="rounded-lg bg-[#0f0f0f] px-3 py-1.5 font-mono text-sm font-medium text-primary">
                  {name}
                </code>
                {tag && (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">
                    {tag}
                  </Badge>
                )}
              </div>
              <CardDescription className="leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock language="uso">{usage}</CodeBlock>
            </CardContent>
          </Card>
        ))}
      </div>

      <TerminalDemo
        title="O skill /frontend em ação"
        description="Da digitação do comando até o build passar — o Claude lê os arquivos, implementa e roda typecheck + lint automaticamente."
        steps={[
          { role: 'user',   text: '/frontend adicionar skeleton loading no ProductList' },
          { role: 'claude', text: 'Reading src/features/products/components/ProductList.tsx...' },
          { role: 'claude', text: 'Reading src/components/ui/skeleton.tsx...' },
          { role: 'claude', text: 'Editing ProductList.tsx — wrapping items with SkeletonCard while isLoading' },
          { role: 'claude', text: 'typecheck ✓   lint ✓   build ✓' },
          { role: 'claude', text: 'Skeleton renders on every fetch. No console.log, no any types.' },
        ]}
      />

      <Card className="ring-0 border-amber-200/60 bg-amber-50/50">
        <CardContent className="pt-4">
          <p className="mb-1 text-sm font-semibold text-amber-900">Criando comandos customizados</p>
          <p className="text-sm leading-relaxed text-amber-800">
            Qualquer arquivo <code className="font-mono text-xs">.md</code> em{' '}
            <code className="font-mono text-xs">.claude/commands/</code> vira um slash command.
            Escreva as instruções no arquivo, use{' '}
            <code className="font-mono text-xs">$ARGUMENTS</code> para receber input, e invoque
            pelo nome do arquivo. O skill <code className="font-mono text-xs">/frontend</code>{' '}
            é construído exatamente assim.
          </p>
        </CardContent>
      </Card>

      <NavArrows current="/claude-guide/commands" />
    </div>
  )
}
