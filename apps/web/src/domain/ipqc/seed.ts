import { allFqcRows } from './fqc'
import type { IpqcDb } from './types'

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

/** 单测用：结构与生产一致，FQC 明细来自空册壳 */
export function createDefaultDb(): IpqcDb {
  return {
    ...createEmptyDb(),
    fqcNg: allFqcRows(),
  }
}

export const STORAGE_KEY = 'ipqc_wb_v2'