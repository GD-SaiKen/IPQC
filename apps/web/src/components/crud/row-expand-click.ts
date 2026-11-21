/** 行点击是否应触发展开/折叠（排除操作列、展开列与可交互单元格） */

/**
 * 命中即视为「单元格内的交互元素」，行点击不再冒泡成展开。
 * 业务项目可在使用方追加自己的 class，例如 `.jump-link`。
 */
const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'label',
  '.el-button',
  '.el-dropdown',
  '.el-image',
  '.el-link',
  '.el-checkbox',
  '.el-switch',
  '.el-radio',
  '.is-clickable',
  '[data-stop-row-expand]',
].join(', ')

export function isInteractiveTableClick(event: Event): boolean {
  const target = event.target
  if (!(target instanceof Element)) return false
  return !!target.closest(INTERACTIVE_SELECTOR)
}

export function shouldToggleRowExpand(column: { type?: string } | undefined, event: Event): boolean {
  const colType = column?.type
  if (colType === 'expand' || colType === 'selection' || colType === 'action') return false
  return !isInteractiveTableClick(event)
}
