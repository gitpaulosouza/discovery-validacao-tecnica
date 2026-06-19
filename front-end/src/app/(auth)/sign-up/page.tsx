'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useRegister } from '@/features/auth/hooks/useRegister'
import { tokenStore } from '@/lib/token-store'
import { ApiError } from '@/lib/api'

export default function SignUpPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister()

  useEffect(() => {
    if (tokenStore.getAccess()) router.replace('/account')
  }, [router])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    register.mutate(
      { name: name || undefined, email, password },
      {
        onSuccess: () => router.replace('/account'),
      },
    )
  }

  const errorMessage =
    register.error instanceof ApiError
      ? register.error.message
      : register.error
        ? 'Não foi possível criar a conta. Tente novamente.'
        : null

  return (
    <Card className="border-border/60 shadow-xl ring-1 ring-foreground/5">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Crie sua conta</h1>
          <p className="text-sm text-muted-foreground">Leva menos de um minuto</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nome" htmlFor="name" hint="Opcional">
            <Input
              id="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </Field>

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

          <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
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

          <Button type="submit" size="lg" disabled={register.isPending} className="mt-2 w-full">
            {register.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              <>
                Criar conta
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
