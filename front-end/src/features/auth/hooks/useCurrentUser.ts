'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { tokenStore } from '@/lib/token-store'
import { authApi } from '../api'
import { authKeys } from '../keys'

export function useCurrentUser() {
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(tokenStore.getAccess() !== null)
    return tokenStore.subscribe(() => {
      setHasToken(tokenStore.getAccess() !== null)
    })
  }, [])

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  })
}
