/**
 * 清理台账同步相关库表：绑定配置、同步轮次、共享盘写入的台账行及点检分。
 * 用法：node scripts/clean-ledger-sync-data.mjs
 * 仅统计：node scripts/clean-ledger-sync-data.mjs --dry-run
 */
import { existsSync } from 'node:fs'
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

const dryRun = process.argv.includes('--dry-run')
const CONFIG_ID = '00000000-0000-0000-0000-000000000001'

const prisma = new PrismaClient()

async function counts() {
  const cfg = await prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
  return {
    configFileBindings: Array.isArray(cfg?.selectedEntries) ? cfg.selectedEntries.length : 0,
    shareId: cfg?.shareId ?? null,
    ledgerSyncRun: await prisma.ledgerSyncRun.count(),
    ledgerSyncRunDiff: await prisma.ledgerSyncRunDiff.count(),
    ledgerFa: await prisma.ledgerFa.count(),
    ledgerFqc: await prisma.ledgerFqc.count(),
    ledgerFqcNg: await prisma.ledgerFqcNg.count(),
    ledgerCmp: await prisma.ledgerCmp.count(),
    ledgerPerf: await prisma.ledgerPerf.count(),
    ledgerMat: await prisma.ledgerMat.count(),
    checkScore: await prisma.checkScore.count(),
    ledgerTombstone: await prisma.ledgerTombstone.count(),
    ledgerFaFromShare: await prisma.ledgerFa.count({ where: { sourceFile: { not: null } } }),
    ledgerFqcFromShare: await prisma.ledgerFqc.count({ where: { sourceFile: { not: null } } }),
    ledgerFqcNgFromShare: await prisma.ledgerFqcNg.count({ where: { sourceFile: { not: null } } }),
    ledgerCmpFromShare: await prisma.ledgerCmp.count({ where: { sourceFile: { not: null } } }),
    ledgerPerfFromShare: await prisma.ledgerPerf.count({ where: { sourceFile: { not: null } } }),
  }
}

try {
  console.log('清理前：', await counts())
  if (dryRun) {
    console.log('（dry-run，未写入）')
    process.exit(0)
  }

  await prisma.$transaction(async (tx) => {
    await tx.ledgerSyncRunDiff.deleteMany({})
    await tx.ledgerSyncRun.deleteMany({})
    await tx.ledgerTombstone.deleteMany({})

    const shareWhere = { sourceFile: { not: null } }
    await tx.ledgerFa.deleteMany({ where: shareWhere })
    await tx.ledgerFqc.deleteMany({ where: shareWhere })
    await tx.ledgerFqcNg.deleteMany({ where: shareWhere })
    await tx.ledgerCmp.deleteMany({ where: shareWhere })
    await tx.ledgerPerf.deleteMany({ where: shareWhere })
    await tx.checkScore.deleteMany({})

    await tx.ledgerSyncConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        shareId: null,
        selectedEntries: [],
        excludedPaths: [],
        hour: 6,
        minute: 0,
        configVersion: 0,
      },
      update: {
        shareId: null,
        selectedEntries: [],
        excludedPaths: [],
        configVersion: { increment: 1 },
      },
    })
  })

  console.log('清理后：', await counts())
  console.log('已重置同步绑定；已删除共享盘来源台账行、点检分、墓碑与同步历史。')
  console.log('培训/物料等未带 source_file 的行保留；无 source_file 的手工台账行保留。')
} finally {
  await prisma.$disconnect()
}