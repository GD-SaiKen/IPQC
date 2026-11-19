# 前端规范 — Vue 3

无 IE11 目标时的现代 Vue 3 约定；若项目 README 写明 Vue 2，改用 [vue2.md](vue2.md)。**`components/`、`views/`、`__test__/` 目录约定与 vue2 相同**，差异仅在 `<script>` 语法与构建链。

## 1. 硬约束

- TypeScript；SFC 使用 `<script setup lang="ts">` 或组合式 API + `defineComponent`，与仓库现有风格一致。  
- 构建常见为 **Vite**；路由 `vue-router@4`，默认 **history**（部署需 fallback 配置）。  
- UI：Element Plus、Naive UI 等以项目 `package.json` 为准，不混用 Element UI 2。  
- **独立 mobile 包**（`vant` + 底栏 Tab）叠加 [vant.md](vant.md)；IndexedDB → [indexeddb.md](indexeddb.md)；PWA 安装 → [pwa-install.md](pwa-install.md)；可拷贝源码见 [`knowledge/`](knowledge/)。

## 2. 目录骨架（参考）

```text
src/
├── __test__/             # 所有新建单测（镜像 src 目录，见 §3.3）
│   ├── components/
│   ├── views/
│   ├── composables/
│   ├── stores/
│   └── …
├── api/
├── components/           # 仅生产代码，旁路不新建 *.test.ts
├── composables/
├── layouts/
├── router/
├── stores/
├── types/
├── views/                # 新建页面：每页独立目录 + index.vue（§3.3）
│   └── order-detail/
│       └── index.vue
├── App.vue
└── main.ts
```

Monorepo 时前端包常在 `apps/<app-name>/src/`；命令在对应包目录执行。

本期功能的**文件路径、测试范围、不改清单**以 **`docs/SDD/实施计划/`** 为准（结构见 [sdd.md](sdd.md)）；通用组件目录约定见下文 §3。

## 3. 组件与单文件（SFC）

### 3.1 块顺序

与 [vue2.md](vue2.md) 一致，固定为：

```text
<template>
…
</template>

<script setup lang="ts">
…
</script>

<style scoped>
…
</style>
```

不要把 `<script>` 放在 `<template>` 前面，除非改动的文件本身已是另一种历史顺序且任务未要求统一。

### 3.2 新建组件：目录 + kebab-case

**新增**可复用组件（非改一行既有 `PascalCase.vue`）时：

```text
src/components/<feature-kebab>/
├── <feature-kebab>.vue          # 主 SFC
├── <feature-kebab>-bridge.ts    # 可选：仅本组件用的桥/常量
└── …
```

- 目录名与主文件名一致，均为 **kebab-case**。  
- 组件专用 TS **不要**丢在 `components/` 根目录。  
- 在父级中：`import TeamFoo from '@/components/team-foo/team-foo.vue'`（import 符号用 **PascalCase** 即可）。

### 3.3 新建页面（`views/`）：独立目录 + `index.vue`

**新增**路由页面（非改一行既有 `FooView.vue`）时，**不要**在 `views/` 根下再建 `PascalCaseView.vue`。

```text
src/views/<page-kebab>/
├── index.vue              # 该路由的页面入口（必选）
├── <block-kebab>.vue      # 可选：仅本页使用的子块
└── use-<page-kebab>.ts    # 可选：仅本页使用的 composable
```

约定：

- **目录名、文件名**一律 **小写 kebab-case**（仅用 `-` 连接，无大写、无 `View` 后缀）。  
  - 例：订单详情 → `views/order-detail/index.vue`（不是 `OrderDetailView.vue`）。  
- **`index.vue`** 即该页主 SFC；路由懒加载指向目录入口：  
  `() => import('@/views/order-detail/index.vue')`  
- 跨页复用的块仍放 `src/components/<feature-kebab>/`，不要塞进某个 `views/` 子目录。  
- **遗留**的 `PascalCase.vue` 单文件页面可继续维护；新页或 SDD 要求重构时再迁到上述结构。

### 3.4 单测位置（`src/__test__/`）

**所有新建** `*.test.ts` 一律放在 **`src/__test__/`**，按被测代码在 `src/` 下的路径**镜像**子目录（不把 `__test__` 限死在 `components`）：

| 被测代码 | 新建单测路径（示例） |
|----------|----------------------|
| `src/components/order-form/order-form.vue` | `src/__test__/components/order-form/order-form.test.ts` |
| `src/views/order-detail/index.vue` | `src/__test__/views/order-detail/index.test.ts` |
| `src/composables/use-foo.ts` | `src/__test__/composables/use-foo.test.ts` |
| `src/stores/content.ts` | `src/__test__/stores/content.test.ts` |

规则：

