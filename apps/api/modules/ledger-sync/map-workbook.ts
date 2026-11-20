import type { LedgerRole } from './ledger-roles'
import type { MatchedFile } from './match-files'

export interface WorkbookSheet {
  name: string
  rows: string[][]
  formulaWithoutCache?: boolean
}

export interface WorkbookPayload {
  path: string
  modifiedAt?: string
  sheets: WorkbookSheet[]
}

export interface LedgerSnapshot {
  fa: Record<string, unknown>[]
  fqc: Record<string, unknown>[]
  fqcNg: Record<string, unknown>[]
  cmp: Record<string, unknown>[]
  perf: Record<string, unknown>[]
  mat: Record<string, unknown>[]
  trn: Record<string, unknown>[]
  exam: Record<string, unknown>[]
  skill: Record<string, unknown>[]
}

export type CheckScoresPayload = Record<string, Record<string, number>>

export type MapWorkbooksResult =
  | {
      kind: 'ok'
      snapshot: LedgerSnapshot
      checkScores: CheckScoresPayload
      counts: Record<string, number>
    }
  | { kind: 'reject'; message: string }

function emptySnapshot(): LedgerSnapshot {
  return {
    fa: [],
    fqc: [],
    fqcNg: [],
    cmp: [],
    perf: [],
    mat: [],
    trn: [],
    exam: [],
    skill: [],
  }
}

function normalizeHeader(cell: string): string {
  return cell.trim().replace(/\s+/g, '')
}

function sheetToObjects(sheet: WorkbookSheet): Record<string, string>[] {
  const rows = sheet.rows.filter((row) => row.some((cell) => String(cell).trim() !== ''))
  if (rows.length < 2) return []
  const headers = rows[0]!.map((cell) => normalizeHeader(String(cell)))
  return rows.slice(1).map((row) => {
    const item: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (!header) return
      item[header] = String(row[index] ?? '').trim()
    })
    return item
  })
}

function requireColumns(
  fileLabel: string,
  objects: Record<string, string>[],
  aliases: Record<string, string[]>,
): string[] | null {
  if (objects.length === 0) return []
  const keys = new Set(Object.keys(objects[0]!))
  const missing: string[] = []
  for (const required of Object.keys(aliases)) {
    const ok = aliases[required]!.some((alias) => keys.has(alias))
    if (!ok) missing.push(required)
  }
  if (missing.length > 0) {
    throw new Error(`${fileLabel} 缺少列：${missing.join('、')}`)
  }
  return null
}

function pick(row: Record<string, string>, aliases: string[]): string {
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== '') return row[key]
  }
  return ''
}

function parseFaSxSheet(sheet: WorkbookSheet, dept: string, fileLabel: string): Record<string, unknown>[] {
  const objects = sheetToObjects(sheet)
  requireColumns(fileLabel, objects, {
    日期: ['日期', '检验日期'],
    类型: ['类型', 'S/X', 'SX'],
    结果: ['结果', '判定'],
    检验员: ['检验员', '检验人', 'who'],
  })
  const batches = new Map<
    string,
    { date: string; who: string; stage: string; dept: string; ng: boolean }
  >()
  for (const row of objects) {
    const date = pick(row, ['日期', '检验日期'])
    const who = pick(row, ['检验员', '检验人', 'who'])
    if (!date) continue
    const typeRaw = pick(row, ['类型', 'S/X', 'SX']).toUpperCase()
    const stage = typeRaw.startsWith('S') ? '首件' : typeRaw.startsWith('X') ? '巡检' : typeRaw || '首件'
    const result = pick(row, ['结果', '判定']).toUpperCase()
    const key = `${date}|${who}`
    const existing = batches.get(key) ?? {
      date,
      who,
      stage,
      dept,
      ng: false,
    }
    if (result === 'NG') existing.ng = true
    batches.set(key, existing)
  }
  return [...batches.values()].map((batch) => ({
    date: batch.date,
    stage: batch.stage,
    dept: batch.dept,
    pn: '',
    part: '',
    item: '',
    spec: '',
    meas: '',
    result: batch.ng ? 'NG' : 'OK',
    who: batch.who,
    status: batch.ng ? 'NG' : 'OK',
    action: batch.ng ? '待对策' : '首件OK，正常生产',
    eng: '',
  }))
}

