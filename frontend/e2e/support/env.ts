import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseEnv } from 'node:util'

export const frontendPort = process.env.E2E_FRONTEND_PORT ?? '5199'
export const backendPort = process.env.E2E_BACKEND_PORT ?? '8099'
export const frontendUrl = `http://localhost:${frontendPort}`
export const backendUrl = `http://localhost:${backendPort}`
export const e2eDataDir = join(tmpdir(), 'review-queue-e2e-data')
export const authFile = resolve(import.meta.dirname, '../.auth/user.json')
export const backendDir = resolve(import.meta.dirname, '../../../backend')

/** Loads frontend/.env then frontend/.env.local (only when present), like Vite does. */
export function loadFrontendEnv(): void {
  for (const name of ['.env', '.env.local']) {
    const file = resolve(import.meta.dirname, '../..', name)
    if (existsSync(file)) process.loadEnvFile(file)
  }
}

/** Fills the Clerk variables @clerk/testing needs, without exporting the rest of the backend env. */
export function resolveClerkEnv(): void {
  process.env.CLERK_PUBLISHABLE_KEY ||= process.env.VITE_CLERK_PUBLISHABLE_KEY
  const backendEnv = join(backendDir, '.env')
  if (!process.env.CLERK_SECRET_KEY && existsSync(backendEnv)) {
    const secret = parseEnv(readFileSync(backendEnv, 'utf8')).CLERK_SECRET_KEY
    if (secret) process.env.CLERK_SECRET_KEY = secret
  }
}

export function clerkEnvMissing(): string[] {
  return ['E2E_CLERK_USER_USERNAME', 'CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'].filter(
    (name) => !process.env[name],
  )
}
