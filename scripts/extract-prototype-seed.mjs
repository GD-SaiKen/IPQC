/**
 * 从 docs/原型 HTML 抽取种子常量，写入 apps/web/src/fixtures/
 * 运行：node scripts/extract-prototype-seed.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = fs.readFileSync(
  path.join(root, 'docs/原型/IPQC智能工作台1-2026-11-5.html'),
  'utf8'
)

function sliceBetween(startMarker, endMarker) {
  const a = html.indexOf(startMarker)
  const b = html.indexOf(endMarker, a + startMarker.length)
  if (a < 0 || b < 0) {
    throw new Error(`markers not found: ${startMarker} … ${endMarker}`)
  }
  let s = html.slice(a + startMarker.length, b).trim()
  if (s.endsWith(';')) s = s.slice(0, -1)
  return Function(`return ${s}`)()
}

const outDir = path.join(root, 'apps/web/src/fixtures/raw')
fs.mkdirSync(outDir, { recursive: true })

const writes = [
  ['real.json', () => sliceBetween('const REAL = ', '\nconst FQCS = ')],
  ['fqcs.json', () => sliceBetween('const FQCS = ', '\nconst FQC = ')],
  [
    'fqc-keys.json',
    () => {
      const m = html.match(/const FQC_KEYS = (\[[^\]]+\]);/)
      if (!m) throw new Error('FQC_KEYS regex failed')
      return JSON.parse(m[1])
    },
  ],
  ['training-materials.json', () => sliceBetween('const TRAINING_MATERIALS = ', '\nconst TRAINING_RECORDS = ')],
  ['training-records.json', () => sliceBetween('const TRAINING_RECORDS = ', '\nconst TRAINING_EXAMS = ')],
  ['training-exams.json', () => sliceBetween('const TRAINING_EXAMS = ', '\nconst SKILL_MATRIX = ')],
  ['skill-matrix.json', () => sliceBetween('const SKILL_MATRIX = ', '\nconst PERF_RULES = ')],
  ['roster.json', () => sliceBetween('const ROSTER = ', '\nconst ITEM_POOL = ')],
  ['item-pool.json', () => sliceBetween('const ITEM_POOL = ', '\nconst CHECK_ITEMS = ')],
  ['actions.json', () => sliceBetween('const ACTIONS = ', '\nconst COMPLAINT_CAUSE_TAGS = ')],
]

for (const [file, load] of writes) {
  const data = load()
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(data))
  console.log('wrote', file)
}
