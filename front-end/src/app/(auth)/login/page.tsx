'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { tokenStore } from '@/lib/token-store'
import { ApiError } from '@/lib/api'

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <SignInForm />
    </Suspense>
  )
}

function SignInSkeleton() {
  return (
    <Card className="border-border/60 shadow-xl ring-1 ring-foreground/5">
      <CardContent className="flex h-[420px] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </CardContent>
    </Card>
  )
}

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  useEffect(() => {
    if (tokenStore.getAccess()) router.replace(next)
  }, [router, next])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    login.mutate(
      { email, password },
      {
        onSuccess: () => router.replace(next),
      },
    )
  }

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.error
        ? 'Não foi possível entrar. Tente novamente.'
        : null

  return (
    <Card className="border-border/60 shadow-xl ring-1 ring-foreground/5">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground">Entre na sua conta para continuar</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </Field>

          <Field label="Senha" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </Field>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <Button type="submit" size="lg" disabled={login.isPending} className="mt-2 w-full">
            {login.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
