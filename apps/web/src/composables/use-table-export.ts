export interface CsvColumn {
  key: string
  label: string
  format?: (row: Record<string, unknown>) => string
}

function cellValue(row: Record<string, unknown>, col: CsvColumn): string {
  if (col.format) return col.format(row)
  const v = row[col.key]
  return v == null ? '' : String(v)
}

/** 防公式 / DDE 注入：Excel 会把 = + - @ 开头的文本当公式执行 */
function safeCell(text: string): string {
  if (/^[=+\-@\t\r]/.test(text) && !/^-\d+(\.\d+)?$/.test(text)) return `'${text}`
  return text
}

export function buildCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const head = columns.map((c) => c.label).join(',')
  const body = rows.map((row) =>
    columns
      .map((c) => `"${safeCell(cellValue(row, c)).replace(/"/g, '""')}"`)
      .join(',')
  )
  return [head, ...body].join('\r\n')
}

function saveUrl(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadBlob(blob: Blob, filename: string): void {
  saveUrl(URL.createObjectURL(blob), filename)
}

export function downloadCsv(
  fileBase: string,
  columns: CsvColumn[],
  rows: Record<string, unknown>[]
): void {
  const blob = new Blob([`\ufeff${buildCsv(columns, rows)}`], {
    type: 'text/csv;charset=utf-8',
  })
  downloadBlob(blob, `${fileBase}_${new Date().toISOString().slice(0, 10)}.csv`)
}
