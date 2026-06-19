export interface User {
  id: string
  email: string
  name: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
}
