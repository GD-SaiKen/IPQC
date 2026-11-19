// 操作列按钮默认图标（Vue 3 + @element-plus/icons-vue）。
// 页面未传 icon 时按 label 精确匹配；传 icon: false 可关闭图标。

import type { Component } from 'vue'
import {
  CircleCheck,
  Connection,
  Delete,
  Edit,
  FolderOpened,
  SwitchButton,
  View,
} from '@element-plus/icons-vue'

import type { ActionButton } from './types'

/** 常用操作文案 → 图标（key 为 trim 后的 label） */
export const DEFAULT_ACTION_BUTTON_ICONS: Record<string, Component> = {
  查看: View,
  详情: View,
  浏览: FolderOpened,
  编辑: Edit,
  修改: Edit,
  删除: Delete,
  完成: CircleCheck,
  连接: Connection,
  断开连接: SwitchButton,
}

export function resolveActionButtonIcon(btn: ActionButton): Component | undefined {
  if (btn.icon === false) {
    return undefined
  }
  if (btn.icon) {
    return btn.icon
  }
  return DEFAULT_ACTION_BUTTON_ICONS[btn.label.trim()]
}

/** 列宽估算：该按钮是否会显示图标 */
export function actionButtonShowsIcon(btn: Pick<ActionButton, 'label' | 'icon'>): boolean {
  if (btn.icon === false) {
    return false
  }
  if (btn.icon) {
    return true
  }
  return Boolean(DEFAULT_ACTION_BUTTON_ICONS[btn.label.trim()])
}
