import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, buildQuery, request } from '@/api/http'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('http client', () => {
  it('throws ApiError with status, code, message and fieldErrors for a 422', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        message: 'Invalid',
        code: 'validation_failed',
        errors: { title: ['Too short'] },
      }),
    )
    const err = await request('POST', '/items', { body: {} }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 422,
      code: 'validation_failed',
      message: 'Invalid',
      fieldErrors: { title: ['Too short'] },
    })
  })

  it('maps network failures to network_error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(request('GET', '/items')).rejects.toMatchObject({ code: 'network_error' })
  })

  it('maps a non-JSON 500 to server_error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 500 }))
    await expect(request('GET', '/items')).rejects.toMatchObject({
      status: 500,
      code: 'server_error',
    })
  })

  it('sends no Authorization header', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))
    await request('GET', '/items')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.headers).not.toHaveProperty('Authorization')
  })

  it('serialises nested query params', () => {
    expect(buildQuery({ state: 'pending', filter: { status: 'approved' }, page: 2 })).toBe(
      'state=pending&filter%5Bstatus%5D=approved&page=2',
    )
  })

  it('rejects with an AbortError, not an ApiError, when aborted', async () => {
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const controller = new AbortController()
    controller.abort()
    const err = await request('GET', '/items', { signal: controller.signal }).catch(
      (e: unknown) => e,
    )
    expect(err).not.toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ name: 'AbortError' })
  })

  it.each([undefined, '', '  '])(
    'defaults the base url when VITE_API_BASE_URL is %j',
    async (value) => {
      vi.stubEnv('VITE_API_BASE_URL', value)
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))
      await request('GET', '/items')
      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/items')
    },
  )

  it('normalizes a trailing slash on the base url', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/api/')
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))
    await request('GET', '/items')
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/items')
  })
})
