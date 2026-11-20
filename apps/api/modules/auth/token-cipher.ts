import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const AUTH_TAG_BYTES = 16
const NONCE_BYTES = 12

export const DATA_HUB_TOKEN_KEY_VERSION = 1

export interface EncryptedTokenPayload {
  ciphertext: string
  nonce: string
  keyVersion: number
}

export function encryptToken(plaintext: string, key: Buffer): EncryptedTokenPayload {
  if (key.length !== 32) {
    throw new Error('token key must be 32 bytes')
  }
  const nonce = randomBytes(NONCE_BYTES)
  const cipher = createCipheriv(ALGO, key, nonce)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([encrypted, tag])
  return {
    ciphertext: payload.toString('base64'),
    nonce: nonce.toString('base64'),
    keyVersion: DATA_HUB_TOKEN_KEY_VERSION,
  }
}

export function decryptToken(payload: EncryptedTokenPayload, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('token key must be 32 bytes')
  }
  const data = Buffer.from(payload.ciphertext, 'base64')
  if (data.length < AUTH_TAG_BYTES) {
    throw new Error('invalid ciphertext')
  }
  const tag = data.subarray(data.length - AUTH_TAG_BYTES)
  const encrypted = data.subarray(0, data.length - AUTH_TAG_BYTES)
  const decipher = createDecipheriv(ALGO, key, Buffer.from(payload.nonce, 'base64'))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function decodeTokenKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64')
  if (key.length !== 32) {
    throw new Error('DATA_HUB_TOKEN_KEY 必须是 32 字节的 Base64')
  }
  return key
}