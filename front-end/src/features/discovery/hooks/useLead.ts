'use client'

import { useQuery } from '@tanstack/react-query'

import { discoveryApi } from '../api'
import { discoveryKeys } from '../keys'

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: discoveryKeys.lead(id ?? ''),
    queryFn: () => discoveryApi.getOne(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  })
}
