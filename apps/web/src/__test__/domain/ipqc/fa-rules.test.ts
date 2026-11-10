import { describe, expect, it } from 'vitest'
import {
  FA_STEPS,
  faFeedbackBuckets,
  faFocus,
  faNgConfirmLabel,
  faStats,
} from '@/domain/ipqc/fa-rules'

describe('fa-rules', () => {
  it('NG 确认角色按阶段', () => {
    expect(faNgConfirmLabel('NG', '量产')).toContain('工艺工程师')
    expect(faNgConfirmLabel('NG', '新产品TH RUN样品')).toContain('QE')
    expect(faNgConfirmLabel('OK', '量产')).toBe('—')
  })

  it('5/15 分钟统计', () => {
    const s = faStats([
      { result: 'NG', fb: 3, iv: 10, status: '整改中' },
      { result: 'NG', fb: 8, iv: 20, status: '已关闭' },
      { result: 'OK', status: '已放行' },
    ])
    expect(s.ng).toBe(2)
    expect(s.fbRate).toBe(50)
    expect(s.ivRate).toBe(50)
  })
})

describe('fa-rules · 批次归并与时效分布', () => {
  it('100394-003 逐尺寸记录按日期 + 检验员归并', () => {
    const focus = faFocus([
      { date: '2026-06-23', pn: '100394-003', result: 'NG', who: '黄紫茵' },
      { date: '2026-06-24', pn: '100394-003', result: 'OK', who: '赵红梅' },
      { date: '2026-06-24', pn: '100394-003', result: 'NG', who: '赵红梅' },
      { date: '2026-06-24', pn: '100394-003', result: 'OK', who: '杨志江' },
      { date: '2026-06-24', pn: '999999-001', result: 'NG', who: '杨志江' },
    ])
    expect(focus.n).toBe(4)
    expect(focus.ng).toBe(2)
    expect(focus.byMonth['2026-06'].n).toBe(4)
    expect(focus.byWho['赵红梅']).toEqual({ n: 2, ng: 1 })
  })

  it('反馈时长分布按 5 分钟分段', () => {
    const buckets = faFeedbackBuckets([
      { result: 'NG', fb: 3 },
      { result: 'NG', fb: 5 },
      { result: 'NG', fb: 8 },
      { result: 'NG', fb: 16 },
      { result: 'OK', fb: '' },
    ])
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1, 0, 1])
  })

  it('NG 确认角色随阶段切换', () => {
    expect(faNgConfirmLabel('ng', '销售员样品')).toContain('开发工程师')
    expect(faNgConfirmLabel('NG', '量产')).toBe('工艺工程师')
    expect(faNgConfirmLabel('OK', '销售员样品')).toBe('—')
  })

  it('5 步 NG 流程责任与时限完整', () => {
    expect(FA_STEPS.length).toBe(5)
    expect(FA_STEPS[1].limit).toContain('5')
    expect(FA_STEPS[2].limit).toContain('15')
    expect(FA_STEPS[3].desc).toContain('不得')
  })
})
