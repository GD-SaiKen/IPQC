import { describe, expect, it } from 'vitest'

import { parseSourceDate, parseSourceSheet } from '../../../modules/ledger-sync/parse-source-sheet'
import { planSourceSheets } from '../../../modules/ledger-sync/source-templates'
import { SOURCE_PARSER_VERSION } from '../../../modules/ledger-sync/source-types'

function row(entries: Record<number, string>): string[] {
  const cells: string[] = []
  for (const [column, value] of Object.entries(entries)) cells[Number(column)] = value
  return Array.from(cells, (cell) => cell ?? '')
}

function parse(sheet: string, rows: string[][], path = '2026年/履历.xlsx') {
  const [plan] = planSourceSheets(path, { path, sheets: [{ name: sheet, totalRows: rows.length, totalColumns: 50 }] })
  return parseSourceSheet(plan!, rows, { shareId: 'share-1', path, sheet, parserVersion: SOURCE_PARSER_VERSION })
}

const injectionFaHeader = [
  ['注塑首巡检汇总'],
  row({ 0: '日期', 1: '品号', 2: '机台', 3: '时间', 4: '判定', 5: '检验员', 6: '不良分类', 11: '改善状况', 12: 'CE工程确认', 13: '零件状态', 14: '备注', 15: 'QC负责人确认', 16: '首件最终判定结果', 22: '末件' }),
  row({ 6: '尺寸', 7: '外观', 8: '设变', 9: '试产', 10: '维修', 22: '日期', 23: '时间', 24: '尺寸', 25: '外观', 26: '判定', 27: '检验员' }),
]

const printHeader = [
  ['2026年印刷检验记录表'],
  row({ 0: '首件', 12: 'FQC出货检验日期', 13: '批量数', 14: '抽检数', 15: '实际抽样数', 16: '抽检不良数', 17: '不良率', 18: '不良项目/批', 36: '判定', 39: '备注', 40: '检验员' }),
  row({ 0: ' 首件日期 ', 1: ' JOB单号 ', 2: '料名', 3: '机种', 4: '印刷遍数', 5: '印刷颜色/内容\n（对照指导表）', 11: '判\n 定', 18: '跑位', 19: '染墨模糊', 35: '其他', 37: '计数' }),
]

const inventoryHeader = [
  ['日期', '品号', '名称', '不良描述', '清查人', '清查车 间', '企划提供', '', '实际存放数', '抽检数', '不良数', '不良率', '签认', '备注', '不良品 处理对策'],
]

const injectionFqcHeader = [
  ['2026年注塑FQC报表'],
  row({ 0: '日期', 2: '品号', 4: '批量数', 5: '抽检数', 6: '抽检不良数', 7: '不良率', 8: '不良项目', 27: '判定', 30: '检验员', 31: '处理措施', 35: '异常返工' }),
  row({ 1: '工单号', 8: '毛边', 26: '其他', 35: '日期', 36: '重检批量数', 37: '重检抽检数', 38: '判定', 39: '检验员' }),
]

const hardwareFaHeader = [
  ['2026年五金首（巡）检验汇总'],
  ['日期', '品号', '机种', '工序', '时间', '判定', '检验员', '改善状况', '零件状况', '工程确认', '备注', 'QC负责人确认', '最终判 定'],
]

const complaintHeader = [
  ['零件异常分析及改善对策'],
  ['投诉日期', '投诉部门/人', '生产部门', '机种', '品名', '料号', '异常投诉', '原因分析', '临时对策（不良品处理对策）', '永久对策', '负责人', '异常单完成包括临时对策（3天）', '', '', '不良品处理完成（3天）', '', '', '对策结案预计7天或按工程回复时间', '', '', '是否重复异常'],
  row({ 11: '异常回复计划完成时间', 12: '异常回复实际时间', 13: '异常回复是否按时', 14: '不良品处理计划完成时间', 15: '不良品处理实际完成时间', 16: '不良品处理是否按时', 17: '预计结案时间', 18: '实际结案时间', 19: '结案是否按时' }),
]

const performanceHeader = [
  ['QC绩效考核统计表'],
  ['车间', '品号', '品名', '发生时间', '投诉单位', '事项', '责任人', '加减分', '绩效属性'],
]

