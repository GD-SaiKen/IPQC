import { describe, expect, it } from 'vitest'
import { faNgConfirmLabel, faStats } from '@/domain/ipqc/fa-rules'

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
