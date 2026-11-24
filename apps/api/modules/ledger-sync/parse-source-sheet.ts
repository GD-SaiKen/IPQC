/**
 * @file 真实共享盘工作表解析
 * @description 以已核实的物理列区生成台账事实、来源和逐行诊断。
 * @author Codex
 * @date 2026-11-23
 */

import type { ParsedFileResult, ParsedSourceRow, SheetPlan, SourceRef } from './source-types'

import { SOURCE_PARSER_VERSION } from './source-types'

type Columns = Readonly<Record<number, string>>
type Row = readonly string[]
type Fields = ParsedSourceRow['fields']
type Table = ParsedSourceRow['table']
type Diagnose = (code: string, message: string, region?: string) => void

interface FaLayout {
  headers: Columns[]
  time: number
  judgement: number
  who: number
  final: number
  action: number
  engineering: number
  defects?: [number, number]
  model?: number
  machine?: number
  process?: number
}

const FA_LAYOUTS: Partial<Record<string, FaLayout>> = {
  faInjection: {
    headers: [
      { 0: '日期', 1: '品号', 2: '机台', 3: '时间', 4: '判定', 5: '检验员', 6: '不良分类',
        11: '改善状况', 12: 'CE工程确认', 16: '首件最终判定结果', 22: '末件' },
      { 6: '尺寸', 7: '外观', 8: '设变', 9: '试产', 10: '维修', 22: '日期', 23: '时间', 26: '判定', 27: '检验员' },
    ],
    time: 3, judgement: 4, who: 5, final: 16, action: 11, engineering: 12, defects: [6, 10], machine: 2,
  },
  faDiecast: {
    headers: [
      { 0: '日期', 1: '品号', 2: '机种', 3: '机台', 4: '时间', 5: '判定', 6: '检验员', 7: '尺寸不良',
        8: '重量不良', 9: '外观不良', 10: '设变', 11: '试产/试模', 12: '改善状况', 13: 'CE工程确认', 17: '最终判定' },
    ],
    time: 4, judgement: 5, who: 6, final: 17, action: 12, engineering: 13, defects: [7, 11], model: 2, machine: 3,
  },
  faHardware: {
    headers: [
      { 0: '日期', 1: '品号', 2: '机种', 3: '工序', 4: '时间', 5: '判定', 6: '检验员', 7: '改善状况',
        9: '工程确认', 12: '最终判定' },
    ],
    time: 4, judgement: 5, who: 6, final: 12, action: 7, engineering: 9, model: 2, process: 3,
  },
}

interface FqcLayout {
  headers: [Columns, Columns]
  date: number
  partNumber?: number
  job?: number
  jobFromPrintFa?: boolean
  batchQty: number
  samp: number
  alternateSamp?: number
  bad: number
  judgement: number
  who: number
  action?: number
  note?: number
  defects: [number, number]
  recheck?: number
}

