'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { discoveryApi } from '../api'
import { discoveryKeys } from '../keys'
import type { CreateLeadPayload, LeadDetail } from '../types'

export function useCreateLead() {
  const queryClient = useQueryClient()

  return useMutation<LeadDetail, Error, CreateLeadPayload>({
    mutationFn: (payload) => discoveryApi.create(payload),
    onSuccess: (lead) => {
      // Seed the detail cache so the redirect target renders instantly.
      queryClient.setQueryData(discoveryKeys.lead(lead.id), lead)
      void queryClient.invalidateQueries({ queryKey: discoveryKeys.leads() })
    },
  })
}
