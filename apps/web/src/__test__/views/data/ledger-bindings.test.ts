import { describe, expect, it } from 'vitest'
import {
  bindingSaveErrorFromRoleMap,
  entriesFromRoleToPath,
  roleToPathFromEntries,
} from '@/views/data/ledger-bindings'

describe('ledger-bindings role map', () => {
  it('entriesFromRoleToPath 只输出有路径的角色', () => {
    expect(
      entriesFromRoleToPath({
        perf: 'a/绩效.xlsx',
        complaint: '',
      }),
    ).toEqual([
      {
        path: 'a/绩效.xlsx',
        kind: 'file',
        role: 'perf',
        template: 'perfSheet',
      },
    ])
  })

  it('roleToPathFromEntries 与 entriesFromRoleToPath 互逆', () => {
    const entries = [
      { path: 'a/投诉.xls', kind: 'file' as const, role: 'complaint', template: 'complaintSheet' },
    ]
    expect(entriesFromRoleToPath(roleToPathFromEntries(entries))).toEqual(entries)
  })

  it('bindingSaveErrorFromRoleMap 不要求为树上每个文件指定角色', () => {
    expect(bindingSaveErrorFromRoleMap({ perf: 'a/绩效.xlsx' })).toBe('')
  })

  it('同一文件不能绑定多个角色', () => {
    expect(
      bindingSaveErrorFromRoleMap({
        perf: 'a/绩效.xlsx',
        complaint: 'a/绩效.xlsx',
      }),
    ).toBe('同一文件不能绑定多个角色')
  })
})