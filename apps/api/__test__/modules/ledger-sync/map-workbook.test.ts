import { describe, expect, it } from 'vitest'

import type { LedgerRole } from '../../../modules/ledger-sync/ledger-roles'
import { LEDGER_ROLE_LABELS } from '../../../modules/ledger-sync/ledger-roles'
import type { MatchedFile } from '../../../modules/ledger-sync/match-files'
import { mapWorkbooksToSnapshot } from '../../../modules/ledger-sync/map-workbook'

function file(role: LedgerRole, name: string): MatchedFile {
  return { role, path: `/${name}`, name }
}

describe('mapWorkbooksToSnapshot', () => {
  it('S/X 每行一条，不再按检验员合并', () => {
    const wb = new Map([
      [
        'faInjection',
        {
          path: '/注塑首巡检.xlsx',
          sheets: [
            {
              name: 'Sheet1',
              rows: [
                ['日期', '类型', '结果', '检验员'],
                ['2026-01-02', 'S', 'OK', '张三'],
                ['2026-01-02', 'X', 'NG', '张三'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [file('faInjection', '注塑首巡检.xlsx')]
    const result = mapWorkbooksToSnapshot(files, wb, ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa).toHaveLength(2)
    expect(result.snapshot.fa.some((r) => r.result === 'NG')).toBe(true)
    expect(result.snapshot.fa.some((r) => r.result === 'OK')).toBe(true)
  })

  it('印刷表区分首件与终检', () => {
    const wb = new Map([
      [
        'printLedger',
        {
          path: '/2026年印刷车间品质履历表.xlsx',
          sheets: [
            {
              name: '首件',
              rows: [
                ['日期', '类型', '结果', '检验员'],
                ['2026-01-01', 'S', 'OK', '李四'],
              ],
            },
            {
              name: 'FQC',
              rows: [
                ['日期', '批次', '品号'],
                ['2026-01-01', 'B1', 'P1'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [file('printLedger', '2026年印刷车间品质履历表.xlsx')]
    const result = mapWorkbooksToSnapshot(files, wb, ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa.length).toBeGreaterThan(0)
    expect(result.snapshot.fqcNg.length).toBeGreaterThan(0)
  })

  it('缺列只失败该文件，其它绑定仍进入快照', () => {
    const wb = new Map<LedgerRole, { path: string; sheets: { name: string; rows: string[][] }[] }>([
      [
        'checkRank',
        {
          path: '/各车间点检评分排名.xlsx',
          sheets: [{ name: 'Sheet1', rows: [['项目'], ['外观']] }],
        },
      ],
      [
        'complaint',
        {
          path: '/投诉.xls',
          sheets: [
            {
              name: 'Sheet1',
              rows: [
                ['日期', '来源', '责任部门'],
                ['2026-01-01', 'BC', '注塑'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [
      file('checkRank', '各车间点检评分排名.xlsx'),
      file('complaint', '投诉.xls'),
    ]
    const result = mapWorkbooksToSnapshot(files, wb, [])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.failures).toEqual([
      expect.objectContaining({
        path: '/各车间点检评分排名.xlsx',
        message: expect.stringContaining('缺少列'),
      }),
    ])
    expect(result.snapshot.cmp.length).toBeGreaterThan(0)
  })

  it('投诉 CSV 单表可映射', () => {
    const wb = new Map([
      [
        'complaint',
        {
          path: '/2026年前制程零件投诉跟进.csv',
          sheets: [
            {
              name: 'csv',
              rows: [
                ['日期', '来源', '责任部门'],
                ['2026-01-01', 'BC', '注塑'],
              ],
            },
          ],
        },
      ],
    ])
    const files = [file('complaint', '2026年前制程零件投诉跟进.csv')]
    const result = mapWorkbooksToSnapshot(files, wb, ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.cmp.length).toBeGreaterThan(0)
  })

  it('毛边首件缺失不向 fa 写入占位', () => {
    const result = mapWorkbooksToSnapshot([], new Map(), ['faInjectionBur'])
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.fa).toEqual([])
    void LEDGER_ROLE_LABELS
  })

  it('从已核实的业务工作表投影快照，保留初判和独立检验类型', () => {
    const path = '/2026年/五金首(巡)检汇总表.xlsx'
    const wb = new Map<LedgerRole, { path: string; sheets: { name: string; rows: string[][] }[] }>([
      ['faHardware', { path, sheets: [
        { name: '新零件汇总', rows: [['说明'], ['参考资料']] },
        { name: '检验汇总', rows: [
          ['2026年五金首（巡）检验汇总'],
          ['日期', '品号', '机种', '工序', '时间', '判定', '检验员', '改善状况', '零件状况', '工程确认', '备注', 'QC负责人确认', '最终判 定'],
          ['1月2日', 'P001', 'M1', '攻牙', '10:00S', 'NG', '测试员', '', '', '', '', '', 'OK'],
        ] },
      ] }],
    ])
    const result = mapWorkbooksToSnapshot([{ role: 'faHardware', path, name: '五金首(巡)检汇总表.xlsx' }], wb, [])
    expect(result).toMatchObject({
      kind: 'ok', failures: [],
      snapshot: { fa: [expect.objectContaining({ result: 'NG', finalResult: 'OK', inspectionType: 'S', stage: '' })] },
    })
  })

  it('旧快照投影仅保留同表中的有效工序身份', () => {
    const sample = { role: 'faHardware', path: '/2026年/五金首巡检汇总表.xlsx', name: '五金首巡检汇总表.xlsx' } as const
    const result = mapWorkbooksToSnapshot([sample], new Map([[sample.role, { path: sample.path, sheets: [
      { name: '检验汇总', rows: [
        ['2026年五金首（巡）检验汇总'],
        ['日期', '品号', '机种', '工序', '时间', '判定', '检验员', '改善状况', '零件状况', '工程确认', '备注', 'QC负责人确认', '最终判 定'],
        ['1月2日', 'P001', 'M1', '#REF!', '10:00S', 'NG', '测试员'],
        ['1月2日', 'P001', 'M1', '攻牙', '10:00S', 'OK', '测试员'],
      ] },
    ] }]]), [])
    expect(result).toMatchObject({
      kind: 'ok', failures: [],
      snapshot: { fa: [expect.objectContaining({ pn: 'P001', process: '攻牙', result: 'OK' })] },
    })
  })

  it('清查续行含公式错误时仍投影有效主行与独立记录', () => {
    const sample = { role: 'fqcInventory', path: '/2026年/不良品清查.xls', name: '不良品清查.xls' } as const
    const result = mapWorkbooksToSnapshot([sample], new Map([[sample.role, { path: sample.path, sheets: [
      { name: '不良品清查记录', rows: [
        ['日期', '品号', '名称', '不良描述', '清查人', '清查车间', '企划提供', '', '实际存放数', '抽检数', '不良数', '不良率', '签认', '备注', '不良品处理对策'],
        ['1月2日', 'P001', '模拟零件', '压伤', '测试员', '五金', '', '', '10'],
        ['', '', '', '#REF!', '', '五金', '', '', '99'],
        ['', '', '', '', '', '涂装', '', '', '5'],
        ['1月3日', 'P002', '模拟零件', '碰伤', '测试员', '五金', '', '', '20'],
      ] },
    ] }]]), [])
    expect(result).toMatchObject({
      kind: 'ok', failures: [],
      snapshot: { fqc: [
        expect.objectContaining({ pn: 'P001', depts: '五金', stock: 10 }),
        expect.objectContaining({ pn: 'P001', depts: '涂装', stock: 5 }),
        expect.objectContaining({ pn: 'P002', stock: 20 }),
      ] },
    })
  })

  it('只排除有冲突的月份，保留同一物理行的其他月份', () => {
    const rank = { role: 'checkRank', path: '/2026年/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' } as const
    const result = mapWorkbooksToSnapshot([rank], new Map([[rank.role, { path: rank.path, sheets: [
      { name: '月汇总', rows: [
        ['过程关键点管控评分月汇总'],
        ['部门', '负责人', '目标', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '累计排名', '排名'],
        ['五金', '', '90', '92', '96'],
        ['五金', '', '90', '94'],
      ] },
    ] }]]), [])
    expect(result).toMatchObject({ kind: 'ok', checkScores: { 五金: { 2: 96 } } })
    if (result.kind === 'ok') expect(result.checkScores.五金).not.toHaveProperty('1')
  })

  it('从旧入口排除考核方案，只让真正的旧普通行表进入兼容解析', () => {
    const perf = { role: 'perf', path: '/2026年/绩效.xlsx', name: '绩效.xlsx' } as const
    const rules = { name: '考核方案', rows: [['日期', '分值', '项目'], ['2026-01-02', '3', '考核规则']] }
    const legacy = { name: 'Sheet1', rows: [['日期', '分值', '项目'], ['2026-01-03', '-1', '模拟事项']] }
    const rulesOnly = mapWorkbooksToSnapshot([perf], new Map([[perf.role, { path: perf.path, sheets: [rules] }]]), [])
    expect(rulesOnly).toMatchObject({
      kind: 'ok', snapshot: { perf: [] }, failures: [{ path: perf.path, message: expect.stringContaining('考核方案') }],
    })
    const mixed = mapWorkbooksToSnapshot([perf], new Map([[perf.role, { path: perf.path, sheets: [rules, legacy] }]]), [])
    expect(mixed).toMatchObject({
      kind: 'ok', snapshot: { perf: [expect.objectContaining({ item: '模拟事项' })] }, failures: [],
    })
  })
})
