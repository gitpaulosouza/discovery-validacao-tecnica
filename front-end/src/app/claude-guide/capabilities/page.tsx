import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/CodeBlock'
import { TerminalDemo } from '@/components/TerminalDemo'
import { NavArrows } from '@/components/NavArrows'

const capabilities = [
  {
    title: 'Ler e entender código',
    description:
      'Explica qualquer módulo, rastreia um fluxo de dados, encontra onde algo é definido — com referências de arquivo e linha. Pergunte sobre partes do código que você ainda não conhece.',
    example: 'Como funciona o middleware de autenticação? Rastreie a requisição desde a rota até a validação do token.',
  },
  {
    title: 'Escrever e editar código',
    description:
      'Edita arquivos diretamente. No modo interativo você vê um diff completo antes de qualquer alteração ser aplicada — você aprova ou rejeita arquivo por arquivo.',
    example: 'Refatore ProductCard.tsx para extrair a formatação de preço em um hook usePriceFormat.',
  },
  {
    title: 'Executar comandos no terminal',
    description:
      'Testes, builds, lint, operações git — o Claude Code executa comandos shell por você. Sempre pede permissão antes de executar qualquer coisa e nunca roda comandos destrutivos sem prompt explícito.',
    example: 'Execute apenas os testes relacionados ao fluxo de checkout e mostre as falhas.',
  },
  {
    title: 'Tarefas em múltiplos passos',
    description:
      'Dê um objetivo, não uma lista de etapas. O Claude descobre os arquivos, faz as edições, roda as verificações e reporta — tudo em uma só interação. Você intervém se algo der errado.',
    example: 'Adicione um toggle de modo escuro na página de configurações, conectado ao ThemeContext existente.',
  },
  {
    title: 'Busca e navegação',
    description:
      'Busca instantânea em todo o repositório. Encontra definições de símbolos, usos, padrões de arquivos e correspondências de strings — mais rápido que grep e com mais contexto.',
    example: 'Onde está definida a lógica de formatação de moeda e quem a chama?',
  },
]

export default function CapabilitiesPage() {
  return (
    <div>
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-0">
        Seção 4
      </Badge>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">
        Funcionalidades Principais
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
        O que o Claude Code faz — e como cada funcionalidade se aplica ao trabalho diário.
      </p>

      <div className="mb-10 grid gap-4">
        {capabilities.map(({ title, description, example }) => (
          <Card key={title} className="ring-0 border-border transition-shadow hover:shadow-md hover:shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="leading-relaxed">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                &ldquo;{example}&rdquo;
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TerminalDemo
        title="Tarefa em múltiplos passos — do objetivo ao código"
        description="O Claude recebe um objetivo, identifica os arquivos, faz as edições e roda o pipeline de qualidade — sem intervenção manual."
        steps={[
          { role: 'user',   text: 'claude "adicionar toggle de modo escuro na página de configurações"' },
          { role: 'claude', text: 'Reading src/app/settings/page.tsx...' },
          { role: 'claude', text: 'Reading src/contexts/ThemeContext.tsx...' },
          { role: 'claude', text: 'Editing src/app/settings/page.tsx — adding DarkModeToggle' },
          { role: 'claude', text: 'Running typecheck... ✓' },
          { role: 'claude', text: 'Running lint... ✓' },
          { role: 'claude', text: 'Done. Toggle wired to ThemeContext.setTheme. No any types introduced.' },
        ]}
      />

      <h2 className="mb-3 text-xl font-bold">Explorar antes de executar</h2>
      <p className="mb-4 leading-relaxed text-muted-foreground text-sm">
        Um padrão que evita muito retrabalho: peça ao Claude para explicar algo antes
        de pedir para mudar. Entender a implementação atual leva a edições melhores.
      </p>
      <CodeBlock language="padrão recomendado">{`# Primeiro — entenda
"Como funciona useProductFilter? Que estado ele gerencia?"

# Depois — aja
"Refatore para derivar filteredProducts com useMemo em vez de armazenar em estado."`}</CodeBlock>

      <NavArrows current="/claude-guide/capabilities" />
    </div>
  )
}
