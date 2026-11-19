// 列宽 / 对齐 / 固定的解析规则。没有任何 Vue 依赖，可原样复制。
// 核心思路：schema 只写业务含义，宽度和对齐由这里按优先级推断，页面不用逐列填 width。

import { actionButtonShowsIcon } from './action-button-icons'
import type { ColumnSchema } from './types'

/** 常用列宽（px）。按自己的业务改，改完全表生效 */
export const COL_WIDTH = {
  index: 56,
  selection: 50,
  /** 名称类列（如「项目」） */
  name: 148,
  /** 复合名称列（如「物料」：编号 + 品名两行） */
  compoundName: 200,
  /** 长文本列默认宽度 */
  longText: 240,
  /** 长文本列最小宽度 */
  longTextMin: 180,
  /** 纯日期 */
  date: 112,
  /** 日期 + 时分（含 4–6 字表头的余量） */
  dateTime: 168,
  dateTimeMin: 152,
  /** 状态 / 类型 类短枚举 */
  status: 100,
  /** 操作列最小宽度（表头「操作」+ 单个紧凑按钮）；列宽随内容撑开，不设固定 width */
  actionMin: 88,
  /** 兜底最小宽度 */
  text: 120,
  image: 100,
} as const

/**
 * 业务词表：**复制后先改这里**。
 * 只在「未显式配置 width / minWidth / align」时参与推断，配了显式值就完全以 schema 为准。
 */
export const BIZ_KEYWORDS = {
  /** 名称列：给固定宽度，避免长名称把表格撑爆 */
  name: ['项目', '名称'],
  /** 复合名称列：两行展示（编号 + 名称），给更宽的固定宽度 */
  compoundName: ['物料', '模具'],
  /** 长文本列：给 minWidth 并允许换行 / tooltip，让它吃掉剩余宽度 */
  longText: ['说明', '描述', '备注', '问题', '任务'],
  /** 短枚举列：状态、类型、轮次等，给固定小宽度 */
  status: ['状态', '类型', '轮次', '等级'],
  /** 时间类：表头命中即按时间列处理（type='date' 无需命中） */
  dateTime: ['时间', '日期', '交期'],
  /** 左对齐的 prop 兜底（表头没命中词表时再用） */
  leftAlignProps: ['name', 'title', 'desc', 'description', 'note', 'remark', 'task', 'content', 'result'],
} as const

export interface ResolvedColSizing {
  width?: string | number
  minWidth?: string | number
  className?: string
}

function normalizeLabel(label?: string): string {
  return label?.replace(/\s/g, '') ?? ''
}

function hit(label: string, words: readonly string[]): boolean {
  return words.some((w) => label.includes(w))
}

/** 操作列：type=action 或 label=操作 */
export function isActionColumn(col: ColumnSchema): boolean {
  return col.type === 'action' || normalizeLabel(col.label) === '操作'
}

/**
 * 列固定策略：
 * - fixed=false → 不固定（可覆盖操作列默认）
 * - fixed=true / 'left' → 左侧固定
 * - fixed='right' → 右侧固定
 * - 操作列未配置时默认右侧固定
 */
export function resolveColFixed(col: ColumnSchema): boolean | 'left' | 'right' | undefined {
  const { fixed } = col
  if (fixed === false) return undefined
  if (fixed === true || fixed === 'left') return 'left'
  if (fixed === 'right') return 'right'
  if (isActionColumn(col)) return 'right'
  return undefined
}

/** 是否为左对齐的业务文本列（对齐优先级：显式 align > 本函数 > 居中） */
export function isLeftAlignColumn(col: ColumnSchema): boolean {
  const n = normalizeLabel(col.label)
  if (n && hit(n, BIZ_KEYWORDS.name)) return true
  if (n && hit(n, BIZ_KEYWORDS.compoundName)) return true
  if (n && hit(n, BIZ_KEYWORDS.longText)) return true
  const prop = (col as { prop?: string }).prop
  return (BIZ_KEYWORDS.leftAlignProps as readonly string[]).includes(prop ?? '')
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value == null) return undefined
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(n) ? n : undefined
}

/** 日期 / 时间类列（type='date' 或表头命中时间词） */
export function isDateTimeColumn(col: ColumnSchema): boolean {
  if (col.type === 'date') return true
  return hit(normalizeLabel(col.label), BIZ_KEYWORDS.dateTime)
}

/** 可能多行展示的长文本列 */
export function isLongTextColumn(col: ColumnSchema): boolean {
  const n = normalizeLabel(col.label)
  if (n && hit(n, BIZ_KEYWORDS.longText)) return true
  const prop = (col as { prop?: string }).prop
  return (BIZ_KEYWORDS.leftAlignProps as readonly string[]).includes(prop ?? '')
}

function shouldFlexColumn(col: ColumnSchema): boolean {
  if (isActionColumn(col)) return false
  if (col.flex === false) return false
  if (col.flex === true) return true
  // 仅 minWidth、无 width → 弹性列，均分剩余宽度
  if (col.width == null && col.minWidth != null) return true
  return isLongTextColumn(col)
}

