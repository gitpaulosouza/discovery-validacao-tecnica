'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { tokenStore } from '@/lib/token-store'
import { authApi } from '@/features/auth/api'
import { usersApi } from '../api'

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const refreshToken = tokenStore.getRefresh()
      await usersApi.remove(id)
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken)
        } catch {
          /* token may already be invalid after delete */
        }
      }
    },
    onSettled: () => {
      tokenStore.clear()
      queryClient.clear()
    },
  })
}
