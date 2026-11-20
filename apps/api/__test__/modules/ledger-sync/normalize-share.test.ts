import { describe, expect, it } from 'vitest'

import { normalizeShare } from '../../../modules/ledger-sync/data-hub-client'

describe('normalizeShare', () => {
  it('maps data-hub displayName and connectionStatus', () => {
    expect(
      normalizeShare({
        id: 'x',
        displayName: '台账盘',
        connectionStatus: 'ready',
      }),
    ).toEqual({ id: 'x', name: '台账盘', status: 'ready' })
  })

  it('keeps legacy name and status', () => {
    expect(normalizeShare({ id: 'y', name: 'n', status: 'pending' })).toEqual({
      id: 'y',
      name: 'n',
      status: 'pending',
    })
  })
})