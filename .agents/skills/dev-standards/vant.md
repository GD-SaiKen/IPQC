# Vant 4（Vue 3 移动 H5）

与 [vue3.md](vue3.md)、[http-client.md](http-client.md) 叠加使用。**独立 mobile 包**（`vant` + `vue-router` + Pinia + Vite）时读本文件；PC 端 Element Plus 项目不要套用本节壳层与滚动约定。

信封、REST、`src/api` 分层仍以 [SKILL.md](SKILL.md) 与 [http-client.md](http-client.md) 为准。

| 主题 | 规范 | 可拷贝源码 |
|------|------|------------|
| Vant 壳层、列表、键盘、图库 | 本节 | [`knowledge/mobile-shell/`](knowledge/mobile-shell/)、[`knowledge/keyboard/`](knowledge/keyboard/)、[`knowledge/gallery/`](knowledge/gallery/) |
| **IndexedDB** 浏览器数据库 | [indexeddb.md](indexeddb.md) | [`knowledge/indexeddb/`](knowledge/indexeddb/) |
| **PWA 应用安装** | [pwa-install.md](pwa-install.md) | [`knowledge/pwa-install/`](knowledge/pwa-install/) |
| axios 提示 | [http-client.md](http-client.md) §5 | [`knowledge/feedback/`](knowledge/feedback/) |

总索引：[knowledge/README.md](knowledge/README.md)

## 0. 知识库（整文件拷贝）

| 源文件（skill 内） | 粘贴到项目 |
|--------------------|------------|
| `knowledge/mobile-shell/App.vue` | `src/App.vue`（改 Tab 与路由） |
| `knowledge/mobile-shell/app-nav-bar.vue` | `src/components/common/app-nav-bar.vue` |
| `knowledge/mobile-shell/use-app-nav-bar.ts` | `src/composables/use-app-nav-bar.ts` |
| `knowledge/mobile-shell/route-meta.d.ts` | `src/router/meta.d.ts` |
| `knowledge/mobile-shell/om-refresh-list.vue` | `src/components/common/om-refresh-list.vue` |
| `knowledge/mobile-shell/pull-refresh.ts` | `src/utils/pull-refresh.ts` |
| `knowledge/mobile-shell/mobile-shell-base.css` | `src/styles/base.css`（合并 tokens） |
| `knowledge/mobile-shell/main.ts.snippet.ts` | 合并进 `src/main.ts` |
| `knowledge/keyboard/*` | `src/composables/` + `keyboard-avoiding-view.vue` |
| `knowledge/gallery/image-preview-overlay.ts` | `src/utils/`（需 overlay 返回栈） |
| `knowledge/feedback/*` | `src/utils/feedback.ts` + `feedback-vant.ts` |

PWA 安装、IndexedDB 见各自文档与 `knowledge/pwa-install/`、`knowledge/indexeddb/`。

## 1. 版本与栈

| 项 | 约定 |
|----|------|
| UI | **Vant 4**（`vant@4.x`），Vue 3 + TypeScript |
| 构建 | **Vite**；样式 `import 'vant/lib/index.css'`（或按需 + 主题变量，与仓库一致） |
| 路由 | `createWebHistory`；Tab 页与二级页共用一套 `RouteMeta`（§4） |
| 状态 | Pinia；会话 token 与业务 store 分离 |
| 测试 | Vitest；Vant 在单测中 `vi.mock('vant', …)` 或只测 domain/composable |

**引入方式**

- 推荐：**按需 import 组件**（`<script setup>` 里 `import { List, PullRefresh } from 'vant'`），Tree-shaking 友好。
- 全局：`main.ts` 注册 **`Lazyload`**（图库、长列表缩略图）；其余组件不必 `app.use` 全量注册。
- 主题：优先 **CSS 变量**（`--van-primary-color` 等）与项目 `styles/tokens.css`；Design Token 与 Vant 变量对齐，避免页面内硬编码色值。

## 2. 入口与 HTML 全局设置

### 2.1 `index.html` viewport

移动壳层依赖 **安全区** 与 **键盘 resize**：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"
/>
<meta name="theme-color" content="#1989fa" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

- `viewport-fit=cover`：配合 `env(safe-area-inset-*)` 与 Vant `safe-area-inset-top`。
- `interactive-widget=resizes-content`：键盘弹出时布局视口收缩；与 §7 键盘逻辑一致。

### 2.2 `main.ts` 最小装配

```text
configureVirtualKeyboardForResize()   // navigator.virtualKeyboard.overlaysContent = false（若支持）
createApp → pinia → Lazyload → router → mount
import 'vant/lib/index.css' → @/styles/base.css
```

- **overlay 返回栈**：若使用全屏 `Popup` / `ImagePreview`，在 `router` 使用前绑定 `popstate`（避免系统返回直接离开 Tab 页）。
- **Web Push / SW**（可选）：见 [pwa-install.md](pwa-install.md)；勿与 Vant 样式顺序冲突。

