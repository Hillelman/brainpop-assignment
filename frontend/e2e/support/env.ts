import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

function parsePort(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  const port = Number(raw)
  if (!/^\d+$/.test(raw) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer between 1024 and 65535`)
  }
  return port
}

export const frontendPort = parsePort('E2E_FRONTEND_PORT', 5199)
export const backendPort = parsePort('E2E_BACKEND_PORT', 8099)
export const frontendUrl = `http://localhost:${frontendPort}`
export const backendUrl = `http://localhost:${backendPort}`
export const e2eDataDir = join(tmpdir(), `review-queue-e2e-data-${backendPort}`)
export const backendDir = resolve(import.meta.dirname, '../../../backend')
