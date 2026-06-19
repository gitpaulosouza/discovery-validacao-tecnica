import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CodeBlock } from '@/components/CodeBlock'
import { TerminalDemo } from '@/components/TerminalDemo'
import { NavArrows } from '@/components/NavArrows'

function Inline({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
      {children}
    </code>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs shadow-sm">
      {children}
    </kbd>
  )
}

export default function BasicsPage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 3
      </Badge>
      <h1 className="mb-8 text-4xl font-bold tracking-tight">Como Usar</h1>

      <h2 className="mb-3 text-xl font-bold">Iniciando uma sessão</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Duas formas de iniciar. O modo interativo é o padrão — mantém o contexto completo
        entre turnos e é ideal para qualquer tarefa não-trivial.
      </p>
      <CodeBlock language="bash">{`claude                                  # modo interativo (recomendado)
claude "corrigir o 401 em auth.service.ts"  # one-shot, sai ao terminar`}</CodeBlock>

      <TerminalDemo
        title="Iniciando o modo interativo"
        description="Abra uma sessão, dê uma tarefa e veja o Claude navegar pelo repositório em tempo real."
        steps={[
          { role: 'user',   text: 'claude' },
          { role: 'claude', text: 'Claude Code ready. What would you like to work on?' },
          { role: 'user',   text: 'Explique como funciona o middleware de autenticação' },
          { role: 'claude', text: 'Reading src/middleware/auth.ts...' },
          { role: 'claude', text: 'Reading src/lib/jwt.ts...' },
          { role: 'claude', text: 'The auth middleware validates JWT tokens on every protected route. It extracts the Bearer token, calls jwt.verify(), and attaches the decoded payload to req.user.' },
          { role: 'claude', text: 'Want me to trace a specific route or explain the token refresh flow?' },
        ]}
      />

      <Separator className="my-8" />

      <h2 className="mb-3 text-xl font-bold">Escrevendo bons prompts</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Específico supera vago — quanto mais contexto você der, menos vai e vem.
      </p>
      <div className="mb-6 overflow-hidden rounded-xl border border-border text-sm">
        <div className="grid grid-cols-2 border-b border-border bg-muted/50">
          <div className="px-4 py-3 font-semibold text-red-500/80">Muito vago</div>
          <div className="border-l border-border px-4 py-3 font-semibold text-emerald-600">Específico</div>
        </div>
        {[
          ['Corrija o bug',         'Login retorna 401 — veja auth.service.ts:42'],
          ['Melhore isso',          'Refatore getUserById para usar async/await'],
          ['Adicione uma feature',  'Adicione paginação no endpoint /products, 12 itens por página'],
          ['Faça uma limpeza',      'Remova imports não utilizados de src/components/'],
        ].map(([bad, good]) => (
          <div key={bad} className="grid grid-cols-2 border-b border-border last:border-0">
            <div className="px-4 py-3 text-muted-foreground">&ldquo;{bad}&rdquo;</div>
            <div className="border-l border-border px-4 py-3 text-foreground">&ldquo;{good}&rdquo;</div>
          </div>
        ))}
      </div>

      <Separator className="my-8" />

      <h2 className="mb-3 text-xl font-bold">Feedback durante a tarefa</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Se o Claude for na direção errada, diga — ele corrige imediatamente. Não
        precisa reiniciar a sessão.
      </p>
      <Card className="ring-0 bg-muted/40 border-border">
        <CardContent className="pt-4">
          <p className="mb-2 font-mono text-xs text-muted-foreground"># Exemplos de correção no meio da tarefa</p>
          <p className="font-mono text-sm text-foreground/80">Não — não mude a interface, só a implementação.</p>
          <p className="mt-1 font-mono text-sm text-foreground/80">Reverta esse arquivo, mantenha a lógica original.</p>
          <p className="mt-1 font-mono text-sm text-foreground/80">Para. Use React Query em vez de useEffect para esse fetch.</p>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <h2 className="mb-3 text-xl font-bold">Interrompendo uma tarefa</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Se o Claude começar a ir na direção errada, interrompa cedo — não espere
        ele terminar para desfazer.
      </p>
      <Card className="ring-0">
        <CardContent className="divide-y divide-border pt-0">
          {[
            ['Escape',  'Interrompe a execução do Claude'],
            ['↑ / ↓',   'Navega pelo histórico de mensagens'],
            ['Ctrl+C',  'Encerra o Claude Code'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-4 py-3">
              <Kbd>{key}</Kbd>
              <span className="text-sm text-muted-foreground">{desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <h2 className="mb-3 text-xl font-bold">Gerenciamento de contexto</h2>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        Em sessões longas o contexto acumula. Quando as respostas ficarem lentas ou
        imprecisas, compacte a conversa:
      </p>
      <CodeBlock language="prompt">/compact</CodeBlock>
      <p className="text-sm text-muted-foreground">
        Ou inicie uma nova sessão com <Inline>claude</Inline> para tarefas completamente diferentes.
      </p>

      <NavArrows current="/claude-guide/basics" />
    </div>
  )
}
