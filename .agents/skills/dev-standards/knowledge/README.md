# dev-standards 知识库（可直接拷贝源码）

规范说明见上级目录的 [vant.md](../vant.md)、[indexeddb.md](../indexeddb.md)、[pwa-install.md](../pwa-install.md)、[admin-shell.md](../admin-shell.md)、[crud.md](../crud.md)、[echarts.md](../echarts.md)。本目录是**可运行参考实现**，拷贝到新仓库后改 `@/` 路径、应用名、DB 名、业务类型即可。

内容分两类，互不重叠：

- **移动 H5**（Vue 3 + Vant 4）：`mobile-shell/`、`keyboard/`、`feedback/`、`indexeddb/`、`pwa-install/`、`gallery/`
- **桌面管理端**：`admin-shell/`（侧栏 + 顶栏 + 页面骨架）、`crud/`（列表页四件套）、`echarts/`（看板 KPI + 图表 + layout mixin），前两者各分 `vue3/` 与 `vue2/` 两套；`echarts/` 目前仅 `vue3/`

## 拷贝顺序建议

1. **移动壳层** → `knowledge/mobile-shell/` → `src/` 对应路径  
2. **键盘**（表单页需要时）→ `knowledge/keyboard/` → `src/composables/` + `src/components/common/`  
3. **反馈** → `knowledge/feedback/` → `src/utils/`，并在 `main.ts` 注册 adapter  
4. **IndexedDB** → `knowledge/indexeddb/` → `src/db/`（模板文件去掉 `.template` 并改名）  
5. **PWA 安装** → `knowledge/pwa-install/` + `vite-pwa.config.snippet.ts`  
6. **图库预览**（可选）→ `knowledge/gallery/`  
7. **后台壳层**（桌面端，先做）→ `knowledge/admin-shell/vue3/` 或 `vue2/` → `layouts/` + `composables/` + `components/form-page|section-card/`  
8. **列表页 CRUD**（桌面端，后做）→ `knowledge/crud/vue3/` 或 `knowledge/crud/vue2/` → `src/components/crud/`  
9. **看板页**（KPI + 图表 + 明细，与 CRUD 配合）→ `knowledge/echarts/vue3/` + `dashboard-mixins.snippet.scss` → `src/components/kpi-board|echart|chart-card|charts-panel/` + `styles/mixins.scss`

## 目录索引

| 目录 | 目标路径 | 文档 |
|------|----------|------|
| [mobile-shell/](mobile-shell/) | `App.vue`、`components/common/*`、`composables/use-app-nav-bar.ts`、`router/meta.d.ts`、`styles/base.css`、`utils/pull-refresh.ts` | [vant.md](../vant.md) |
| [keyboard/](keyboard/) | `use-keyboard-viewport.ts`、`use-keyboard-avoiding.ts`、`keyboard-avoiding-view.vue` | [vant.md](../vant.md) §7 |
| [feedback/](feedback/) | `feedback.ts`、`feedback-vant.ts` | [http-client.md](../http-client.md) §5 |
| [indexeddb/](indexeddb/) | `src/db/*` | [indexeddb.md](../indexeddb.md) |
| [pwa-install/](pwa-install/) | `utils/pwa-install.ts`、`stores/pwa-install.ts`、安装 Dialog | [pwa-install.md](../pwa-install.md) |
| [gallery/](gallery/) | 全屏预览 + overlay 返回栈 | [vant.md](../vant.md) §9 |
| [admin-shell/vue3/](admin-shell/vue3/) | `layouts/default-layout/`、`composables/use-page-title|use-sidebar`、`components/form-page|section-card/`（Element Plus） | [admin-shell.md](../admin-shell.md)、[vue3-admin-shell.md](../vue3-admin-shell.md) |
| [admin-shell/vue2/](admin-shell/vue2/) | 同上（Element UI 2，`Vue.extend`） | [admin-shell.md](../admin-shell.md)、[vue2-admin-shell.md](../vue2-admin-shell.md) |
| [crud/vue3/](crud/vue3/) | `components/crud/*`（Element Plus） | [crud.md](../crud.md)、[vue3-crud.md](../vue3-crud.md) |
| [crud/vue2/](crud/vue2/) | `components/crud/*`（Element UI 2） | [crud.md](../crud.md)、[vue2-crud.md](../vue2-crud.md) |
| [echarts/vue3/](echarts/vue3/) + [dashboard-mixins.snippet.scss](echarts/dashboard-mixins.snippet.scss) | `kpi-board/`、图表三组件、看板 mixin | [echarts.md](../echarts.md)、[vue3-echarts.md](../vue3-echarts.md) |

`admin-shell/` 与 `crud/` 的骨架都**不含移动端适配**，移动 H5 走 Vant 那套，两套不复用。壳层与列表页也不重叠：壳管「页面放在哪」，CRUD 管「列表长什么样」。`echarts/` 负责看板页 KPI 行、折叠图表区与明细 flex 骨架（依赖已拷贝的 CRUD）。

## 拷贝后必改项

- `indexeddb/connection.ts`：`APP_MOBILE_DB_NAME`（默认 `app-mobile`）  
- `pwa-install.ts`：`PWA_INSTALL_DISMISS_KEY` 前缀  
- `pwa-install-prompt.vue`：`appName`、`appShortLead` props  
- `types.template.ts` / `list-cache.template.ts`：领域模型与 store 名  
- `App.vue` / Tab 路由：业务路由与权限 Tab  

## 依赖（package.json）

```json
"vant": "^4",
"idb": "^8",
"vue-router": "^4",
"pinia": "^2",
"echarts": "^6.1.0"
```

PWA：`vite-plugin-pwa`、`workbox-*`（injectManifest 时）。桌面看板图表另需 `element-plus`、`@element-plus/icons-vue`。
