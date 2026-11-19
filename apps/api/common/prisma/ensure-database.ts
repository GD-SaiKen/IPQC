import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { Client } from 'pg'

const localRequire = createRequire(__filename)

const CONNECT_TIMEOUT_MS = 5000

function databaseNameOf(databaseUrl: string): string {
  let pathname: string
  try {
    pathname = new URL(databaseUrl).pathname
  } catch {
    throw new Error('DATABASE_URL 不是合法的连接串')
  }
  const name = decodeURIComponent(pathname.replace(/^\//, ''))
  if (!name) {
    throw new Error('DATABASE_URL 未指定数据库名')
  }
  return name
}

function applyMigrations(): void {
  let cliEntry: string
  try {
    cliEntry = localRequire.resolve('prisma/build/index.js')
  } catch {
    console.warn('[Bootstrap] 未找到 Prisma CLI，跳过自动迁移；请执行 pnpm exec prisma migrate deploy')
    return
  }
  const schema = resolve(__dirname, '../../../../../prisma/schema.prisma')
  const result = spawnSync(process.execPath, [cliEntry, 'migrate', 'deploy', '--schema', schema], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error('数据库迁移失败，请检查迁移文件与 DATABASE_URL 后重试')
  }
}

export async function ensureDatabase(databaseUrl: string): Promise<boolean> {
  const target = databaseNameOf(databaseUrl)
  const maintenance = new URL(databaseUrl)
  maintenance.pathname = '/postgres'

  const client = new Client({
    connectionString: maintenance.toString(),
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  })
  let created = false
  await client.connect()
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [target])
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${target.replace(/"/g, '""')}"`)
      created = true
    }
  } finally {
    await client.end()
  }

  applyMigrations()
  return created
}