function parseComplaintSheet(sheet: WorkbookSheet, fileLabel: string): Record<string, unknown>[] {
  const objects = sheetToObjects(sheet)
  requireColumns(fileLabel, objects, {
    日期: ['日期'],
    部门: ['责任部门', '部门', 'dept'],
  })
  return objects
    .filter((row) => pick(row, ['日期']))
    .map((row) => ({
      date: pick(row, ['日期']),
      from: pick(row, ['来源', 'from']),
      dept: pick(row, ['责任部门', '部门', 'dept']),
      model: pick(row, ['机型', 'model']),
      part: pick(row, ['零件', 'part']),
      pn: pick(row, ['品号', 'pn']),
      issue: pick(row, ['问题', 'issue']),
      cause: pick(row, ['原因', 'cause']),
      temp: pick(row, ['临时对策', 'temp']),
      perm: pick(row, ['永久对策', 'perm']),
      owner: pick(row, ['负责人', 'owner']),
      planReply: pick(row, ['计划回复', 'planReply']),
      actReply: pick(row, ['实际回复', 'actReply']),
      ontimeReply: pick(row, ['回复准时', 'ontimeReply']),
      planDisp: pick(row, ['计划处置', 'planDisp']),
      actDisp: pick(row, ['实际处置', 'actDisp']),
      ontimeDisp: pick(row, ['处置准时', 'ontimeDisp']),
      planClose: pick(row, ['计划关闭', 'planClose']),
      actClose: pick(row, ['实际关闭', 'actClose']),
      ontimeClose: pick(row, ['关闭准时', 'ontimeClose']),
      repeat: pick(row, ['重复', 'repeat']),
    }))
}

function parsePerfSheet(sheet: WorkbookSheet, fileLabel: string): Record<string, unknown>[] {
  const objects = sheetToObjects(sheet)
  requireColumns(fileLabel, objects, {
    日期: ['日期', 'date'],
    分值: ['分值', '加减分', 'score'],
  })
  return objects
    .filter((row) => pick(row, ['日期', 'date']))
    .map((row) => ({
      date: pick(row, ['日期', 'date']),
      dept: pick(row, ['部门', 'dept']),
      who: pick(row, ['姓名', 'who']),
      attr: pick(row, ['属性', 'attr']),
      item: pick(row, ['项目', 'item']),
      score: pick(row, ['分值', '加减分', 'score']),
    }))
}

function parseInventorySheet(sheet: WorkbookSheet, fileLabel: string): Record<string, unknown>[] {
  const objects = sheetToObjects(sheet)
  requireColumns(fileLabel, objects, {
    日期: ['日期', 'd'],
  })
  return objects
    .filter((row) => pick(row, ['日期', 'd']))
    .map((row) => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        out[key] = value
      }
      return out
    })
}

function parseFqcNgRows(sheet: WorkbookSheet, ws: string, fileLabel: string): Record<string, unknown>[] {
  const objects = sheetToObjects(sheet)
  requireColumns(fileLabel, objects, {
    日期: ['日期', 'd'],
    批次: ['批次', 'lot', '批号'],
  })
  return objects
    .filter((row) => pick(row, ['日期', 'd']))
    .map((row) => ({
      ws,
      d: pick(row, ['日期', 'd']),
      pn: pick(row, ['品号', 'pn']),
      lot: pick(row, ['批次', 'lot', '批号']),
      rate: pick(row, ['不良率', 'rate']),
      issue: pick(row, ['不良项', 'issue']),
    }))
}

function parsePrintLedger(
  workbook: WorkbookPayload,
  fileLabel: string,
): { fa: Record<string, unknown>[]; fqcNg: Record<string, unknown>[] } {
  const faSheet =
    workbook.sheets.find((s) => s.name.includes('首件') || s.name.toLowerCase().includes('fa')) ??
    workbook.sheets[0]
  const fqcSheet =
    workbook.sheets.find((s) => s.name.includes('FQC') || s.name.includes('终检')) ??
    workbook.sheets[workbook.sheets.length > 1 ? 1 : 0]
  if (!faSheet || !fqcSheet) {
    throw new Error(`${fileLabel} 需要首件与终检两个工作表`)
  }
  const fa = parseFaSxSheet(faSheet, '印刷', `${fileLabel}·首件`)
  const fqcNg = parseFqcNgRows(fqcSheet, '印刷', `${fileLabel}·终检`)
  return { fa, fqcNg }
}

