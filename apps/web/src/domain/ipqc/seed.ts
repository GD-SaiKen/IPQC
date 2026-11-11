import { FA_ACTIONS, FA_ITEM_POOL, FA_ROSTER } from './build-fa-helpers'
import realJson from '@/fixtures/raw/real.json'
import skillMatrixJson from '@/fixtures/raw/skill-matrix.json'
import trainingExamsJson from '@/fixtures/raw/training-exams.json'
import trainingMaterialsJson from '@/fixtures/raw/training-materials.json'
import trainingRecordsJson from '@/fixtures/raw/training-records.json'
import { FA_STAGES } from './fa-rules'
import { allFqcRows } from './fqc'
import type { CheckScores, FaRecord, IpqcDb } from './types'
import { WS_MAP } from './workshops'

const REAL = realJson as {
  complaints: Record<string, unknown>[]
  firstReal?: Record<string, unknown>[]
  finalInsp?: Record<string, unknown>[]
  perfRecords?: Record<string, unknown>[]
  checkScores: CheckScores
}

const ROSTER = FA_ROSTER
const ITEM_POOL = FA_ITEM_POOL
const ACTIONS = [...FA_ACTIONS]

function seed(n: number) {
  let s = n * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function buildFa(): FaRecord[] {
  const out: FaRecord[] = []
  const rg: Record<
    string,
    {
      date: string
      stage: string
      pn: string
      part: string
      item: string
      spec: string
      n: number
      ng: number
      who: string
    }
  > = {}
  ;(REAL.firstReal || []).forEach((r) => {
    const row = r as Record<string, string>
    const k = `${row.date}|${row.who || ''}`
    if (!rg[k]) {
      rg[k] = {
        date: row.date,
        stage: row.stage || '量产',
        pn: row.pn,
        part: row.part,
        item: row.item,
        spec: row.spec,
        n: 0,
        ng: 0,
        who: row.who || '赵红梅',
      }
    }
    rg[k].n++
    if (row.result === 'NG') rg[k].ng++
  })
  Object.keys(rg)
    .sort()
    .forEach((k, i) => {
      const b = rg[k]
      const ng = b.ng > 0
      out.push({
        date: b.date,
        stage: b.stage,
        dept: '五金',
        pn: b.pn,
        part: b.part,
        item: b.item,
        spec: b.spec,
        meas: b.n > 1 ? `${b.n} 项实测 / NG ${b.ng} 项` : ng ? '超差 / 不符' : '合格',
        result: ng ? 'NG' : 'OK',
        who: b.who,
        fb: ng ? (i % 11 === 0 ? 8 : 2 + (i * 7) % 4) : '',
        iv: ng ? (i % 9 === 0 ? 24 + (i % 8) : 7 + (i * 3) % 8) : '',
        status: ng ? (i % 4 === 0 ? '整改中' : i % 6 === 0 ? '待介入' : '已关闭') : '已放行',
        action: ng
          ? `尺寸复测并与工程确认公差（${b.ng} 项超差）`
          : '首件OK，正常生产',
        eng: '覃宇翔',
        src: '实测',
      })
    })

  const pool = REAL.complaints || []
  pool.forEach((c, i) => {
    const row = c as Record<string, string>
    if (!row.pn && !row.part) return
    let dept = row.dept === '注塑毛边' ? '注塑' : row.dept
    if (!WS_MAP[dept]) dept = '五金'
    const rnd = seed(i + 7)
    const items = ITEM_POOL[dept]
    if (!items?.length) return
    const it = items[Math.floor(rnd() * items.length)]
    const ng = rnd() < 0.28
    const stage = FA_STAGES[i % 3]
    const d = row.date || '2026-06-01'
    const roster = ROSTER[dept]
    const who = roster?.[Math.floor(rnd() * roster.length)] || '检验员'
    const outlier = rnd() < 0.14
    const fb = ng ? (outlier ? 7 + Math.round(rnd() * 6) : 2 + Math.round(rnd() * 3)) : ''
    const iv = ng
      ? outlier
        ? (Number(fb) || 0) + 14 + Math.round(rnd() * 12)
        : (Number(fb) || 0) + 3 + Math.round(rnd() * 7)
      : ''
    const st = !ng ? '已放行' : Number(iv) > 15 ? (rnd() < 0.5 ? '整改中' : '待介入') : '已关闭'
    out.push({
      date: d,
      stage,
      dept,
      pn: row.pn || '—',
      part: row.part || '—',
      item: it[0],
      spec: it[1],
      meas: ng ? '超差 / 不符' : '合格',
      result: ng ? 'NG' : 'OK',
      who,
      fb,
      iv,
      status: st,
      action: ng ? (row.perm || ACTIONS[i % ACTIONS.length]) : '首件OK，正常生产',
      eng: WS_MAP[dept]?.ce || '',
      src: '案例',
    })
  })
  return out
}

export function getCheckScores(): CheckScores {
  return REAL.checkScores || {}
}

export function createDefaultDb(): IpqcDb {
  return {
    fa: buildFa().sort((a, b) => String(b.date).localeCompare(String(a.date))),
    fqc: (REAL.finalInsp || []).map((r) => ({ ...r })),
    fqcNg: allFqcRows(),
    cmp: (REAL.complaints || []).map((r) => ({ ...r })) as unknown as IpqcDb['cmp'],
    perf: (REAL.perfRecords || []).map((r) => ({ ...r })) as unknown as IpqcDb['perf'],
    mat: trainingMaterialsJson.map((o) => ({ ...o })),
    trn: trainingRecordsJson.map((o) => ({ ...o })),
    exam: trainingExamsJson.map((o) => ({ ...o })),
    skill: skillMatrixJson.map((o) => ({
      ...o,
      lv: [...((o as { lv: number[] }).lv || [])],
    })),
  }
}

export const STORAGE_KEY = 'ipqc_wb_v2'
