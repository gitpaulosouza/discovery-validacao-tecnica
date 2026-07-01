'use client'

import { useQuery } from '@tanstack/react-query'

import { discoveryApi } from '../api'
import { discoveryKeys } from '../keys'

export function useLeads() {
  return useQuery({
    queryKey: discoveryKeys.leads(),
    queryFn: () => discoveryApi.list(),
    staleTime: 15_000,
  })
}
