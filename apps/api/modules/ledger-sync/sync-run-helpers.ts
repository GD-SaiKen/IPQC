import type { PrismaService } from '../../common/prisma/prisma.service'

export const SYNC_LEASE_MS = 3 * 60 * 1000
export const SYNC_HEARTBEAT_MS = 60 * 1000
export const SYNC_HISTORY_RETENTION_DAYS = 180

export async function extendSyncLease(
  prisma: PrismaService,
  runId: string,
  executorId: string,
): Promise<boolean> {
  const updated = await prisma.ledgerSyncRun.updateMany({
    where: { id: runId, status: 'running', executorId },
    data: { leaseExpiresAt: new Date(Date.now() + SYNC_LEASE_MS) },
  })
  return updated.count === 1
}

export async function markInterruptedSyncRuns(prisma: PrismaService, now = new Date()): Promise<number> {
  const updated = await prisma.ledgerSyncRun.updateMany({
    where: {
      status: 'running',
      leaseExpiresAt: { lt: now },
    },
    data: {
      status: 'failed',
      message: '同步中断',
      finishedAt: now,
    },
  })
  return updated.count
}

export async function purgeOldSyncHistory(prisma: PrismaService, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - SYNC_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const oldRuns = await prisma.ledgerSyncRun.findMany({
    where: { startedAt: { lt: cutoff } },
    select: { id: true },
  })
  if (!oldRuns.length) {
    return
  }
  const ids = oldRuns.map((r) => r.id)
  await prisma.ledgerSyncRunDiff.deleteMany({ where: { runId: { in: ids } } })
  await prisma.ledgerSyncRun.deleteMany({ where: { id: { in: ids } } })
}