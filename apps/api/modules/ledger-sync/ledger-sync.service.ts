import { randomUUID } from 'node:crypto'

import { HttpException, Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { apiError, API_MSG, RuntimeConfigService } from '../../common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuthService } from '../auth/auth.service'
import type { AuthUser } from '../auth/auth.types'
import { LEDGER_ROLE_LABELS } from './ledger-roles'
import {
  DataHubRequestError,
  fetchWorkbook,
  listAllShareEntries,
  listShares,
  mapDataHubError,
  searchLedgerPaths,
} from './data-hub-client'
import type { LedgerEntriesQueryDto } from './dto/ledger-entries-query.dto'
import type { LedgerSyncBodyDto } from './dto/ledger-sync-body.dto'
import type { LedgerSharesQueryDto } from './dto/ledger-shares-query.dto'
import {
  basename,
  buildLedgerFileRecords,
  comparePreviewFiles,
  hasBlockingIssues,
  markParsedFiles,
  summarizeLedgerFiles,
  type LedgerFileRecord,
} from './ledger-sync-files'
import { matchLedgerFiles, normalizeRootPath, validateRootPath } from './match-files'
import type { MatchedFile } from './match-files'
import { mapWorkbooksToSnapshot } from './map-workbook'
import type { LedgerRole } from './ledger-roles'
import {
  applyExclusions,
  dedupeCandidates,
  normalizeLedgerPath,
  validateEntryPath,
  type FileCandidate,
} from './select-files'
import type { PutLedgerSyncConfigDto } from './dto/ledger-sync-config.dto'
import type { LedgerSyncRunDto } from './dto/ledger-sync-run.dto'
import { executeSyncWrites, planSyncApply } from './sync-db-apply'
import {
  extendSyncLease,
  SYNC_HEARTBEAT_MS,
  SYNC_LEASE_MS,
} from './sync-run-helpers'

const CONFIG_ID = '00000000-0000-0000-0000-000000000001'
const SYNC_ADVISORY_LOCK = 840321

type SyncRunKind = 'manual' | 'scheduled'

interface ExecuteSyncOptions {
  runType: SyncRunKind
  actorUserId: string
  viewUserId: string
  scheduledRunDate?: string | null
  previewFiles?: LedgerSyncRunDto['previewFiles']
  throwOnError: boolean
}

@Injectable()
export class LedgerSyncService {
  @Inject(AuthService)
  private readonly auth!: AuthService

  @Inject(RuntimeConfigService)
  private readonly config!: RuntimeConfigService

  @Inject(PrismaService)
  private readonly prisma!: PrismaService

  async listShares(user: AuthUser, query: LedgerSharesQueryDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 10
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    const shares = await this.safeHub(() =>
      listShares(this.config.dataHubOAuth.apiOrigin, accessToken, globalThis.fetch),
    )
    const start = (page - 1) * pageSize
    const slice = shares.slice(start, start + pageSize).map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
    }))
    return { list: slice, total: shares.length, page, pageSize }
  }

  async listShareEntries(user: AuthUser, shareId: string, query: LedgerEntriesQueryDto) {
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    const share = await this.resolveReadyShare(user, shareId, accessToken)
    void share
    const path = normalizeRootPath(query.path ?? '')
    const rootError = validateRootPath(path)
    if (rootError) {
      throw apiError(400, rootError, 'bad_request')
    }
    const list = await this.safeHub(() =>
      listAllShareEntries(
        this.config.dataHubOAuth.apiOrigin,
        accessToken,
        shareId,
        path,
        globalThis.fetch,
      ),
    )
    return {
      list: list.map((item) => ({
        name: item.name,
        path: item.path,
        kind: item.kind,
      })),
    }
  }

  async scope(user: AuthUser, body: LedgerSyncBodyDto) {
    if (!this.usesNewSelection(body)) {
      throw apiError(400, '请选择要核对的目录或文件', 'bad_request')
    }
    this.assertNewSelectionBody(body)
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    await this.resolveReadyShare(user, body.shareId, accessToken)
    const { all, active, excluded } = await this.resolveSelectionCandidates(body, accessToken)
    const directories = (body.selectedEntries ?? []).filter((entry) => entry.kind === 'directory').length
    const pinnedFiles = (body.selectedEntries ?? []).filter((entry) => entry.kind === 'file').length
    return {
      expandedTotal: all.length,
      activeTotal: active.length,
      excludedTotal: excluded.length,
      selectedDirectoryCount: directories,
      selectedFileCount: pinnedFiles,
      excludedPathCount: body.excludedPaths?.length ?? 0,
    }
  }

  async preview(user: AuthUser, body: LedgerSyncBodyDto) {
    if (this.usesNewSelection(body)) {
      this.assertNewSelectionBody(body)
      return this.previewSelected(user, body)
    }
    if (this.usesLegacySelection(body)) {
      const mapped = await this.resolveFilesLegacy(user, body)
      const mapResult = await this.loadAndMapLegacy(user, body.shareId, mapped, false)
      return {
        files: mapResult.files,
        counts: mapResult.counts,
      }
    }
    throw apiError(400, '请选择要核对的目录或文件', 'bad_request')
  }

  async sync(user: AuthUser, body: LedgerSyncBodyDto) {
    if (this.usesNewSelection(body)) {
      this.assertNewSelectionBody(body)
      return this.syncSelected(user, body)
    }
    if (this.usesLegacySelection(body)) {
      const mapped = await this.resolveFilesLegacy(user, body)
      const mapResult = await this.loadAndMapLegacy(user, body.shareId, mapped, true)
      return {
        counts: mapResult.counts,
        snapshot: mapResult.snapshot,
        checkScores: mapResult.checkScores,
      }
    }
    throw apiError(400, '请选择要核对的目录或文件', 'bad_request')
  }

  private usesNewSelection(body: LedgerSyncBodyDto): boolean {
    return (body.selectedEntries?.length ?? 0) > 0
  }

  private usesLegacySelection(body: LedgerSyncBodyDto): boolean {
    return Boolean(body.rootPath?.trim() || body.rootPaths?.length)
  }

  private assertNewSelectionBody(body: LedgerSyncBodyDto): void {
    if (this.usesLegacySelection(body)) {
      throw apiError(400, '不能同时使用新旧选择字段', 'bad_request')
    }
    if (!body.selectedEntries?.length) {
      throw apiError(400, '请选择要核对的目录或文件', 'bad_request')
    }
    for (const entry of body.selectedEntries) {
      const error = validateEntryPath(entry.path, entry.kind)
      if (error) {
        throw apiError(400, error, 'bad_request')
      }
    }
    for (const excluded of body.excludedPaths ?? []) {
      const error = validateEntryPath(excluded, 'directory')
      if (error) {
        throw apiError(400, error, 'bad_request')
      }
    }
  }

  private async resolveReadyShare(user: AuthUser, shareId: string, accessToken: string) {
    const shares = await this.safeHub(() =>
      listShares(this.config.dataHubOAuth.apiOrigin, accessToken, globalThis.fetch),
    )
    const share = shares.find((item) => item.id === shareId)
    if (!share || share.status !== 'ready') {
      throw apiError(404, '找不到可用的共享盘', 'not_found')
    }
    return share
  }

  private async previewSelected(user: AuthUser, body: LedgerSyncBodyDto) {
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    await this.resolveReadyShare(user, body.shareId, accessToken)
    const packed = await this.buildSelectedView(user, body, accessToken, false)
    const blocked = hasBlockingIssues(packed.issues)
    return {
      files: packed.files,
      summary: packed.summary,
      issues: packed.issues,
      counts: blocked ? undefined : packed.counts,
    }
  }

  private async syncSelected(user: AuthUser, body: LedgerSyncBodyDto) {
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    await this.resolveReadyShare(user, body.shareId, accessToken)
    const packed = await this.buildSelectedView(user, body, accessToken, true)
    if (hasBlockingIssues(packed.issues)) {
      throw apiError(400, packed.issues[0]?.message ?? '当前选择无法写入本机', 'bad_request')
    }
    const currentSnapshot = packed.files.map((file) => ({
      path: file.path,
      modifiedAt: file.modifiedAt,
    }))
    if (!comparePreviewFiles(body.previewFiles, currentSnapshot)) {
      throw apiError(400, '共享盘文件已变化，请重新核对', 'bad_request')
    }
    if (!packed.snapshot || !packed.counts) {
      throw apiError(400, '当前选择无法写入本机', 'bad_request')
    }
    return {
      files: packed.files,
      counts: packed.counts,
      snapshot: packed.snapshot,
      checkScores: packed.checkScores,
    }
  }

  private async buildSelectedView(
    user: AuthUser,
    body: LedgerSyncBodyDto,
    accessToken: string,
    includeSnapshot: boolean,
  ) {
    void user
    const { active, excluded } = await this.resolveSelectionCandidates(body, accessToken)
    let { files, analysis, issues } = buildLedgerFileRecords({ active, excluded })

    let counts: Record<string, number> | undefined
    let snapshot: ReturnType<typeof mapWorkbooksToSnapshot> extends infer Result
      ? Result extends { kind: 'ok'; snapshot: infer Snapshot }
        ? Snapshot
        : undefined
      : undefined
    let checkScores: Record<string, Record<string, number>> | undefined

    const canLoad =
      analysis.files.length > 0 &&
      analysis.duplicates.length === 0 &&
      analysis.invalid.length === 0

    if (canLoad) {
      const loaded = await this.loadMatchedWorkbooks(body.shareId, accessToken, analysis.files)
      const marked = markParsedFiles(files, loaded.parsed, loaded.readFailures, loaded.columnFailures)
      files = marked.files
      issues = [...issues, ...marked.issues]

      if (includeSnapshot && !hasBlockingIssues(issues)) {
        const mapResult = mapWorkbooksToSnapshot(
          analysis.files.filter((file) => !analysis.missingOptional.includes(file.role)),
          loaded.workbooks,
          analysis.missingOptional,
        )
        if (mapResult.kind === 'reject') {
          issues.push({
            type: 'column_mismatch',
            message: mapResult.message,
          })
          files = files.map((file) =>
            file.status === 'parsed'
              ? { ...file, status: 'invalid', reason: mapResult.message }
              : file,
          )
        } else {
          counts = mapResult.counts
          snapshot = mapResult.snapshot
          checkScores = mapResult.checkScores
        }
      } else if (!includeSnapshot && !hasBlockingIssues(issues)) {
        const mapResult = mapWorkbooksToSnapshot(
          analysis.files.filter((file) => !analysis.missingOptional.includes(file.role)),
          loaded.workbooks,
          analysis.missingOptional,
        )
        if (mapResult.kind === 'ok') {
          counts = mapResult.counts
        } else {
          issues.push({
            type: 'column_mismatch',
            message: mapResult.message,
          })
        }
      }
    }

    return {
      files,
      summary: summarizeLedgerFiles(files, issues),
      issues,
      counts,
      snapshot,
      checkScores,
    }
  }

  private async resolveSelectionCandidates(
    body: LedgerSyncBodyDto,
    accessToken: string,
  ): Promise<{ all: FileCandidate[]; active: FileCandidate[]; excluded: FileCandidate[] }> {
    const allCandidates = await this.expandSelectedEntries(body, accessToken)
    const selectedDirectories = (body.selectedEntries ?? [])
      .filter((entry) => entry.kind === 'directory')
      .map((entry) => normalizeLedgerPath(entry.path))
    const pinnedFiles = (body.selectedEntries ?? [])
      .filter((entry) => entry.kind === 'file')
      .map((entry) => normalizeLedgerPath(entry.path))
    const excludedPaths = (body.excludedPaths ?? []).map((path) => normalizeLedgerPath(path))
    const { active, excluded } = applyExclusions(allCandidates, {
      selectedDirectories,
      pinnedFiles,
      excludedPaths,
    })
    return { all: allCandidates, active, excluded }
  }

  private async expandSelectedEntries(
    body: LedgerSyncBodyDto,
    accessToken: string,
  ): Promise<FileCandidate[]> {
    const collected: FileCandidate[] = []
    const visited = new Set<string>()
    for (const entry of body.selectedEntries ?? []) {
      const path = normalizeLedgerPath(entry.path)
      if (entry.kind === 'file') {
        collected.push({ path, name: basename(path) })
        continue
      }
      await this.walkShareDirectory(body.shareId, accessToken, path, visited, collected)
    }
    return dedupeCandidates(collected)
  }

  private async walkShareDirectory(
    shareId: string,
    accessToken: string,
    path: string,
    visited: Set<string>,
    collected: FileCandidate[],
  ): Promise<void> {
    const key = path.toLowerCase()
    if (visited.has(key)) {
      return
    }
    visited.add(key)
    const entries = await this.safeHub(() =>
      listAllShareEntries(
        this.config.dataHubOAuth.apiOrigin,
        accessToken,
        shareId,
        path,
        globalThis.fetch,
      ),
    )
    for (const entry of entries) {
      if (entry.kind === 'file') {
        collected.push({ path: normalizeLedgerPath(entry.path), name: entry.name })
        continue
      }
      await this.walkShareDirectory(shareId, accessToken, entry.path, visited, collected)
    }
  }

  private async loadMatchedWorkbooks(shareId: string, accessToken: string, files: MatchedFile[]) {
    const workbooks = new Map()
    const parsed: Array<{ role: LedgerRole; path: string; modifiedAt?: string }> = []
    const readFailures: Array<{ path: string; reason: string }> = []
    const columnFailures: Array<{ path: string; message: string }> = []

    for (const file of files) {
      try {
        const workbook = await fetchWorkbook(
          this.config.dataHubOAuth.apiOrigin,
          accessToken,
          shareId,
          file.path,
          globalThis.fetch,
        )
        workbooks.set(file.role, workbook)
        parsed.push({
          role: file.role,
          path: file.path,
          modifiedAt: workbook.modifiedAt,
        })
      } catch (error) {
        if (error instanceof DataHubRequestError && error.status === 404) {
          readFailures.push({ path: file.path, reason: '文件不存在' })
          continue
        }
        if (error instanceof DataHubRequestError && file.name.toLowerCase().endsWith('.csv')) {
          readFailures.push({ path: file.path, reason: 'data-hub 尚未提供 CSV 读取' })
          continue
        }
        const mapped = mapDataHubError(error)
        readFailures.push({ path: file.path, reason: mapped.message })
      }
    }

    return { workbooks, parsed, readFailures, columnFailures }
  }

  private resolvePreferRootPaths(body: LedgerSyncBodyDto): string[] | undefined {
    const raw: string[] = []
    if (body.rootPath?.trim()) {
      raw.push(body.rootPath)
    }
    if (body.rootPaths?.length) {
      raw.push(...body.rootPaths)
    }
    const normalized = [...new Set(raw.map((item) => normalizeRootPath(item)).filter(Boolean))]
    for (const path of normalized) {
      const rootError = validateRootPath(path)
      if (rootError) {
        throw apiError(400, rootError, 'bad_request')
      }
    }
    return normalized.length > 0 ? normalized : undefined
  }

  private async resolveFilesLegacy(user: AuthUser, body: LedgerSyncBodyDto) {
    const preferRootPaths = this.resolvePreferRootPaths(body)
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    await this.resolveReadyShare(user, body.shareId, accessToken)
    const hits = await this.safeHub(() =>
      searchLedgerPaths(
        this.config.dataHubOAuth.apiOrigin,
        accessToken,
        body.shareId,
        '',
        globalThis.fetch,
      ),
    )
    const matched = matchLedgerFiles(hits, { preferRootPaths })
    if (matched.kind === 'reject') {
      throw apiError(400, matched.message, 'bad_request')
    }
    return matched
  }

  private async loadAndMapLegacy(
    user: AuthUser,
    shareId: string,
    matched: Extract<Awaited<ReturnType<typeof matchLedgerFiles>>, { kind: 'ok' }>,
    includeSnapshot: boolean,
  ) {
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    const workbooks = new Map()
    const fileSummaries: Array<{
      role: string
      label: string
      path: string
      modifiedAt?: string
    }> = []

    for (const file of matched.files) {
      if (matched.missingOptional.includes(file.role)) continue
      try {
        const workbook = await fetchWorkbook(
          this.config.dataHubOAuth.apiOrigin,
          accessToken,
          shareId,
          file.path,
          globalThis.fetch,
        )
        workbooks.set(file.role, workbook)
        fileSummaries.push({
          role: file.role,
          label: LEDGER_ROLE_LABELS[file.role],
          path: file.path,
          modifiedAt: workbook.modifiedAt,
        })
      } catch (error) {
        if (error instanceof DataHubRequestError && error.status === 404) {
          throw apiError(400, 'data-hub 尚未提供表格读取', 'bad_request')
        }
        throw error
      }
    }

    const mapResult = mapWorkbooksToSnapshot(matched.files, workbooks, matched.missingOptional)
    if (mapResult.kind === 'reject') {
      throw apiError(400, mapResult.message, 'bad_request')
    }

    if (!includeSnapshot) {
      return {
        files: fileSummaries,
        counts: mapResult.counts,
        snapshot: null as never,
        checkScores: null as never,
      }
    }

    return {
      files: fileSummaries,
      counts: mapResult.counts,
      snapshot: mapResult.snapshot,
      checkScores: mapResult.checkScores,
    }
  }

  private async safeHub<T>(task: () => Promise<T>): Promise<T> {
    try {
      return await task()
    } catch (error) {
      const mapped = mapDataHubError(error)
      throw apiError(
        mapped.status,
        mapped.message,
        mapped.status === 401 ? API_MSG.dataHubUnauthorized : 'bad_request',
      )
    }
  }

  private assertAdmin(user: AuthUser): void {
    if (user.role !== 'admin') {
      throw apiError(403, '没有权限', API_MSG.forbidden)
    }
  }

  async getSyncConfig(user: AuthUser) {
    this.assertAdmin(user)
    const row = await this.prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
    const link = await this.auth.hasDataHubLink(user.id)
    return {
      shareId: row?.shareId ?? null,
      selectedEntries: (row?.selectedEntries as unknown[]) ?? [],
      excludedPaths: (row?.excludedPaths as string[]) ?? [],
      hour: row?.hour ?? 6,
      minute: row?.minute ?? 0,
      configVersion: row?.configVersion ?? 0,
      savedByUserId: row?.savedByUserId ?? null,
      dataHubLinked: link.linked,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    }
  }

  async putSyncConfig(user: AuthUser, dto: PutLedgerSyncConfigDto) {
    this.assertAdmin(user)
    const link = await this.auth.hasDataHubLink(user.id)
    if (!link.linked) {
      throw apiError(400, '请先连接 data-hub', API_MSG.badRequest)
    }
    const prev = await this.prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
    const nextVersion = (prev?.configVersion ?? 0) + 1
    const row = await this.prisma.ledgerSyncConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        shareId: dto.shareId ?? null,
        selectedEntries: dto.selectedEntries as unknown as Prisma.InputJsonValue,
        excludedPaths: dto.excludedPaths as unknown as Prisma.InputJsonValue,
        hour: dto.hour,
        minute: dto.minute,
        savedByUserId: user.id,
        configVersion: nextVersion,
      },
      update: {
        shareId: dto.shareId ?? null,
        selectedEntries: dto.selectedEntries as unknown as Prisma.InputJsonValue,
        excludedPaths: dto.excludedPaths as unknown as Prisma.InputJsonValue,
        hour: dto.hour,
        minute: dto.minute,
        savedByUserId: user.id,
        configVersion: nextVersion,
      },
    })
    return {
      shareId: row.shareId,
      selectedEntries: row.selectedEntries,
      excludedPaths: row.excludedPaths,
      hour: row.hour,
      minute: row.minute,
      configVersion: row.configVersion,
      savedByUserId: row.savedByUserId,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async listSyncRuns(
    user: AuthUser,
    query: { page?: number; pageSize?: number },
  ) {
    this.assertAdmin(user)
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? 10, 100)
    const skip = (page - 1) * pageSize
    const [list, total] = await this.prisma.$transaction([
      this.prisma.ledgerSyncRun.findMany({
        orderBy: { startedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.ledgerSyncRun.count(),
    ])
    return {
      list: list.map((r) => this.serializeRun(r)),
      total,
      page,
      pageSize,
    }
  }

  async listRunDiffs(
    user: AuthUser,
    runId: string,
    query: { page?: number; pageSize?: number },
  ) {
    this.assertAdmin(user)
    const page = query.page ?? 1
    const pageSize = Math.min(query.pageSize ?? 10, 100)
    const skip = (page - 1) * pageSize
    const [list, total] = await this.prisma.$transaction([
      this.prisma.ledgerSyncRunDiff.findMany({
        where: { runId },
        orderBy: [{ tableName: 'asc' }, { rowId: 'asc' }, { field: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.ledgerSyncRunDiff.count({ where: { runId } }),
    ])
    return { list, total, page, pageSize }
  }

  async runSync(user: AuthUser, dto: LedgerSyncRunDto) {
    this.assertAdmin(user)
    const config = await this.prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
    if (!config?.shareId || !config.savedByUserId || !(config.selectedEntries as unknown[])?.length) {
      await this.prisma.ledgerSyncRun.create({
        data: {
          runType: 'manual',
          status: 'failed',
          message: '尚未配置同步',
          finishedAt: new Date(),
          actorUserId: user.id,
          configVersion: config?.configVersion ?? 0,
        },
      })
      throw apiError(400, '尚未配置同步', API_MSG.badRequest)
    }
    const result = await this.executeSyncRun({
      runType: 'manual',
      actorUserId: user.id,
      viewUserId: config.savedByUserId,
      scheduledRunDate: null,
      previewFiles: dto.previewFiles,
      throwOnError: true,
    })
    return result
  }

  async runScheduledSync(scheduledRunDate: string): Promise<void> {
    const config = await this.prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
    if (!config?.shareId || !config.savedByUserId || !(config.selectedEntries as unknown[])?.length) {
      return
    }
    await this.executeSyncRun({
      runType: 'scheduled',
      actorUserId: config.savedByUserId,
      viewUserId: config.savedByUserId,
      scheduledRunDate,
      previewFiles: undefined,
      throwOnError: false,
    })
  }

  private async executeSyncRun(options: ExecuteSyncOptions) {
    const config = await this.prisma.ledgerSyncConfig.findUnique({ where: { id: CONFIG_ID } })
    if (!config?.shareId || !config.savedByUserId) {
      throw apiError(400, '尚未配置同步', API_MSG.badRequest)
    }

    const executorId = randomUUID()
    const run = await this.prisma.ledgerSyncRun.create({
      data: {
        runType: options.runType,
        status: 'running',
        executorId,
        leaseExpiresAt: new Date(Date.now() + SYNC_LEASE_MS),
        actorUserId: options.actorUserId,
        configVersion: config.configVersion,
        scheduledRunDate: options.scheduledRunDate ?? null,
      },
    })

    const lockRows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${SYNC_ADVISORY_LOCK}) AS locked
    `
    if (!lockRows[0]?.locked) {
      await this.prisma.ledgerSyncRun.updateMany({
        where: { id: run.id, executorId, status: 'running' },
        data: { status: 'failed', message: '已有同步正在执行', finishedAt: new Date() },
      })
      if (options.throwOnError) {
        throw apiError(409, '已有同步正在执行', API_MSG.conflict)
      }
      return { id: run.id, status: 'failed' as const }
    }

    let heartbeatTimer: ReturnType<typeof setInterval> | undefined
    let leaseAlive = true

    const stopHeartbeat = (): void => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = undefined
      }
    }

    heartbeatTimer = setInterval(() => {
      void extendSyncLease(this.prisma, run.id, executorId).then((ok) => {
        if (!ok) {
          leaseAlive = false
          stopHeartbeat()
        }
      })
    }, SYNC_HEARTBEAT_MS)

    try {
      if (!leaseAlive) {
        throw apiError(409, '同步租约已失效', API_MSG.conflict)
      }

      const tokenUserId = config.savedByUserId
      let accessToken: string
      try {
        accessToken = await this.auth.getDataHubAccessToken(tokenUserId)
      } catch (error) {
        throw apiError(401, '授权已失效', API_MSG.dataHubUnauthorized)
      }

      const body: LedgerSyncBodyDto = {
        shareId: config.shareId,
        selectedEntries: config.selectedEntries as unknown as LedgerSyncBodyDto['selectedEntries'],
        excludedPaths: (config.excludedPaths as string[]) ?? [],
        previewFiles: options.previewFiles,
      }
      const viewUser: AuthUser = {
        id: options.viewUserId,
        role: 'admin',
        sessionId: executorId,
        phone: '',
        displayName: '',
        dataHubUserId: null,
      }
      const packed = await this.buildSelectedView(viewUser, body, accessToken, true)
      if (hasBlockingIssues(packed.issues)) {
        throw apiError(400, packed.issues[0]?.message ?? '当前选择无法同步', API_MSG.badRequest)
      }
      if (options.previewFiles?.length) {
        const currentSnapshot = packed.files.map((file) => ({
          path: file.path,
          modifiedAt: file.modifiedAt,
        }))
        if (!comparePreviewFiles(options.previewFiles, currentSnapshot)) {
          throw apiError(400, '共享盘文件已变化，请重新核对', API_MSG.badRequest)
        }
      }
      if (!packed.snapshot) {
        throw apiError(400, '当前选择无法同步', API_MSG.badRequest)
      }

      if (!leaseAlive) {
        throw apiError(409, '同步租约已失效', API_MSG.conflict)
      }

      const plan = await planSyncApply(this.prisma, packed.snapshot, packed.checkScores ?? {})
      await this.prisma.$transaction(async (tx) => {
        await executeSyncWrites(tx as unknown as PrismaService, plan)
        if (plan.diffs.length) {
          await tx.ledgerSyncRunDiff.createMany({
            data: plan.diffs.map((d) => ({
              runId: run.id,
              tableName: d.tableName,
              rowId: d.rowId ?? null,
              field: d.field,
              shareValue: d.shareValue,
              gridValue: d.gridValue,
              kind: d.kind,
              workshop: d.workshop ?? null,
              month: d.month ?? null,
            })),
          })
        }
        const updated = await tx.ledgerSyncRun.updateMany({
          where: { id: run.id, status: 'running', executorId },
          data: {
            status: 'success',
            message: '',
            finishedAt: new Date(),
            addedCount: plan.addedCount,
            skippedCount: plan.skippedCount,
            diffCount: plan.diffCount,
            unmatchedCount: plan.unmatchedCount,
            tombstoneSkipCount: plan.tombstoneSkipCount,
          },
        })
        if (updated.count !== 1) {
          throw apiError(500, '同步状态更新失败', API_MSG.internalError)
        }
      })

      return {
        id: run.id,
        status: 'success' as const,
        addedCount: plan.addedCount,
        skippedCount: plan.skippedCount,
        diffCount: plan.diffCount,
        unmatchedCount: plan.unmatchedCount,
        tombstoneSkipCount: plan.tombstoneSkipCount,
        diffs: plan.diffs,
      }
    } catch (error) {
      let message = '同步失败'
      if (error instanceof HttpException) {
        const body = error.getResponse()
        if (typeof body === 'object' && body && 'message' in body) {
          message = String((body as { message: string }).message)
        }
      } else if (error instanceof Error) {
        message = error.message
      }
      await this.prisma.ledgerSyncRun.updateMany({
        where: { id: run.id, status: 'running', executorId },
        data: { status: 'failed', message: String(message), finishedAt: new Date() },
      })
      if (options.throwOnError) {
        throw error
      }
      return { id: run.id, status: 'failed' as const }
    } finally {
      stopHeartbeat()
      await this.prisma.$executeRaw`SELECT pg_advisory_unlock(${SYNC_ADVISORY_LOCK})`
    }
  }

  private serializeRun(r: {
    id: string
    runType: string
    status: string
    message: string
    startedAt: Date
    finishedAt: Date | null
    actorUserId: string | null
    configVersion: number
    scheduledRunDate: string | null
    addedCount: number
    skippedCount: number
    diffCount: number
    unmatchedCount: number
    tombstoneSkipCount: number
  }) {
    return {
      id: r.id,
      runType: r.runType,
      status: r.status,
      message: r.message,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      actorUserId: r.actorUserId,
      configVersion: r.configVersion,
      scheduledRunDate: r.scheduledRunDate,
      addedCount: r.addedCount,
      skippedCount: r.skippedCount,
      diffCount: r.diffCount,
      unmatchedCount: r.unmatchedCount,
      tombstoneSkipCount: r.tombstoneSkipCount,
    }
  }
}