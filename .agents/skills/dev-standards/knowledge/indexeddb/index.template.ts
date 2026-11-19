/** 拷贝为 src/db/index.ts，按实际 cache 模块导出 */
export { APP_MOBILE_DB_NAME, resetAppMobileDatabase } from '@/db/connection';
export {
  applyCachedListSnapshot,
  clearListSnapshot,
  isListCacheFresh,
  LIST_CACHE_TTL_MS,
  readListSnapshot,
  saveListSnapshot,
} from '@/db/list-cache';
export type { CachedListSnapshot } from '@/db/types';
