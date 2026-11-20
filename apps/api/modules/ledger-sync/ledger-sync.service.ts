import { Inject, Injectable } from '@nestjs/common'

import { apiError, API_MSG, RuntimeConfigService } from '../../common'
import { AuthService } from '../auth/auth.service'
import type { AuthUser } from '../auth/auth.types'
import { LEDGER_ROLE_LABELS } from './ledger-roles'
import {
  DataHubRequestError,
  fetchWorkbook,
  listShareEntries,
  listShares,
  mapDataHubError,
  searchLedgerPaths,
} from './data-hub-client'
import type { LedgerEntriesQueryDto } from './dto/ledger-entries-query.dto'
import type { LedgerSyncBodyDto } from './dto/ledger-sync-body.dto'
import type { LedgerSharesQueryDto } from './dto/ledger-shares-query.dto'
import { matchLedgerFiles, normalizeRootPath, validateRootPath } from './match-files'
import { mapWorkbooksToSnapshot } from './map-workbook'
import type { LedgerRole } from './ledger-roles'

@Injectable()
export class LedgerSyncService {
  @Inject(AuthService)
  private readonly auth!: AuthService

  @Inject(RuntimeConfigService)
  private readonly config!: RuntimeConfigService

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
    const shares = await this.safeHub(() =>
      listShares(this.config.dataHubOAuth.apiOrigin, accessToken, globalThis.fetch),
    )
    const share = shares.find((item) => item.id === shareId)
    if (!share || share.status !== 'ready') {
      throw apiError(404, '找不到可用的共享盘', 'not_found')
    }
    const path = normalizeRootPath(query.path ?? '')
    const rootError = validateRootPath(path)
    if (rootError) {
      throw apiError(400, rootError, 'bad_request')
    }
    const list = await this.safeHub(() =>
      listShareEntries(
        this.config.dataHubOAuth.apiOrigin,
        accessToken,
        shareId,
        path,
        globalThis.fetch,
      ),
    )
    return {
      list: list
        .filter((item) => item.kind === 'directory')
        .map((item) => ({ name: item.name, path: item.path })),
    }
  }

  async preview(user: AuthUser, body: LedgerSyncBodyDto) {
    const mapped = await this.resolveFiles(user, body)
    const mapResult = await this.loadAndMap(user, body.shareId, mapped, false)
    return {
      files: mapResult.files,
      counts: mapResult.counts,
    }
  }

  async sync(user: AuthUser, body: LedgerSyncBodyDto) {
    const mapped = await this.resolveFiles(user, body)
    const mapResult = await this.loadAndMap(user, body.shareId, mapped, true)
    return {
      counts: mapResult.counts,
      snapshot: mapResult.snapshot,
      checkScores: mapResult.checkScores,
    }
  }

  private async resolveFiles(user: AuthUser, body: LedgerSyncBodyDto) {
    const rootPath = normalizeRootPath(body.rootPath ?? '')
    const rootError = validateRootPath(rootPath)
    if (rootError) {
      throw apiError(400, rootError, 'bad_request')
    }
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    const shares = await this.safeHub(() =>
      listShares(this.config.dataHubOAuth.apiOrigin, accessToken, globalThis.fetch),
    )
    const share = shares.find((item) => item.id === body.shareId)
    if (!share || share.status !== 'ready') {
      throw apiError(404, '找不到可用的共享盘', 'not_found')
    }
    const hits = await this.safeHub(() =>
      searchLedgerPaths(
        this.config.dataHubOAuth.apiOrigin,
        accessToken,
        body.shareId,
        '',
        globalThis.fetch,
      ),
    )
    const matched = matchLedgerFiles(hits, {
      preferRootPath: rootPath || undefined,
    })
    if (matched.kind === 'reject') {
      throw apiError(400, matched.message, 'bad_request')
    }
    return matched
  }

  private async loadAndMap(
    user: AuthUser,
    shareId: string,
    matched: Extract<Awaited<ReturnType<typeof matchLedgerFiles>>, { kind: 'ok' }>,
    includeSnapshot: boolean,
  ) {
    const accessToken = await this.auth.getDataHubAccessToken(user.id)
    const workbooks = new Map()
    const fileSummaries: Array<{
      role: LedgerRole
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
}