export const LEDGER_TABLE_KEYS = [
  'fa',
  'fqcNg',
  'fqc',
  'cmp',
  'perf',
  'mat',
  'trn',
  'exam',
  'skill',
] as const

export type LedgerTableKey = (typeof LEDGER_TABLE_KEYS)[number]

export const MAX_ROWS_PER_TABLE = 20000

export const TEXT_FIELDS: Record<LedgerTableKey, Record<string, number>> = {
  fa: {
    date: 32,
    stage: 64,
    dept: 64,
    pn: 64,
    part: 64,
    item: 200,
    spec: 500,
    meas: 500,
    result: 64,
    who: 64,
    status: 64,
    action: 500,
    eng: 64,
    src: 64,
  },
  fqcNg: {
    ws: 64,
    d: 32,
    pn: 64,
    lot: 64,
    cat: 200,
    defs: 500,
    who: 64,
    act: 500,
    re: 64,
    rd: 32,
  },
  fqc: {
    date: 32,
    pn: 64,
    part: 64,
    issue: 500,
    checker: 64,
    depts: 200,
    note: 500,
    action: 500,
  },
  cmp: {
    date: 32,
    from: 64,
    dept: 64,
    model: 64,
    part: 64,
    pn: 64,
    issue: 500,
    cause: 500,
    temp: 500,
    perm: 500,
    owner: 64,
    planReply: 32,
    actReply: 32,
    ontimeReply: 8,
    planDisp: 32,
    actDisp: 32,
    ontimeDisp: 8,
    planClose: 32,
    actClose: 32,
    ontimeClose: 8,
    repeat: 8,
  },
  perf: {
    date: 32,
    dept: 64,
    who: 64,
    attr: 64,
    item: 500,
  },
  mat: { t: 200, dept: 64, type: 64, ver: 64, date: 32 },
  trn: {
    date: 32,
    dept: 64,
    topic: 200,
    trainer: 64,
    way: 64,
  },
  exam: {
    date: 32,
    who: 64,
    dept: 64,
    subject: 200,
    level: 8,
  },
  skill: { who: 64, dept: 64 },
}

export const NUM_FIELDS: Record<LedgerTableKey, string[]> = {
  fa: ['fb', 'iv'],
  fqcNg: ['samp', 'bad'],
  fqc: ['stock', 'ng'],
  cmp: [],
  perf: ['score'],
  mat: ['pages'],
  trn: ['num', 'hours', 'pass'],
  exam: ['score'],
  skill: [],
}

export const FORBIDDEN_WRITE = new Set(['sourceKey', 'sourceFile', 'sourceSheet', 'sourceRow', 'id', 'createdAt', 'updatedAt'])

export function isLedgerTableKey(value: string): value is LedgerTableKey {
  return (LEDGER_TABLE_KEYS as readonly string[]).includes(value)
}

export const TABLES_WITH_SOURCE_KEY = new Set<LedgerTableKey>(['fa', 'fqcNg', 'fqc', 'cmp', 'perf'])

export const CSV_HEADERS: Record<LedgerTableKey, Array<{ key: string; label: string }>> = {
  fa: [
    { key: 'date', label: '日期' },
    { key: 'stage', label: '阶段' },
    { key: 'dept', label: '车间' },
    { key: 'pn', label: '料号' },
    { key: 'part', label: '品名' },
    { key: 'item', label: '检验项' },
    { key: 'result', label: '判定' },
    { key: 'who', label: '检验员' },
  ],
  fqcNg: [
    { key: 'ws', label: '车间' },
    { key: 'd', label: '日期' },
    { key: 'pn', label: '料号' },
    { key: 'lot', label: '批次' },
    { key: 'bad', label: '不良 pcs' },
    { key: 'who', label: '检验员' },
  ],
  fqc: [
    { key: 'date', label: '日期' },
    { key: 'pn', label: '料号' },
    { key: 'issue', label: '不良问题' },
    { key: 'checker', label: '检查人' },
  ],
  cmp: [
    { key: 'date', label: '日期' },
    { key: 'from', label: '投诉来源' },
    { key: 'dept', label: '责任车间' },
    { key: 'issue', label: '问题' },
  ],
  perf: [
    { key: 'date', label: '日期' },
    { key: 'dept', label: '车间' },
    { key: 'who', label: '姓名' },
    { key: 'item', label: '事项' },
    { key: 'score', label: '分值' },
  ],
  mat: [
    { key: 't', label: '资料名称' },
    { key: 'dept', label: '适用车间' },
    { key: 'type', label: '类型' },
  ],
  trn: [
    { key: 'date', label: '日期' },
    { key: 'dept', label: '车间' },
    { key: 'topic', label: '主题' },
  ],
  exam: [
    { key: 'date', label: '日期' },
    { key: 'who', label: '姓名' },
    { key: 'subject', label: '科目' },
  ],
  skill: [
    { key: 'who', label: '姓名' },
    { key: 'dept', label: '车间' },
  ],
}