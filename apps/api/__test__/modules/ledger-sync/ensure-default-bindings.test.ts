import { describe, expect, it } from 'vitest'

import {
  hasValidSavedBindings,
  readDefaultLedgerBindingsFile,
} from '../../../modules/ledger-sync/ensure-default-ledger-sync-config'

describe('default ledger bindings file', () => {
  it('默认配置可被解析为有效绑定', () => {
    const raw = readDefaultLedgerBindingsFile()
    expect(raw.selectedEntries.length).toBeGreaterThanOrEqual(10)
    expect(hasValidSavedBindings(raw.selectedEntries)).toBe(true)
  })

  it('旧版目录选择不算有效绑定', () => {
    expect(
      hasValidSavedBindings([{ path: '前制程QC', kind: 'directory' }]),
    ).toBe(false)
  })
})