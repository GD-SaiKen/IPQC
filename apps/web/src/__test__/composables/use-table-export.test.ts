import { describe, expect, it } from 'vitest'
import { buildCsv } from '@/composables/use-table-export'

const COLS = [{ key: 'v', label: 'V' }]

describe('buildCsv', () => {
  it('公式 / DDE 前缀被中和，纯负数为正常数值', () => {
    const csv = buildCsv(COLS, [
      { v: '=SUM(A1)' },
      { v: '+1+2' },
      { v: '@cmd' },
      { v: '-2+3' },
      { v: '-5' },
      { v: 12 },
    ])
    expect(csv).toContain('"\'=SUM(A1)"')
    expect(csv).toContain('"\'+1+2"')
    expect(csv).toContain('"\'@cmd"')
    expect(csv).toContain('"\'-2+3"')
    expect(csv).toContain('"-5"')
    expect(csv).toContain('"12"')
  })

  it('双引号与换行保持 CSV 合法', () => {
    const csv = buildCsv(COLS, [{ v: '他说"好"' }, { v: 'a\nb' }])
    expect(csv).toContain('"他说""好"""')
    expect(csv).toContain('"a\nb"')
  })
})
