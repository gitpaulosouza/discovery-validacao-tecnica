import { api } from '@/lib/api'
import type {
  CreateLeadPayload,
  LeadDetail,
  LeadSummary,
} from './types'

export const discoveryApi = {
  list: (): Promise<LeadSummary[]> =>
    api.get<LeadSummary[]>('/discovery/leads'),

  getOne: (id: string): Promise<LeadDetail> =>
    api.get<LeadDetail>(`/discovery/leads/${id}`),

  create: (payload: CreateLeadPayload): Promise<LeadDetail> =>
    api.post<LeadDetail>('/discovery/leads', payload),
}
