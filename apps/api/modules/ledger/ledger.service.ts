import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { apiError } from '../../common/api-error'
import { PrismaService } from '../../common/prisma/prisma.service'
import {
  FORBIDDEN_WRITE,
  isLedgerTableKey,
  LEDGER_TABLE_KEYS,
  MAX_ROWS_PER_TABLE,
  NUM_FIELDS,
  TABLES_WITH_SOURCE_KEY,
  TEXT_FIELDS,
  type LedgerTableKey,
} from './ledger-tables'
import { serializeRow } from './ledger-serialize'
import { parseOptionalNumber, parseSkillLv, sanitizeText } from './text-value'

type TableDelegate = {
  findMany: (args?: { orderBy?: { createdAt: 'desc' } }) => Promise<Record<string, unknown>[]>
  findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>
  count: () => Promise<number>
  create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<Record<string, unknown>>
  delete: (args: { where: { id: string } }) => Promise<Record<string, unknown>>
}

@Injectable()
export class LedgerService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService

  private delegate(table: LedgerTableKey): TableDelegate {
    const map: Record<LedgerTableKey, () => TableDelegate> = {
      fa: () => this.prisma.ledgerFa as unknown as TableDelegate,
      fqcNg: () => this.prisma.ledgerFqcNg as unknown as TableDelegate,
      fqc: () => this.prisma.ledgerFqc as unknown as TableDelegate,
      cmp: () => this.prisma.ledgerCmp as unknown as TableDelegate,
      perf: () => this.prisma.ledgerPerf as unknown as TableDelegate,
      mat: () => this.prisma.ledgerMat as unknown as TableDelegate,
      trn: () => this.prisma.ledgerTrn as unknown as TableDelegate,
      exam: () => this.prisma.ledgerExam as unknown as TableDelegate,
      skill: () => this.prisma.ledgerSkill as unknown as TableDelegate,
    }
    return map[table]()
  }

  async getSnapshot(): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {}
    for (const key of LEDGER_TABLE_KEYS) {
      const rows = await this.delegate(key).findMany({ orderBy: { createdAt: 'desc' } })
      out[key] = rows.map((r) => serializeRow(key, r))
    }
    const scores = await this.prisma.checkScore.findMany({ orderBy: { workshop: 'asc' } })
    out.checkScores = {
      list: scores.map((s) => ({
        id: s.id,
        workshop: s.workshop,
        month: s.month,
        score: Number(s.score.toString()),
        updatedAt: s.updatedAt.toISOString(),
      })),
    }
    return out
  }

  async getRow(table: string, id: string): Promise<Record<string, unknown>> {
    if (!isLedgerTableKey(table)) {
      throw apiError(400, '表名无效')
    }
    const row = await this.delegate(table).findUnique({ where: { id } })
    if (!row) {
      throw apiError(404, '记录不存在')
    }
    return serializeRow(table, row)
  }

  async createRow(table: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!isLedgerTableKey(table)) {
      throw apiError(400, '表名无效')
    }
  for (const key of Object.keys(body)) {
      if (FORBIDDEN_WRITE.has(key)) {
        throw apiError(400, `不允许写入字段 ${key}`)
      }
    }
    const count = await this.delegate(table).count()
    if (count >= MAX_ROWS_PER_TABLE) {
      throw apiError(409, `${table} 已达 ${MAX_ROWS_PER_TABLE} 行上限`)
    }
    const data = this.buildWriteData(table, body, false)
    const row = await this.delegate(table).create({ data })
    return serializeRow(table, row)
  }

  async patchRow(table: string, id: string, body: Record<string, unknown>): Promise<{ id: string; updated: true }> {
    if (!isLedgerTableKey(table)) {
      throw apiError(400, '表名无效')
    }
    const existing = await this.delegate(table).findUnique({ where: { id } })
    if (!existing) {
      throw apiError(404, '记录不存在')
    }
    for (const key of Object.keys(body)) {
      if (FORBIDDEN_WRITE.has(key)) {
        throw apiError(400, `不允许写入字段 ${key}`)
      }
    }
    const data = this.buildWriteData(table, body, true)
    if (Object.keys(data).length === 0) {
      return { id, updated: true }
    }
    await this.delegate(table).update({ where: { id }, data })
    return { id, updated: true }
  }

  async deleteRow(table: string, id: string): Promise<{ id: string; deleted: true }> {
    if (!isLedgerTableKey(table)) {
      throw apiError(400, '表名无效')
    }
    const existing = await this.delegate(table).findUnique({ where: { id } })
    if (!existing) {
      throw apiError(404, '记录不存在')
    }
    const sourceKey = existing.sourceKey as string | null | undefined
    if (TABLES_WITH_SOURCE_KEY.has(table) && sourceKey) {
      await this.prisma.ledgerTombstone.upsert({
        where: {
          tableName_sourceKey: { tableName: table, sourceKey },
        },
        create: { tableName: table, sourceKey },
        update: {},
      })
    }
    await this.delegate(table).delete({ where: { id } })
    return { id, deleted: true }
  }

  async exportJson(): Promise<Record<string, unknown>> {
    return this.getSnapshot()
  }

  private buildWriteData(
    table: LedgerTableKey,
    body: Record<string, unknown>,
    partial: boolean,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    const textFields = TEXT_FIELDS[table]
    for (const [field, max] of Object.entries(textFields)) {
      if (partial && !(field in body)) continue
      const raw = partial ? body[field] : body[field]
      if (!partial && raw === undefined) {
        data[field === 'from' ? 'from' : field] = ''
        continue
      }
      if (partial && raw === undefined) continue
      const sanitized = sanitizeText(field, raw, max)
      if (!sanitized.ok) {
        throw apiError(400, sanitized.message)
      }
      if (table === 'cmp' && field === 'from') {
        data.from = sanitized.value
      } else {
        data[field] = sanitized.value
      }
    }
    for (const field of NUM_FIELDS[table]) {
      if (partial && !(field in body)) continue
      const parsed = parseOptionalNumber(field, partial ? body[field] : body[field] ?? null)
      if (!parsed.ok) {
        throw apiError(400, parsed.message)
      }
      data[field] = parsed.value === null ? null : new Prisma.Decimal(parsed.value)
    }
    if (table === 'skill') {
      if (partial && !('lv' in body)) return data
      const lv = parseSkillLv(body.lv ?? [])
      if ('error' in lv) {
        throw apiError(400, lv.error)
      }
      data.lv = lv
    }
    if (!partial) {
      data.sourceKey = null
    }
    return data
  }
}