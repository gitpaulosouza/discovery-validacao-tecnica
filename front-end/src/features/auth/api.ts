import { api } from '@/lib/api'
import type { AuthTokens, LoginPayload, RegisterPayload } from '@/types/auth'
import type { AuthenticatedUser, User } from '@/types/user'

export const authApi = {
  login: (payload: LoginPayload): Promise<AuthTokens> =>
    api.post<AuthTokens>('/auth/login', payload, { auth: false }),

  register: (payload: RegisterPayload): Promise<User> =>
    api.post<User>('/users', payload, { auth: false }),

  me: (): Promise<AuthenticatedUser> => api.get<AuthenticatedUser>('/auth/me'),

  logout: (refreshToken: string): Promise<void> =>
    api.post<void>('/auth/logout', { refreshToken }, { auth: false }),
}
