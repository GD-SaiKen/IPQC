/**
 * 拷贝为 src/db/types.ts，按领域改 ListItem、store 名。
 * 示例：列表示快照，键 userId。
 */
import type { DBSchema } from 'idb';

/** 与 API 列表项一致或子集 */
export interface ListItem {
  id: number;
  url: string;
}

export interface CachedListSnapshot {
  userId: number;
  items: ListItem[];
  total: number;
  page: number;
  savedAt: number;
}

export interface AppMobileDB extends DBSchema {
  listSnapshots: {
    key: number;
    value: CachedListSnapshot;
  };
}

export type AppMobileCacheStore = keyof AppMobileDB;
