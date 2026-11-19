# PWA 应用安装与 Manifest

与 [vue3.md](vue3.md)、[vant.md](vant.md) 叠加。**「添加到主屏幕 / 安装应用」** 与 **Web App Manifest**；本地列表缓存用 [indexeddb.md](indexeddb.md)，不要混为一谈。

**可直接拷贝的源码**在 [`knowledge/pwa-install/`](knowledge/pwa-install/)。

## 1. 能力边界

| 包含 | 不包含 |
|------|--------|
| `manifest.webmanifest`、图标、theme-color | IndexedDB 业务缓存 |
| Chromium `beforeinstallprompt` + 安装 Dialog | 把 API 响应 precache 进 SW |
| iOS「分享 → 添加到主屏幕」引导 | 替代登录鉴权 |
| （可选）`injectManifest` + Push | 开发环境默认开 SW 干扰 HMR |

## 2. Vite 配置

- 插件 **`vite-plugin-pwa`**。
- 仅安装 + 静态壳：可用 `generateSW`。
- 需要自定义 **`src/sw.ts`**（Push 等）：`strategies: 'injectManifest'`，源码保留字面量 **`self.__WB_MANIFEST`**。

片段见 [`knowledge/pwa-install/vite-pwa.config.snippet.ts`](knowledge/pwa-install/vite-pwa.config.snippet.ts)。

## 3. HTML

- `viewport-fit=cover`、`theme-color`、`apple-mobile-web-app-*`、`apple-touch-icon`。
- 键盘与壳层：`interactive-widget=resizes-content`（与 [vant.md](vant.md) 一致）。

片段见 [`knowledge/pwa-install/index-html.snippet.html`](knowledge/pwa-install/index-html.snippet.html)。

## 4. 安装提示（Chromium + iOS）

| 平台 | 行为 |
|------|------|
| Chromium | 监听 `beforeinstallprompt` → `preventDefault` → 用户点按钮再 `prompt()` |
| iOS Safari | 无 prompt；Dialog 展示操作步骤 |
| 打扰控制 | 「暂不」写 localStorage 时间戳，N 天冷却 |
| 已安装 | `display-mode: standalone` 或 `navigator.standalone` 不再弹 |

## 5. 知识库文件（拷贝清单）

| 拷贝到 | 来源 |
|--------|------|
| `src/utils/pwa-install.ts` | [`knowledge/pwa-install/pwa-install.ts`](knowledge/pwa-install/pwa-install.ts)（改 `PWA_INSTALL_DISMISS_KEY` 前缀） |
| `src/stores/pwa-install.ts` | [`knowledge/pwa-install/pwa-install-store.ts`](knowledge/pwa-install/pwa-install-store.ts) |
| `src/components/common/pwa-install-prompt.vue` | [`knowledge/pwa-install/pwa-install-prompt.vue`](knowledge/pwa-install/pwa-install-prompt.vue)（改 `appName` / 文案 props） |
| `App.vue` | `onMounted` 调 `usePwaInstallStore().bootstrap()`，模板挂 `<PwaInstallPrompt />` |

Store 与 util **成对拷贝**；Dialog 依赖 Vant，见 [`knowledge/mobile-shell/`](knowledge/mobile-shell/) 壳层。

## 6. Service Worker（可选）

Push、precache 与「安装提示」可同仓不同文件：`sw.ts` 负责 precache/Push；安装 UI 仍走 §5。

若 `injectRegister: false`，在 `main.ts` 或 `push.ts` 里注册 SW，失败不阻塞登录。

## 7. 自检

- [ ] `start_url` / `scope` / Vite `base` 一致  
- [ ] 图标 192 + 512（含 maskable）  
- [ ] standalone 下不再出现安装 Dialog  
- [ ] dismiss 冷却与产品一致  

## 8. 禁止

- 在 SW 里缓存带 Cookie 的 `GET /api/*` 当离线数据源。
- 未文档化就在 dev 默认启用 SW。
