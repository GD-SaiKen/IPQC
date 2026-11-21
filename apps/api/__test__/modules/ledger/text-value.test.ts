import { describe, expect, it } from 'vitest'

import {
  parseOptionalNumber,
  parseSkillLv,
  sanitizeText,
} from '../../../modules/ledger/text-value'

describe('sanitizeText', () => {
  it('去掉首尾空白', () => {
    const r = sanitizeText('pn', '  A  ', 64)
    expect(r).toEqual({ ok: true, value: 'A' })
  })

  it('拒绝 U+001E', () => {
    const r = sanitizeText('item', `a${'\u001e'}b`, 200)
    expect(r.ok).toBe(false)
  })
})

describe('parseOptionalNumber', () => {
  it('1 与 1.0 相同数值', () => {
    const a = parseOptionalNumber('score', 1)
    const b = parseOptionalNumber('score', '1.0')
    expect(a.ok && b.ok && a.value === b.value).toBe(true)
  })

  it('空值为 null', () => {
    expect(parseOptionalNumber('score', '')).toEqual({ ok: true, value: null })
  })
})

describe('parseSkillLv', () => {
  it('拒绝非法等级', () => {
    expect(parseSkillLv([0, 10])).toEqual({ error: 'lv 每项须为 0 到 9 的整数' })
  })
})