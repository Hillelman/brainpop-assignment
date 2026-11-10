import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/http'
import { toUserMessage, UNKNOWN_ERROR_MESSAGE } from '@/lib/errors'

describe('toUserMessage', () => {
  it.each(['validation_failed', 'not_found', 'conflict', 'server_error'])(
    'returns friendly text for %s',
    (code) => {
      const message = toUserMessage(new ApiError(400, code, 'raw backend message'))
      expect(message).not.toBe(UNKNOWN_ERROR_MESSAGE)
      expect(message).not.toContain('raw backend message')
    },
  )

  it('falls back for unknown codes and non-API errors', () => {
    expect(toUserMessage(new ApiError(418, 'teapot', 'x'))).toBe(UNKNOWN_ERROR_MESSAGE)
    expect(toUserMessage(new Error('boom'))).toBe(UNKNOWN_ERROR_MESSAGE)
    expect(toUserMessage(null)).toBe(UNKNOWN_ERROR_MESSAGE)
  })

  describe('network errors', () => {
    afterEach(() => vi.unstubAllEnvs())

    it('includes the base url for network errors', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/api/')
      expect(toUserMessage(new ApiError(0, 'network_error', 'x'))).toBe(
        'Cannot reach the API at http://api.test/api',
      )
    })
  })
})
