import realJson from '@/fixtures/raw/real.json'
import skillMatrixJson from '@/fixtures/raw/skill-matrix.json'
import trainingExamsJson from '@/fixtures/raw/training-exams.json'
import trainingMaterialsJson from '@/fixtures/raw/training-materials.json'
import trainingRecordsJson from '@/fixtures/raw/training-records.json'
import { allFqcRows } from './fqc'
import type { CheckScores, FaRecord, IpqcDb } from './types'

const REAL = realJson as {
  complaints: Record<string, unknown>[]
  firstReal?: Record<string, unknown>[]
  finalInsp?: Record<string, unknown>[]
  perfRecords?: Record<string, unknown>[]
  checkScores: CheckScores
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
        who: row.who || '',
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
        eng: '',
        src: '实测',
      })
    })
  return out
}

export function getCheckScores(): CheckScores {
  return REAL.checkScores || {}
}

export function createEmptyDb(): IpqcDb {
  return {
    fa: [],
    fqc: [],
    fqcNg: [],
    cmp: [],
    perf: [],
    mat: [],
    trn: [],
    exam: [],
    skill: [],
  }
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