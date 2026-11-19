import { computed, ref } from 'vue'

export const keyboardInset = ref(0)
/** 键盘是否占用可视区（与 bottom 抬升量解耦：resizes-content 时抬升为 0 但仍为 true） */
export const keyboardVisible = ref(false)
export const viewportOffsetTop = ref(0)
export const viewportHeight = ref(
  typeof window !== 'undefined' ? window.innerHeight : 0,
)

/** 键盘收起后记录的最大布局高度，用于 resizes-content 类浏览器 */
let stableLayoutHeight =
  typeof window !== 'undefined' ? window.innerHeight : 0

const SHRINK_THRESHOLD_PX = 48

/** 测试/文档用：曾用于 overlays-content 预估，现仅保留常量避免外部引用断裂 */
export const COMPOSER_KEYBOARD_ESTIMATE_RATIO = 0.42

let minLayoutHeightWhileKeyboardOpen = Number.POSITIVE_INFINITY

export const keyboardOpen = computed(() => keyboardVisible.value)

export function isChatComposerInputFocused() {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return false
  return Boolean(el.closest('[data-testid="chat-input"]'))
}

export function configureVirtualKeyboardForResize() {
  if (typeof navigator === 'undefined') return
  const vk = (navigator as Navigator & { virtualKeyboard?: { overlaysContent: boolean } })
    .virtualKeyboard
  if (vk && 'overlaysContent' in vk) {
    vk.overlaysContent = false
  }
}

/** viewport meta 使用 interactive-widget=resizes-content 时，布局高度已随键盘收缩，无需再抬 fixed 底栏 */
export function isLayoutViewportResizedForKeyboard(metrics: KeyboardViewportMetrics) {
  return metrics.shrinkFromStable >= SHRINK_THRESHOLD_PX && metrics.shrink < SHRINK_THRESHOLD_PX
}

export function isKeyboardVisible(metrics: KeyboardViewportMetrics) {
  return (
    metrics.shrink >= SHRINK_THRESHOLD_PX
    || metrics.shrinkFromStable >= SHRINK_THRESHOLD_PX
    || metrics.inset >= SHRINK_THRESHOLD_PX
  )
}

export function measureKeyboardInsetFromMetrics(metrics: KeyboardViewportMetrics) {
  if (isLayoutViewportResizedForKeyboard(metrics)) return 0

  if (metrics.inset >= SHRINK_THRESHOLD_PX) return metrics.inset

  const shrinkFallback = Math.max(
    metrics.shrink >= SHRINK_THRESHOLD_PX ? metrics.shrink : 0,
    metrics.shrinkFromStable >= SHRINK_THRESHOLD_PX ? metrics.shrinkFromStable : 0,
  )
  if (shrinkFallback >= SHRINK_THRESHOLD_PX) return shrinkFallback

  return metrics.inset
}

/** @deprecated 预估抬升已移除，保留供 composer-dock 在失焦时调用 */
export function resetComposerKeyboardLiftState() {
  minLayoutHeightWhileKeyboardOpen = Number.POSITIVE_INFINITY
}

export type KeyboardViewportMetrics = {
  inset: number
  top: number
  height: number
  shrink: number
  shrinkFromStable: number
}

function reconcileStaleVisualViewport(
  layoutHeight: number,
  viewportHeight: number,
  offsetTop: number,
) {
  const vvLooksLikeKeyboard = layoutHeight - viewportHeight >= SHRINK_THRESHOLD_PX
  const layoutRecoveredFromShrink = Number.isFinite(minLayoutHeightWhileKeyboardOpen)
    && layoutHeight > minLayoutHeightWhileKeyboardOpen + 16
  if (layoutRecoveredFromShrink && vvLooksLikeKeyboard) {
    return { height: layoutHeight, top: 0 }
  }
  return { height: viewportHeight, top: offsetTop }
}

export function readKeyboardViewport(): KeyboardViewportMetrics {
  const layoutHeight = window.innerHeight
  const viewport = window.visualViewport
  if (!viewport) {
    return {
      inset: 0,
      top: 0,
      height: layoutHeight,
      shrink: 0,
      shrinkFromStable: 0,
    }
  }

  const reconciled = reconcileStaleVisualViewport(
    layoutHeight,
    viewport.height,
    viewport.offsetTop,
  )
  const height = reconciled.height
  let top = reconciled.top
  const shrink = Math.max(0, Math.round(layoutHeight - height))
  const shrinkFromStable = Math.max(0, Math.round(stableLayoutHeight - height))

  if (shrink < SHRINK_THRESHOLD_PX && shrinkFromStable < SHRINK_THRESHOLD_PX) {
    top = 0
  }

  const insetFromOffset = Math.max(0, Math.round(layoutHeight - height - top))

  const inset = Math.max(
    insetFromOffset,
    shrink >= SHRINK_THRESHOLD_PX ? shrink : 0,
    shrinkFromStable >= SHRINK_THRESHOLD_PX ? shrinkFromStable : 0,
  )

  return {
    inset,
    top,
    height,
    shrink,
    shrinkFromStable,
  }
}

