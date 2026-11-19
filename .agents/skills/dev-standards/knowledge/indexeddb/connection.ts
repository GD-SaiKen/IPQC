import { deleteDB, openDB, type IDBPDatabase } from 'idb';

import type { AppMobileCacheStore, AppMobileDB, CachedListSnapshot } from '@/db/types';

/** 拷贝后改成项目名，避免多项目同域冲突 */
export const APP_MOBILE_DB_NAME = 'app-mobile';
const DB_VERSION = 1;

let databasePromise: Promise<IDBPDatabase<AppMobileDB>> | null = null;

export function getAppMobileDatabase(): Promise<IDBPDatabase<AppMobileDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB unavailable'));
  }
  if (!databasePromise) {
    databasePromise = openDB<AppMobileDB>(APP_MOBILE_DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('listSnapshots')) {
          database.createObjectStore('listSnapshots', { keyPath: 'userId' });
        }
      },
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function cloneForIndexedDB<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function readCacheRecord<Name extends AppMobileCacheStore>(
  storeName: Name,
  key: AppMobileDB[Name]['key'],
): Promise<AppMobileDB[Name]['value'] | null> {
  try {
    const database = await getAppMobileDatabase();
    return (await database.get(storeName as 'listSnapshots', key as number)) ?? null;
  } catch {
    return null;
  }
}

export async function writeCacheRecord<Name extends AppMobileCacheStore>(
  storeName: Name,
  value: AppMobileDB[Name]['value'],
): Promise<void> {
  const database = await getAppMobileDatabase();
  await database.put(
    storeName as 'listSnapshots',
    cloneForIndexedDB(value) as CachedListSnapshot,
  );
}

export async function deleteCacheRecord<Name extends AppMobileCacheStore>(
  storeName: Name,
  key: AppMobileDB[Name]['key'],
): Promise<void> {
  try {
    const database = await getAppMobileDatabase();
    await database.delete(storeName as 'listSnapshots', key as number);
  } catch {
    databasePromise = null;
  }
}

export async function resetAppMobileDatabase(): Promise<void> {
  if (databasePromise) {
    try {
      (await databasePromise).close();
    } catch {
      // ignore
    }
  }
  databasePromise = null;
  try {
    await deleteDB(APP_MOBILE_DB_NAME);
  } catch {
    // ignore
  }
}