### 2.3 根布局（App 壳）

固定 **单列 flex**，只让 **一处** 纵向滚动，避免 PullRefresh 嵌套滚动误判：

```text
.mobile-app                    flex column; height 100%; max-height 100dvh; overflow hidden
  AppNavBar                     VanNavBar fixed + placeholder + safe-area-inset-top
  main.mobile-app__main         flex 1; min-height 0; overflow-y auto（默认 Tab 列表页）
  main--embed                   overflow hidden（表单/聊天式页，由内层 keyboard-avoiding 滚动）
  VanTabbar                     route fixed placeholder; padding-bottom safe-area
```

`:root` 定义 `--safe-top` / `--safe-bottom`；Tabbar 在 `:root.keyboard-open` 时可隐藏，避免键盘挡住输入区。

## 3. 目录补充（mobile 包）

在 [vue3.md](vue3.md) 骨架上常见：

```text
src/
├── components/common/       # app-nav-bar、om-refresh-list、keyboard-avoiding-view 等壳组件
├── composables/               # use-app-nav-bar、use-keyboard-* 
├── domain/                    # 纯函数：列表合并、图库时间线、选择态（可单测、无 Vant）
├── db/                        # IndexedDB（见 [indexeddb.md](indexeddb.md)）
├── styles/                    # tokens.css、base.css（壳层 + Vant 变量覆盖）
└── utils/                     # pull-refresh、gallery-preview、overlay-back-stack
```

- **业务列表/表单逻辑**放 `domain/` 或 composable；**Vant 只留在视图层**。
- 项目专用命名前缀（如 `om-*`）表示设计体系包装，新仓库可换成自己的前缀，结构不变。

## 4. 顶栏 NavBar + 路由 meta

### 4.1 扩展 `RouteMeta`

在 `router/meta.d.ts` 声明，与守卫、顶栏组件共用：

| 字段 | 含义 |
|------|------|
| `public` | 无需登录 |
| `hideNav` | 隐藏全局顶栏（登录页） |
| `navTitle` | 默认标题 |
| `navBack` | 显示左侧返回箭头 |
| `mainEmbed` | 主内容区不滚动，交给键盘避让内层 |

### 4.2 全局顶栏组件

- 使用 **`NavBar`**：`fixed`、`placeholder`、`safe-area-inset-top`。
- 标题：`override.title ?? route.meta.navTitle`。
- 返回：`navBack` 为 true 时 `left-arrow`，`click-left` → `router.back()`。
- **路由切换清空 override**：`watch(route.fullPath, resetOverride)`。

### 4.3 页面级覆盖 `useAppNavBar()`

供子页面临时改标题、右侧按钮（不新增路由 meta）：

- `setTitle(string)`
- `setRight({ text, onClick })` 或 `{ label }`（只读说明文案）
- `clear()` / 路由变化自动 reset

## 5. 底栏 Tabbar

- **`Tabbar` + `TabbarItem`**，设置 **`route`** 模式，`:to` 指向 Tab 根路径。
- **角标**：`:badge` 字符串或 `undefined`（无未读时不传 `'0'`）。
- **自定义图标**：`#icon` 插槽 + 与 `--van-tabbar-item-icon-size` 对齐的尺寸。
- **权限 Tab**：`v-if` 按 store 能力显隐，勿留 dead link。
- 非 Tab 二级页（带 `navBack`）仍保留 Tabbar 时，确保路由 path 不重复挂载多个 Tab 高亮（以 Vant `route` 匹配规则为准）。

## 6. 反馈与 `request`

与 [http-client.md](http-client.md) §5 一致：**`request.ts` 不直接依赖 Vant**。

- 实现 `src/utils/feedback-vant.ts`（`showToast` / `showDialog`），在 `main.ts` `setFeedbackAdapter`。
- 拦截器只 `import { msgError, msgSuccess } from '@/utils/feedback'`。
- 单测：`vi.mock('@/utils/feedback')` 或 mock `vant`（与仓库现有 spec 一致）。

页面内短提示可直接 `showToast`；**接口成功/失败**仍走拦截器，避免重复弹窗。

## 7. 键盘录入与避让

### 7.1 全局 viewport 绑定

- `configureVirtualKeyboardForResize()`：支持时关闭 `virtualKeyboard.overlaysContent`，让布局随键盘收缩。
- composable 维护 `keyboardInset`、`keyboardVisible`、`visualViewport` / `innerHeight` 差值；键盘可见时给 `document.documentElement` 加 class **`keyboard-open`**（用于隐藏 Tabbar）。

### 7.2 `keyboard-avoiding-view`

用于 **整页表单、聊天式输入**（路由 `mainEmbed: true`）：

| prop | 用途 |
|------|------|
| `behavior` | `padding` / `height` / `position`（默认 `padding`） |
| `pinAlign` | `fit` / `end`（底部输入区贴键盘） |
| `keyboardVerticalOffset` | 与键盘顶部间距 |
| `bindViewport` | 外层已全局 bind 时可 false |

