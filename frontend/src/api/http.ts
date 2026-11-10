import type { ApiErrorBody } from '@/types/api'

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = { [key: string]: QueryValue | QueryParams }

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api'

// VITE_API_BASE_URL is an override used only by Playwright.
export function getApiBaseUrl(): string {
  const configured = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string[]>

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function buildQuery(params: QueryParams | undefined): string {
  const search = new URLSearchParams()
  const append = (prefix: string, value: QueryValue | QueryParams): void => {
    if (value === undefined || value === null || value === '') return
    if (typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) append(`${prefix}[${key}]`, nested)
      return
    }
    search.append(prefix, String(value))
  }
  for (const [key, value] of Object.entries(params ?? {})) append(key, value)
  return search.toString()
}

export interface RequestOptions {
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

const GENERIC_SERVER_MESSAGE = 'Something went wrong on our side.'

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).message === 'string' &&
    typeof (value as Record<string, unknown>).code === 'string'
  )
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const query = buildQuery(options.query)
  const url = `${baseUrl}${path}${query ? `?${query}` : ''}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (err) {
    if (isAbortError(err)) throw err
    throw new ApiError(0, 'network_error', 'Unable to reach the server.')
  }

  const payload = await parseJson(response)

  if (!response.ok) {
    if (isErrorBody(payload)) {
      throw new ApiError(response.status, payload.code, payload.message, payload.errors)
    }
    throw new ApiError(response.status, 'server_error', GENERIC_SERVER_MESSAGE)
  }

  if (payload === undefined) {
    throw new ApiError(response.status, 'server_error', GENERIC_SERVER_MESSAGE)
  }
  return payload as T
}
