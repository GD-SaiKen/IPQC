/** 图库全屏预览：当前列表顺序 + 左右/上下切换。 */

import type { GalleryPhoto } from '@/api/gallery';
import { normalizeImageSrc } from '@/utils/attachment-url';
import { openImagePreviewWithOverlayBack } from '@/utils/image-preview-overlay';

export function openGalleryPhotoPreview(
  photos: readonly GalleryPhoto[],
  active: GalleryPhoto,
): ReturnType<typeof openImagePreviewWithOverlayBack> {
  const urls = photos.map((photo) => normalizeImageSrc(photo.url));
  const start = photos.findIndex((photo) => photo.id === active.id);
  return openImagePreviewWithOverlayBack({
    images: urls,
    startPosition: start >= 0 ? start : 0,
    loop: photos.length > 1,
    showIndex: photos.length > 1,
  });
}
