'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { tokenStore } from '@/lib/token-store'
import { authApi } from '../api'

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStore.getRefresh()
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken)
        } catch {
          /* best-effort: server may have already revoked */
        }
      }
    },
    onSettled: () => {
      tokenStore.clear()
      queryClient.clear()
    },
  })
}
