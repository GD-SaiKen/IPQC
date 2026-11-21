import {
  LEDGER_ROLES,
  LEDGER_ROLE_LABELS,
  OPTIONAL_LEDGER_ROLES,
  TEMPLATE_BY_ROLE,
  type LedgerRole,
  type LedgerTemplate,
} from './ledger-roles'

export interface LedgerBinding {
  role: LedgerRole
  path: string
  template: LedgerTemplate
  name: string
}

export interface BindingIssue {
  type: 'duplicate' | 'invalid'
  message: string
  role?: LedgerRole
  paths?: string[]
}

export interface ParseBindingsResult {
  bindings: LedgerBinding[]
  issues: BindingIssue[]
  missingRoles: LedgerRole[]
}

export interface BindingEntry {
  path: string
  kind: 'directory' | 'file'
  role?: string
  template?: string
}

function basename(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? path
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export function isLedgerRole(value: string): value is LedgerRole {
  return (LEDGER_ROLES as readonly string[]).includes(value)
}

export function parseLedgerBindings(entries: BindingEntry[]): ParseBindingsResult {
  const issues: BindingIssue[] = []
  const bindings: LedgerBinding[] = []
  const byRole = new Map<LedgerRole, LedgerBinding[]>()

  for (const entry of entries) {
    const path = normalizePath(entry.path)
    if (!path || path.includes('..')) {
      issues.push({ type: 'invalid', message: '绑定路径无效', paths: [entry.path] })
      continue
    }
    if (entry.kind === 'directory') {
      issues.push({
        type: 'invalid',
        message: '目录不能作为台账绑定，请勾选单个文件并指定角色',
        paths: [path],
      })
      continue
    }
    if (!entry.role || !isLedgerRole(entry.role)) {
      issues.push({
        type: 'invalid',
        message: `请为文件指定台账角色：${basename(path)}`,
        paths: [path],
      })
      continue
    }
    const template = TEMPLATE_BY_ROLE[entry.role]
    if (entry.template && entry.template !== template) {
      issues.push({
        type: 'invalid',
        message: `${LEDGER_ROLE_LABELS[entry.role]} 的列模板必须是 ${template}`,
        role: entry.role,
        paths: [path],
      })
      continue
    }
    const binding: LedgerBinding = {
      role: entry.role,
      path,
      template,
      name: basename(path),
    }
    const list = byRole.get(entry.role) ?? []
    list.push(binding)
    byRole.set(entry.role, list)
  }

  for (const [role, list] of byRole) {
    if (list.length > 1) {
      issues.push({
        type: 'duplicate',
        role,
        message: `${LEDGER_ROLE_LABELS[role]} 绑定了多个文件`,
        paths: list.map((item) => item.path),
      })
      continue
    }
    bindings.push(list[0]!)
  }

  const missingRoles = LEDGER_ROLES.filter(
    (role) => !byRole.has(role) && !OPTIONAL_LEDGER_ROLES.includes(role),
  )

  return { bindings, issues, missingRoles }
}