const FQC_LAYOUTS: Partial<Record<string, FqcLayout>> = {
  fqcInjection: {
    headers: [
      { 0: '日期', 2: '品号', 4: '批量数', 5: '抽检数', 6: '抽检不良数', 8: '不良项目', 27: '判定',
        30: '检验员', 31: '处理措施', 35: '异常返工' },
      { 1: '工单号', 8: '毛边', 26: '其他', 35: '日期', 36: '重检批量数', 37: '重检抽检数', 38: '判定', 39: '检验员' },
    ],
    date: 0, partNumber: 2, job: 1, batchQty: 4, samp: 5, bad: 6, judgement: 27, who: 30, action: 31,
    defects: [8, 26], recheck: 35,
  },
  fqcInjectionBur: {
    headers: [
      { 0: '日期', 1: '工单号', 2: '品号', 4: '批量数', 5: '抽检数', 6: '抽检不良数', 8: '不良项', 21: '判定',
        24: '检验员', 25: '处理措施', 26: '异常返工', 34: '备注' },
      { 8: '混料', 20: '其他', 26: '日期', 27: '重检批量数', 28: '重检抽检数', 29: '判定', 30: '检验员' },
    ],
    date: 0, partNumber: 2, job: 1, batchQty: 4, samp: 5, bad: 6, judgement: 21, who: 24, action: 25, note: 34,
    defects: [8, 20], recheck: 26,
  },
  fqcDiecast: {
    headers: [
      { 0: '日期', 1: '品号', 4: '工单号', 5: '批量数', 6: '抽检数', 7: '抽检不良数', 9: '不良项目',
        26: '判定', 29: '检验员', 31: '处理措施', 35: '备注' },
      { 9: '装配不良', 25: '其他' },
    ],
    date: 0, partNumber: 1, job: 4, batchQty: 5, samp: 6, bad: 7, judgement: 26, who: 29, action: 31, note: 35,
    defects: [9, 25],
  },
  fqcHardware: {
    headers: [
      { 0: '日期', 1: '品号', 2: '品号', 4: '批量数', 5: '外观抽样数', 6: '抽检不良数', 8: '不良项目',
        23: '判定', 26: '检验员', 28: '处理措施' },
      { 8: '螺牙不良', 22: '其它' },
    ],
    date: 0, partNumber: 1, batchQty: 4, samp: 5, bad: 6, judgement: 23, who: 26, action: 28, note: 32,
    defects: [8, 22],
  },
  fqcCoating: {
    headers: [
      { 0: '日期', 1: '单号', 3: '颜色', 4: '数量', 5: '外观抽检数', 7: '抽检不良数', 9: '不良项目/批',
        27: '判定', 30: '品管签名', 31: '处理措施', 35: '备注' },
      { 9: '色差', 26: '其他' },
    ],
    // 涂装第三列的表头为空，已核实该物理列存放完整料号。
    date: 0, partNumber: 2, job: 1, batchQty: 4, samp: 5, bad: 7, judgement: 27, who: 30, action: 31, note: 35,
    defects: [9, 26],
  },
  printLedger: {
    headers: [
      { 0: '首件', 12: 'FQC出货检验日期', 13: '批量数', 14: '抽检数', 15: '实际抽样数', 16: '抽检不良数',
        18: '不良项目/批', 36: '判定', 39: '备注', 40: '检验员' },
      { 0: '首件日期', 1: 'JOB单号', 2: '料名', 3: '机种', 4: '印刷遍数', 5: '印刷颜色/内容(对照指导表)',
        11: '判定', 18: '跑位', 35: '其他' },
    ],
    date: 12, job: 1, jobFromPrintFa: true, batchQty: 13, samp: 15, alternateSamp: 14, bad: 16, judgement: 36, who: 40, note: 39,
    defects: [18, 35],
  },
}

const COMPLAINT_HEADERS: Columns[] = [
  { 0: '投诉日期', 1: '投诉部门/人', 2: '生产部门', 3: '机种', 4: '品名', 5: '料号', 6: '异常投诉', 7: '原因分析',
    8: '临时对策(不良品处理对策)', 9: '永久对策', 10: '负责人', 11: '异常单完成包括临时对策(3天)',
    14: '不良品处理完成(3天)', 17: '对策结案预计7天或按工程回复时间', 20: '是否重复异常' },
  { 11: '异常回复计划完成时间', 12: '异常回复实际时间', 13: '异常回复是否按时', 14: '不良品处理计划完成时间',
    15: '不良品处理实际完成时间', 16: '不良品处理是否按时', 17: '预计结案时间', 18: '实际结案时间', 19: '结案是否按时' },
]
const INVENTORY_HEADERS: Columns[] = [
  { 0: '日期', 1: '品号', 2: '名称', 3: '不良描述', 4: '清查人', 5: '清查车间', 8: '实际存放数', 9: '抽检数',
    10: '不良数', 12: '签认', 13: '备注', 14: '不良品处理对策' },
]
const MONTHLY_HEADERS: Columns[] = [
  { 0: '部门', 1: '负责人', 2: '目标', 3: '1', 4: '2', 5: '3', 6: '4', 7: '5', 8: '6', 9: '7',
    10: '8', 11: '9', 12: '10', 13: '11', 14: '12' },
]
const PERFORMANCE_HEADERS: Columns[] = [
  { 0: '车间', 1: '品号', 2: '品名', 3: '发生时间', 4: '投诉单位', 5: '事项', 6: '责任人', 7: '加减分', 8: '绩效属性' },
]

