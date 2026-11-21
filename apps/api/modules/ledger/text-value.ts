import { apiError } from '../../common/api-error'

const RECORD_SEPARATOR = '\u001e'
const CONTROL_CHAR = /\p{Cc}/u

export type TextSanitizeResult =
  | { ok: true; value: string }
  | { ok: false; field: string; message: string }

export function normalizeNfc(value: string): string {
  return value.normalize('NFC')
}

export function trimUnicodeWhitespace(value: string): string {
  return value.replace(/^[\p{White_Space}]+|[\p{White_Space}]+$/gu, '')
}

export function sanitizeText(field: string, raw: unknown, maxLen: number): TextSanitizeResult {
  const str = raw === null || raw === undefined ? '' : String(raw)
  let value = normalizeNfc(trimUnicodeWhitespace(str))
  if (CONTROL_CHAR.test(value)) {
    return { ok: false, field, message: `${field} 不能包含控制字符` }
  }
  if (value.length > maxLen) {
    return { ok: false, field, message: `${field} 超出最大长度 ${maxLen}` }
  }
  return { ok: true, value }
}

export function parseOptionalNumber(
  field: string,
  raw: unknown,
): { ok: true; value: number | null } | { ok: false; field: string; message: string } {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: true, value: null }
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n)) {
    return { ok: false, field, message: `${field} 不是有效数字` }
  }
  return { ok: true, value: n }
}

export function parseSkillLv(raw: unknown): number[] | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: 'lv 必须是数组' }
  }
  if (raw.length > 32) {
    return { error: 'lv 最多 32 项' }
  }
  const out: number[] = []
  for (const item of raw) {
    const n = typeof item === 'number' ? item : Number(item)
    if (!Number.isInteger(n) || n < 0 || n > 9) {
      return { error: 'lv 每项须为 0 到 9 的整数' }
    }
    out.push(n)
  }
  return out
}

export function decimalToJson(value: { toString: () => string } | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value.toString())
  return Number.isFinite(n) ? n : null
}

export function assertNoControlInSourceKeyParts(parts: string[], context: string): void {
  for (const part of parts) {
    if (CONTROL_CHAR.test(part)) {
      throw apiError(400, `${context} 含控制字符，无法同步`)
    }
  }
}

export { RECORD_SEPARATOR }