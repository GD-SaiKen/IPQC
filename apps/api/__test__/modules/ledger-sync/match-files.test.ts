import { describe, expect, it } from 'vitest'

import {
  analyzeSelectedLedgerFiles,
  classifyLedgerFileName,
  matchLedgerFiles,
  validateRootPath,
} from '../../../modules/ledger-sync/match-files'

function allRequiredHits(): Array<{ path: string; name: string }> {
  return [
    { path: 'a/100394-003首巡检报告.xls', name: '100394-003首巡检报告.xls' },
    { path: 'a/注塑首巡检.xlsx', name: '注塑首巡检.xlsx' },
    { path: 'a/压铸首巡检.xlsx', name: '压铸首巡检.xlsx' },
    { path: 'a/五金首巡检.xlsx', name: '五金首巡检.xlsx' },
    { path: 'a/2026年印刷车间品质履历表.xlsx', name: '2026年印刷车间品质履历表.xlsx' },
    { path: 'a/2026年注塑车间品质履历表.xlsx', name: '2026年注塑车间品质履历表.xlsx' },
    { path: 'a/2026年注塑毛边车间品质履历表.xlsx', name: '2026年注塑毛边车间品质履历表.xlsx' },
    { path: 'a/2026年压铸车间品质履历表.xlsx', name: '2026年压铸车间品质履历表.xlsx' },
    { path: 'a/2026年五金车间品质履历表.xlsx', name: '2026年五金车间品质履历表.xlsx' },
    { path: 'a/2026年涂装车间品质履历表.xlsx', name: '2026年涂装车间品质履历表.xlsx' },
    { path: 'a/2026年不良品清查.xls', name: '2026年不良品清查.xls' },
    { path: 'a/2026年前制程零件投诉跟进.xls', name: '2026年前制程零件投诉跟进.xls' },
    { path: 'a/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' },
    { path: 'a/注塑车间关键点管控.xlsx', name: '注塑车间关键点管控.xlsx' },
    { path: 'a/PQC员工2026年绩效.xlsx', name: 'PQC员工2026年绩效.xlsx' },
  ]
}

describe('validateRootPath', () => {
  it('拒绝 .. 与盘符', () => {
    expect(validateRootPath('../x')).not.toBeNull()
    expect(validateRootPath('D:\\台账')).not.toBeNull()
  })
})

describe('matchLedgerFiles', () => {
  it('必选文件齐全时成功', () => {
    const result = matchLedgerFiles(allRequiredHits())
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.missingOptional).toContain('faInjectionBur')
    }
  })

  it('缺终检时拒绝', () => {
    const hits = allRequiredHits().filter((h) => !h.name.includes('涂装'))
    const result = matchLedgerFiles(hits)
    expect(result).toEqual({ kind: 'reject', message: expect.stringContaining('缺少必需台账文件') })
  })

  it('重名时拒绝', () => {
    const hits = [...allRequiredHits(), { path: 'b/2026年涂装车间品质履历表.xlsx', name: '2026年涂装车间品质履历表.xlsx' }]
    const result = matchLedgerFiles(hits)
    expect(result.kind).toBe('reject')
    if (result.kind === 'reject') {
      expect(result.conflicts?.length).toBeGreaterThan(0)
    }
  })

  it('识别 xls 扩展名与 100394 前缀文件名', () => {
    const hits = allRequiredHits().map((h) => ({ ...h }))
    hits[0] = { path: 'a/100394-003首巡检汇总.xls', name: '100394-003首巡检汇总.xls' }
    const injIdx = hits.findIndex((h) => h.name === '2026年注塑车间品质履历表.xlsx')
    hits[injIdx] = { path: 'a/2026年注塑车间品质履历表.xls', name: '2026年注塑车间品质履历表.xls' }
    const result = matchLedgerFiles(hits)
    expect(result.kind).toBe('ok')
  })

  it('缺少注塑毛边终检表时拒绝', () => {
    const hits = allRequiredHits().filter((h) => !h.name.includes('注塑毛边车间品质履历'))
    const result = matchLedgerFiles(hits)
    expect(result.kind).toBe('reject')
  })

  it('多选偏好目录时优先落在其中的副本', () => {
    const hits = allRequiredHits().filter((h) => h.name !== '各车间点检评分排名.xlsx')
    hits.push(
      { path: '归档/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' },
      { path: '台账B/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' },
    )
    const result = matchLedgerFiles(hits, { preferRootPaths: ['台账B', '正式台账'] })
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      const rank = result.files.find((f) => f.role === 'checkRank')
      expect(rank?.path).toBe('台账B/各车间点检评分排名.xlsx')
    }
  })

  it('历年副本时优先 2026 正式目录', () => {
    const hits = allRequiredHits().filter((h) => h.name !== '各车间点检评分排名.xlsx')
    hits.push(
      { path: '前制程QC/前制程过程管控/2024年过程管控检查/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' },
      { path: '前制程QC/前制程过程管控/2026年过程管控检查/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' },
      { path: '前制程QC/AI文件夹/2026年过程管控检查/各车间点检评分排名.xlsx', name: '各车间点检评分排名.xlsx' },
    )
    const result = matchLedgerFiles(hits)
    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      const rank = result.files.find((f) => f.role === 'checkRank')
      expect(rank?.path).toContain('2026年过程管控检查')
      expect(rank?.path).not.toContain('AI文件夹')
    }
  })

  it('毛边首件缺失仍成功', () => {
    const result = matchLedgerFiles(allRequiredHits())
    expect(result.kind).toBe('ok')
  })
})

describe('analyzeSelectedLedgerFiles', () => {
  it('同一角色两份文件全部视为重复', () => {
    const hits = [
      { path: '2024/2026年涂装车间品质履历表.xlsx', name: '2026年涂装车间品质履历表.xlsx' },
      { path: '2026/2026年涂装车间品质履历表.xlsx', name: '2026年涂装车间品质履历表.xlsx' },
    ]
    const result = analyzeSelectedLedgerFiles(hits)
    expect(result.duplicates).toHaveLength(1)
    expect(result.files).toHaveLength(0)
    expect(result.kind).toBe('blocked')
  })

  it('.XLS 与 .csv 文件名可识别', () => {
    expect(classifyLedgerFileName('100394-003首巡检报告.XLS')).toEqual({
      kind: 'role',
      role: 'faFocus',
    })
    expect(classifyLedgerFileName('2026年前制程零件投诉跟进.csv')).toEqual({
      kind: 'role',
      role: 'complaint',
    })
    expect(classifyLedgerFileName('2026年印刷车间品质履历表.csv')).toEqual({
      kind: 'invalid',
      reason: '该角色需要两张工作表',
    })
  })

  it('毛边首件缺失仍成功，毛边终检缺失则拒绝', () => {
    const hits = allRequiredHits()
    const ok = analyzeSelectedLedgerFiles(hits)
    expect(ok.missingOptional).toContain('faInjectionBur')
    expect(ok.missingRoles).not.toContain('faInjectionBur')

    const withoutBurFqc = hits.filter((h) => !h.name.includes('注塑毛边车间品质履历'))
    const blocked = analyzeSelectedLedgerFiles(withoutBurFqc)
    expect(blocked.missingRoles).toContain('fqcInjectionBur')
  })
})