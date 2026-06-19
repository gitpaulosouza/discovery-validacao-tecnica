export const discoveryKeys = {
  all: ['discovery'] as const,
  leads: () => [...discoveryKeys.all, 'leads'] as const,
  lead: (id: string) => [...discoveryKeys.all, 'lead', id] as const,
}
