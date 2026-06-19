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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground shadow-md shadow-primary/30">
        {n}
      </div>
      <div className="flex-1 pb-8">
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 2
      </Badge>
      <h1 className="mb-8 text-4xl font-bold tracking-tight">
        Instalação e Configuração
      </h1>

      <div className="mb-8">
        <Step n={1} title="Instalar o Claude Code">
          <p className="mb-3 text-sm text-muted-foreground">
            Requer Node.js 18 ou superior. Verifique com <Inline>node --version</Inline>.
          </p>
          <CodeBlock language="bash">
            npm install -g @anthropic-ai/claude-code
          </CodeBlock>
        </Step>

        <Step n={2} title="Autenticar">
          <p className="mb-3 text-sm text-muted-foreground">
            Execute <Inline>claude</Inline> pela primeira vez — ele abre um navegador para
            conectar sua conta Anthropic. Use sua conta Google da Loomi se o SSO estiver configurado.
          </p>
          <CodeBlock language="bash">claude</CodeBlock>
        </Step>

        <Step n={3} title="Abrir um projeto">
          <p className="mb-3 text-sm text-muted-foreground">
            Navegue até qualquer repositório e execute <Inline>claude</Inline>. O Claude Code
            lê o projeto automaticamente. Na primeira sessão, execute <Inline>/init</Inline> para
            gerar o <Inline>CLAUDE.md</Inline> com contexto do projeto.
          </p>
          <CodeBlock language="bash">{`cd loomi-product-view
claude
/init`}</CodeBlock>
        </Step>
      </div>

      <Separator className="mb-6" />

      <h2 className="mb-3 text-xl font-bold">Permissões</h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        O Claude Code pede aprovação antes de executar comandos shell, editar arquivos fora
        do projeto ou fazer push para o git. Configure permissões pré-aprovadas nesses arquivos:
      </p>
      <Card className="ring-0">
        <CardContent className="divide-y divide-border pt-0">
          <div className="flex items-center gap-3 py-3">
            <Inline>.claude/settings.json</Inline>
            <span className="text-sm text-muted-foreground">permissões do projeto (no repositório)</span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Inline>~/.claude/settings.json</Inline>
            <span className="text-sm text-muted-foreground">permissões globais (todos os projetos)</span>
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 text-sm text-muted-foreground">
        Comece restrito. Adicione permissões conforme você encontrar prompts repetitivos.
      </p>

      <NavArrows current="/claude-guide/setup" />
    </div>
  )
}
