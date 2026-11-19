# 后台管理壳层（可直接拷贝源码）

规范说明见上级目录 [admin-shell.md](../../admin-shell.md)（契约）、[vue3-admin-shell.md](../../vue3-admin-shell.md)、[vue2-admin-shell.md](../../vue2-admin-shell.md)。本目录是**桌面后台管理界面**的壳骨架：侧边栏 + 顶栏（折叠钮 / 返回 / 标题 / 用户区）+ 路由出口 + 页面骨架，按栈分成两份。

不含移动端（无 `≤760px` 抽屉、无 App 式顶部标题栏、无 `safe-area-inset`）。移动 H5 走 [vant.md](../../vant.md) 那套，两者不复用。

## 拷贝到哪

| 本目录 | 目标路径 |
|--------|----------|
| `vue3/*` | `src/layouts/default-layout/`、`src/composables/`、`src/components/form-page/`、`src/components/section-card/` |
| `vue2/*` | `src/layouts/`、`src/domain/`、`src/components/form-page/`、`src/components/section-card/` |

两套文件名基本一致，但**不要混拷**：图标写法、`.sync` 与 `v-model`、`describe` 的销毁钩子全都不同。

## 文件清单

| 文件 | 职责 | 备注 |
|------|------|------|
| `default-layout.vue` | 壳：侧栏 + 顶栏 + `.view` 路由出口 | 桌面端专用 |
| `brand/*` | 示例图形 + ICO 导出脚本（**勿原样拷进业务仓**） | 业务仓自建 `public/brand-mark.svg` + `favicon.ico`，见 [admin-shell.md](../../admin-shell.md#品牌-logo-与-favicon) |
| `menu.ts` | 菜单数据 + active 判定 + 白名单过滤 | 图标字段：vue3 存组件名，vue2 存 `el-icon-*` 类名 |
| `icons.ts` | 图标名 → 组件映射 | **仅 vue3**（Element UI 2 用字体类，不需要） |
| `use-sidebar.ts` | 折叠状态 + `localStorage` 持久化 | **仅 vue3**（vue2 写在组件 `data` 里） |
| `use-page-title.ts` / `page-title.ts` | 全局页面标题单例 | vue3 用模块级 `ref`，vue2 用 `Vue.observable` |
| `session.ts` | 当前用户适配层（名字 / 角色 / 退出） | 换成自己的 auth store 只改这一个文件 |
| `form-page.vue` | 表单页三段式：页头 + 可滚 body + 固定底栏 | 底栏是 flex 兄弟节点，不是 `position: fixed` |
| `section-card.vue` | 内容分块卡片（步骤胶囊 / 文字标题、可折叠） | 详情页与表单页唯一的内容单元 |
| `example-view.vue` | 详情页示例：整页滚 + 卡片堆叠 + 动态标题 | 复制成 `views/<模块>/detail.vue` |
| `index.ts` | 统一出口 | |

列表页不在本目录，见 [crud/](../crud/)。

## 拷贝后必改项

- `public/brand-mark.svg` + `public/favicon.ico`：按产品线自备（可参考 `brand/` 脚本导出 ICO，**不要**直接拷贝示例 SVG）
- `default-layout.vue`：`appName` / `appNameEn` 作为 props 传入（路由里绑 `:app-name="'你的系统名'"`）
- `menu.ts` 的 `NAV_GROUPS`：替换成真实菜单，`key` 与路由 name 对齐
- `icons.ts`：加新菜单项时补一行图标导入
- `session.ts`：换成项目的 auth store（`useSession` / `scope` 那一层）
- 色值：骨架已内联字面量（`#3b6fe0` 主色、`#e3e8f0` 描边、`#1f2733` 正文），换成自己的设计 token
- 尺寸：`240px` 侧栏 / `64px` 图标栏 / `56px` 顶栏 / `20px` 内容内边距

## 路由接线

```ts
// Vue 3
{
  path: '/',
  component: () => import('@/layouts/default-layout/index.vue'),
  redirect: '/todos',
  children: [ /* 页面 */ ],
}
```

壳的 `appName` 通过路由层的 `props` 传：

```ts
component: () => import('@/layouts/default-layout/index.vue'),
props: { appName: '某某管理系统', appNameEn: 'Admin Console' },
```

## 依赖

Vue 3 侧：`element-plus`、`@element-plus/icons-vue`、`vue-router@4`、`sass`。

Vue 2 侧：`element-ui@2`、`vue@2.7`、`vue-router@3`、`sass`。IE11 目标额外要 `core-js@3` + `@babel/preset-env` 的 `useBuiltIns: 'usage'`。

## 改造纪律

壳层只认三件事：**路由 path/name、`meta.title`、`meta.parent`**。

往壳里塞业务判断（当前用户是不是管理员、这个菜单要不要显示角标、这个页面要不要特殊顶栏）一旦开头，第二个项目就没法复用。权限过滤传 `allowedKeys`，角标传 `badges`，特殊顶栏用 `#topbar-right` 插槽——三条口子够用，不够再加 prop，不要加 `if (route.name === 'xxx')`。
