import { api } from '@/lib/api'
import type { User } from '@/types/user'

export interface UpdateUserPayload {
  email?: string
  name?: string
  password?: string
}

export const usersApi = {
  getOne: (id: string): Promise<User> => api.get<User>(`/users/${id}`),

  update: (id: string, payload: UpdateUserPayload): Promise<User> =>
    api.patch<User>(`/users/${id}`, payload),

  remove: (id: string): Promise<void> => api.delete<void>(`/users/${id}`),
}
