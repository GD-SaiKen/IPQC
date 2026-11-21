export const LEDGER_ROLE_OPTIONS = [
  { role: 'faFocus', label: '重点零件首件', template: '首件表' },
  { role: 'faInjection', label: '注塑首件', template: '首件表' },
  { role: 'faInjectionBur', label: '注塑毛边首件', template: '首件表' },
  { role: 'faDiecast', label: '压铸首件', template: '首件表' },
  { role: 'faHardware', label: '五金首件', template: '首件表' },
  { role: 'printLedger', label: '印刷品质履历', template: '印刷履历' },
  { role: 'fqcInjection', label: '注塑终检', template: '终检表' },
  { role: 'fqcInjectionBur', label: '注塑毛边终检', template: '终检表' },
  { role: 'fqcDiecast', label: '压铸终检', template: '终检表' },
  { role: 'fqcHardware', label: '五金终检', template: '终检表' },
  { role: 'fqcCoating', label: '涂装终检', template: '终检表' },
  { role: 'fqcInventory', label: '不良品清查', template: '清查表' },
  { role: 'complaint', label: '零件投诉', template: '投诉表' },
  { role: 'checkRank', label: '点检排名', template: '点检得分表' },
  { role: 'checkStandard', label: '点检标准', template: '点检标准表' },
  { role: 'perf', label: '绩效', template: '绩效表' },
] as const

export type LedgerBindingRole = (typeof LEDGER_ROLE_OPTIONS)[number]['role']

const TEMPLATE_ID: Record<LedgerBindingRole, string> = {
  faFocus: 'faSheet',
  faInjection: 'faSheet',
  faInjectionBur: 'faSheet',
  faDiecast: 'faSheet',
  faHardware: 'faSheet',
  printLedger: 'printLedger',
  fqcInjection: 'fqcSheet',
  fqcInjectionBur: 'fqcSheet',
  fqcDiecast: 'fqcSheet',
  fqcHardware: 'fqcSheet',
  fqcCoating: 'fqcSheet',
  fqcInventory: 'inventorySheet',
  complaint: 'complaintSheet',
  checkRank: 'checkRankSheet',
  checkStandard: 'checkStandardSheet',
  perf: 'perfSheet',
}

export function templateIdForRole(role: string): string {
  return TEMPLATE_ID[role as LedgerBindingRole] ?? ''
}

export function templateLabelForRole(role: string): string {
  return LEDGER_ROLE_OPTIONS.find((item) => item.role === role)?.template ?? '—'
}

export function roleLabel(role: string): string {
  return LEDGER_ROLE_OPTIONS.find((item) => item.role === role)?.label ?? role
}

export interface BindingEntry {
  path: string
  kind: 'directory' | 'file'
  role?: string
  template?: string
}

export function isCompleteBindingSelection(entries: BindingEntry[]): boolean {
  if (entries.length === 0) return false
  if (entries.some((entry) => entry.kind !== 'file' || !entry.role || !entry.template)) return false
  const roles = entries.map((entry) => entry.role)
  return new Set(roles).size === roles.length
}

export function bindingSaveError(files: string[], roles: Record<string, string>): string {
  if (files.length === 0) return '请勾选单个文件'
  const missing = files.filter((path) => !roles[path])
  if (missing.length) return '请为每个勾选的文件选择角色'
  const used = files.map((path) => roles[path])
  if (new Set(used).size !== used.length) return '同一角色只能绑定一个文件'
  return ''
}
