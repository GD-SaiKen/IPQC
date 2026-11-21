function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDate(value: unknown): Date | null {
  if (value == null || value === '') {
    return null
  }
  const d = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(d.getTime()) ? null : d
}

/** dayjs 风格大写模式，供 CRUD 日期列使用 */
export function formatPattern(value: unknown, pattern: string): string {
  const d = toDate(value)
  if (!d) {
    return value != null && value !== '' ? String(value) : '—'
  }

  const tokens: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  }

  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token] ?? token)
}