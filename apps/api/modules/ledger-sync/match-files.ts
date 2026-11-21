import type { LedgerRole } from './ledger-roles'
import { LEDGER_ROLES, OPTIONAL_LEDGER_ROLES } from './ledger-roles'

export interface SearchHit {
  path: string
  name: string
}

export interface MatchedFile {
  role: LedgerRole
  path: string
  name: string
}

export type MatchFilesResult =
  | { kind: 'ok'; files: MatchedFile[]; missingOptional: LedgerRole[] }
  | { kind: 'reject'; message: string; conflicts?: Array<{ role: LedgerRole; paths: string[] }> }

function basename(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? path
}

/** 同名多路径时优先正式年度目录，避免整盘搜索命中历年副本 */
const PREFER_PATH_MARKERS = [
  '前制程过程管控/2026年过程管控检查',
  '零件异常跟进/零件投诉跟进/2026年',
  '2026年',
] as const

const DEPRIORITIZE_PATH_MARKERS = [
  'AI文件夹',
  '2021年',
  '2022年',
  '2023年',
  '2024年',
  '2025年',
] as const

function scoreLedgerPath(path: string, preferRootPaths?: string[]): number {
  let score = 0
  for (const marker of PREFER_PATH_MARKERS) {
    if (path.includes(marker)) {
      score += marker.length
    }
  }
  for (const marker of DEPRIORITIZE_PATH_MARKERS) {
    if (path.includes(marker)) {
      score -= marker.length
    }
  }
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  for (const preferRootPath of preferRootPaths ?? []) {
    const root = preferRootPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    if (root && (normalized === root || normalized.startsWith(`${root}/`))) {
      score += 120
      break
    }
  }
  return score
}

function pickPreferredHit(hits: SearchHit[], preferRootPaths?: string[]): SearchHit | null {
  if (hits.length <= 1) {
    return hits[0] ?? null
  }
  let best = hits[0]!
  let bestScore = scoreLedgerPath(best.path, preferRootPaths)
  let tied = false
  for (let i = 1; i < hits.length; i++) {
    const hit = hits[i]!
    const score = scoreLedgerPath(hit.path, preferRootPaths)
    if (score > bestScore) {
      best = hit
      bestScore = score
      tied = false
    } else if (score === bestScore) {
      tied = true
    }
  }
  return tied ? null : best
}

function isFirstArticleName(file: string): boolean {
  return file.includes('首巡检') || file.includes('首件')
}

function isFqcLedger(file: string, workshop: string, options?: { allowBur?: boolean; excludeBur?: boolean }): boolean {
  const bur = options?.allowBur ? '毛边' : ''
  const pattern = new RegExp(`^2026年${bur}${workshop}车间品质履历表\\.(xlsx?|csv)$`, 'i')
  if (!pattern.test(file)) {
    return false
  }
  if (options?.excludeBur && file.includes('毛边')) {
    return false
  }
  return true
}

export const SUPPORTED_FILE_TYPES = ['xls', 'xlsx', 'csv'] as const

export function spreadsheetExtension(name: string): string {
  const match = name.trim().match(/\.([^.]+)$/i)
  return match?.[1]?.toLowerCase() ?? ''
}

export function isSupportedSpreadsheet(name: string): boolean {
  const ext = spreadsheetExtension(name)
  return (SUPPORTED_FILE_TYPES as readonly string[]).includes(ext)
}

export type ClassifyLedgerFileResult =
  | { kind: 'role'; role: LedgerRole }
  | { kind: 'unrecognized' }
  | { kind: 'invalid'; reason: string }

export function classifyLedgerFileName(name: string): ClassifyLedgerFileResult {
  const file = name.trim()
  if (/^2026年印刷车间品质履历表\.csv$/i.test(file)) {
    return { kind: 'invalid', reason: '该角色需要两张工作表' }
  }
  const role = matchRole(file)
  if (role) {
    return { kind: 'role', role }
  }
  return { kind: 'unrecognized' }
}

function matchRole(name: string): LedgerRole | null {
  const file = name.trim()
  if (file.includes('100394-003') && /\.(xls|xlsx|csv)$/i.test(file)) return 'faFocus'
  if (file.includes('毛边') && isFirstArticleName(file)) return 'faInjectionBur'
  if (file.includes('注塑') && isFirstArticleName(file) && !file.includes('毛边')) return 'faInjection'
  if (file.includes('压铸') && isFirstArticleName(file)) return 'faDiecast'
  if (file.includes('五金') && isFirstArticleName(file)) return 'faHardware'
  if (/^2026年印刷车间品质履历表\.xlsx?$/i.test(file)) return 'printLedger'
  if (/^2026年注塑毛边车间品质履历表\.(xlsx?|csv)$/i.test(file)) return 'fqcInjectionBur'
  if (isFqcLedger(file, '注塑', { excludeBur: true })) return 'fqcInjection'
  if (isFqcLedger(file, '压铸')) return 'fqcDiecast'
  if (isFqcLedger(file, '五金')) return 'fqcHardware'
  if (isFqcLedger(file, '涂装')) return 'fqcCoating'
  if (/^2026年不良品清查\.(xls|xlsx|csv)$/i.test(file)) return 'fqcInventory'
  if (/^2026年前制程零件投诉跟进\.(xls|xlsx|csv)$/i.test(file)) return 'complaint'
  if (/^各车间点检评分排名\.(xlsx?|csv)$/i.test(file)) return 'checkRank'
  if (/^注塑车间关键点管控\.(xlsx?|csv)$/i.test(file)) return 'checkStandard'
  if (/^PQC员工2026年绩效\.(xlsx?|csv)$/i.test(file)) return 'perf'
  return null
}

