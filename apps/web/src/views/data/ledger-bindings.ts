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

/** 角色 → 文件路径（保存时只写入有值的行） */
export function roleToPathFromEntries(entries: BindingEntry[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const entry of entries) {
    if (entry.kind === 'file' && entry.role) {
      map[entry.role] = entry.path
    }
  }
  return map
}

export function entriesFromRoleToPath(roleToPath: Record<string, string>): BindingEntry[] {
  return Object.entries(roleToPath)
    .filter(([, path]) => path.trim())
    .map(([role, path]) => ({
      path,
      kind: 'file' as const,
      role,
      template: templateIdForRole(role),
    }))
}

export function boundPathCount(roleToPath: Record<string, string>): number {
  return Object.values(roleToPath).filter((path) => path.trim()).length
}

export function bindingSaveErrorFromRoleMap(roleToPath: Record<string, string>): string {
  const paths = Object.values(roleToPath).filter((path) => path.trim())
  if (paths.length === 0) {
    return '请至少为一个台账角色选择文件'
  }
  if (new Set(paths).size !== paths.length) {
    return '同一文件不能绑定多个角色'
  }
  return ''
}

/** @deprecated 文件×角色矩阵；树上大量勾选时请改用按角色选文件 */
export function bindingSaveError(files: string[], roles: Record<string, string>): string {
  const roleToPath: Record<string, string> = {}
  for (const path of files) {
    const role = roles[path]
    if (role) {
      roleToPath[role] = path
    }
  }
  if (files.length === 0) {
    return '请勾选单个文件'
  }
  const missing = files.filter((path) => !roles[path])
  if (missing.length) {
    return '请为每个勾选的文件选择角色'
  }
  return bindingSaveErrorFromRoleMap(roleToPath)
}
