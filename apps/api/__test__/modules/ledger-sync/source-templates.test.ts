import { describe, expect, it } from 'vitest'

import { inspectSourceSheets, planSourceSheets } from '../../../modules/ledger-sync/source-templates'

function manifest(path: string, ...names: string[]) {
  return { path, sheets: names.map((name) => ({ name, totalRows: 250, totalColumns: 50 })) }
}

describe('real source plans', () => {
  it('detectsInspectionSheetAfterNewPartsSheet', () => {
    const path = '首（巡）检验汇总记录/2026年/2026年五金首(巡)检 汇总表.xlsx'
    const book = manifest(path, '新零件汇总', '零件清单', '检验汇总')
    expect(planSourceSheets(path, book)).toEqual([
      { name: '检验汇总', template: 'faHardware', regions: ['first-patrol'], year: 2026, workshop: '五金' },
    ])
    expect(inspectSourceSheets(path, book).skipped).toEqual([
      expect.objectContaining({ sheet: '新零件汇总', code: 'reference_sheet' }),
      expect.objectContaining({ sheet: '零件清单', code: 'reference_sheet' }),
    ])
  })

  it('requires explicit responsibility for a generic inspection summary when the path gives no clue', () => {
    const path = '2026年/首巡检汇总.xlsx'
    const book = manifest(path, '检验汇总')
    expect(inspectSourceSheets(path, book).skipped[0]).toMatchObject({ code: 'ambiguous_source' })
    expect(planSourceSheets(path, book, { role: 'faDiecast' })[0]).toMatchObject({
      name: '检验汇总', template: 'faDiecast', workshop: '压铸',
    })
  })

  it('plans only the audited main sheet for all six FQC formats', () => {
    const sources = [
      ['注塑检验记录', '注塑', 'fqcInjection'],
      ['毛边检验汇总', '注塑毛边', 'fqcInjectionBur'],
      ['压铸FQC检验记录', '压铸', 'fqcDiecast'],
      ['五金FQC检验记录', '五金', 'fqcHardware'],
      ['涂装检验报告', '涂装', 'fqcCoating'],
      ['印刷检验报告', '印刷', 'printLedger'],
    ]
    for (const [sheet, workshop, template] of sources) {
      const path = '2026年/品质履历.xls'
      expect(planSourceSheets(path, manifest(path, '图表', '注塑检验记录不良', sheet!))).toEqual([
        {
          name: sheet, template, workshop, year: 2026,
          regions: template === 'printLedger' ? ['print-fa', 'fqc-main'] : ['fqc-main'],
        },
      ])
    }
  })

  it('parsesPerformanceEventsNotRules', () => {
    const path = '2026年品管绩效数据/PQC员工2026年绩效.xlsx'
    expect(planSourceSheets(path, manifest(path, '考核方案', '考核统计', '实得绩效'))).toEqual([
      { name: '考核统计', template: 'perf', regions: ['events'], year: 2026 },
    ])
  })

  it('uses the explicit file year before its enclosing directory year', () => {
    const path = '2026年品管绩效数据/PQC员工2025年绩效.xlsx'
    expect(planSourceSheets(path, manifest(path, '考核统计'))[0]?.year).toBe(2025)
  })

  it('reports every ambiguous candidate sharing the same normalized business sheet name', () => {
    const path = '2026年/履历.xlsx'
    const result = inspectSourceSheets(path, manifest(path, '注塑检验记录', '注塑 检验记录', ' 注塑检验记录 '))
    expect(result.plans).toEqual([])
    expect(result.skipped.map(({ code }) => code)).toEqual(['ambiguous_source', 'ambiguous_source', 'ambiguous_source'])
  })

  it.each([
    ['首（巡）检验报告/五金/100/100394-003.xls', '1', '横向尺寸'],
    ['2026年过程管控检查/毛边车间点检（新）.xlsx', '月汇总', '点检标准'],
    ['技能培训及绩效/培训记录及QC技能表/2026年培训记录.xls', 'Sheet1', '培训'],
    ['2026年/履历.xlsx.lnk', '注塑检验记录', '快捷方式'],
    ['2026年/履历副本.xlsx', '注塑检验记录', '副本'],
  ])('leaves %s pending with a visible reason', (path, sheet, reason) => {
    const result = inspectSourceSheets(path, manifest(path, sheet))
    expect(result.plans).toEqual([])
    expect(result.skipped[0]).toMatchObject({ sheet, message: expect.stringContaining(reason) })
  })

  it('does not plan a workbook from file name alone', () => {
    const path = '2026年注塑车间品质履历表.xlsx'
    expect(planSourceSheets(path, manifest(path, '填表说明'))).toEqual([])
  })
})
