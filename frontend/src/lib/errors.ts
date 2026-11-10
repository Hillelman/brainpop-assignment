import { ApiError, getApiBaseUrl } from '@/api/http'

const MESSAGES: Record<string, string> = {
  validation_failed: 'Some fields are invalid. Please check your input and try again.',
  not_found: 'We could not find what you were looking for.',
  conflict: 'This action conflicts with the current state. Please refresh and try again.',
  server_error: 'Something went wrong on our side. Please try again later.',
}

export const UNKNOWN_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.'

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'network_error') return `Cannot reach the API at ${getApiBaseUrl()}`
    return MESSAGES[err.code] ?? UNKNOWN_ERROR_MESSAGE
  }
  return UNKNOWN_ERROR_MESSAGE
}
