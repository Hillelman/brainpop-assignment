import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { test as setup } from '@playwright/test'
import { backendDir, e2eDataDir } from './support/env.ts'

setup('seed isolated data', () => {
  rmSync(e2eDataDir, { recursive: true, force: true })
  mkdirSync(e2eDataDir, { recursive: true })
  execFileSync('php', ['artisan', 'app:seed-json', '--fresh', '--count=30'], {
    cwd: backendDir,
    env: { ...process.env, JSON_STORAGE_PATH: e2eDataDir },
    stdio: 'pipe',
  })
})
