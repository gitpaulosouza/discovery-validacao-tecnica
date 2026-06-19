'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { tokenStore } from '@/lib/token-store'
import type { LoginPayload } from '@/types/auth'
import { authApi } from '../api'
import { authKeys } from '../keys'

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: async (tokens) => {
      tokenStore.set(tokens)
      await queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}
