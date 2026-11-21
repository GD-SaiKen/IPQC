/**
 * 将 config/ledger-default-bindings.json 写入 ledger_sync_config。
 * 用法：node scripts/apply-ledger-default-bindings.mjs
 * 强制覆盖：node scripts/apply-ledger-default-bindings.mjs --force
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PrismaClient } from '@prisma/client'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const envPath of [resolve(root, 'apps/api/.env'), resolve(root, '.env')]) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath)
    break
  }
}

const CONFIG_ID = '00000000-0000-0000-0000-000000000001'
const force = process.argv.includes('--force')

const defaults = JSON.parse(
  readFileSync(resolve(root, 'config/ledger-default-bindings.json'), 'utf8'),
)

const prisma = new PrismaClient()
try {
  const row = await prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
  if (row?.selectedEntries?.length && !force) {
    const entries = row.selectedEntries
    const looksValid =
      Array.isArray(entries) &&
      entries.every((e) => e?.kind === 'file' && e?.role && e?.path)
    if (looksValid) {
      console.log('已有有效文件绑定，未覆盖。若要重置请使用 --force')
      process.exit(0)
    }
  }
  const nextVersion = (row?.configVersion ?? 0) + 1
  await prisma.ledgerSyncConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      shareId: defaults.shareId,
      selectedEntries: defaults.selectedEntries,
      excludedPaths: [],
      hour: defaults.hour ?? 6,
      minute: defaults.minute ?? 0,
      configVersion: 1,
    },
    update: {
      shareId: defaults.shareId,
      selectedEntries: defaults.selectedEntries,
      excludedPaths: [],
      hour: defaults.hour ?? 6,
      minute: defaults.minute ?? 0,
      configVersion: nextVersion,
    },
  })
  console.log(`已写入 ${defaults.selectedEntries.length} 条台账绑定，共享盘 ${defaults.shareId}`)
} finally {
  await prisma.$disconnect()
}