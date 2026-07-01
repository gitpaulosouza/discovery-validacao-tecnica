import { discoveryMock } from './mock'
import type {
  CreateLeadPayload,
  DecideLeadPayload,
  LeadDetail,
  LeadSummary,
} from './types'

/**
 * Discovery API surface. Currently backed by an in-memory mock (frontend-only
 * phase). When the back-end discovery module lands, swap the implementations
 * for `api.get`/`api.post` calls — the signatures stay identical.
 */
export const discoveryApi = {
  list: (): Promise<LeadSummary[]> => discoveryMock.list(),

  getOne: (id: string): Promise<LeadDetail> => discoveryMock.getOne(id),

  create: (payload: CreateLeadPayload): Promise<LeadDetail> =>
    discoveryMock.create(payload),

  decide: (id: string, payload: DecideLeadPayload): Promise<LeadDetail> =>
    discoveryMock.decide(id, payload),
}
