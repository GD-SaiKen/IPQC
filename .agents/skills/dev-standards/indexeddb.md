# IndexedDB 本地缓存（浏览器数据库）

与 [vue3.md](vue3.md) 叠加；Vant 移动包常见用法见 [vant.md](vant.md)。**与 PWA 安装无关**——IDB 是页面内的结构化存储；PWA 见 [pwa-install.md](pwa-install.md)。

业务 store 名、TTL、字段以各仓库 **`docs/SDD`** 为准。本节约定分层；**可直接拷贝的源码**在 [`knowledge/indexeddb/`](knowledge/indexeddb/)。

## 1. 适用场景

| 适合 | 不适合 |
|------|--------|
| 列表首屏快照、离线 placeholder | accessToken / 密码 |
| 按 userId 隔离的元数据 | 大二进制、整图 base64 |
| stale-while-revalidate（先本地再网络） | 替代服务端鉴权 |

策略：有 fresh 缓存先渲染 → 并行请求 API → 成功则 `save`；**下拉刷新始终走网络**。

## 2. 依赖与目录

- 包：**`idb`**（`openDB` + `DBSchema`）。
- 推荐路径：

```text
src/db/
├── connection.ts          # 单例 openDB、read/write/delete、resetDatabase
├── types.ts               # DBSchema 泛型
├── <domain>-cache.ts      # TTL、read/save/clear/apply
└── index.ts               # 对外 re-export
```

## 3. 实现要点

- **`DB_VERSION`**：schema 变更时递增，在 `upgrade` 里建 store / 迁移。
- **`write` 前** `JSON.parse(JSON.stringify(value))`，避免 Vue Proxy 或不可克隆字段。
- **`read` 失败**返回 `null`，不抛到页面。
- **键**：至少按 **`userId`** 隔离；登出 `clear` 该用户或 `resetDatabase()`。
- **TTL**：纯函数 `is*Fresh(savedAt, now)` 便于单测；过期仍可作为 placeholder 与否由 SDD 定。

## 4. 知识库文件（拷贝到 `src/db/`）

| 文件 | 说明 |
|------|------|
| [`connection.ts`](knowledge/indexeddb/connection.ts) | 通用读写门面；改 `APP_MOBILE_DB_NAME` |
| [`types.template.ts`](knowledge/indexeddb/types.template.ts) | 示例 `galleryLists` store，复制为 `types.ts` 并按领域改 |
| [`list-cache.template.ts`](knowledge/indexeddb/list-cache.template.ts) | 列表示例：TTL + save/apply，复制为 `<domain>-cache.ts` |
| [`index.template.ts`](knowledge/indexeddb/index.template.ts) | 导出入口，复制为 `index.ts` |

拷贝后：替换类型中的 API 模型、`replace*Photos` 等领域函数引用，常量 `*_CACHE_TTL_MS` 与 SDD 对齐。

## 5. 测试

- TTL / `applyCached*`：**domain 或 cache 模块纯函数单测**，不打开 IDB。
- 集成：`fake-indexeddb`，或 Vitest mock `openDB`。

## 6. 禁止

- IDB 存 refresh token。
- 只写 IDB 长期不同步服务端（除非 SDD 明确离线优先）。
- `DB_VERSION` 升级不迁移、静默删库（除登出流程外）。
