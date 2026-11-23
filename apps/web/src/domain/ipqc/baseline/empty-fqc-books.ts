import { FQC_KEYS } from './fqc-keys'

function emptyMonth() {
  return Array.from({ length: 10 }, (_, i) => ({
    m: i + 1,
    lots: 0,
    samp: 0,
    ng: 0,
    bad: 0,
  }))
}

function emptyFqcBook(dept: string) {
  return {
    meta: {
      file: '',
      dept,
      name: dept,
      frm: '',
      to: '',
      lots: 0,
      samp: 0,
      ng: 0,
      bad: 0,
      recheck: 0,
      recheckOk: 0,
      recheckNg: 0,
      recheckBlank: 0,
      cats: [] as string[],
    },
    month: emptyMonth(),
    pareto: [] as { n: string; cnt: number; bad: number }[],
    parts: [] as { pn: string; ng: number; lots: number; bad: number }[],
    whos: [] as { who: string; ng: number; lots: number; bad: number }[],
    act: {} as Record<string, unknown>,
    rows: [] as Record<string, unknown>[],
  }
}

export type FqcBook = ReturnType<typeof emptyFqcBook>

export function buildEmptyFqcs(): Record<string, FqcBook> {
  return Object.fromEntries(FQC_KEYS.map((k) => [k, emptyFqcBook(k)]))
}