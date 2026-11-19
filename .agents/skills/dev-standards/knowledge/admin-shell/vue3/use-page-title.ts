// 页面标题（全局单例）。复制到 src/composables/use-page-title.ts
//
// 页面写、壳读，两者之间没有父子关系，所以只能是模块级单例。
// 已知取舍：多个页面同时存活（keep-alive）时后写入的会覆盖先写入的。
// 真要支持多标签缓存，得改成 Map<routeName, title>。

import { ref } from 'vue'

const pageTitle = ref('')

export function usePageTitle() {
  /** 页面卸载时必须传 '' 清空，否则回到上一页会挂着旧标题 */
  function setPageTitle(text: string): void {
    pageTitle.value = text
  }

  return { pageTitle, setPageTitle }
}
