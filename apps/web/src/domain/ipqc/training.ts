import skillsJson from '@/fixtures/raw/skills.json'
import { num, pct, shortDept, sum } from './format'
import type {
  SkillRow,
  TrainingExam,
  TrainingMaterial,
  TrainingRecord,
  WorkshopFilter,
} from './types'

export const SKILLS = skillsJson as string[]

export const SKILL_LEVELS: [number, string][] = [
  [1, '了解'],
  [2, '可独立操作'],
  [3, '熟练并能带徒'],
  [4, '可制定标准 / 跨车间支援'],
]

export const TRN_TABS: { key: string; label: string }[] = [
  { key: 'mat', label: '资料库' },
  { key: 'trn', label: '实施记录' },
  { key: 'exam', label: '考核' },
  { key: 'skill', label: '技能矩阵' },
]

export function visibleMaterial(
  m: TrainingMaterial,
  ws: WorkshopFilter
): boolean {
  if (ws === '全部') return true
  return m.dept === '通用' || shortDept(m.dept) === ws
}

export function visibleRecord(r: TrainingRecord, ws: WorkshopFilter): boolean {
  return ws === '全部' || r.dept === '通用' || shortDept(r.dept) === ws
}

export function visibleExam(e: TrainingExam, ws: WorkshopFilter): boolean {
  return ws === '全部' || e.dept === '通用' || shortDept(e.dept) === ws
}

export function visibleSkill(s: SkillRow, ws: WorkshopFilter): boolean {
  return ws === '全部' || shortDept(s.dept) === ws
}

export interface TrainingStats {
  materials: number
  sessions: number
  people: number
  hours: number
  passRate: number
  avgExam: number
}

export function trainingStats(
  mats: TrainingMaterial[],
  records: TrainingRecord[],
  exams: TrainingExam[]
): TrainingStats {
  const people = sum(records, (r) => num(r.num))
  const weighted = sum(records, (r) => (num(r.pass) * num(r.num)) / 100)
  return {
    materials: mats.length,
    sessions: records.length,
    people,
    hours: sum(records, (r) => num(r.hours) * num(r.num)),
    passRate: pct(weighted, people),
    avgExam: exams.length ? sum(exams, (e) => num(e.score)) / exams.length : 0,
  }
}

export function nextSkillLevel(lv: number): number {
  return (lv % 4) + 1
}

export function skillAverage(lv: number[]): number {
  return lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 0
}
