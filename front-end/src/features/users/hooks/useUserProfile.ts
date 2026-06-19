'use client'

import { useQuery } from '@tanstack/react-query'

import { usersApi } from '../api'
import { userKeys } from '../keys'

export function useUserProfile(id: string | undefined) {
  return useQuery({
    queryKey: id ? userKeys.detail(id) : ['users', 'detail', 'pending'],
    queryFn: () => usersApi.getOne(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}
