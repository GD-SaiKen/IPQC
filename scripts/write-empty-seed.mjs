/**
 * 将 apps/web/src/fixtures/raw 中的原型台账种子置为空结构（保留口径类 JSON）。
 * 运行：node scripts/write-empty-seed.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'apps/web/src/fixtures/raw')

const FQC_KEYS = ['注塑', '注塑毛边', '压铸', '五金', '涂装', '印刷']

function emptyMonth() {
  return Array.from({ length: 10 }, (_, i) => ({
    m: i + 1,
    lots: 0,
    samp: 0,
    ng: 0,
    bad: 0,
  }))
}

function emptyFqcBook(dept) {
  return {
    meta: {
      file: '',
      dept,
      name: dept,
      frm: '',
      to: '',
      lots: 0,
      samp: 0,
      ng: 0,
      bad: 0,
      recheck: 0,
      recheckOk: 0,
      recheckNg: 0,
      recheckBlank: 0,
      cats: [],
    },
    month: emptyMonth(),
    pareto: [],
    parts: [],
    whos: [],
    act: {},
    rows: [],
  }
}

const fqcs = Object.fromEntries(FQC_KEYS.map((k) => [k, emptyFqcBook(k)]))

const writes = {
  'real.json': {
    complaints: [],
    firstReal: [],
    finalInsp: [],
    perfRecords: [],
    checkScores: {},
    checkItemScores: {},
    checkDaily: {},
  },
  'fqcs.json': fqcs,
  'fqc-keys.json': FQC_KEYS,
  'training-materials.json': [],
  'training-records.json': [],
  'training-exams.json': [],
  'skill-matrix.json': [],
  'roster.json': {},
  'item-pool.json': {},
  'actions.json': [],
  'std-index.json': [],
}

fs.mkdirSync(outDir, { recursive: true })
for (const [name, data] of Object.entries(writes)) {
  const p = path.join(outDir, name)
  fs.writeFileSync(p, `${JSON.stringify(data)}\n`, 'utf8')
  console.log('wrote', name)
}