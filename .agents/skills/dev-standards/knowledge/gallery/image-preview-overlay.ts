/** 全屏看图：压入 overlay 返回栈，系统返回先关预览而非离开当前 Tab 页（对齐通知详情 Popup）。 */

import { showImagePreview, type ImagePreviewInstance, type ImagePreviewOptions } from 'vant';

import { registerOverlayBack, unregisterOverlayBack } from '@/utils/overlay-back-stack';

type PreviewController = ImagePreviewInstance & { close: () => void };

const VERTICAL_SWIPE_MIN_PX = 48;
const VERTICAL_SWIPE_DOMINANCE = 1.25;

function bindPreviewVerticalSwitch(preview: ImagePreviewInstance): () => void {
  const root = document.querySelector('.van-image-preview');
  if (!root) return () => {};

  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onStart: EventListener = (event) => {
    const touchEvent = event as TouchEvent;
    if (touchEvent.touches.length !== 1) {
      tracking = false;
      return;
    }
    startX = touchEvent.touches[0].clientX;
    startY = touchEvent.touches[0].clientY;
    tracking = true;
  };

  const onEnd: EventListener = (event) => {
    if (!tracking) return;
    tracking = false;
    const touchEvent = event as TouchEvent;
    const touch = touchEvent.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dy) < VERTICAL_SWIPE_MIN_PX) return;
    if (Math.abs(dy) < Math.abs(dx) * VERTICAL_SWIPE_DOMINANCE) return;
    if (dy < 0) preview.next();
    else preview.prev();
  };

  root.addEventListener('touchstart', onStart, { passive: true, capture: true });
  root.addEventListener('touchend', onEnd, { passive: true, capture: true });

  return () => {
    root.removeEventListener('touchstart', onStart, true);
    root.removeEventListener('touchend', onEnd, true);
  };
}

export function openImagePreviewWithOverlayBack(
  options: string[] | ImagePreviewOptions,
  startPosition = 0,
) {
  let entryId: number | null = null;
  let disposeVerticalSwipe: (() => void) | undefined;

  const base: ImagePreviewOptions = Array.isArray(options)
    ? { images: options, startPosition }
    : options;

  const userOnClose = base.onClose;
  const imageCount = base.images?.length ?? 0;

  const preview = showImagePreview({
    ...base,
    closeOnPopstate: false,
    onClose: () => {
      disposeVerticalSwipe?.();
      disposeVerticalSwipe = undefined;
      if (entryId !== null) {
        const id = entryId;
        entryId = null;
        unregisterOverlayBack(id);
      }
      userOnClose?.();
    },
  }) as PreviewController;

  if (imageCount > 1) {
    requestAnimationFrame(() => {
      disposeVerticalSwipe = bindPreviewVerticalSwitch(preview);
    });
  }

  entryId = registerOverlayBack(() => {
    preview.close();
  });

  return preview as PreviewController;
}
