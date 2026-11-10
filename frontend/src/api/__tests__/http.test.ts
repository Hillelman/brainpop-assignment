import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, buildQuery, request, setTokenProvider, setUnauthorizedHandler } from '@/api/http'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  setTokenProvider(() => Promise.resolve('tok'))
  setUnauthorizedHandler(null)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
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

  it('calls the unauthorized handler on 401 and sends the Bearer token', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'No', code: 'unauthenticated' }))
    await expect(request('GET', '/me')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
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
})
