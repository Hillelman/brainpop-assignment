export type ItemStatus = 'pending' | 'approved' | 'rejected'
export type RiskLevel = 'low' | 'medium' | 'high'
export type ReviewDecision = 'approved' | 'rejected'

export interface PersonRef {
  id: number
  name: string
}

export interface Review {
  id: number
  decision: ReviewDecision
  risk: RiskLevel | null
  note: string | null
  reviewer: PersonRef
  created_at: string
}

export interface Item {
  id: number
  title: string
  description: string
  status: ItemStatus
  risk: RiskLevel | null
  submitter: PersonRef
  created_at: string
  updated_at: string
  latest_review?: Review | null
}

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterMeta {
  key: string
  label: string
  type: 'select' | 'date' | 'text'
  options?: FilterOption[]
  group?: string | null
  group_label?: string | null
}

export interface SortMeta {
  key: string
  label: string
}

export interface FiltersResponse {
  filters: FilterMeta[]
  sorts: SortMeta[]
}

export type BulkReviewFailureReason = 'not_found' | 'already_reviewed' | 'same_person'

export interface BulkReviewResult {
  updated: Item[]
  failed: { id: number; reason: BulkReviewFailureReason }[]
}

export interface BulkReviewPayload {
  ids: number[]
  decision: ReviewDecision
  risk?: RiskLevel | null
  note?: string | null
  reviewer_name: string
}

export interface NewItemPayload {
  title: string
  description: string
  submitter_name: string
}

export interface ApiErrorBody {
  message: string
  code: string
  errors?: Record<string, string[]>
}

export interface ItemListParams {
  filter?: Record<string, string | undefined>
  sort?: string
  page?: number
  per_page?: number
}