export function resolveKeyboardOverlap(_inputFocused = false) {
  const metrics = readKeyboardViewport()
  return measureKeyboardInsetFromMetrics(metrics)
}

function syncLayoutHeightCss() {
  const h = window.innerHeight
  document.documentElement.style.setProperty('--layout-height', `${h}px`)
}

function trackLayoutHeightDuringKeyboard(inset: number) {
  if (inset < SHRINK_THRESHOLD_PX) return
  minLayoutHeightWhileKeyboardOpen = Math.min(minLayoutHeightWhileKeyboardOpen, window.innerHeight)
}

function resetDocumentScrollAfterKeyboardDismiss(previousInset: number, inset: number) {
  if (previousInset < SHRINK_THRESHOLD_PX || inset >= SHRINK_THRESHOLD_PX) return
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function updateKeyboardViewport() {
  const previousInset = keyboardInset.value
  const metrics = readKeyboardViewport()
  const inset = measureKeyboardInsetFromMetrics(metrics)
  const visible = isKeyboardVisible(metrics)

  if (!visible) {
    stableLayoutHeight = Math.max(stableLayoutHeight, window.innerHeight)
    minLayoutHeightWhileKeyboardOpen = Number.POSITIVE_INFINITY
  } else {
    trackLayoutHeightDuringKeyboard(Math.max(inset, SHRINK_THRESHOLD_PX))
  }

  resetDocumentScrollAfterKeyboardDismiss(previousInset, visible ? Math.max(inset, SHRINK_THRESHOLD_PX) : inset)
  syncLayoutHeightCss()

  keyboardInset.value = inset
  keyboardVisible.value = visible
  viewportOffsetTop.value = metrics.top
  viewportHeight.value = metrics.height
  document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`)
  document.documentElement.classList.toggle('keyboard-open', visible)
}

function resetStableLayoutHeight() {
  stableLayoutHeight = window.innerHeight
  minLayoutHeightWhileKeyboardOpen = Number.POSITIVE_INFINITY
  updateKeyboardViewport()
}

let listenerCount = 0
let virtualKeyboardBound = false

function onViewportChange() {
  updateKeyboardViewport()
}

function onVirtualKeyboardGeometryChange() {
  scheduleKeyboardViewportSync()
}

function bindVirtualKeyboardListener() {
  if (virtualKeyboardBound || typeof navigator === 'undefined') return
  const vk = (navigator as Navigator & { virtualKeyboard?: { addEventListener: Function } })
    .virtualKeyboard
  if (!vk?.addEventListener) return
  vk.addEventListener('geometrychange', onVirtualKeyboardGeometryChange)
  virtualKeyboardBound = true
}

function unbindVirtualKeyboardListener() {
  if (!virtualKeyboardBound || typeof navigator === 'undefined') return
  const vk = (navigator as Navigator & { virtualKeyboard?: { removeEventListener: Function } })
    .virtualKeyboard
  vk?.removeEventListener?.('geometrychange', onVirtualKeyboardGeometryChange)
  virtualKeyboardBound = false
}

export function bindKeyboardViewportListeners() {
  configureVirtualKeyboardForResize()
  if (listenerCount === 0) {
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('orientationchange', resetStableLayoutHeight)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    bindVirtualKeyboardListener()
  }
  listenerCount += 1
  stableLayoutHeight = Math.max(stableLayoutHeight, window.innerHeight)
  syncLayoutHeightCss()
  updateKeyboardViewport()
}

export function unbindKeyboardViewportListeners() {
  if (listenerCount === 0) return
  listenerCount -= 1
  if (listenerCount > 0) return

  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('orientationchange', resetStableLayoutHeight)
  window.visualViewport?.removeEventListener('resize', onViewportChange)
  window.visualViewport?.removeEventListener('scroll', onViewportChange)
  unbindVirtualKeyboardListener()

  keyboardInset.value = 0
  keyboardVisible.value = false
  viewportOffsetTop.value = 0
  viewportHeight.value = window.innerHeight
  minLayoutHeightWhileKeyboardOpen = Number.POSITIVE_INFINITY
  document.documentElement.style.setProperty('--keyboard-inset', '0px')
  document.documentElement.style.removeProperty('--layout-height')
  document.documentElement.classList.remove('keyboard-open')
}

export function scheduleKeyboardViewportSync() {
  updateKeyboardViewport()
  requestAnimationFrame(updateKeyboardViewport)
  window.setTimeout(updateKeyboardViewport, 50)
  window.setTimeout(updateKeyboardViewport, 180)
  window.setTimeout(updateKeyboardViewport, 400)
}

/** 测试用：重置稳定高度基线 */
export function __resetKeyboardViewportStateForTests(layoutHeight = window.innerHeight) {
  stableLayoutHeight = layoutHeight
  keyboardInset.value = 0
  keyboardVisible.value = false
  viewportOffsetTop.value = 0
  viewportHeight.value = layoutHeight
  minLayoutHeightWhileKeyboardOpen = Number.POSITIVE_INFINITY
}
