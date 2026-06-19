'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { tokenStore } from '@/lib/token-store'
import type { RegisterPayload } from '@/types/auth'
import { authApi } from '../api'
import { authKeys } from '../keys'

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      await authApi.register(payload)
      const tokens = await authApi.login({
        email: payload.email,
        password: payload.password,
      })
      return tokens
    },
    onSuccess: async (tokens) => {
      tokenStore.set(tokens)
      await queryClient.invalidateQueries({ queryKey: authKeys.me() })
    },
  })
}
