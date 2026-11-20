import { randomBytes } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { decryptToken, encryptToken } from '../../../modules/auth/token-cipher'

describe('token-cipher', () => {
  const key = randomBytes(32)

  it('往返成功', () => {
    const payload = encryptToken('refresh-secret', key)
    const plain = decryptToken(payload, key)
    expect(plain).toBe('refresh-secret')
  })

  it('密文不等于明文', () => {
    const payload = encryptToken('refresh-secret', key)
    expect(payload.ciphertext).not.toBe('refresh-secret')
  })

  it('错误密钥解密失败', () => {
    const payload = encryptToken('refresh-secret', key)
    expect(() => decryptToken(payload, randomBytes(32))).toThrow()
  })
})