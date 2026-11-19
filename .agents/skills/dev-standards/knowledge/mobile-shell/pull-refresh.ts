import type { Ref } from 'vue'

const DEFAULT_MIN_VISIBLE_MS = 400

/** 保持 Vant PullRefresh 顶部 loading 至少可见一小段时间 */
export async function runPullRefresh(
  refreshing: Ref<boolean>,
  work: () => Promise<void>,
  minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
) {
  const started = Date.now()
  try {
    await work()
  } finally {
    const remain = minVisibleMs - (Date.now() - started)
    if (remain > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, remain)
      })
    }
    refreshing.value = false
  }
}