内层 **唯一** `overflow-y: auto` 滚动容器；`overscroll-behavior: contain`。

### 7.3 表单组件

- 优先 Vant **`Field`**、**`Form`**；长表单包在 `keyboard-avoiding-view` 内。
- 登录/发通知等页：`mainEmbed` + 内层滚动，避免与 `.mobile-app__main` 双滚动条。
- **`keyboard-avoiding-anchor`**（若有）：聚焦时将字段滚入可视区，与 avoiding view 配合。

## 8. 列表刷新与分页

### 8.1 封装 `PullRefresh` + `List`

推荐单一包装组件（如 `om-refresh-list.vue`）：

- `v-model:refreshing` / `v-model:loading`（Vue 3 `defineModel`）。
- 事件：`@refresh` 全量重拉；`@load` 触底分页。
- props：`finished`、`finishedText`、`contentEmpty`（无数据时隐藏「没有更多了」）、`immediateCheck`、`offset`。

**滚动约定（重要）**

- **不要**在 PullRefresh 外层再设 `overflow-y: auto`，与 `.mobile-app__main` 形成嵌套滚动；否则 `scrollTop` 恒为 0，**未滚到顶也会触发下拉刷新**。
- Tab 列表页：滚动发生在 **`main`**；包装组件只 `min-height: 100%`，不设 overflow。

### 8.2 下拉刷新 UX

- 用 **`runPullRefresh(refreshing, asyncWork, minVisibleMs?)`**：`finally` 里保证 loading 至少可见 ~400ms，避免闪一下。
- 刷新完成后更新 `finished`；空列表 `list: []`、`total: 0`，配合 **Empty** 或项目 `empty-state`。

### 8.3 分页状态

- 与后端信封 `{ list, total, page, pageSize }` 对齐；domain 层函数负责 **合并去重、替换第一页**（便于单测）。
- `List` 的 `loading` 仅在 **加载更多** 时为 true；首屏拉取勿与 PullRefresh 同时误触。

## 9. 图库与媒体

### 9.1 列表与缩略图

- **`Lazyload`** 全局注册；图片 `:src` 配合 `loading` / `error` 占位（Vant 或自定义）。
- 附件 URL：统一 **`normalizeImageSrc`**（鉴权、相对路径、代理前缀）再进 UI。

### 9.2 全屏预览

- **`showImagePreview`**：传入 `images` 数组、`startPosition`、`loop`、`showIndex`。
- **系统返回键**：`closeOnPopstate: false`，改为注册 **overlay 返回栈**，先关预览再 pop 路由（与 `Popup` 一致）。
- 多图：**横向** Vant 默认；若需 **竖滑切换上一张/下一张**，在 preview 根节点监听 touch（domain 外放在 `utils/image-preview-overlay.ts`）。

### 9.3 选择与上传

- 多选、时间线分组逻辑放 **`domain/`**；UI 用 **`Checkbox`**、**`Uploader`**（若启用）或原生 `input[type=file]` + 压缩 util。
- 上传走 `api` + `FormData`；进度与失败提示走 feedback，不在 domain 里调 Vant。

### 9.4 本地 IndexedDB 快照

图库首屏可先读 **IndexedDB** 再网络刷新；规范与拷贝模板见 [indexeddb.md](indexeddb.md)、[`knowledge/indexeddb/`](knowledge/indexeddb/)。

## 10. 常用 Vant 组件速查

| 场景 | 组件 |
|------|------|
| 行动 Sheet | `ActionSheet` |
| 底部详情 | `Popup` `position="bottom"` + round |
| 确认 | `Dialog.confirm`（或 feedback 门面） |
| 空态 | `Empty` 或项目统一 `empty-state` |
| 单元格列表 | `Cell` / `CellGroup`（可再包一层 list-cell 统一样式） |
| 标签页 | `Tabs`（子页内；与底栏 Tab 勿混用同一套路由） |
| 搜索 | `Search` |
| 下拉菜单 | `DropdownMenu` |

弹层打开时同样接入 **overlay 返回栈**，避免 Android 返回键直接退出应用。

## 11. 单测与 mock

- Domain / `runPullRefresh` / 缓存 TTL：**不 import Vant**。
- 测 `request` 信封：mock `feedback` 或 `vant` 的 `showToast`。
- 组件测：@vue/test-utils + stub Vant 子组件，或只测包装组件的 props/emit。

## 12. 禁止

- 在 `views` 里拼 API URL 或直接 `axios`（见 http-client）。
- 多处纵向滚动容器叠加（破坏 PullRefresh / 顶栏 fixed）。
- 新页在 `views/` 根下建 `FooView.vue`（见 vue3 §3.3）。
- 把业务规则写进 Vant 的 `formatter` / 插槽里而无法单测。
- PC 端 Element Plus 与 Vant 混在一个入口（monorepo 应 **分包**）。
