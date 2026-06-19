import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NavArrows } from '@/components/NavArrows'

const comparisons = [
  ['Claude.ai',  'Interface de chat web',         'Claude Code', 'CLI no seu terminal'],
  ['Claude.ai',  'Sem acesso aos seus arquivos',   'Claude Code', 'Lê e edita arquivos diretamente'],
  ['Claude.ai',  'Responde perguntas',             'Claude Code', 'Executa tarefas em múltiplos passos'],
  ['Claude.ai',  'Sem contexto do repositório',    'Claude Code', 'Entende todo o seu projeto'],
]

const capabilities = [
  ['Ler código',                 'Explica qualquer módulo, rastreia fluxos de dados, encontra onde algo é definido — com referências de arquivo e linha.'],
  ['Escrever código',            'Edita arquivos diretamente. Você vê um diff e aprova ou rejeita cada alteração.'],
  ['Executar comandos',          'Testes, builds, lint, git — pede permissão antes de qualquer coisa destrutiva.'],
  ['Tarefas em múltiplos passos','Dê um objetivo, não uma lista de etapas. "Adicione modo escuro à página de configurações" — ele descobre o resto.'],
  ['Busca e navegação',          'Encontra qualquer símbolo, padrão ou arquivo no repositório instantaneamente.'],
]

export default function WelcomePage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 1
      </Badge>
      <h1 className="mb-4 text-4xl font-bold tracking-tight">
        Bem-vindo ao Claude Code
      </h1>

      <Card className="mb-10 border-primary/20 bg-primary/5 ring-0">
        <CardContent className="pt-5">
          <p className="text-base leading-relaxed text-foreground/80">
            Este guia te deixa produtivo com o Claude Code rapidamente — o que é,
            como funciona e como o time de produto da Loomi usa no dia a dia.
          </p>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-xl font-bold">O que é o Claude Code?</h2>
      <p className="mb-4 leading-relaxed text-foreground/70">
        Claude Code é uma CLI com IA desenvolvida pela Anthropic que roda no seu terminal
        e entende toda a sua base de código. Não é uma janela de chat — é um agente com
        acesso direto ao seu ambiente local: seus arquivos, seu terminal, seu histórico git.
      </p>
      <p className="mb-8 leading-relaxed text-foreground/70">
        Diferente do Claude.ai, o Claude Code <em className="text-foreground font-medium">age</em> — ele
        lê, escreve e executa por você. Você mantém o controle: cada edição mostra um diff,
        cada comando exige aprovação.
      </p>

      <div className="mb-10 overflow-hidden rounded-xl border border-border text-sm">
        <div className="grid grid-cols-2 border-b border-border bg-muted/50">
          <div className="px-4 py-3 font-semibold text-muted-foreground">Claude.ai</div>
          <div className="border-l border-border px-4 py-3 font-semibold text-foreground">Claude Code</div>
        </div>
        {comparisons.map(([, bad, , good]) => (
          <div key={bad} className="grid grid-cols-2 border-b border-border last:border-0">
            <div className="px-4 py-3 text-muted-foreground">{bad}</div>
            <div className="border-l border-border px-4 py-3 text-foreground">{good}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-xl font-bold">O que ele consegue fazer</h2>
      <div className="mb-8 space-y-3">
        {capabilities.map(([title, desc]) => (
          <Card key={title} size="sm" className="ring-0 border-border">
            <CardContent className="flex items-start gap-3 pt-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <p className="text-sm leading-relaxed text-foreground/75">
                <strong className="font-semibold text-foreground">{title}.</strong>{' '}{desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <NavArrows current="/claude-guide" />
    </div>
  )
}
