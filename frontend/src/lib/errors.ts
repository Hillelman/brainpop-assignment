import { ApiError, getApiBaseUrl } from '@/api/http'

const MESSAGES: Record<string, string> = {
  validation_failed: 'Some fields are invalid. Please check your input and try again.',
  not_found: 'We could not find what you were looking for.',
  conflict: 'This action conflicts with the current state. Please refresh and try again.',
  unauthenticated: 'Your session has expired. Please sign in again.',
  server_rejected_session:
    'The server rejected your session. Check the backend Clerk configuration (see docs/troubleshooting.md).',
  server_error: 'Something went wrong on our side. Please try again later.',
}

export const UNKNOWN_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.'

const NOT_CONFIGURED_CODES = ['auth_not_configured', 'app_not_configured']

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'network_error') return `Cannot reach the API at ${getApiBaseUrl()}`
    if (NOT_CONFIGURED_CODES.includes(err.code)) {
      const missing = err.fieldErrors.missing
      return Array.isArray(missing) && missing.length > 0
        ? `The backend is not configured: missing ${missing.join(', ')}`
        : 'The backend is not configured.'
    }
    return MESSAGES[err.code] ?? UNKNOWN_ERROR_MESSAGE
  }
  return UNKNOWN_ERROR_MESSAGE
}
