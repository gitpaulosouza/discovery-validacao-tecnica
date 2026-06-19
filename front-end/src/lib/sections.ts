export const sections = [
  { number: 1, href: '/claude-guide',              label: 'Bem-vindo'      },
  { number: 2, href: '/claude-guide/setup',        label: 'Instalação'     },
  { number: 3, href: '/claude-guide/basics',       label: 'Como Usar'      },
  { number: 4, href: '/claude-guide/capabilities', label: 'Funcionalidades'},
  { number: 5, href: '/claude-guide/commands',     label: 'Comandos'       },
  { number: 6, href: '/claude-guide/claude-md',    label: 'CLAUDE.md'      },
  { number: 7, href: '/claude-guide/team',         label: 'Fluxo do Time'  },
  { number: 8, href: '/claude-guide/checklist',    label: 'Checklist'      },
] as const

export type SectionHref = (typeof sections)[number]['href']
