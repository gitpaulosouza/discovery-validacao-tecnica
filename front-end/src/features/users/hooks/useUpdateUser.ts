'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { authKeys } from '@/features/auth/keys'
import { usersApi, type UpdateUserPayload } from '../api'
import { userKeys } from '../keys'

interface UpdateArgs {
  id: string
  payload: UpdateUserPayload
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: UpdateArgs) => usersApi.update(id, payload),
    onSuccess: async (user) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) }),
        queryClient.invalidateQueries({ queryKey: authKeys.me() }),
      ])
    },
  })
}
