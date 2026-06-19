import type { AuthTokens } from '@/types/auth'

const ACCESS_KEY = 'app.accessToken'
const REFRESH_KEY = 'app.refreshToken'

type Listener = () => void
const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export const tokenStore = {
  getAccess(): string | null {
    if (!isBrowser()) return null
    return window.localStorage.getItem(ACCESS_KEY)
  },
  getRefresh(): string | null {
    if (!isBrowser()) return null
    return window.localStorage.getItem(REFRESH_KEY)
  },
  set(tokens: AuthTokens): void {
    if (!isBrowser()) return
    window.localStorage.setItem(ACCESS_KEY, tokens.accessToken)
    window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
    listeners.forEach((l) => l())
  },
  clear(): void {
    if (!isBrowser()) return
    window.localStorage.removeItem(ACCESS_KEY)
    window.localStorage.removeItem(REFRESH_KEY)
    listeners.forEach((l) => l())
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
