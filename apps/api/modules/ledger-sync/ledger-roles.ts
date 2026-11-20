export const LEDGER_ROLES = [
  'faFocus',
  'faInjection',
  'faInjectionBur',
  'faDiecast',
  'faHardware',
  'printLedger',
  'fqcInjection',
  'fqcInjectionBur',
  'fqcDiecast',
  'fqcHardware',
  'fqcCoating',
  'fqcInventory',
  'complaint',
  'checkRank',
  'checkStandard',
  'perf',
] as const

export type LedgerRole = (typeof LEDGER_ROLES)[number]

/** 注塑毛边首件 / 终检源表可缺失，对应车间口径显示「—」 */
export const OPTIONAL_LEDGER_ROLES: LedgerRole[] = ['faInjectionBur', 'fqcInjectionBur']

export const LEDGER_ROLE_LABELS: Record<LedgerRole, string> = {
  faFocus: '重点零件首件',
  faInjection: '注塑首件',
  faInjectionBur: '注塑毛边首件',
  faDiecast: '压铸首件',
  faHardware: '五金首件',
  printLedger: '印刷品质履历',
  fqcInjection: '注塑终检',
  fqcInjectionBur: '注塑毛边终检',
  fqcDiecast: '压铸终检',
  fqcHardware: '五金终检',
  fqcCoating: '涂装终检',
  fqcInventory: '不良品清查',
  complaint: '零件投诉',
  checkRank: '点检排名',
  checkStandard: '点检标准',
  perf: '绩效',
}