describe('real source parsing', () => {
  it('keepsRepeatedHeadersInSeparateRegions', () => {
    const result = parse('注塑', [...injectionFaHeader, [], row({
      0: '2026/1/2', 1: 'P001', 2: 'A1', 3: '9:00x', 4: 'NG', 5: '测试员甲', 6: '1',
      11: '调整', 16: 'OK', 22: '2026/1/3', 23: '11:00M', 26: 'OK', 27: '测试员乙',
    })])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      table: 'fa',
      fields: { date: '2026-01-02', pn: 'P001', time: '09:00', stage: '', inspectionType: 'X', result: 'NG', finalResult: 'OK', who: '测试员甲', machine: 'A1' },
      source: { row: 5, sheet: '注塑', region: 'first-patrol', path: '2026年/履历.xlsx', shareId: 'share-1', parserVersion: 'real-ledger-v1' },
    })
    expect(result).toMatchObject({ readRows: 5, declaredRows: 5, validRows: 1, skippedRows: 1 })
  })

  it('keepsInitialNgAfterFinalOk', () => {
    const result = parse('检验汇总', [
      ['2026压铸首（巡）检验汇总'],
      ['日期', '品号', '机种', '机台', '时间', '判定', '检验员', '尺寸不良', '重量不良', '外观不良', '设变', '试产/试模', '改善状况', 'CE工程确认', '零件状况', '备注', 'QC确 认', '最终判定'],
      row({ 0: '1/2/26', 1: 'P001', 3: 'A1', 4: '9:00s', 5: 'NG', 6: '测试员', 12: '特采', 17: 'OK' }),
      row({ 0: '1月2日', 1: 'P001', 3: 'A1', 4: '10:00S', 5: 'OK', 6: '测试员' }),
      row({ 0: '1月2日', 1: 'P001', 3: 'A1', 4: '11:00X', 5: '待定', 6: '测试员' }),
      row({ 0: '1月2日', 1: 'P001', 3: 'A1', 4: '12:00M', 6: '测试员' }),
    ], '2026年/压铸首巡检.xlsx')
    expect(result.rows.map(({ fields }) => [fields.result, fields.finalResult, fields.inspectionType]))
      .toEqual([['NG', 'OK', 'S'], ['OK', '', 'S']])
    expect(new Set(result.rows.map(({ identity }) => identity)).size).toBe(2)
    expect(result.diagnostics.map(({ code, source }) => [code, source.row]))
      .toEqual([['invalid_result', 5], ['invalid_result', 6]])
  })

  it('uses the hardware process column and parses explicit M classification', () => {
    const result = parse('检验汇总', [...hardwareFaHeader,
      ['1月2日', 'P001', 'M1', '攻牙', '10:00m', 'OK', '测试员'],
    ], '2026年/五金首(巡)检汇总表.xlsx')
    expect(result.rows[0]?.fields).toMatchObject({ process: '攻牙', inspectionType: 'M', stage: '', dept: '五金' })
  })

  it.each([
    {
      label: '机台', field: 'machine', sheet: '注塑', headers: injectionFaHeader, path: '2026年/注塑首巡检.xlsx',
      invalid: ['1月2日', 'P001', '#REF!', '10:00S', 'NG', '测试员'],
      valid: ['1月2日', 'P001', 'M1', '10:00S', 'OK', '测试员'],
    },
    {
      label: '工序', field: 'process', sheet: '检验汇总', headers: hardwareFaHeader, path: '2026年/五金首巡检.xlsx',
      invalid: ['1月2日', 'P001', 'M1', '#VALUE!', '10:00S', 'NG', '测试员'],
      valid: ['1月2日', 'P001', 'M1', '攻牙', '10:00S', 'OK', '测试员'],
    },
  ])('rejects formula errors in $label without rejecting the neighboring FA row', ({ label, field, sheet, headers, path, invalid, valid }) => {
    const result = parse(sheet, [...headers, invalid, valid], path)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({ identity: '', fields: { pn: 'P001', [field]: '', result: 'NG' } })
    expect(result.rows[1]?.identity).toBeTruthy()
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid_identity_value', message: expect.stringContaining(label),
        source: expect.objectContaining({ row: headers.length + 1, region: 'first-patrol' }),
      }),
    ]))
    expect(result.diagnostics.every(({ source }) => source.row === headers.length + 1)).toBe(true)
  })

  it('retains both printing regions, the actual sample, and genuinely blank identities and inspectors', () => {
    const result = parse('印刷检验报告', [...printHeader,
      row({ 0: '1月2日', 1: 'JOB-01', 2: '模拟零件', 3: 'M1', 11: 'OK', 12: '2026/1/3', 13: '100', 14: '12', 15: '10', 16: '2', 17: '20%', 18: '2', 36: 'NG', 40: '终检员' }),
      row({ 0: '1月3日', 1: 'JOB-02', 2: '模拟零件', 11: 'OK', 17: '#DIV/0!' }),
    ])
    expect(result.rows.map(({ table, source }) => [table, source.row, source.region])).toEqual([
      ['fa', 4, 'print-fa'], ['fqcInspection', 4, 'fqc-main'], ['fqcNg', 4, 'fqc-main'], ['fa', 5, 'print-fa'],
    ])
    expect(result.rows[0]?.fields).toMatchObject({ pn: '', who: '', part: '模拟零件', job: 'JOB-01', inspectionType: 'S', stage: '' })
    expect(result.rows[1]?.fields).toMatchObject({ pn: '', who: '终检员', lot: 'JOB-01', samp: 10, bad: 2, batchQty: 100, cat: '跑位', defs: '跑位：2', result: 'NG' })
    expect(result.rows[2]?.fields).not.toHaveProperty('rate')
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_source_columns', source: expect.objectContaining({ region: 'print-fa' }) }),
    ]))
  })

  it('keeps a right-hand print inspection beside a left-hand subtotal', () => {
    const result = parse('印刷检验报告', [...printHeader, row({
      0: '小计', 12: '2026/1/3', 13: '100', 15: '10', 16: '2', 18: '2', 36: 'NG', 40: '终检员',
    })])
    expect(result.rows.map(({ table, source }) => [table, source.row, source.region])).toEqual([
      ['fqcInspection', 4, 'fqc-main'], ['fqcNg', 4, 'fqc-main'],
    ])
    expect(result.validRows).toBe(1)
    expect(result.skippedRows).toBe(0)
  })

  it('does not use Excel errors from a part or JOB cell as editable source identity', () => {
    const injection = parse('注塑', [...injectionFaHeader, ['2026/1/2', '#N/A', 'A1', '9:00S', 'NG', '测试员']])
    expect(injection.rows).toEqual([])
    expect(injection.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_identity_value', source: expect.objectContaining({ row: 4, region: 'first-patrol' }) }),
    ]))
    const print = parse('印刷检验报告', [...printHeader, row({ 0: '1月2日', 1: '#N/A', 11: 'OK', 12: '1月2日', 36: 'NG' })])
    expect(print.rows.map(({ table, fields, identity }) => [table, fields.job ?? fields.lot, Boolean(identity)])).toEqual([
      ['fa', '', false], ['fqcInspection', '', true], ['fqcNg', '', false],
    ])
    expect(print.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_identity_value', source: expect.objectContaining({ row: 4, region: 'print-fa' }) }),
      expect.objectContaining({ code: 'invalid_identity_value', source: expect.objectContaining({ row: 4, region: 'fqc-main' }) }),
    ]))
  })

  it('preserves otherwise valid read-only inspections with a formula error in the work order or part', () => {
    const result = parse('注塑检验记录', [...injectionFqcHeader,
      row({ 0: '1月2日', 1: '#N/A', 2: 'P001', 27: 'NG', 30: '测试员' }),
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001', 27: 'NG', 30: '测试员' }),
      row({ 0: '1月2日', 1: 'WO-2', 2: '#REF!', 27: 'NG', 30: '测试员' }),
    ])
    expect(result.rows.filter(({ table }) => table === 'fqcInspection')).toHaveLength(3)
    expect(result.rows.filter(({ table }) => table === 'fqcNg').map(({ fields, identity }) => [fields.lot, fields.pn, Boolean(identity)])).toEqual([
      ['', 'P001', false], ['WO-1', 'P001', true], ['WO-2', '', false],
    ])
    expect(result.diagnostics.filter(({ code }) => code === 'invalid_identity_value').map(({ source }) => source.row)).toEqual([4, 6])
  })

  it('preserves the complete part number and keeps duplicate batches as independent read-only facts', () => {
    const result = parse('五金FQC检验记录', [
      ['2026年FQC报告:五金车间'],
      row({ 0: '日期', 1: '品号', 2: '品号', 3: '机种', 4: '批量数', 5: '外观抽样数', 6: '抽检不良数', 7: '不良率', 8: '不良项目', 23: '判定', 26: '检验员', 28: '处理措施' }),
      row({ 8: '螺牙不良', 22: '其它', 27: '下工序' }),
      row({ 0: '1月2日', 1: 'P001-001', 2: 'P001', 4: '10', 5: '0', 6: '0', 7: '#DIV/0!', 23: 'OK', 26: '测试员' }),
      row({ 0: '1月2日', 1: 'P001-001', 2: 'P001', 4: '10', 5: '5%', 6: '#DIV/0!', 23: 'OK', 26: '测试员' }),
    ])
    expect(result.rows.map(({ fields }) => [fields.pn, fields.samp, fields.bad])).toEqual([
      ['P001-001', 0, 0], ['P001-001', null, null],
    ])
    expect(new Set(result.rows.map(({ identity }) => identity)).size).toBe(2)
    expect(result.diagnostics.filter(({ code }) => code === 'invalid_number')).toHaveLength(2)
  })

  it('attaches recheck data without treating it as a second initial inspection', () => {
    const result = parse('注塑检验记录', [...injectionFqcHeader,
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001', 4: '100', 5: '20', 6: '3', 8: '3', 27: 'NG', 30: '初检员', 31: '返工', 35: '1月3日', 36: '100', 37: '25', 38: 'OK', 39: '复检员' }),
    ])
    expect(result.rows.map(({ table }) => table)).toEqual(['fqcInspection', 'fqcNg'])
    expect(result.rows[0]?.fields).toMatchObject({
      result: 'NG', who: '初检员', samp: 20, bad: 3, lot: 'WO-1',
      rd: '2026-01-03', re: 'OK', recheckBatchQty: 100, recheckSamp: 25, recheckWho: '复检员',
    })
  })

  it('retains quantity-only rechecks and diagnoses orphans with absent or invalid initial judgements', () => {
    const result = parse('注塑检验记录', [...injectionFqcHeader,
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001', 27: 'OK', 36: '0', 37: '0' }),
      row({ 37: '0' }),
      row({ 0: '1月2日', 4: '100', 27: '待定', 36: '0' }),
    ])
    expect(result.rows[0]?.fields).toMatchObject({ recheckBatchQty: 0, recheckSamp: 0 })
    expect(result.diagnostics.filter(({ code }) => code === 'orphan_recheck').map(({ source }) => [source.row, source.region]))
      .toEqual([[5, 'fqc-recheck'], [6, 'fqc-recheck']])
  })

  it.each([
    [
      '毛边检验汇总', '注塑毛边', 'P001', 'WO-1',
      { 0: '日期', 1: '工单号', 2: '品号', 4: '批量数', 5: '抽检数', 6: '抽 检不良数', 8: '不良项',
        21: '判定', 24: '检验员', 25: '处理措施', 26: '异常返工', 34: '备注' },
      { 8: '混料', 20: '其他', 26: '日期', 27: '重检批量数', 28: '重检抽检数', 29: '判定', 30: '检验员' },
      { 0: '1月2日', 1: 'WO-1', 2: 'P001', 4: '100', 5: '20', 6: '3', 8: '3', 21: 'NG', 24: '初检员' },
      '混料',
    ],
    [
      '压铸FQC检验记录', '压铸', 'P001', 'WO-1',
      { 0: '日期', 1: '品号', 4: '工单号', 5: '批量数', 6: '抽检数', 7: '抽检不良数', 9: '不良项目',
        26: '判定', 29: '检验员', 31: '处理措施', 35: '备注' },
      { 9: '装配不良', 25: '其他' },
      { 0: '1月2日', 1: 'P001', 4: 'WO-1', 5: '100', 6: '20', 7: '3', 9: '3', 26: 'NG', 29: '初检员' },
      '装配不良',
    ],
    [
      '涂装检验报告', '涂装', 'P001-001', 'WO-1',
      { 0: '日期', 1: '单号', 3: '颜色', 4: '数量', 5: '外观抽检数', 7: '抽检不良数', 9: '不良项目/批',
        27: '判定', 30: '品管签名', 31: '处理措施', 35: '备注' },
      { 9: '色差', 26: '其他' },
      { 0: '1月2日', 1: 'WO-1', 2: 'P001-001', 3: '白', 4: '100', 5: '20', 7: '3', 9: '3', 27: 'NG', 30: '初检员' },
      '色差',
    ],
  ] as const)('parses all physical mappings for %s', (sheet, ws, pn, lot, main, child, data, cat) => {
    const result = parse(sheet, [['业务履历'], row(main), row(child), row(data)])
    expect(result.validRows).toBe(1)
    expect(result.rows.map((item) => item.table)).toEqual(['fqcInspection', 'fqcNg'])
    expect(result.rows[0]?.fields).toMatchObject({ ws, pn, lot, cat, result: 'NG', batchQty: 100, samp: 20, bad: 3 })
  })

  it('distinguishes coating NG results for different full parts on the same job', () => {
    const result = parse('涂装检验报告', [
      ['2026年涂装车间FQC报告'],
      row({ 0: '日期', 1: '单号', 2: ' ', 3: '颜色', 4: '数量', 5: '外观抽检数', 7: '抽检不良数', 9: '不良项目/批',
        27: '判定', 30: '品管签名', 31: '处理措施', 35: '备注' }),
      row({ 9: '色差', 26: '其他' }),
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001-001', 27: 'NG', 30: '初检员' }),
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001-002', 27: 'NG', 30: '初检员' }),
    ])
    const ngRows = result.rows.filter(({ table }) => table === 'fqcNg')
    expect(ngRows.map(({ fields }) => [fields.lot, fields.pn])).toEqual([['WO-1', 'P001-001'], ['WO-1', 'P001-002']])
    expect(ngRows.every(({ identity }) => Boolean(identity))).toBe(true)
    expect(ngRows[0]?.identity).not.toBe(ngRows[1]?.identity)
    expect(result.diagnostics).toEqual([])
  })

  it('detects an editable NG identity collision with an OK observation of the same lot', () => {
    const result = parse('注塑检验记录', [
      ['2026年注塑FQC报表'],
      row({ 0: '日期', 2: '品号', 4: '批量数', 5: '抽检数', 6: '抽检不良数', 7: '不良率', 8: '不良项目', 27: '判定', 30: '检验员', 31: '处理措施', 35: '异常返工' }),
      row({ 1: '工单号', 8: '毛边', 26: '其他', 35: '日期', 36: '重检批量数', 37: '重检抽检数', 38: '判定', 39: '检验员' }),
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001', 27: 'OK', 30: '初检员' }),
      row({ 0: '1月2日', 1: 'WO-1', 2: 'P001', 27: 'NG', 30: '初检员' }),
      row({ 35: '1月3日', 38: 'OK', 39: '复检员' }),
    ])
    expect(result.validRows).toBe(2)
    expect(result.rows.find(({ table }) => table === 'fqcNg')?.identity).toBe('')
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ambiguous_identity', source: expect.objectContaining({ row: 5, region: 'fqc-main' }) }),
      expect.objectContaining({ code: 'orphan_recheck', source: expect.objectContaining({ row: 6, region: 'fqc-recheck' }) }),
    ]))
  })

  it('reports ambiguous editable identities without collapsing records', () => {
    const result = parse('注塑', [...injectionFaHeader,
      ['2026/1/2', 'P001', 'A1', '9:00s', 'OK', '测试员'],
      ['2026/1/2', 'P001', 'A1', '09:00S', 'NG', '测试员'],
    ])
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map(({ identity }) => identity)).toEqual(['', ''])
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['ambiguous_identity', 'ambiguous_identity'])
  })

  it('maps the complaint source and production department separately and reads grouped dates', () => {
    const result = parse('投诉零件清单', [...complaintHeader,
      row({ 0: '1/2/26', 1: '组装', 2: '五金车间', 4: '模拟零件', 5: 'P001', 6: '压伤', 9: '更换治具', 11: '1月4日', 12: '1月3日', 13: '是', 18: '1月8日', 20: '否' }),
    ])
    expect(result.rows[0]).toMatchObject({
      table: 'cmp', source: { row: 4, region: 'complaint' },
      fields: { from: '组装', dept: '五金', pn: 'P001', issue: '压伤', planReply: '2026-01-04', actReply: '2026-01-03', ontimeReply: '是', actClose: '2026-01-08', repeat: '否' },
    })
  })

  it('inherits inventory identity within one group and stops at totals or partial anchors', () => {
    const result = parse('不良品清查记录', [...inventoryHeader,
      row({ 0: '1月2日', 1: 'P001', 2: '模拟零件', 3: '压伤', 4: '测试员', 5: '注塑', 8: '100', 9: '20', 10: '2' }),
      row({ 5: '压铸', 8: '200', 9: '25', 10: '1' }),
      row({ 5: '小计', 8: '300' }),
      row({ 5: '五金', 8: '120' }),
      row({ 0: '1月3日', 5: '五金', 8: '20' }),
      row({ 5: '印刷', 8: '80' }),
    ])
    expect(result.rows.map(({ fields, source }) => [fields.date, fields.pn, fields.stock, fields.samp, fields.ng, source.row])).toEqual([
      ['2026-01-02', 'P001', 100, 20, 2, 2], ['2026-01-02', 'P001', 200, 25, 1, 3],
    ])
    expect(result.rows[1]?.fields).toMatchObject({ issue: '压伤', depts: '压铸' })
    expect(result.diagnostics).toHaveLength(3)
  })

  it.each([
    { column: 2, label: '名称', error: '#N/A' },
    { column: 3, label: '不良描述', error: '#REF!' },
    { column: 4, label: '清查人', error: '＃ＶＡＬＵＥ！' },
  ])('skips an inventory continuation with a formula error in $label and preserves its neighbors', ({ column, label, error }) => {
    const result = parse('不良品清查记录', [...inventoryHeader,
      row({ 0: '1月2日', 1: 'P001', 2: '模拟零件', 3: '压伤', 4: '测试员', 5: '注塑', 8: '100' }),
      row({ 5: '五金', 8: '200' }),
      row({ [column]: error, 5: '注塑', 8: '999' }),
      row({ 5: '涂装', 8: '300' }),
      row({ 0: '1月3日', 1: 'P002', 2: '模拟零件', 3: '碰伤', 4: '测试员', 5: '注塑', 8: '50' }),
      row({ 2: ' ', 3: ' ', 4: ' ', 5: '五金', 8: '20' }),
    ])
    expect(result.rows.map(({ fields, source }) => [fields.pn, fields.depts, fields.stock, source.row])).toEqual([
      ['P001', '注塑', 100, 2], ['P001', '五金', 200, 3], ['P001', '涂装', 300, 5],
      ['P002', '注塑', 50, 6], ['P002', '五金', 20, 7],
    ])
    expect(result.rows.every(({ identity }) => Boolean(identity))).toBe(true)
    expect(result.diagnostics).toMatchObject([
      { code: 'invalid_identity_value', source: { row: 4, region: 'inventory' }, message: expect.stringContaining(label) },
    ])
  })

  it('ends the previous inventory group when a new date or part anchor is invalid', () => {
    const result = parse('不良品清查记录', [...inventoryHeader,
      row({ 0: '1月2日', 1: 'P001', 3: '压伤', 5: '注塑', 8: '100' }),
      row({ 0: '1月3日', 1: '#REF!', 5: '五金', 8: '99' }),
      row({ 5: '涂装', 8: '300' }),
      row({ 0: '1月4日', 1: 'P002', 3: '碰伤', 5: '注塑', 8: '50' }),
      row({ 0: '2月30日', 1: 'P003', 5: '五金', 8: '999' }),
      row({ 5: '涂装', 8: '300' }),
    ])
    expect(result.rows.map(({ source }) => source.row)).toEqual([2, 5])
    expect(result.diagnostics.map(({ source, code }) => [source.row, code])).toEqual([
      [3, 'invalid_identity_value'], [4, 'orphan_inventory_detail'],
      [6, 'invalid_date'], [7, 'orphan_inventory_detail'],
    ])
  })

  it('unPivotsMonthlyCheckScores', () => {
    const result = parse('月汇总', [
      ['过程关键点管控评分月汇总'],
      ['部门', '负责人', '目标', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '累计排名', '排名'],
      ['注塑车间', '负责人', '90', '0', '', '92.5', '#DIV/0!'],
      ['佛山注塑', '负责人', '90', '88'],
    ])
    expect(result.rows.map(({ table, fields, source }) => [table, fields, source.row])).toEqual([
      ['checkScore', { ws: '注塑', year: 2026, month: 1, score: 0 }, 3],
      ['checkScore', { ws: '注塑', year: 2026, month: 3, score: 92.5 }, 3],
    ])
    expect(result.diagnostics.map(({ code }) => code)).toEqual(['invalid_number', 'unmapped_workshop'])
  })

  it('parsesPerformanceEventsNotRules', () => {
    const result = parse('考核统计', [...performanceHeader,
      ['五金车间', 'P001', '模拟零件', '1月2日', '组装', '模拟事项', '测试员', '-2.5', '扣分'],
      ['五金车间', 'P002', '模拟零件', '1月3日', '组装', '模拟事项', '测试员', '', '加分'],
    ])
    expect(result.rows).toMatchObject([
      { table: 'perf', fields: { date: '2026-01-02', dept: '五金', who: '测试员', score: -2.5, attr: '扣分', item: '模拟事项', pn: 'P001', from: '组装' } },
    ])
    expect(result.diagnostics).toMatchObject([{ code: 'invalid_number' }])
  })

  it.each([
    { sheet: '投诉零件清单', headers: complaintHeader, invalid: row({ 0: '1月2日', 1: '#REF!', 2: '五金', 5: 'P001', 6: '压伤' }), field: 'from' },
    { sheet: '不良品清查记录', headers: inventoryHeader, invalid: row({ 0: '1月2日', 1: 'P001', 3: '#NAME?', 5: '五金', 8: '10' }), field: 'issue' },
    { sheet: '考核统计', headers: performanceHeader, invalid: ['五金', 'P001', '', '1月2日', '#VALUE!', '模拟事项', '测试员', '-1'], field: 'from' },
  ])('prevents invalid source components from reaching $sheet identities', ({ sheet, headers, invalid, field }) => {
    const result = parse(sheet, [...headers, invalid])
    expect(result.rows[0]).toMatchObject({ identity: '', fields: { [field]: '' } })
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_identity_value', source: expect.objectContaining({ row: headers.length + 1 }) }),
    ]))
  })

  it('keeps an explicit data year and reports its discrepancy', () => {
    const result = parse('考核统计', [
      ['QC绩效考核统计表'],
      ['车间', '品号', '品名', '发生时间', '投诉单位', '事项', '责任人', '加减分', '绩效属性'],
      ['五金', 'P001', '', '2025/12/30', '组装', '模拟事项', '测试员', '0', '扣分'],
    ])
    expect(result.rows[0]?.fields).toMatchObject({ date: '2025-12-30', score: 0 })
    expect(result.diagnostics).toMatchObject([{ code: 'date_year_mismatch', source: { row: 3 } }])
  })

  it('rejects a business sheet name with an unrelated column structure', () => {
    const result = parse('月汇总', [['项目', '备注'], ['模拟事项', '100']])
    expect(result.rows).toEqual([])
    expect(result.diagnostics).toMatchObject([{ code: 'unsupported_header' }])
  })
})

describe('source dates', () => {
  it.each([
    ['2026/1/2', 2026, '2026-01-02'],
    ['1/2/26', 2026, '2026-01-02'],
    ['1月2日', 2026, '2026-01-02'],
    ['2025-12-31', 2026, '2025-12-31'],
    ['2/29/24', 2024, '2024-02-29'],
    ['2/29/26', 2026, null],
    ['1/2/25', 2026, null],
    ['1/2/26', 0, null],
    ['2026-02-30', 2026, null],
    ['', 2026, null],
    ['#DIV/0!', 2026, null],
  ])('parses %s with explicit workbook year %s', (date, year, expected) => {
    expect(parseSourceDate(date, year)).toBe(expected)
  })
})
