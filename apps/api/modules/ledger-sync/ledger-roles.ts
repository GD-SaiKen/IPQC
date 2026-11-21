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

/** 注塑毛边首件可缺失，对应车间口径显示「—」 */
export const OPTIONAL_LEDGER_ROLES: LedgerRole[] = ['faInjectionBur']

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

export const LEDGER_TEMPLATES = [
  'faSheet',
  'printLedger',
  'fqcSheet',
  'inventorySheet',
  'complaintSheet',
  'checkRankSheet',
  'checkStandardSheet',
  'perfSheet',
] as const

export type LedgerTemplate = (typeof LEDGER_TEMPLATES)[number]

export const LEDGER_TEMPLATE_LABELS: Record<LedgerTemplate, string> = {
  faSheet: '首件表',
  printLedger: '印刷履历',
  fqcSheet: '终检表',
  inventorySheet: '清查表',
  complaintSheet: '投诉表',
  checkRankSheet: '点检得分表',
  checkStandardSheet: '点检标准表',
  perfSheet: '绩效表',
}

export const TEMPLATE_BY_ROLE: Record<LedgerRole, LedgerTemplate> = {
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