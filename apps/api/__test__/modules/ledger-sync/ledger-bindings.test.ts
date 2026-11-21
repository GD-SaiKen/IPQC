import { describe, expect, it } from 'vitest'

import { parseLedgerBindings } from '../../../modules/ledger-sync/ledger-bindings'

describe('parseLedgerBindings', () => {
  it('目录、缺角色、模板不一致都不能成为有效绑定', () => {
    const result = parseLedgerBindings([
      { path: '前制程QC', kind: 'directory' },
      { path: 'a/投诉.xls', kind: 'file' },
      { path: 'a/绩效.xlsx', kind: 'file', role: 'perf', template: 'faSheet' },
    ])
    expect(result.bindings).toEqual([])
    expect(result.issues.map((item) => item.message).join(' ')).toContain('目录不能作为台账绑定')
    expect(result.issues.map((item) => item.message).join(' ')).toContain('请为文件指定台账角色')
    expect(result.issues.map((item) => item.message).join(' ')).toContain('列模板必须是')
  })

  it('同一角色两条路径记为重复，且不进入可解析绑定', () => {
    const result = parseLedgerBindings([
      { path: 'a/投诉.xls', kind: 'file', role: 'complaint', template: 'complaintSheet' },
      { path: 'b/另一本.xls', kind: 'file', role: 'complaint', template: 'complaintSheet' },
      { path: 'c/绩效.xlsx', kind: 'file', role: 'perf', template: 'perfSheet' },
    ])
    expect(result.bindings.map((item) => item.role)).toEqual(['perf'])
    expect(result.issues.some((item) => item.type === 'duplicate' && item.role === 'complaint')).toBe(true)
  })

  it('未绑定的必选角色只出现在缺项里', () => {
    const result = parseLedgerBindings([
      { path: 'c/绩效.xlsx', kind: 'file', role: 'perf' },
    ])
    expect(result.bindings[0]?.template).toBe('perfSheet')
    expect(result.missingRoles).toContain('faInjection')
    expect(result.missingRoles).not.toContain('faInjectionBur')
  })
})