'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useLogout } from '@/features/auth/hooks/useLogout'

export function AccountTopbar() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const logout = useLogout()

  function onLogout() {
    logout.mutate(undefined, {
      onSettled: () => router.replace('/login'),
    })
  }

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user.name ?? user.email}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        disabled={logout.isPending}
        aria-label="Sair"
      >
        <LogOut className="size-4" />
        Sair
      </Button>
    </div>
  )
}
