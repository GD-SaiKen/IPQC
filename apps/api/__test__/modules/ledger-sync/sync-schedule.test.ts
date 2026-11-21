import { describe, expect, it } from 'vitest'

import {
  isPastScheduleTime,
  shanghaiDateKey,
  shouldStartScheduledSync,
} from '../../../modules/ledger-sync/sync-schedule'

function shanghaiWall(hour: number, minute: number, day = 21): Date {
  return new Date(`2026-11-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`)
}

describe('sync-schedule', () => {
  it('未到钟点不触发', () => {
    const now = shanghaiWall(5, 59)
    expect(isPastScheduleTime(now, 6, 0)).toBe(false)
    expect(
      shouldStartScheduledSync({ now, hour: 6, minute: 0, hasScheduledRunToday: false }),
    ).toBe(false)
  })

  it('到点且当天没有定时轮次可触发', () => {
    const now = shanghaiWall(6, 0)
    expect(
      shouldStartScheduledSync({ now, hour: 6, minute: 0, hasScheduledRunToday: false }),
    ).toBe(true)
  })

  it('当天已有定时轮次不再触发', () => {
    const now = shanghaiWall(12, 0)
    expect(
      shouldStartScheduledSync({ now, hour: 6, minute: 0, hasScheduledRunToday: true }),
    ).toBe(false)
  })

  it('晚启动且已过钟点可补跑一次', () => {
    const now = shanghaiWall(10, 30)
    expect(
      shouldStartScheduledSync({ now, hour: 6, minute: 0, hasScheduledRunToday: false }),
    ).toBe(true)
  })

  it('shanghaiDateKey 使用上海日历日', () => {
    const utcLate = new Date('2026-11-20T18:30:00Z')
    expect(shanghaiDateKey(utcLate)).toBe('2026-11-21')
  })
})