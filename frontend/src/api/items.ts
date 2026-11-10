import { request } from '@/api/http'
import type {
  BulkReviewPayload,
  BulkReviewResult,
  FiltersResponse,
  Item,
  ItemListParams,
  NewItemPayload,
  Paginated,
  Review,
} from '@/types/api'

interface Options {
  signal?: AbortSignal
}

interface Wrapped<T> {
  data: T
}

export function listItems(params: ItemListParams, { signal }: Options = {}) {
  return request<Paginated<Item>>('GET', '/items', { query: { ...params }, signal })
}

export function searchItems(q: string, params: ItemListParams, { signal }: Options = {}) {
  return request<Paginated<Item>>('GET', '/items/search', { query: { q, ...params }, signal })
}

export async function getFilters({ signal }: Options = {}): Promise<FiltersResponse> {
  const res = await request<Wrapped<FiltersResponse> | FiltersResponse>('GET', '/items/filters', {
    signal,
  })
  return 'data' in res ? res.data : res
}

export async function getItem(id: number, { signal }: Options = {}): Promise<Item> {
  const res = await request<Wrapped<Item>>('GET', `/items/${id}`, { signal })
  return res.data
}

export function getItemReviews(
  id: number,
  params: { page?: number; per_page?: number } = {},
  { signal }: Options = {},
) {
  return request<Paginated<Review>>('GET', `/items/${id}/reviews`, { query: params, signal })
}

export async function createItem(payload: NewItemPayload, { signal }: Options = {}): Promise<Item> {
  const res = await request<Wrapped<Item>>('POST', '/items', { body: payload, signal })
  return res.data
}

export async function bulkReview(
  payload: BulkReviewPayload,
  { signal }: Options = {},
): Promise<BulkReviewResult> {
  const res = await request<Wrapped<BulkReviewResult>>('POST', '/items/reviews', {
    body: payload,
    signal,
  })
  return res.data
}