export interface AnalyzeSelectedResult {
  kind: 'ok' | 'blocked'
  files: MatchedFile[]
  missingOptional: LedgerRole[]
  duplicates: Array<{ role: LedgerRole; paths: string[] }>
  missingRoles: LedgerRole[]
  unrecognized: SearchHit[]
  invalid: Array<{ hit: SearchHit; reason: string }>
}

export function analyzeSelectedLedgerFiles(hits: SearchHit[]): AnalyzeSelectedResult {
  const byRole = new Map<LedgerRole, SearchHit[]>()
  const unrecognized: SearchHit[] = []
  const invalid: Array<{ hit: SearchHit; reason: string }> = []

  for (const hit of hits) {
    const name = hit.name || basename(hit.path)
    const classified = classifyLedgerFileName(name)
    if (classified.kind === 'invalid') {
      invalid.push({ hit: { ...hit, name }, reason: classified.reason })
      continue
    }
    if (classified.kind === 'unrecognized') {
      if (isSupportedSpreadsheet(name)) {
        unrecognized.push({ ...hit, name })
      }
      continue
    }
    const list = byRole.get(classified.role) ?? []
    list.push({ ...hit, name })
    byRole.set(classified.role, list)
  }

  const duplicates: Array<{ role: LedgerRole; paths: string[] }> = []
  const files: MatchedFile[] = []
  for (const [role, list] of byRole) {
    if (list.length > 1) {
      duplicates.push({ role, paths: list.map((item) => item.path) })
      continue
    }
    const hit = list[0]!
    files.push({ role, path: hit.path, name: hit.name || basename(hit.path) })
  }

  const missingRoles: LedgerRole[] = []
  const missingOptional: LedgerRole[] = []
  for (const role of LEDGER_ROLES) {
    if (byRole.has(role)) continue
    if (OPTIONAL_LEDGER_ROLES.includes(role)) {
      missingOptional.push(role)
      continue
    }
    missingRoles.push(role)
  }

  const blocked = duplicates.length > 0 || missingRoles.length > 0 || invalid.length > 0
  return {
    kind: blocked ? 'blocked' : 'ok',
    files,
    missingOptional,
    duplicates,
    missingRoles,
    unrecognized,
    invalid,
  }
}

export function validateRootPath(rootPath: string): string | null {
  const trimmed = rootPath.trim()
  if (trimmed.includes('..')) {
    return '目录路径不能包含 ..'
  }
  if (/^[a-zA-Z]:/.test(trimmed) || trimmed.startsWith('\\\\')) {
    return '请使用共享盘内的相对路径'
  }
  return null
}

export function normalizeRootPath(rootPath: string): string {
  return rootPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

export interface MatchLedgerFilesOptions {
  /** 不限制搜索范围，仅在重名时优先所列目录下的副本 */
  preferRootPaths?: string[]
}

export function matchLedgerFiles(hits: SearchHit[], options?: MatchLedgerFilesOptions): MatchFilesResult {
  const preferRootPaths = options?.preferRootPaths
  const byRole = new Map<LedgerRole, SearchHit[]>()

  for (const hit of hits) {
    const name = hit.name || basename(hit.path)
    const role = matchRole(name)
    if (!role) continue
    const list = byRole.get(role) ?? []
    list.push({ ...hit, name })
    byRole.set(role, list)
  }

  const conflicts: Array<{ role: LedgerRole; paths: string[] }> = []
  for (const [role, list] of byRole) {
    if (list.length > 1) {
      const preferred = pickPreferredHit(list, preferRootPaths)
      if (preferred) {
        byRole.set(role, [preferred])
        continue
      }
      conflicts.push({ role, paths: list.map((item) => item.path) })
    }
  }
  if (conflicts.length > 0) {
    const lines = conflicts.map(
      (item) => `${item.role}：${item.paths.join('、')}`,
    )
    return {
      kind: 'reject',
      message: `以下台账存在多条匹配文件：${lines.join('；')}`,
      conflicts,
    }
  }

  const missing: string[] = []
  const missingOptional: LedgerRole[] = []
  for (const role of LEDGER_ROLES) {
    if (byRole.has(role)) continue
    if (OPTIONAL_LEDGER_ROLES.includes(role)) {
      missingOptional.push(role)
      continue
    }
    missing.push(role)
  }
  if (missing.length > 0) {
    const rootHint = preferRootPaths?.length
      ? `已在全共享盘搜索；若仍缺项，请确认共享盘内是否存在对应 Excel，或检查 data-hub 检索是否命中。`
      : `请确认共享盘内文件名与规格一致（如「100394-003首巡检报告.xls」「2026年注塑车间品质履历表.xlsx」）。`
    return {
      kind: 'reject',
      message: `缺少必需台账文件（角色：${missing.join('、')}）。${rootHint}`,
    }
  }

  const files: MatchedFile[] = []
  for (const [role, list] of byRole) {
    const hit = list[0]!
    files.push({ role, path: hit.path, name: hit.name || basename(hit.path) })
  }

  return { kind: 'ok', files, missingOptional }
}