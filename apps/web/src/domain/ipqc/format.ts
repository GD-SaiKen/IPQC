export function num(v: unknown): number {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

export function pct(a: number, b: number): number {
  return b > 0 ? (a / b) * 100 : 0
}

export function fp(x: number, d = 1): string {
  return Number.isFinite(x) ? x.toFixed(d) : '—'
}

export function sum<T>(arr: T[], f?: (o: T) => number): number {
  return arr.reduce((s, o) => s + (f ? f(o) : 0), 0)
}

export function monthOf(d: string | undefined): number {
  const m = String(d || '').match(/^(\d{4})-(\d{2})/)
  return m ? +m[2] : 0
}

export function shortDept(d: string | undefined): string {
  const s = String(d || '').trim().replace(/车间$/, '')
  if (s === '毛边' || s === '注塑毛边') return '注塑毛边'
  return s
}

export function inMonth(d: string | undefined, m: number): boolean {
  return m ? monthOf(d) === m : true
}
