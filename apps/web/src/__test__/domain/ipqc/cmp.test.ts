import { describe, expect, it } from 'vitest'
import {
  cmpCauseDistribution,
  cmpCauseTag,
  cmpMonthlyTrend,
  cmpOwnerLoad,
  cmpSourceDistribution,
  cmpSourceKey,
  cmpStats,
  isClosed,
} from '@/domain/ipqc/cmp'
import type { ComplaintRecord } from '@/domain/ipqc/types'

const rows: ComplaintRecord[] = [
  {
    date: '2026-01-03',
    from: 'BC产线',
    dept: '注塑',
    actReply: '2026-01-04',
    actDisp: '2026-01-05',
    actClose: '2026-01-06',
    ontimeReply: '是',
    ontimeDisp: '否',
    ontimeClose: '是',
    repeat: '是',
    cause: '模具拉伤',
    owner: '杨永昌',
  },
  {
    date: '2026-02-03',
    from: 'LP',
    dept: '注塑',
    actReply: '',
    actDisp: '',
    actClose: '',
    ontimeReply: '',
    ontimeDisp: '',
    ontimeClose: '',
    cause: '调机参数不对',
    owner: '杨永昌',
  },
]

describe('cmp', () => {
  it('来源部门回答谁在投诉，BC / LP 归并', () => {
    expect(cmpSourceKey('BC铆接')).toBe('BC')
    expect(cmpSourceKey('LP附件')).toBe('LP')
    expect(cmpSourceKey('')).toBe('未填写')
  })

  it('来源分布按投诉部门，不按责任车间', () => {
    const dist = cmpSourceDistribution(rows)
    expect(dist.find((x) => x.label === 'BC')?.value).toBe(1)
    expect(dist.find((x) => x.label === 'LP')?.value).toBe(1)
  })

  it('结案率与按时三率只在已填/有效分母上计算', () => {
    const s = cmpStats(rows)
    expect(s.total).toBe(2)
    expect(s.closed).toBe(1)
    expect(s.closeRate).toBe(50)
    expect(s.replyRate).toBe(100)
    expect(s.closeOnTime).toBe(100)
    expect(s.overdue).toBe(1)
    expect(s.repeat).toBe(1)
  })

  it('无投诉时结案率为空', () => {
    const s = cmpStats([])
    expect(s.closeRate).toBeNull()
    expect(s.replyDone).toBeNull()
    expect(s.dispDone).toBeNull()
  })

  it('未填按时标记时按时率为空而不是 0', () => {
    const s = cmpStats([{ date: '2026-03-01', from: 'BC', dept: '注塑' }])
    expect(s.replyRate).toBeNull()
    expect(s.dispRate).toBeNull()
    expect(s.closeOnTime).toBeNull()
  })

  it('未填实际结案日视为未结案', () => {
    expect(isClosed(rows[0])).toBe(true)
    expect(isClosed(rows[1])).toBe(false)
  })

  it('原因文本归类', () => {
    expect(cmpCauseTag('模具拉伤')).toBe('模具')
    expect(cmpCauseTag('无对应关键词')).toBe('其他')
  })

  it('原因分布与责任人负荷', () => {
    expect(cmpCauseDistribution(rows).length).toBe(2)
    const load = cmpOwnerLoad(rows)
    expect(load[0].label).toBe('杨永昌')
    expect(load[0].value).toBe(2)
    expect(load[0].open).toBe(1)
  })

  it('月度趋势按责任车间统计', () => {
    expect(cmpMonthlyTrend(rows, '注塑')).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(cmpMonthlyTrend(rows, '压铸').every((v) => v === 0)).toBe(true)
  })
})
