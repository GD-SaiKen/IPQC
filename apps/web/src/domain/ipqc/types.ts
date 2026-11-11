export type WorkshopKey = '注塑' | '注塑毛边' | '压铸' | '五金' | '涂装' | '印刷'
export type WorkshopFilter = WorkshopKey | '全部'

export interface WorkshopConfig {
  key: WorkshopKey
  name: string
  owner: string
  ce: string
  color: string
  max: number
}

export interface FaRecord {
  date: string
  stage: string
  dept: string
  pn: string
  part: string
  item: string
  spec: string
  meas: string
  result: string
  who: string
  fb?: string | number
  iv?: string | number
  status: string
  action: string
  eng: string
  src?: string
}

export interface ComplaintRecord {
  date: string
  from: string
  dept: string
  model?: string
  part?: string
  pn?: string
  issue?: string
  cause?: string
  temp?: string
  perm?: string
  owner?: string
  planReply?: string
  actReply?: string
  ontimeReply?: string
  planDisp?: string
  actDisp?: string
  ontimeDisp?: string
  planClose?: string
  actClose?: string
  ontimeClose?: string
  repeat?: string
}

export interface PerfRecord {
  date: string
  dept: string
  who: string
  attr: string
  item: string
  score: number | string
}

export interface IpqcDb {
  fa: FaRecord[]
  fqc: Record<string, unknown>[]
  fqcNg: Record<string, unknown>[]
  cmp: ComplaintRecord[]
  perf: PerfRecord[]
  mat: Record<string, unknown>[]
  trn: Record<string, unknown>[]
  exam: Record<string, unknown>[]
  skill: Record<string, unknown>[]
}

export interface FqcNgRow {
  ws?: string
  d?: string
  pn?: string
  lot?: number | string
  samp?: number | string
  bad?: number | string
  cat?: string
  defs?: string
  who?: string
  act?: string
  rd?: string
  re?: string
}

export interface FqcClearRow {
  date?: string
  pn?: string
  part?: string
  issue?: string
  checker?: string
  depts?: string
  stock?: number | string
  ng?: number | string
  note?: string
  action?: string
}

export interface TrainingMaterial {
  t?: string
  dept?: string
  type?: string
  ver?: string
  date?: string
  pages?: number | string
}

export interface TrainingRecord {
  date?: string
  dept?: string
  topic?: string
  trainer?: string
  num?: number | string
  hours?: number | string
  way?: string
  pass?: number | string
}

export interface TrainingExam {
  date?: string
  who?: string
  dept?: string
  subject?: string
  score?: number | string
  level?: string
}

export interface SkillRow {
  who?: string
  dept?: string
  lv?: number[]
}

export interface CheckScores {
  [workshop: string]: Record<number, number>
}
