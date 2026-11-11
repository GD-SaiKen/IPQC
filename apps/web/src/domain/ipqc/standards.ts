import stdIndexJson from '@/fixtures/raw/std-index.json'

export interface StdItem {
  n: string
  p: string
  e: string
  t: string
  c: string
}

export const STD_ROOT = 'D:/AI文件夹'
export const STD_INDEX = stdIndexJson as StdItem[]

export const STD_TYPES: [string, string][] = [
  ['全部', ''],
  ['Excel', 'excel'],
  ['Word', 'word'],
  ['CAD', 'cad'],
  ['图片', 'image'],
]

export const STD_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  excel: { label: 'Excel', color: '#0f9d58', bg: '#e8f6ee' },
  word: { label: 'Word', color: '#2563eb', bg: '#eaf0ff' },
  cad: { label: 'CAD', color: '#7c3aed', bg: '#f3ecfe' },
  image: { label: '图片', color: '#0d9488', bg: '#e6f6f4' },
}

export interface StdQuery {
  q?: string
  t?: string
  c?: string
}

export function stdFiltered(query: StdQuery, list: StdItem[] = STD_INDEX): StdItem[] {
  const q = String(query.q || '').trim().toLowerCase()
  return list.filter((it) => {
    if (query.t && it.t !== query.t) return false
    if (query.c && it.c !== query.c) return false
    if (!q) return true
    return `${it.n} ${it.p} ${it.c} ${it.t || ''}`.toLowerCase().includes(q)
  })
}

export function stdCats(list: StdItem[] = STD_INDEX): { c: string; n: number }[] {
  const map: Record<string, number> = {}
  list.forEach((it) => {
    map[it.c] = (map[it.c] || 0) + 1
  })
  return Object.keys(map)
    .map((c) => ({ c, n: map[c] }))
    .sort((a, b) => b.n - a.n)
}

export function stdPath(it: StdItem): string {
  return `${STD_ROOT}/${it.p}`
}

export function stdUrl(it: StdItem): string {
  return `file:///${encodeURI(stdPath(it))}`
}

/** 浏览器可直接预览的类型：图片；其余（Excel / Word / CAD）只复制路径到本机打开 */
export function stdPreviewable(it: StdItem): boolean {
  return it.t === 'image'
}
