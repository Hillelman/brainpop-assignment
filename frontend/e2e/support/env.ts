import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export const frontendPort = process.env.E2E_FRONTEND_PORT ?? '5199'
export const backendPort = process.env.E2E_BACKEND_PORT ?? '8099'
export const frontendUrl = `http://localhost:${frontendPort}`
export const backendUrl = `http://localhost:${backendPort}`
export const e2eDataDir = join(tmpdir(), `review-queue-e2e-data-${backendPort}`)
export const backendDir = resolve(import.meta.dirname, '../../../backend')
export const e2eAppKey = 'base64:ZTJlLW9ubHkta2V5LWUyZS1vbmx5LWtleS0zMmJ5dGU='
