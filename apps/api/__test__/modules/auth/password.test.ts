import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../../../modules/auth/password'

describe('password', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('secret-1')
    expect(hash).not.toBe('secret-1')
    await expect(verifyPassword('secret-1', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
  })
})