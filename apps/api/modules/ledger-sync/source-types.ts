/**
 * @file 共享盘台账来源类型
 * @description 定向读取、解析和写入共用的事实与来源契约。
 * @author Codex
 * @date 2026-11-23
 */

import type { SourceKeyTable } from '../ledger/source-key'
import type { LedgerRole, LedgerTemplate } from './ledger-roles'

export const SOURCE_PARSER_VERSION = 'real-ledger-v1'

export interface SourceRef {
  shareId: string
  path: string
  sheet: string
  row: number
  region: string
  parserVersion: string
}

export interface SourceDiagnostic {
  source: SourceRef
  code: string
  message: string
}

export interface SourceSelection {
  path: string
  kind: 'file' | 'directory'
  role?: LedgerRole
  template?: LedgerTemplate
}

export interface SheetPlan {
  name: string
  template: string
  regions: string[]
  year: number
  workshop?: string
}

export interface ParsedSourceRow {
  table: SourceKeyTable | 'fqcInspection' | 'checkScore'
  fields: Record<string, unknown>
  source: SourceRef
  identity: string
}

export interface ParsedFileResult {
  rows: ParsedSourceRow[]
  diagnostics: SourceDiagnostic[]
  declaredRows: number
  readRows: number
  validRows: number
  skippedRows: number
}
