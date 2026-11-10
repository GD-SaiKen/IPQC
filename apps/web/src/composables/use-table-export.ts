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

export function buildCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const head = columns.map((c) => c.label).join(',')
  const body = rows.map((row) =>
    columns
      .map((c) => `"${cellValue(row, c).replace(/"/g, '""')}"`)
      .join(',')
  )
  return [head, ...body].join('\r\n')
}

export function downloadCsv(
  fileBase: string,
  columns: CsvColumn[],
  rows: Record<string, unknown>[]
): void {
  const blob = new Blob([`\ufeff${buildCsv(columns, rows)}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileBase}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
