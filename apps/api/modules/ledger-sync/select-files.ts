export const MAX_LEDGER_CANDIDATES = 2000

export interface FileCandidate {
  path: string
  name: string
}

export interface ApplyExclusionsInput {
  selectedDirectories: string[]
  pinnedFiles: string[]
  excludedPaths: string[]
}

function compareKey(path: string): string {
  return normalizeLedgerPath(path).toLowerCase()
}

export function normalizeLedgerPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

export function validateEntryPath(path: string, kind: 'directory' | 'file'): string | null {
  const trimmed = path.trim()
  if (kind === 'file' && !trimmed) {
    return '文件路径不能为空'
  }
  if (trimmed.includes('..')) {
    return '路径不能包含 ..'
  }
  if (/^[a-zA-Z]:/.test(trimmed) || trimmed.startsWith('\\\\')) {
    return '请使用共享盘内的相对路径'
  }
  return null
}

export function isUnderPath(child: string, parent: string): boolean {
  const childKey = compareKey(child)
  const parentKey = compareKey(parent)
  if (!parentKey) {
    return true
  }
  return childKey === parentKey || childKey.startsWith(`${parentKey}/`)
}

function isExclusionInScope(
  excludedPath: string,
  selectedDirectories: string[],
  pinnedFiles: string[],
): boolean {
  const normalized = normalizeLedgerPath(excludedPath)
  for (const directory of selectedDirectories) {
    if (
      isUnderPath(normalized, directory) ||
      isUnderPath(directory, normalized) ||
      compareKey(normalized) === compareKey(directory)
    ) {
      return true
    }
  }
  for (const file of pinnedFiles) {
    if (
      compareKey(normalized) === compareKey(file) ||
      isUnderPath(file, normalized) ||
      isUnderPath(normalized, file)
    ) {
      return true
    }
  }
  return false
}

function isExcludedPath(
  candidatePath: string,
  excludedPath: string,
): boolean {
  const candidateKey = compareKey(candidatePath)
  const excludedKey = compareKey(excludedPath)
  return candidateKey === excludedKey || isUnderPath(candidatePath, excludedPath)
}

export function dedupeCandidates(candidates: FileCandidate[]): FileCandidate[] {
  const seen = new Set<string>()
  const output: FileCandidate[] = []
  for (const item of candidates) {
    const key = compareKey(item.path)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    output.push({
      path: normalizeLedgerPath(item.path),
      name: item.name,
    })
  }
  return output
}

export function assertCandidateLimit(candidates: FileCandidate[]): void {
  if (candidates.length > MAX_LEDGER_CANDIDATES) {
    throw new Error(`选中文件超过 ${MAX_LEDGER_CANDIDATES} 个，请缩小选择范围`)
  }
}

export function applyExclusions(
  candidates: FileCandidate[],
  input: ApplyExclusionsInput,
): { active: FileCandidate[]; excluded: FileCandidate[] } {
  const scopedExcluded = input.excludedPaths.filter((path) =>
    isExclusionInScope(path, input.selectedDirectories, input.pinnedFiles),
  )
  const pinned = new Set(input.pinnedFiles.map((path) => compareKey(path)))
  const active: FileCandidate[] = []
  const excluded: FileCandidate[] = []

  for (const candidate of candidates) {
    const key = compareKey(candidate.path)
    if (pinned.has(key)) {
      active.push(candidate)
      continue
    }
    const hit = scopedExcluded.some((path) => isExcludedPath(candidate.path, path))
    if (hit) {
      excluded.push(candidate)
      continue
    }
    active.push(candidate)
  }

  return { active, excluded }
}