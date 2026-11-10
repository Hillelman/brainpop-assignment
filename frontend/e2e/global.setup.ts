import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { relative, isAbsolute, resolve } from 'node:path'
import { test as setup } from '@playwright/test'
import { backendDir, e2eDataDir } from './support/env.ts'

setup('seed isolated data', () => {
  const rel = relative(resolve(tmpdir()), resolve(e2eDataDir))
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Refusing to delete ${e2eDataDir}: not inside ${tmpdir()}`)
  }
  rmSync(e2eDataDir, { recursive: true, force: true })
  mkdirSync(e2eDataDir, { recursive: true })
  execFileSync('php', ['artisan', 'app:seed-json', '--fresh', '--count=30'], {
    cwd: backendDir,
    env: { ...process.env, JSON_STORAGE_PATH: e2eDataDir },
    stdio: 'pipe',
  })
})