const WORKSHOPS = new Set(['注塑', '注塑毛边', '压铸', '五金', '涂装', '印刷'])
const SUMMARY_LABEL = /^(?:小计|合计|合共|总计|汇总|总数|平均|平均分)(?:$|[:：])/u
const FORMULA_ERROR = /^(?:=|#(?:N\/A|GETTING_DATA|GETTING DATA|[A-Z0-9_/]+[!?])$)/iu
const PASS = new Set(['OK', '合格', 'PASS'])
const FAIL = new Set(['NG', '不合格', 'FAIL'])
const DISPOSITIONS = new Set(['特采', '让步接收', '让步放行'])

function text(row: Row, column?: number): string {
  return column === undefined ? '' : (row[column] ?? '').trim()
}

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, '').toUpperCase()
}

function isSummary(row: Row, columns: Array<number | undefined>): boolean {
  return columns.some((column) => SUMMARY_LABEL.test(text(row, column)))
}

function identityText(row: Row, column: number | undefined, label: string, diagnose: Diagnose): string | null {
  const value = text(row, column)
  if (!FORMULA_ERROR.test(value.normalize('NFKC'))) return value
  diagnose('invalid_identity_value', `${label}含有公式错误或未计算的公式`)
  return null
}

function matchesHeader(rows: readonly Row[], row: number, headers: readonly Columns[]): boolean {
  return headers.every((header, offset) => Object.entries(header)
    .every(([column, label]) => normalized(text(rows[row + offset] ?? [], Number(column))) === normalized(label)))
}

function knownWorkshop(value: string): string | undefined {
  const raw = normalized(value)
  const name = raw === '毛边车间' || raw === '毛边' ? '注塑毛边' : raw.replace(/车间$/u, '')
  return WORKSHOPS.has(name) ? name : undefined
}