function estimateButtonHasIcon(btn: { label: string; icon?: unknown }): boolean {
  if (btn.icon === false) {
    return false
  }
  if (btn.icon === true || (btn.icon != null && btn.icon !== false)) {
    return true
  }
  return actionButtonShowsIcon({ label: btn.label })
}

/** type=action 列：按按钮文案估算宽度（图标 + 文字 link 按钮） */
export function estimateActionColMinWidth(
  buttons: { label: string; icon?: unknown }[],
  maxVisible = 3,
): number {
  const visible = buttons.slice(0, maxVisible)
  let w = 24 // 单元格左右留白
  visible.forEach((btn, i) => {
    if (i > 0) w += 4
    if (estimateButtonHasIcon(btn)) w += 16
    w += btn.label.length * 14
    w += 12
  })
  if (buttons.length > maxVisible) w += 52
  return Math.max(COL_WIDTH.actionMin, w)
}

/** 扫描全表各行可见按钮，取最宽一行作为操作列 width（minWidth 为下限） */
export function resolveActionColumnWidth(col: ColumnSchema, data: Record<string, any>[]): number {
  const sizing = resolveColSizing(col)
  const floor = toNumber(sizing.minWidth) ?? COL_WIDTH.actionMin
  if (!isActionColumn(col)) return floor

  let maxW = floor

  if (col.actionLabels) {
    for (const row of data) {
      const labels = col.actionLabels(row)
      if (!labels.length) continue
      maxW = Math.max(
        maxW,
        estimateActionColMinWidth(
          labels.map((label) => ({
            label,
            icon: actionButtonShowsIcon({ label }),
          })),
          labels.length,
        ),
      )
    }
    return maxW
  }

  if (col.type === 'action') {
    const actionCol = col as Extract<ColumnSchema, { type: 'action' }>
    const maxVisible = actionCol.maxVisible ?? 3
    const scan = data.length ? data : [null]
    for (const row of scan) {
      const buttons = row
        ? actionCol.buttons.filter((b) => !b.hidden?.(row))
        : actionCol.buttons
      maxW = Math.max(
        maxW,
        estimateActionColMinWidth(
          buttons.map((b) => ({
            label: b.label,
            icon: b.icon ?? actionButtonShowsIcon(b),
          })),
          maxVisible,
        ),
      )
    }
    return maxW
  }

  return floor
}

/**
 * 解析列宽，优先级：
 * 1. schema 显式 width / minWidth
 * 2. flex 规则（仅 minWidth 默认弹性；flex=false 时 minWidth 当固定宽）
 * 3. 时间列抬宽、操作列只给 minWidth
 * 4. 业务词表兜底
 */
export function resolveColSizing(col: ColumnSchema): ResolvedColSizing {
  const flex = shouldFlexColumn(col)
  let width = col.width
  let minWidth = col.minWidth
  const classNames: string[] = []
  if (col.className) classNames.push(col.className)

  // 显式禁止弹性：仅 minWidth → 固定为同宽
  if (col.flex === false && width == null && minWidth != null) {
    width = minWidth
  }

  // 时间列：表头 4–6 字 + YYYY-MM-DD HH:mm
  if (isDateTimeColumn(col) && !flex) {
    const w = toNumber(width)
    if (w == null || w < COL_WIDTH.dateTimeMin) {
      width = COL_WIDTH.dateTime
    }
    minWidth = minWidth ?? COL_WIDTH.dateTimeMin
  }

  // 操作列：不设固定 width，仅 minWidth 保底，列宽随按钮内容自然撑开
  if (isActionColumn(col)) {
    width = undefined
    if (minWidth == null) minWidth = COL_WIDTH.actionMin
  }

  if (width == null && minWidth == null) {
    const n = normalizeLabel(col.label)

    if (col.type === 'index') {
      width = COL_WIDTH.index
    } else if (col.type === 'selection') {
      width = COL_WIDTH.selection
    } else if (isActionColumn(col)) {
      minWidth = COL_WIDTH.actionMin
    } else if (col.type === 'image') {
      width = COL_WIDTH.image
    } else if (n && hit(n, BIZ_KEYWORDS.compoundName)) {
      width = COL_WIDTH.compoundName
      minWidth = 160
    } else if (n && hit(n, BIZ_KEYWORDS.name)) {
      width = COL_WIDTH.name
    } else if (isLongTextColumn(col)) {
      minWidth = COL_WIDTH.longTextMin
    } else if (n && hit(n, BIZ_KEYWORDS.status)) {
      width = COL_WIDTH.status
    } else if (isDateTimeColumn(col)) {
      width = COL_WIDTH.dateTime
      minWidth = COL_WIDTH.dateTimeMin
    } else {
      minWidth = COL_WIDTH.text
    }
  }

  return {
    width,
    minWidth,
    className: classNames.length ? classNames.join(' ') : undefined,
  }
}
