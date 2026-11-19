/**
 * 拷贝为 src/db/<domain>-cache.ts，替换 ListItem、domain 合并函数、TTL。
 */
import type { ListItem } from '@/api/example';
import { mergeListItems } from '@/domain/example-list';
import { deleteCacheRecord, readCacheRecord, writeCacheRecord } from '@/db/connection';
import type { CachedListSnapshot } from '@/db/types';

export const LIST_CACHE_TTL_MS = 10 * 60 * 1000;

export function readListSnapshot(userId: number): Promise<CachedListSnapshot | null> {
  return readCacheRecord('listSnapshots', userId);
}

export async function saveListSnapshot(snapshot: {
  userId: number;
  items: readonly ListItem[];
  total: number;
  page: number;
}): Promise<void> {
  const record: CachedListSnapshot = {
    userId: snapshot.userId,
    items: mergeListItems(snapshot.items),
    total: snapshot.total,
    page: snapshot.page,
    savedAt: Date.now(),
  };
  await writeCacheRecord('listSnapshots', record);
}

export function clearListSnapshot(userId: number): Promise<void> {
  return deleteCacheRecord('listSnapshots', userId);
}

export function isListCacheFresh(savedAt: number, now = Date.now()): boolean {
  return now - savedAt < LIST_CACHE_TTL_MS;
}

export function applyCachedListSnapshot(cached: CachedListSnapshot): {
  items: ListItem[];
  total: number;
  page: number;
} {
  return {
    items: mergeListItems(cached.items),
    total: cached.total,
    page: Math.max(0, cached.page),
  };
}