/** 仅依源年度解释缺年份或两位年份的日期，完整日期保留其实际年度。 */
export function parseSourceDate(value: string, year: number): string | null {
  const raw = normalized(value)
  const full = /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/u.exec(raw)
  const monthDay = /^(\d{1,2})[-/.月](\d{1,2})(?:日|[-/.](\d{2}))?$/u.exec(raw)
  if (!full && !monthDay) return null
  if (monthDay?.[3] && Number(monthDay[3]) !== year % 100) return null
  const resolvedYear = full ? Number(full[1]) : year
  const month = Number(full?.[2] ?? monthDay?.[1])
  const day = Number(full?.[3] ?? monthDay?.[2])
  if (!Number.isInteger(resolvedYear) || resolvedYear < 1900 || resolvedYear > 9999) return null
  const date = new Date(Date.UTC(resolvedYear, month - 1, day))
  if (date.getUTCFullYear() !== resolvedYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

function sourceDate(value: string, year: number, diagnose: Diagnose): string | null {
  const date = parseSourceDate(value, year)
  if (!date) diagnose('invalid_date', '日期缺失、无法识别或与源表年度不符')
  else if (year && Number(date.slice(0, 4)) !== year) {
    diagnose('date_year_mismatch', '记录日期与源表年度不符，已保留原日期')
  }
  return date
}

function optionalDate(value: string, year: number, label: string, diagnose: Diagnose): string {
  if (!value) return ''
  const date = parseSourceDate(value, year)
  if (!date) diagnose('invalid_date', `${label}日期无法识别`)
  return date ?? ''
}

function numberValue(value: string, label: string, diagnose: Diagnose, signed = false, required = false): number | null {
  if (!value && !required) return null
  const raw = value.normalize('NFKC')
  const numberPattern = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/u
  const parsed = numberPattern.test(raw) ? Number(raw.replace(/,/g, '')) : NaN
  if (Number.isFinite(parsed) && (signed || parsed >= 0)) return parsed
  diagnose('invalid_number', `${label}缺失或不是有效数值`)
  return null
}

function judgement(value: string, label: string, diagnose: Diagnose, required = false): string {
  const raw = normalized(value)
  if (PASS.has(raw)) return 'OK'
  if (FAIL.has(raw)) return 'NG'
  if (DISPOSITIONS.has(raw)) return raw
  if (raw || required) diagnose('invalid_result', `${label}缺失或无法识别`)
  return ''
}

function defects(row: Row, labels: Row, [start, end]: [number, number], diagnose: Diagnose) {
  const categories: string[] = []
  const descriptions: string[] = []
  for (let column = start; column <= end; column += 1) {
    const label = text(labels, column).replace(/[\r\n]/gu, '')
    const value = text(row, column)
    if (!label || !value || /^0+(?:\.0+)?$/u.test(normalized(value))) continue
    if (FORMULA_ERROR.test(value)) {
      diagnose('invalid_defect', '不良项目含有公式错误')
      continue
    }
    categories.push(label)
    descriptions.push(`${label}：${value}`)
  }
  return { cat: categories.join('、'), defs: descriptions.join('；') }
}

function hasValue(row: Row, columns: Array<number | undefined>): boolean {
  return columns.some((column) => {
    const value = text(row, column)
    return value !== '' && !FORMULA_ERROR.test(value)
  })
}

function identity(...parts: Array<string | number | null>): string {
  if (parts.some((part) => part === null)) return ''
  return JSON.stringify(parts.map((part) => typeof part === 'string' ? part.normalize('NFC') : part))
}

function parseFa(row: Row, labels: Row, layout: FaLayout, year: number, workshop: string, diagnose: Diagnose) {
  if (isSummary(row, [0, 1])) return
  if (!hasValue(row, [0, 1, layout.time, layout.judgement, layout.who])) return
  const date = sourceDate(text(row, 0), year, diagnose)
  const pn = identityText(row, 1, '品号', diagnose)
  const result = judgement(text(row, layout.judgement), '初判', diagnose, true)
  const rawTime = normalized(text(row, layout.time))
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?([SXM])$/u.exec(rawTime)
  if (!clock || Number(clock[1]) > 23 || Number(clock[2]) > 59 || Number(clock[3] ?? 0) > 59) {
    diagnose('invalid_inspection_type', '检验时间或末尾 S/X/M 类型无法识别')
    return
  }
  if (pn === '') diagnose('missing_part_number', '检验记录缺少品号')
  if (!date || !pn || !result) return
  const finalResult = judgement(text(row, layout.final), '最终判定', diagnose)
  const who = text(row, layout.who)
  if (!who) diagnose('missing_inspector', '检验记录缺少检验员')
  const time = `${clock[1]!.padStart(2, '0')}:${clock[2]}${clock[3] && clock[3] !== '00' ? `:${clock[3]}` : ''}`
  const inspectionType = clock[4]!
  const machine = identityText(row, layout.machine, '机台', diagnose)
  const process = identityText(row, layout.process, '工序', diagnose)
  const findings = layout.defects ? defects(row, labels, layout.defects, diagnose) : undefined
  return {
    fields: {
      date, dept: workshop, pn, stage: '', time, inspectionType, result, finalResult, who,
      machine: machine ?? '', process: process ?? '',
      model: text(row, layout.model), status: finalResult || result, action: text(row, layout.action),
      eng: text(row, layout.engineering), item: findings?.cat ?? '', meas: findings?.defs ?? '',
    },
    identity: identity(workshop, date, pn, inspectionType, time, machine, process),
  }
}

function parsePrintFa(row: Row, year: number, diagnose: Diagnose) {
  if (isSummary(row, [0, 1])) return
  if (!hasValue(row, [0, 11])) return
  const date = sourceDate(text(row, 0), year, diagnose)
  const result = judgement(text(row, 11), '首件判定', diagnose, true)
  if (!date || !result) return
  const job = identityText(row, 1, 'JOB 单号', diagnose) ?? ''
  return {
    fields: { date, dept: '印刷', stage: '', inspectionType: 'S', pn: '', who: '', job,
      part: text(row, 2), model: text(row, 3), passes: text(row, 4), item: text(row, 5),
      result, finalResult: '', status: result },
    identity: job ? identity('印刷', date, 'S', job) : '',
  }
}

function parseFqc(row: Row, labels: Row, layout: FqcLayout, year: number, workshop: string, diagnose: Diagnose) {
  if (isSummary(row, [layout.date, layout.partNumber, layout.jobFromPrintFa ? undefined : layout.job])) return
  const recheck = layout.recheck
  const hasRecheck = recheck !== undefined && hasValue(row, [recheck, recheck + 1, recheck + 2, recheck + 3, recheck + 4])
  const hasMain = hasValue(row, [layout.date, layout.judgement, layout.who, layout.batchQty, layout.samp, layout.bad])
  const d = hasMain ? sourceDate(text(row, layout.date), year, diagnose) : null
  const result = hasMain ? judgement(text(row, layout.judgement), '终检判定', diagnose, true) : ''
  if (!d || !result) {
    if (hasRecheck) diagnose('orphan_recheck', '复检记录没有可确认的同一行初检信息', 'fqc-recheck')
    return
  }
  const pn = identityText(row, layout.partNumber, '品号', diagnose)
  const jobColumn = layout.jobFromPrintFa && isSummary(row, [0, layout.job]) ? undefined : layout.job
  const lot = identityText(row, jobColumn, '工单或批次号', diagnose)
  const who = text(row, layout.who)
  if (layout.partNumber !== undefined && pn === '') diagnose('missing_part_number', '终检记录缺少品号')
  if (!who) diagnose('missing_inspector', '终检记录缺少检验员')
  const primarySample = text(row, layout.samp)
  const samp = numberValue(primarySample || text(row, layout.alternateSamp), '抽样数', diagnose)
  const bad = numberValue(text(row, layout.bad), '抽检不良数', diagnose)
  const batchQty = numberValue(text(row, layout.batchQty), '批量数', diagnose)
  const fields: Fields = { ws: workshop, d, pn: pn ?? '', lot: lot ?? '', result, batchQty, samp, bad, who,
    ...defects(row, labels, layout.defects, diagnose), act: text(row, layout.action), note: text(row, layout.note) }
  if (hasRecheck) {
    const diagnoseRecheck: Diagnose = (code, message) => diagnose(code, message, 'fqc-recheck')
    fields.rd = optionalDate(text(row, recheck), year, '复检', diagnoseRecheck)
    fields.recheckBatchQty = numberValue(text(row, recheck + 1), '复检批量数', diagnoseRecheck)
    fields.recheckSamp = numberValue(text(row, recheck + 2), '复检抽样数', diagnoseRecheck)
    fields.re = judgement(text(row, recheck + 3), '复检判定', diagnoseRecheck)
    fields.recheckWho = text(row, recheck + 4)
  }
  return { fields, identity: lot ? identity(workshop, d, pn, lot) : '' }
}

function parseComplaint(row: Row, year: number, diagnose: Diagnose) {
  if (isSummary(row, [0, 1, 2])) return
  if (!hasValue(row, [0, 1, 2, 5, 6])) return
  const date = sourceDate(text(row, 0), year, diagnose)
  const pn = identityText(row, 5, '料号', diagnose)
  const from = identityText(row, 1, '投诉部门或投诉人', diagnose)
  const dept = identityText(row, 2, '生产部门', diagnose)
  const issue = identityText(row, 6, '异常投诉', diagnose)
  if (!dept || !issue) diagnose('incomplete_complaint', '投诉记录缺少生产部门或异常说明')
  if (!date || !dept || !issue) return
  const workshop = knownWorkshop(dept) ?? dept
  const fields: Fields = { date, from: from ?? '', dept: workshop, model: text(row, 3), part: text(row, 4), pn: pn ?? '', issue,
    cause: text(row, 7), temp: text(row, 8), perm: text(row, 9), owner: text(row, 10),
    ontimeReply: text(row, 13), ontimeDisp: text(row, 16), ontimeClose: text(row, 19), repeat: text(row, 20) }
  for (const [key, column, label] of [
    ['planReply', 11, '计划回复'], ['actReply', 12, '实际回复'],
    ['planDisp', 14, '计划处置'], ['actDisp', 15, '实际处置'],
    ['planClose', 17, '预计结案'], ['actClose', 18, '实际结案'],
  ] as const) {
    fields[key] = optionalDate(text(row, column), year, label, diagnose)
  }
  return { fields, identity: pn ? identity(date, workshop, pn, from, issue) : '' }
}

interface InventoryGroup {
  date: string
  pn: string
  part: string
  issue: string | null
  checker: string
}

function resolveInventoryRow(
  row: Row,
  group: InventoryGroup | undefined,
  year: number,
  diagnose: Diagnose,
): { group?: InventoryGroup; skipDetail?: true } {
  if (isSummary(row, [0, 1, 5])) return {}
  const dateRaw = text(row, 0)
  const pn = identityText(row, 1, '品号', diagnose)
  if (pn === null) return {}
  if (dateRaw || pn) {
    const date = sourceDate(dateRaw, year, diagnose)
    if (!pn) diagnose('missing_part_number', '清查新记录缺少品号')
    if (!date || !pn) return {}
    return { group: { date, pn, part: text(row, 2), issue: identityText(row, 3, '不良描述', diagnose), checker: text(row, 4) } }
  }
  const anchorDetails = [
    identityText(row, 2, '名称', diagnose),
    identityText(row, 3, '不良描述', diagnose),
    identityText(row, 4, '清查人', diagnose),
  ]
  if (anchorDetails.some(Boolean)) return {}
  // 错误的明细本身不可续接，下一条真实空白的明细仍可使用已核实的主行。
  if (anchorDetails.includes(null)) return { group, skipDetail: true }
  if (!hasValue(row, [5, 8, 9, 10, 12, 13, 14])) return {}
  if (!group) diagnose('orphan_inventory_detail', '清查明细没有可确认的日期和品号上下文')
  return { group }
}

function parseInventory(row: Row, group: InventoryGroup, diagnose: Diagnose) {
  if (!hasValue(row, [5, 8, 9, 10, 12, 13, 14])) return
  const rawDept = identityText(row, 5, '清查车间', diagnose)
  const depts = rawDept ? (knownWorkshop(rawDept) ?? rawDept) : ''
  const fields: Fields = { ...group, issue: group.issue ?? '', depts,
    stock: numberValue(text(row, 8), '实际存放数', diagnose),
    samp: numberValue(text(row, 9), '抽检数', diagnose),
    ng: numberValue(text(row, 10), '不良数', diagnose),
    signoff: text(row, 12), note: text(row, 13), action: text(row, 14) }
  return { fields, identity: depts ? identity(group.date, group.pn, group.issue, depts) : '' }
}

function parsePerformance(row: Row, year: number, diagnose: Diagnose) {
  if (isSummary(row, [0, 3])) return
  if (!hasValue(row, [3, 5, 6, 7])) return
  const date = sourceDate(text(row, 3), year, diagnose)
  const score = numberValue(text(row, 7), '加减分', diagnose, true, true)
  const dept = identityText(row, 0, '车间', diagnose)
  const who = identityText(row, 6, '责任人', diagnose)
  const item = identityText(row, 5, '事项', diagnose)
  const pn = identityText(row, 1, '品号', diagnose)
  const from = identityText(row, 4, '投诉单位', diagnose)
  if (!dept || !who || !item) diagnose('incomplete_event', '考核事项缺少车间、责任人或事项')
  if (!date || score === null || !dept || !who || !item) return
  const workshop = knownWorkshop(dept) ?? dept
  return {
    fields: { date, score, dept: workshop, who, item, attr: text(row, 8), pn: pn ?? '', part: text(row, 2), from: from ?? '' },
    identity: identity(date, workshop, who, pn, from, item),
  }
}

function parseMonthly(row: Row, year: number, diagnose: Diagnose) {
  if (isSummary(row, [0])) return []
  const rawWorkshop = identityText(row, 0, '部门', diagnose)
  if (rawWorkshop === null) return []
  if (!rawWorkshop && !row.slice(3, 15).some((value) => value.trim())) return []
  const ws = knownWorkshop(rawWorkshop)
  if (!ws) {
    const message = normalized(rawWorkshop).replace(/车间$/u, '') === '佛山注塑'
      ? '月汇总的佛山注塑责任区待映射'
      : '月汇总责任车间待映射'
    diagnose('unmapped_workshop', message)
    return []
  }
  if (!year) {
    diagnose('missing_year', '月汇总缺少可核实的年度')
    return []
  }
  const scores: Array<{ fields: Fields; identity: string }> = []
  for (let month = 1; month <= 12; month += 1) {
    const score = numberValue(text(row, 2 + month), `${month} 月点检得分`, diagnose)
    if (score !== null) scores.push({ fields: { ws, year, month, score }, identity: identity(ws, year, month) })
  }
  return scores
}

function recordIdentities(result: ParsedFileResult): void {
  const groups = new Map<string, ParsedSourceRow[]>()
  for (const row of result.rows) {
    if (!row.identity) {
      if (row.table === 'fqcInspection') {
        row.identity = identity(row.source.region, row.source.row)
      } else {
        result.diagnostics.push({ source: row.source, code: 'missing_identity', message: '记录缺少可稳定定位的业务标识' })
      }
      continue
    }
    const table = row.table === 'fqcNg' ? 'fqcInspection' : row.table
    const key = identity(table, row.source.region, row.identity)
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  for (const group of groups.values()) {
    const physicalRows = new Set(group.map(({ source }) => source.row))
    if (physicalRows.size < 2) continue
    for (const row of group) {
      row.identity = row.table === 'fqcInspection' ? identity(row.source.region, row.source.row) : ''
      if (physicalRows.delete(row.source.row)) {
        result.diagnostics.push({ source: row.source, code: 'ambiguous_identity', message: '同一区域内多条记录的业务标识相同' })
      }
    }
  }
}

/** 校验已规划工作表的结构，保留物理行号并解析各独立业务区域。 */
export function parseSourceSheet(
  plan: SheetPlan,
  rows: string[][],
  source: Omit<SourceRef, 'row' | 'region'>,
): ParsedFileResult {
  const result: ParsedFileResult = {
    rows: [], diagnostics: [], declaredRows: rows.length, readRows: rows.length, validRows: 0, skippedRows: 0,
  }
  const fa = FA_LAYOUTS[plan.template]
  const fqc = FQC_LAYOUTS[plan.template]
  const extraHeaders: Partial<Record<string, Columns[]>> = {
    complaint: COMPLAINT_HEADERS, fqcInventory: INVENTORY_HEADERS, checkRank: MONTHLY_HEADERS, perf: PERFORMANCE_HEADERS,
  }
  const headers = fa?.headers ?? fqc?.headers ?? extraHeaders[plan.template]
  const headerRow = headers ? rows.findIndex((_, index) => matchesHeader(rows, index, headers)) : -1
  const ref = (row: number, region: string): SourceRef => ({ ...source, row, region, parserVersion: SOURCE_PARSER_VERSION })
  if (headerRow < 0 || !headers) {
    result.skippedRows = rows.length
    const firstNonblank = rows.findIndex((row) => row.some((cell) => cell.trim()))
    const diagnosticRow = firstNonblank < 0 ? 1 : firstNonblank + 1
    result.diagnostics.push({ source: ref(diagnosticRow, 'header'), code: 'unsupported_header', message: '表头不符合已核实的业务模板' })
    return result
  }
  const titleRow = rows.slice(0, headerRow).findLastIndex((row) => row.some((value) => value.trim()))
  const titleYear = Number(text(rows[titleRow] ?? [], 0).match(/(?:^|\D)(20\d{2})(?!\d)/)?.[1] ?? 0)
  const year = plan.year || titleYear
  if (plan.year && titleYear && plan.year !== titleYear) {
    result.diagnostics.push({ source: ref(titleRow + 1, 'header'), code: 'source_year_mismatch', message: '标题年度与文件路径年度不符' })
  }
  const workshop = plan.workshop ?? ''
  const labels = rows[headerRow + headers.length - 1]!
  if (plan.template === 'printLedger') {
    result.diagnostics.push({ source: ref(headerRow + 1, 'print-fa'), code: 'missing_source_columns', message: '印刷首件未提供独立品号和检验员列' })
  }
  if (fqc && fqc.partNumber === undefined) {
    result.diagnostics.push({ source: ref(headerRow + 1, 'fqc-main'), code: 'missing_source_columns', message: '终检表未提供独立品号列，保留单号' })
  }

  let group: InventoryGroup | undefined
  for (let index = headerRow + headers.length; index < rows.length; index += 1) {
    if (matchesHeader(rows, index, headers)) {
      group = undefined
      index += headers.length - 1
      continue
    }
    const row = rows[index]!
    const region = plan.regions[0] ?? plan.template
    const previousValid = result.validRows
    const emit = (table: Table, parsed: { fields: Fields; identity: string } | undefined, area = region) => {
      if (!parsed) return
      result.rows.push({ table, ...parsed, source: ref(index + 1, area) })
      if (table !== 'fqcNg') result.validRows += 1
    }
    const diagnose: Diagnose = (code, message, area = region) => {
      result.diagnostics.push({ source: ref(index + 1, area), code, message })
    }
    if (fa) {
      emit('fa', parseFa(row, labels, fa, year, workshop, diagnose))
    } else if (fqc) {
      if (plan.template === 'printLedger') emit('fa', parsePrintFa(row, year, diagnose))
      const fqcArea = 'fqc-main'
      const diagnoseFqc: Diagnose = (code, message, area = fqcArea) => diagnose(code, message, area)
      const inspection = parseFqc(row, labels, fqc, year, workshop, diagnoseFqc)
      emit('fqcInspection', inspection, fqcArea)
      if (inspection?.fields.result === 'NG') emit('fqcNg', inspection, fqcArea)
    } else if (plan.template === 'complaint') {
      emit('cmp', parseComplaint(row, year, diagnose))
    } else if (plan.template === 'fqcInventory') {
      const inventory = resolveInventoryRow(row, group, year, diagnose)
      group = inventory.group
      if (group && !inventory.skipDetail) emit('fqc', parseInventory(row, group, diagnose))
    } else if (plan.template === 'checkRank') {
      for (const month of parseMonthly(row, year, diagnose)) emit('checkScore', month)
    } else if (plan.template === 'perf') {
      emit('perf', parsePerformance(row, year, diagnose))
    }
    if (result.validRows === previousValid) result.skippedRows += 1
  }
  recordIdentities(result)
  return result
}
