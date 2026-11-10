import { monthOf, pct, shortDept } from './format'
import type { ComplaintRecord } from './types'
import { MONTHS } from './workshops'

export const COMPLAINT_CAUSE_TAGS: [string, string[]][] = [
  ['模具', ['模具', '修模', '进胶', '顶针', '滑块', '模温', '拆铜', '抛光', '氮化', '烧模', '披风', 'R角', '孔针', '渣包', '浇口', '模', '毛边', '水口', '走胶', '拉丝', '包胶', '嵌件', '磨损', '尺寸', '偏']],
  ['调机/参数', ['调机', '参数', '温度', '压力', '速度', '烘烤', '烘料', '工艺', '二速', '堵射嘴', '缩水', '调', '流纹', '打不满', '未打满', '缺胶']],
  ['人员作业', ['员工', '培训', '没有按要求', '未按', '人为', '包装工', '枪手', '物料员', '打磨', '修刮', '作业', '疏忽', '代替', '漏加工']],
  ['来料/材料', ['来料', '原料', '材质', '批次', '色差', '油漆', '油墨', '厂家', '材料', '本色', '杂质', '委外', '电镀', '油']],
  ['夹治具', ['治具', '夹头', '装夹', '定位', '挂具', '夹具', '夹', '压伤']],
  ['设备', ['机器', '机床', '设备', '冷干机', '机电', '故障', '异常']],
  ['图纸/开发', ['图纸', '开发', '设变', 'BOM', '编程', '版本', '未及时发行', '承认', '不符']],
  ['检验/管理', ['首件', '特采', '确认', '漏检', '全检', '混料', '标识', '尾缀', '管理', '追踪', '计划', '赶急', '试装', '验证', '手感']],
]

export function cmpCauseTag(text: unknown): string {
  const s = String(text || '')
  for (const [name, keys] of COMPLAINT_CAUSE_TAGS) {
    if (keys.some((k) => s.includes(k))) return name
  }
  return '其他'
}

/** 投诉来源部门：谁在投诉。BC / LP 下的产线、铆接、附件归并到主部门 */
export function cmpSourceKey(from: unknown): string {
  const t = String(from || '').trim()
  if (!t) return '未填写'
  if (/^BC/.test(t)) return 'BC'
  if (/^LP/.test(t)) return 'LP'
  return t
}

export function isClosed(c: ComplaintRecord): boolean {
  return !!c.actClose
}

export interface CmpStats {
  total: number
  replyRate: number
  replyDone: number
  dispRate: number
  dispDone: number
  closeRate: number
  closeOnTime: number
  closed: number
  repeat: number
  overdue: number
}

export function cmpStats(list: ComplaintRecord[]): CmpStats {
  const reply = list.filter((c) => c.ontimeReply === '是' || c.ontimeReply === '否')
  const disp = list.filter((c) => c.ontimeDisp === '是' || c.ontimeDisp === '否')
  const close = list.filter((c) => c.ontimeClose === '是' || c.ontimeClose === '否')
  const closed = list.filter(isClosed)
  return {
    total: list.length,
    replyRate: pct(reply.filter((c) => c.ontimeReply === '是').length, reply.length),
    replyDone: pct(list.filter((c) => c.actReply).length, list.length),
    dispRate: pct(disp.filter((c) => c.ontimeDisp === '是').length, disp.length),
    dispDone: pct(list.filter((c) => c.actDisp).length, list.length),
    closeRate: pct(closed.length, list.length),
    closeOnTime: pct(close.filter((c) => c.ontimeClose === '是').length, close.length),
    closed: closed.length,
    repeat: list.filter((c) => c.repeat === '是').length,
    overdue: list.filter((c) => !isClosed(c)).length,
  }
}

export interface CmpBucket {
  label: string
  value: number
}

export function cmpCauseDistribution(list: ComplaintRecord[]): CmpBucket[] {
  const map: Record<string, number> = {}
  list.forEach((c) => {
    const t = cmpCauseTag(c.cause)
    map[t] = (map[t] || 0) + 1
  })
  return Object.keys(map)
    .map((label) => ({ label, value: map[label] }))
    .sort((a, b) => b.value - a.value)
}

export function cmpSourceDistribution(list: ComplaintRecord[]): CmpBucket[] {
  const map: Record<string, number> = {}
  list.forEach((c) => {
    const k = cmpSourceKey(c.from)
    map[k] = (map[k] || 0) + 1
  })
  return Object.keys(map)
    .map((label) => ({ label, value: map[label] }))
    .sort((a, b) => b.value - a.value)
}

export interface CmpOwnerLoad {
  label: string
  value: number
  open: number
}

export function cmpOwnerLoad(list: ComplaintRecord[]): CmpOwnerLoad[] {
  const map: Record<string, { n: number; open: number }> = {}
  list.forEach((c) => {
    const k = c.owner || '未指派'
    const o = map[k] || (map[k] = { n: 0, open: 0 })
    o.n++
    if (!isClosed(c)) o.open++
  })
  return Object.keys(map)
    .map((label) => ({ label, value: map[label].n, open: map[label].open }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)
}

export function cmpMonthlyTrend(
  list: ComplaintRecord[],
  key: string,
  months: readonly number[] = MONTHS
): number[] {
  return months.map(
    (m) =>
      list.filter((c) => shortDept(c.dept) === key && monthOf(c.date) === m).length
  )
}