function parseCheckRank(workbook: WorkbookPayload, fileLabel: string): CheckScoresPayload {
  const sheet = workbook.sheets[0]
  if (!sheet) throw new Error(`${fileLabel} 无工作表`)
  const objects = sheetToObjects(sheet)
  requireColumns(fileLabel, objects, {
    月份: ['月份', 'month', 'm'],
    车间: ['车间', '责任区', 'ws'],
    得分: ['得分', '评分', 'score'],
  })
  const scores: CheckScoresPayload = {}
  for (const row of objects) {
    const ws = pick(row, ['车间', '责任区', 'ws'])
    const month = pick(row, ['月份', 'month', 'm'])
    const score = Number(pick(row, ['得分', '评分', 'score']))
    if (!ws || !month || Number.isNaN(score)) continue
    const bucket = scores[ws] ?? (scores[ws] = {})
    bucket[month] = score
  }
  return scores
}

const FA_DEPT: Partial<Record<LedgerRole, string>> = {
  faFocus: '注塑',
  faInjection: '注塑',
  faInjectionBur: '注塑毛边',
  faDiecast: '压铸',
  faHardware: '五金',
}

const FQC_WS: Partial<Record<LedgerRole, string>> = {
  fqcInjection: '注塑',
  fqcInjectionBur: '注塑毛边',
  fqcDiecast: '压铸',
  fqcHardware: '五金',
  fqcCoating: '涂装',
}

export function mapWorkbooksToSnapshot(
  files: MatchedFile[],
  workbooks: Map<LedgerRole, WorkbookPayload>,
  missingOptional: LedgerRole[],
): MapWorkbooksResult {
  const snapshot = emptySnapshot()
  const checkScores: CheckScoresPayload = {}

  try {
    for (const file of files) {
      if (missingOptional.includes(file.role)) continue
      const wb = workbooks.get(file.role)
      if (!wb?.sheets?.length) {
        return { kind: 'reject', message: `无法读取：${file.name}` }
      }
      const label = file.name

      if (file.role === 'printLedger') {
        const { fa, fqcNg } = parsePrintLedger(wb, label)
        snapshot.fa.push(...fa)
        snapshot.fqcNg.push(...fqcNg)
        continue
      }
      if (file.role === 'complaint') {
        snapshot.cmp.push(...parseComplaintSheet(wb.sheets[0]!, label))
        continue
      }
      if (file.role === 'perf') {
        snapshot.perf.push(...parsePerfSheet(wb.sheets[0]!, label))
        continue
      }
      if (file.role === 'fqcInventory') {
        snapshot.fqc.push(...parseInventorySheet(wb.sheets[0]!, label))
        continue
      }
      if (file.role === 'checkRank') {
        Object.assign(checkScores, parseCheckRank(wb, label))
        continue
      }
      if (file.role === 'checkStandard') {
        /* 点检项目仍由领域配置承载；同步仅确认源文件可读 */
        continue
      }
      if (file.role in FA_DEPT) {
        const dept = FA_DEPT[file.role as keyof typeof FA_DEPT]!
        snapshot.fa.push(...parseFaSxSheet(wb.sheets[0]!, dept, label))
        continue
      }
      if (file.role in FQC_WS) {
        const ws = FQC_WS[file.role as keyof typeof FQC_WS]!
        snapshot.fqcNg.push(...parseFqcNgRows(wb.sheets[0]!, ws, label))
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '表格解析失败'
    return { kind: 'reject', message }
  }

  if (missingOptional.includes('faInjectionBur')) {
    /* 毛边首件缺失：不向 fa 写入占位行 */
  }

  const counts = {
    fa: snapshot.fa.length,
    fqc: snapshot.fqc.length,
    fqcNg: snapshot.fqcNg.length,
    cmp: snapshot.cmp.length,
    perf: snapshot.perf.length,
    mat: snapshot.mat.length,
    trn: 0,
    exam: 0,
    skill: 0,
  }

  return { kind: 'ok', snapshot, checkScores, counts }
}