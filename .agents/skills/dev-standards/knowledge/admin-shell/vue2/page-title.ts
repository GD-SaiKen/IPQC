// 页面标题（全局响应式单例）。复制到 src/domain/page-title.ts
//
// Vue 2 没有模块级 ref 的惯例写法，用 Vue.observable 造一个响应式容器：
// 页面写、壳读，两者之间没有父子关系。
// 已知取舍：多页面同时存活时后写入的会覆盖先写入的。

import Vue from 'vue'

export const pageTitleState = Vue.observable({ title: '' })

/** 页面卸载时必须传 '' 清空，否则回到上一页会挂着旧标题 */
export function setPageTitle(text: string): void {
  pageTitleState.title = text
}
