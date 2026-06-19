'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mail, Pencil, ShieldCheck, Trash2, User as UserIcon, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useDeleteUser } from '@/features/users/hooks/useDeleteUser'
import { useUpdateUser } from '@/features/users/hooks/useUpdateUser'
import { useUserProfile } from '@/features/users/hooks/useUserProfile'
import { ApiError } from '@/lib/api'

export default function AccountPage() {
  const router = useRouter()
  const { data: authUser } = useCurrentUser()
  const userId = authUser?.id
  const { data: user, isLoading } = useUserProfile(userId)

  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const update = useUpdateUser()
  const remove = useDeleteUser()

  useEffect(() => {
    if (!user || isEditing) return
    setName(user.name ?? '')
    setEmail(user.email)
    setPassword('')
  }, [user, isEditing])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  function startEdit() {
    setSavedFlash(false)
    setIsEditing(true)
  }

  function cancelEdit() {
    if (!user) return
    setName(user.name ?? '')
    setEmail(user.email)
    setPassword('')
    update.reset()
    setIsEditing(false)
  }

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    const payload: { name?: string; email?: string; password?: string } = {}
    const trimmedName = name.trim()
    if (trimmedName !== (user.name ?? '')) payload.name = trimmedName
    if (email !== user.email) payload.email = email
    if (password.length > 0) payload.password = password

    if (Object.keys(payload).length === 0) {
      setIsEditing(false)
      return
    }

    update.mutate(
      { id: user.id, payload },
      {
        onSuccess: () => {
          setIsEditing(false)
          setPassword('')
          setSavedFlash(true)
          window.setTimeout(() => setSavedFlash(false), 2500)
        },
      },
    )
  }

  function onDelete() {
    if (!user) return
    remove.mutate(user.id, {
      onSettled: () => router.replace('/login'),
    })
  }

  const updateError =
    update.error instanceof ApiError ? update.error.message : update.error ? 'Não foi possível salvar.' : null
  const deleteError =
    remove.error instanceof ApiError ? remove.error.message : remove.error ? 'Não foi possível excluir a conta.' : null

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Badge className="w-fit border-0 bg-primary/10 text-primary hover:bg-primary/15">
          Sua conta
        </Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Olá{user.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus dados pessoais, e-mail e segurança da conta.
        </p>
      </header>

      {savedFlash ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          Alterações salvas
        </div>
      ) : null}

      <Card className="border-border/60 ring-foreground/5">
        <CardContent className="p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Perfil</h2>
              <p className="text-sm text-muted-foreground">
                {isEditing ? 'Edite as informações da conta.' : 'Suas informações de cadastro.'}
              </p>
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="size-3.5" />
                Editar
              </Button>
            ) : null}
          </div>

          {!isEditing ? (
            <dl className="divide-y divide-border/60">
              <ProfileRow icon={<UserIcon className="size-4" />} label="Nome" value={user.name ?? '—'} />
              <ProfileRow icon={<Mail className="size-4" />} label="E-mail" value={user.email} />
              <ProfileRow
                icon={<ShieldCheck className="size-4" />}
                label="Membro desde"
                value={new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(user.createdAt))}
              />
            </dl>
          ) : (
            <form onSubmit={onSave} className="flex flex-col gap-4">
              <Field label="Nome" htmlFor="account-name" hint="Opcional">
                <Input
                  id="account-name"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="E-mail" htmlFor="account-email">
                <Input
                  id="account-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field
                label="Nova senha"
                htmlFor="account-password"
                hint="Deixe em branco para manter a senha atual"
              >
                <Input
                  id="account-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  minLength={password.length > 0 ? 8 : undefined}
                  maxLength={128}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </Field>

              {updateError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {updateError}
                </div>
              ) : null}

              <div className="mt-2 flex items-center gap-2">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar alterações'
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={update.isPending}>
                  <X className="size-3.5" />
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30 ring-destructive/10">
        <CardContent className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
              <AlertTriangle className="size-4" />
              Zona de perigo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Excluir sua conta remove permanentemente seus dados. Esta ação não pode ser desfeita.
            </p>
          </div>

          {deleteError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          ) : null}

          {!confirmDelete ? (
            <Button
              variant="destructive"
              className="w-fit"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" />
              Excluir minha conta
            </Button>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-foreground/80">
                Tem certeza? Sua conta e dados serão apagados permanentemente.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Sim, excluir'
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}
