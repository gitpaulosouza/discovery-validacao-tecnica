'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { discoveryApi } from '../api'
import { discoveryKeys } from '../keys'
import type { DecideLeadPayload, LeadDetail } from '../types'

export function useDecideLead(id: string) {
  const queryClient = useQueryClient()

  return useMutation<LeadDetail, Error, DecideLeadPayload>({
    mutationFn: (payload) => discoveryApi.decide(id, payload),
    onSuccess: (lead) => {
      queryClient.setQueryData(discoveryKeys.lead(lead.id), lead)
      void queryClient.invalidateQueries({ queryKey: discoveryKeys.leads() })
    },
  })
}
