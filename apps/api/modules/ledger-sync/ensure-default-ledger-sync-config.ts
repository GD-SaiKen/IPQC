import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { type Prisma, type PrismaClient } from '@prisma/client'

import { type BindingEntry, parseLedgerBindings } from './ledger-bindings'

export const LEDGER_SYNC_CONFIG_ID = '00000000-0000-0000-0000-000000000001'

export interface DefaultLedgerBindingsFile {
  shareId: string
  hour: number
  minute: number
  selectedEntries: BindingEntry[]
}

export function defaultLedgerBindingsPath(): string {
  let dir = __dirname
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, 'scripts/data/ledger-sync-bindings.example.json')
    if (existsSync(candidate)) {
      return candidate
    }
    dir = resolve(dir, '..')
  }
  throw new Error('找不到 ledger-sync-bindings.example.json')
}

export function readDefaultLedgerBindingsFile(): DefaultLedgerBindingsFile {
  const raw = JSON.parse(readFileSync(defaultLedgerBindingsPath(), 'utf8')) as DefaultLedgerBindingsFile
  const parsed = parseLedgerBindings(raw.selectedEntries)
  if (parsed.bindings.length === 0 || parsed.issues.length > 0) {
    throw new Error('默认台账绑定配置无效，请检查 scripts/data/ledger-sync-bindings.example.json')
  }
  return raw
}

export function hasValidSavedBindings(entries: unknown): boolean {
  if (!Array.isArray(entries) || entries.length === 0) {
    return false
  }
  const parsed = parseLedgerBindings(entries as BindingEntry[])
  return parsed.bindings.length > 0 && !parsed.issues.some((issue) => issue.type === 'invalid' || issue.type === 'duplicate')
}

/** 库中尚无有效绑定时，写入仓库里的默认绑定（新环境 / 旧版目录配置） */
export async function ensureDefaultLedgerSyncConfig(prisma: PrismaClient): Promise<boolean> {
  const row = await prisma.ledgerSyncConfig.findUnique({ where: { id: LEDGER_SYNC_CONFIG_ID } })
  if (hasValidSavedBindings(row?.selectedEntries)) {
    return false
  }

  const defaults = readDefaultLedgerBindingsFile()
  const nextVersion = (row?.configVersion ?? 0) + 1
  await prisma.ledgerSyncConfig.upsert({
    where: { id: LEDGER_SYNC_CONFIG_ID },
    create: {
      id: LEDGER_SYNC_CONFIG_ID,
      shareId: defaults.shareId,
      selectedEntries: defaults.selectedEntries as unknown as Prisma.InputJsonValue,
      excludedPaths: [] as unknown as Prisma.InputJsonValue,
      hour: defaults.hour,
      minute: defaults.minute,
      configVersion: 1,
    },
    update: {
      shareId: defaults.shareId,
      selectedEntries: defaults.selectedEntries as unknown as Prisma.InputJsonValue,
      excludedPaths: [] as unknown as Prisma.InputJsonValue,
      hour: defaults.hour,
      minute: defaults.minute,
      configVersion: nextVersion,
    },
  })
  return true
}