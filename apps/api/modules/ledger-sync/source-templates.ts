/**
 * @file 共享盘工作表规划
 * @description 根据清单中的已核实工作表和显式绑定挑选候选，再由解析器校验表头。
 * @author Codex
 * @date 2026-11-23
 */

import type { DataHubWorkbookManifest } from './data-hub-client'
import type { LedgerRole } from './ledger-roles'
import type { SheetPlan, SourceSelection } from './source-types'

import { TEMPLATE_BY_ROLE } from './ledger-roles'

interface KnownSheet {
  role: LedgerRole
  regions: string[]
  workshop?: string
}

const SOURCE_SHEETS = new Map<string, KnownSheet>([
  ['注塑', { role: 'faInjection', regions: ['first-patrol'], workshop: '注塑' }],
  ['注塑检验记录', { role: 'fqcInjection', regions: ['fqc-main'], workshop: '注塑' }],
  ['毛边检验汇总', { role: 'fqcInjectionBur', regions: ['fqc-main'], workshop: '注塑毛边' }],
  ['压铸FQC检验记录', { role: 'fqcDiecast', regions: ['fqc-main'], workshop: '压铸' }],
  ['五金FQC检验记录', { role: 'fqcHardware', regions: ['fqc-main'], workshop: '五金' }],
  ['涂装检验报告', { role: 'fqcCoating', regions: ['fqc-main'], workshop: '涂装' }],
  ['印刷检验报告', { role: 'printLedger', regions: ['print-fa', 'fqc-main'], workshop: '印刷' }],
  ['投诉零件清单', { role: 'complaint', regions: ['complaint'] }],
  ['不良品清查记录', { role: 'fqcInventory', regions: ['inventory'] }],
  ['月汇总', { role: 'checkRank', regions: ['monthly'] }],
  ['考核统计', { role: 'perf', regions: ['events'] }],
])

const REFERENCE_REASONS = new Map([
  ['新零件汇总', '新零件汇总与年度检验主表的重叠范围待核对'],
  ['零件清单', '零件清单为参考资料'],
  ['注塑检验记录不良', '不良明细由注塑终检主表提取，避免重复计入'],
  ['首件记录', '涂装首件为待核对的候选来源'],
  ['清查表', '清查表与清查记录的业务范围待核对'],
  ['考核方案', '考核方案为加减分规则'],
  ['实得绩效', '实得绩效供结果核对'],
  ['图表', '图表为统计参考'],
  ['周汇总', '点检周汇总为统计参考'],
])

export interface SkippedSourceSheet {
  sheet: string
  code: 'reference_sheet' | 'unrecognized_sheet' | 'unsupported_source' | 'ambiguous_source'
  message: string
}

function pathYear(segments: string[]): number {
  for (const segment of segments) {
    const match = segment.match(/(?:^|\D)(20\d{2})(?!\d)/)
    if (match) return Number(match[1])
  }
  return 0
}

function pendingSource(path: string, fileName: string, selection?: Pick<SourceSelection, 'role' | 'template'>) {
  if (/\.lnk$/i.test(fileName)) {
    return { code: 'unsupported_source', message: '快捷方式，请选取原始工作簿' } as const
  }
  if (/副本|备份|(?:^|[\s_/-])copy\b|\(\d+\)(?=\.[^.]+$)/i.test(path)) {
    return { code: 'ambiguous_source', message: '疑似副本，需确认来源后接入' } as const
  }
  if (selection?.role === 'faFocus' || /首[（(]巡[）)]检验报告|100394-003/.test(path)) {
    return { code: 'unsupported_source', message: '重点零件横向尺寸报告待核对并支持' } as const
  }
  if (selection?.role === 'checkStandard' || selection?.template === 'checkStandardSheet'
    || /关键点管控|毛边车间点检/.test(fileName)) {
    return { code: 'unsupported_source', message: '点检标准或过程明细待核对，尚未接入' } as const
  }
  if (/培训记录及QC技能表|培训记录|培训签到|QC技能表/i.test(path)) {
    return { code: 'unsupported_source', message: '培训来源待核对，尚未接入' } as const
  }
  return undefined
}

function normalizedSheetName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/gu, '').toUpperCase()
}

function inspectionSummary(fileName: string, explicitRole?: LedgerRole): KnownSheet | undefined {
  if (explicitRole === 'faDiecast' || (!explicitRole && /压铸/.test(fileName))) {
    return { role: 'faDiecast', regions: ['first-patrol'], workshop: '压铸' }
  }
  if (explicitRole === 'faHardware' || (!explicitRole && /五金/.test(fileName))) {
    return { role: 'faHardware', regions: ['first-patrol'], workshop: '五金' }
  }
  return undefined
}

/** 同时返回候选和跳过原因，供同步任务在完整分页前展示文件范围。 */
export function inspectSourceSheets(
  path: string,
  manifest: DataHubWorkbookManifest,
  selection?: Pick<SourceSelection, 'role' | 'template'>,
): { plans: SheetPlan[]; skipped: SkippedSourceSheet[] } {
  const [fileName = '', ...directories] = path.split(/[\\/]/).filter(Boolean).reverse()
  const year = pathYear([fileName, ...directories])
  const pending = pendingSource(path.normalize('NFKC'), fileName, selection)
  const plans: SheetPlan[] = []
  const skipped: SkippedSourceSheet[] = []
  if (pending) {
    return { plans, skipped: (manifest.sheets.length ? manifest.sheets : [{ name: '' }])
      .map(({ name }) => ({ sheet: name, ...pending })) }
  }

  const sheets = manifest.sheets.map(({ name }) => ({ name, normalizedName: normalizedSheetName(name) }))
  for (const { name, normalizedName } of sheets) {
    const known = normalizedName === '检验汇总'
      ? inspectionSummary(fileName, selection?.role)
      : SOURCE_SHEETS.get(normalizedName)
    if (!known) {
      const reference = REFERENCE_REASONS.get(normalizedName)
        ?? (/^(?:[1-9]|1[0-2])月(?:日明细|明细)?$/u.test(normalizedName) ? '点检日明细待核对，目前读取月汇总' : undefined)
      if (normalizedName === '检验汇总') {
        skipped.push({ sheet: name, code: 'ambiguous_source', message: '检验汇总需确认五金或压铸归属' })
      } else if (reference) {
        skipped.push({ sheet: name, code: 'reference_sheet', message: reference })
      } else {
        skipped.push({ sheet: name, code: 'unrecognized_sheet', message: '工作表未纳入已核实的业务范围' })
      }
      continue
    }
    if ((selection?.role && selection.role !== known.role)
      || (selection?.template && selection.template !== TEMPLATE_BY_ROLE[known.role])) {
      skipped.push({ sheet: name, code: 'unsupported_source', message: '工作表与显式绑定的业务角色或模板不匹配' })
      continue
    }
    if (sheets.filter((sheet) => sheet.normalizedName === normalizedName).length > 1) {
      skipped.push({ sheet: name, code: 'ambiguous_source', message: '同一业务模板有多张候选工作表' })
      continue
    }
    const plan: SheetPlan = { name, template: known.role, regions: [...known.regions], year }
    if (known.workshop) plan.workshop = known.workshop
    plans.push(plan)
  }
  return { plans, skipped }
}

export function planSourceSheets(
  path: string,
  manifest: DataHubWorkbookManifest,
  selection?: Pick<SourceSelection, 'role' | 'template'>,
): SheetPlan[] {
  return inspectSourceSheets(path, manifest, selection).plans
}