- 测试文件名：**kebab-case** + `.test.ts`（与 [engineering.md](engineering.md) 一致）。  
- **`src/components/`、`src/views/` 等生产目录旁禁止新建** `*.test.ts`。  
- **遗留**旁路单测（如 `src/views/WorkspaceDetailView.test.ts`）可继续只改内容；迁移后路径应对齐 `__test__/views/<page-kebab>/index.test.ts`。  
- `describe` 名建议与 feature / 模块 kebab 一致。  
- 导入被测模块用 `@/` 别名。  
- Vitest 常见 `include` 为 `src/**/*.test.ts`，`src/__test__/**` 会被收录；改配置前先读 `vitest.config.ts`。

### 3.5 逻辑与接口

- 逻辑复用优先 **composable**（`composables/use-xxx.ts`），避免巨型 `setup`。  
- Props / emits 用 `defineProps` / `defineEmits` 并标注类型。  
- 纯展示组件（骨架屏、静态壳）可无 props；仍保留简短中文块注释说明**用途与宿主**，不复述模板结构。  
- 副作用（请求、订阅）在 `onMounted` / `onUnmounted`（或 `onBeforeUnmount`）成对清理。  
- 加载态：`aria-busy`、`role="status"` 等与 Element Plus 骨架配合时，保持可访问名称（中文 `aria-label`）。  
- **HTTP**：axios 封装在 `src/utils/request.ts`，业务请求在 `src/api/<module>.ts`；REST 动词与分层见 [http-client.md](http-client.md)。`main.ts` 注入 Element Plus 对应的 feedback 适配器，**勿**在 `request.ts` 内直接 `import` `ElMessage`。

### 3.6 与 engineering 命名表的关系

- **文件路径**：kebab-case（见 [engineering.md](engineering.md) §1）。  
- **代码中的组件名 / 类型**：PascalCase。  
- 仓库中已有的 `PascalCase.vue` **不必**为对齐规范而批量重命名。

### 3.7 列表页与 CRUD 组件

`src/components/crud/` 提供 `Crud`（筛选条 + 表格槽 + 分页）、`Table`（schema 驱动列）、`TableFilters`、`Pagination`、`Form`（分区 + 字段 schema）。列表页与弹窗表单统一用它，页面只写 `columns` / `filters` / `sections` 和业务回调：

```vue
<Crud v-model:filter-values="filters" :filter-items="filterItems" :pagination="pagination">
  <template #table>
    <Table :columns="columns" :data="rows" :loading="loading" row-key="id" />
  </template>
</Crud>
```

- 契约、列宽与对齐规则、页面固定要写的六件事：[crud.md](crud.md)
- Vue 3 实现要点、完整示例页、易错点：[vue3-crud.md](vue3-crud.md)
- 组件目录 `components/crud/`，入口用语义化文件名 `crud.vue`（多组件目录不叫 `index.vue`）
- **桌面管理端**专用：不新增卡片模式与 `≤760px` 断点。移动 H5 另走 [vant.md](vant.md)，两套不复用

### 3.8 后台壳层与页面骨架

桌面后台管理界面统一走 `layouts/default-layout/index.vue`：左侧分组菜单 + 顶栏（折叠钮 / 返回 / 标题 / 用户区）+ `<router-view />`。页面不再自己画导航、不再自拼 `document.title`。

```
layouts/default-layout/
├── index.vue   壳
└── menu.ts     菜单数据 + active 判定
```

三种页面形态各归其位：

| 形态 | 承载 | 滚动 |
|------|------|------|
| 列表 | `Crud`（见 §3.7） | 表格内部滚 |
| 表单 | `FormPage`：页头 + 可滚 body + 固定底栏 | body 滚，底栏常驻 |
| 详情 | `SectionCard` 纵向堆叠 | 页面根元素自己滚 |

- 区域划分、菜单契约、标题与返回逻辑：[admin-shell.md](admin-shell.md)
- Vue 3 实现要点与易错点：[vue3-admin-shell.md](vue3-admin-shell.md)
- 壳层 `overflow: hidden`，**滚动权在页面**；顶栏标题取 `route.meta.title`，页面可运行时覆盖
- **桌面端**专用：不做 `≤760px` 抽屉与 App 式标题栏

## 4. 状态

- 跨页共享用 **Pinia**；组件内局部状态留在 `ref` / `reactive`。  
- 不在子组件直接改 prop；用 emit 或 store action。

## 5. 页面行为

- 数据来自后端 API；错误与空态原则同 [vue2.md](vue2.md) §5。  
- 环境变量：`import.meta.env`（Vite），勿混用 `process.env.VUE_APP_*` 除非项目已统一封装。  
- 页面通过 `@/api` 取数，不直接 axios；静默失败用 `requestOptions.showError: false`（[http-client.md](http-client.md) §4、§6）。

## 6. 验证

在目标应用包目录，**默认用 pnpm** 执行 `package.json` 里已有的脚本（`pnpm run <script>`；常见为 `lint`、`build`、`test`）；仅当项目已明确选用 npm、yarn 或 bun 时跟随该项目。单文件测试按该包的测试工具跑 `src/__test__/<镜像路径>/<name>.test.ts`。
