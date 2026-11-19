---
name: dev-standards
description: Use when 实现或审查 Vue 2/3、React、NestJS、Flutter/Dart 代码，或对齐工程命名、docs/SDD 规格与实施计划、组件/Widget 目录、单测位置、axios/request/api 封装、Git 提交；用户提到开发规范、dev-standards、SDD、规格文档、实施计划、IE11、REST、网络请求、Flutter、Dart、widget、pubspec、echarts、看板图表、ChartsPanel 时。
---

# 开发规范（跨项目 · 唯一权威）

**通用工程与栈约定只维护在本 skill**。各 Git 仓库**不必**复制 `docs/开发规范/通用-*`。

## 优先级（冲突时）

1. **当前仓库**：`AGENTS.md`、`docs/SDD/`（本期规格 + 实施计划）、`docs/项目-业务约定.md`、已有同类文件的布局与命名  
2. **本 skill**：先本节前后端契约，再 `engineering.md` / `backend.md`，最后只读对应语言栈（`vue3.md`、`flutter.md`、`nest.md` 等）；语言栈对**该语言特有约定**优先（如 Dart 文件名 snake_case、常量 lowerCamelCase）  
3. **个人习惯**：不得覆盖 1、2

写代码或审查时：**先读本期 `docs/SDD` → 本 skill → 对照邻近平行文件**。

## 文档结构（总分）

| 层级 | 文件 | 写什么 |
|------|------|--------|
| **总 · 前后端契约** | 本节「前后端统一约定」 | 双方共同遵守的 URL、动词、响应信封、分页与写操作 `data` 形状 |
| **总 · 工程** | [engineering.md](engineering.md) | 命名、目录入口导出、import、注释、Git |
| **总 · 后端** | [backend.md](backend.md) | 与语言无关：三层职责、模块边界、业务载荷、软删与安全 |
| **分 · 前端** | `vue2.md` / `vue3.md` / `react.md`、[vant.md](vant.md)、[indexeddb.md](indexeddb.md)、[pwa-install.md](pwa-install.md)、[flutter.md](flutter.md)、[http-client.md](http-client.md) | 组件目录、Vant 壳、IDB、PWA 安装、Flutter |
| **分 · 壳层** | [admin-shell.md](admin-shell.md) + [vue3-admin-shell.md](vue3-admin-shell.md) / [vue2-admin-shell.md](vue2-admin-shell.md)、[knowledge/admin-shell/](knowledge/admin-shell/) | 侧边栏 / 顶栏折叠钮 / 路由菜单 / 标题 / 页面骨架（列表·表单·详情）的契约与各栈实现；**不含移动端**；`knowledge/admin-shell/` 是可拷贝源码 |
| **分 · 列表页** | [crud.md](crud.md) + [vue3-crud.md](vue3-crud.md) / [vue2-crud.md](vue2-crud.md)、[knowledge/crud/](knowledge/crud/) | 筛选 / 表格 / 分页 / 表单四件套的 schema 契约与各栈实现；**不含移动端**；`knowledge/crud/` 是可拷贝源码 |
| **分 · 看板图表** | [echarts.md](echarts.md) + [vue3-echarts.md](vue3-echarts.md)、[knowledge/echarts/](knowledge/echarts/) | KPI 下折叠图表区：`Echart` / `ChartCard` / `ChartsPanel`、option 约定与下钻；**仅桌面管理端**；`knowledge/echarts/` 是可拷贝源码 |
| **分 · 后端语言** | [nest.md](nest.md)、[go.md](go.md) | Nest 或 Go 如何落实 `backend.md`；只读与当前仓库一致的那一份 |

读后端代码：本节 → `backend.md` → 当前语言的那一份（Nest 读 `nest.md`，Go 读 `go.md`）。不要把契约或三层原则只写在语言文档里。

## 仓库里应保留什么

| 内容 | 路径 |
|------|------|
| **SDD 规格 + 实施计划** | **`docs/SDD/规格文档/`**、**`docs/SDD/实施计划/`**（见 [sdd.md](sdd.md)） |
| 长期方案 / 设计基线 | `docs/design/`、`docs/development/` 等（以仓库为准） |
| 本项目命名、路由、错误码 | `docs/项目-业务约定.md`（文件名可略有差异） |
| Agent / 分支 / CI | `AGENTS.md` 等根目录约定 |
| 仓库里已有的其它规格目录 | 历史文档留在原处；**新的增量以 `docs/SDD` 为准** |

## 前后端统一约定

领域路由前缀、错误文案以仓库 `docs/项目-业务约定.md` 为准。下列形状前后端必须一致；前端在 `request` 里解出 `data`，后端业务代码只返回 `data` 的内容，由框架统一包信封。

### 资源与动词

| 操作 | 方法 | 路径 |
|------|------|------|
| 列表、筛选 | `GET` | `/<resources>` |
| 详情 | `GET` | `/<resources>/:id` |
| 创建 | `POST` | `/<resources>` |
| 部分更新 | `PATCH` | `/<resources>/:id` |
| 删除 | `DELETE` | `/<resources>/:id` |

JSON 字段 **camelCase**。登录、验证码、刷新令牌等可保留非 REST 路径；**新资源**用上表。前端拼 URL 的细节见 [http-client.md](http-client.md)。

### 响应信封

成功（HTTP 200，`code` 同为 200）：

```json
{ "code": 200, "data": {}, "msg": "success", "message": "操作成功" }
```

失败（HTTP 状态与 `code` 相同，`data` 为 `null`）：

```json
{ "code": 400, "data": null, "msg": "bad_request", "message": "用户名已存在" }
```

| 字段 | 给谁看 | 写法 |
|------|--------|------|
| `message` | 页面提示 | 中文短句。业务异常里抛出的文案写到这里 |
| `msg` | 测试、日志、调试 | 稳定英文标识，不用堆栈、不用中文 |

| HTTP / code | `msg` | 场景 |
|-------------|-------|------|
| 400 | `bad_request` | 参数或业务校验失败 |
| 401 | `unauthorized` | 未登录或令牌无效 |
| 403 | `forbidden` | 已登录但无权限 |
| 404 | `not_found` | 资源不存在或已删除 |
| 409 | `conflict` | 唯一冲突 |
| 500 | `internal_error` | 未预期错误；`message` 用「服务器繁忙，请稍后重试」，不暴露堆栈 |

业务方法只返回 **`data`**。页面 API 函数也只拿 **`data`**。不要在 Controller 或页面里再套一层信封。

成功和失败都由前端拦截器提示，页面不必再写一套弹窗。文案优先级都是：本次请求的自定义文案 → `message` → `msg` → 兜底（成功为「操作成功」，失败为「请求失败」）。失败时同时 `reject`，`await` 之后的语句不会执行，不必为了弹错误再写 `try/catch`；需要收尾（例如关掉 loading）用 `finally`。某次请求不要提示时，分别关 `showSuccess` / `showError`。细节见 [http-client.md](http-client.md)。

### `data` 形状（信封之内）

| 场景 | `data` |
|------|--------|
| 列表 | `{ "list": [], "total": 0, "page": 1, "pageSize": 10 }` |
| 详情 / 创建 | 单条资源对象（字段与列表项可不同，创建结果至少含标识） |
| 更新 | `{ "id": 1, "updated": true }` |
| 删除 | `{ "id": 1, "deleted": true }` |
| 无业务体 | `{ "ok": true }` |

分页查询参数：`page`（从 1）、`pageSize`（默认 10，上限 100）。空列表是 `list: []` 且 `total: 0`，不用 `0` 或 `null` 冒充「没有数据」。

## 加载顺序

1. **项目层**：`docs/SDD/规格文档/<本期>.md` + `docs/SDD/实施计划/<本期>.md`（存在时）；不得搬用其它项目的表、路由、字段。  
2. **SDD 写法**：[sdd.md](sdd.md)  
3. **工程共性**：[engineering.md](engineering.md)  
4. **后端共性**（写服务端时）：[backend.md](backend.md)  
5. **语言栈**：只读**一份**前端栈 + 需要时 [http-client.md](http-client.md)；后端只读**一份**语言文档（Nest → [nest.md](nest.md)，Go → [go.md](go.md)）。

| 条件 | 阅读 |
|------|------|
| 写/读 `docs/SDD` | [sdd.md](sdd.md) |
| 任何后端接口（分层、载荷、模块边界） | [backend.md](backend.md)，并遵守本节信封 |
| Vue 2 + TypeScript，含 IE11 | [vue2.md](vue2.md)（目录 / `views` / `__test__` 与 vue3 同构，仅 API 与构建不同） |
| Element UI 2（常与 Vue 2） | [element-ui.md](element-ui.md)（叠加 vue2） |
| Vue 3 现代目标 | [vue3.md](vue3.md) |
| 列表页 / 表格 / 筛选 / 表单弹窗 | [crud.md](crud.md)，再读对应栈的 [vue3-crud.md](vue3-crud.md) 或 [vue2-crud.md](vue2-crud.md) |
| 看板页图表（echarts 柱状/折线、ChartsPanel） | [echarts.md](echarts.md)，再读 [vue3-echarts.md](vue3-echarts.md) |
| 侧边栏 / 顶栏 / 菜单 / 页面骨架 / 后台整体布局 | [admin-shell.md](admin-shell.md)，再读对应栈的 [vue3-admin-shell.md](vue3-admin-shell.md) 或 [vue2-admin-shell.md](vue2-admin-shell.md) |
| 壳外登录页（全屏背景 + 右侧单卡片） | [login-page.md](login-page.md)，再读 [vue3-login-page.md](vue3-login-page.md) |
| Vue 3 + Vant 4 独立移动 H5 | [vant.md](vant.md)（叠加 vue3 + http-client；源码 [`knowledge/`](knowledge/)） |
| IndexedDB 浏览器数据库缓存 | [indexeddb.md](indexeddb.md) |
| PWA 应用安装与 Manifest | [pwa-install.md](pwa-install.md) |
| React + Hooks | [react.md](react.md) |
| Flutter / Dart（移动、桌面、Web） | [flutter.md](flutter.md)（叠加 engineering；信封与分页仍按本节） |
| NestJS 落地（目录、装饰器、Prisma） | [nest.md](nest.md)（须已读 backend.md） |
| Go 落地（包、`*_test.go`、迁移） | [go.md](go.md)（须已读 backend.md；不要套用 nest.md） |
| 前端 axios / `src/api` / REST | [http-client.md](http-client.md)（解包以本节信封为准） |

## Vue 3 速查（详见 vue3.md §3；SDD 实施计划可再写死路径）

**组件**

- `components/<feature-kebab>/<feature-kebab>.vue`；专用 TS 同目录  

**页面（views）**

- `views/<page-kebab>/index.vue` 为路由入口；目录内其它文件亦 **kebab-case**  
- 路由：`import('@/views/<page-kebab>/index.vue')`  

**登录页（壳外）**

- `views/login/index.vue`；`/login` 与 layout **并列**，`meta.public: true`（见 [login-page.md](login-page.md)）
- 品牌 + 表单**同一张卡片**；失败提示走 `request` 拦截器，登录 API 设 `sessionExpiredOn401: false`

**后台壳层**

- `layouts/default-layout/index.vue` 承载侧栏 + 顶栏 + `<router-view />`；菜单数据在 `menu.ts`，**不写进 template**（见 [admin-shell.md](admin-shell.md)）  
- 顶栏标题取 `route.meta.title`，页面可运行时覆盖；`.view` 是 `overflow: hidden`，**滚动权在页面**；侧栏与 favicon 共用本项目 `public/brand-mark.svg` + `favicon.ico`（勿拷 skill 模板，见 [admin-shell.md](admin-shell.md#品牌-logo-与-favicon)）  
- 三种页面形态：列表（`Crud`）/ 表单（`FormPage` 三段 + 固定底栏）/ 详情（`SectionCard` 堆叠）  

**列表页**

- 用 `components/crud` 的 `Crud` + `Table` + `Form`；页面只写 `columns` / `filters` / `sections` 与回调，**不写 `el-table-column`、不拼分页**（见 [crud.md](crud.md)）  
- 二元状态（启用/停用）：列内 `el-switch` + `inline-prompt`（`custom` 列），勿与操作列「启停」、编辑表单状态下拉重复  
- 列表编辑/新建：优先 `el-drawer` + `Form`（`label-position="right"`、固定 `label-width`、规则默认失焦校验）；样式见 `knowledge/crud/list-form-drawer.scss`  
- 桌面管理端专用：移动端卡片模式与 `≤760px` 断点不在本套封装内（移动 H5 走 [vant.md](vant.md)）

**看板图表**

- 骨架：`KpiBoard` → `ChartsPanel` → `dashboard-detail-panel` + `Crud`（见 [echarts.md](echarts.md)）  
- `defineAsyncComponent` 加载 `echart.vue`；`computed<EChartOption>` 在页面组装；空态用 `chart-card__empty`，不挂 `Echart`  
- 引擎只在 `components/echart/echart.vue` 里 `echarts.use`；下钻用 `@click` 改筛选，不在页面 `echarts.init`

**通用**

- **SFC 块顺序**：`template` → `<script setup lang="ts">` → `style`  
- **新建单测**：一律 `src/__test__/…`，子路径镜像 `src/`（组件、页面、store、composable 等）  
- **禁止**在 `src/views/`、`src/components/` 等旁路新建 `*.test.ts`  
- **遗留**旁路 `*.test.ts` 可只改内容；迁移由 SDD/任务明确要求  

## Vant 移动 H5 速查（详见 [vant.md](vant.md)；IDB → [indexeddb.md](indexeddb.md)；安装 → [pwa-install.md](pwa-install.md)；拷贝 [`knowledge/`](knowledge/)）

**壳层**

- `App.vue`：`NavBar` + `main`（单滚动）+ `Tabbar route`；表单页 `meta.mainEmbed` 关闭 main 滚动  
- `router/meta.d.ts`：`hideNav` / `navTitle` / `navBack` / `mainEmbed` / `public`  
- `useAppNavBar()`：面临时改顶栏；路由切换 reset  

**列表**

- 封装 `PullRefresh` + `List`；勿嵌套 `overflow-y` 破坏下拉刷新  
- `runPullRefresh` 保证最小可见 loading；分页与信封 `{ list, total, page, pageSize }` 对齐  

**键盘 / 图库**

- viewport `interactive-widget=resizes-content` + `keyboard-avoiding-view`  
- `Lazyload` + `showImagePreview`；预览接 overlay 返回栈  
- 图库列表快照：`src/db/` + TTL；见 [indexeddb.md](indexeddb.md)  

## Flutter 速查（详见 flutter.md；官方 MVVM，信封仍按本节）

**命名**

- 文件 / 包：**snake_case**（`order_repository.dart`）；类 UpperCamelCase；常量 **lowerCamelCase**、无 `k` 前缀  
- 后缀随官方架构：`XxxView` / `XxxViewModel` / `XxxRepository` / `XxxService`  

**结构**

- `lib/features/<feature>/data|ui` 或按层 `lib/data|ui`；`core/` 放网络、信封、feedback  
- 传输层 `lib/core/network/http_client.dart`；模型 json_serializable；`*.g.dart` 不手改  
- 测试：`test/` **镜像** `lib/`，`*_test.dart`；集成在 `integration_test/`  

**禁止**

- widget / `build()` 里直发 HTTP、写副作用；混用多套状态管理；手改生成文件  

## 实现前自检

- [ ] 本期 **`docs/SDD`** 范围与「不改」清单已读  
- [ ] 栈与 `package.json` / README 一致  
- [ ] 新文件符合 engineering + vue3；计划中的路径已落地  
- [ ] 接口符合本节「前后端统一约定」（信封、动词、分页 `data`）  
- [ ] 前端：`utils/request` 解出 `data`；`api/<module>.ts`；`request` 不直连 UI 组件库（见 [http-client.md](http-client.md)）  
- [ ] 列表页用 `components/crud` 四件套（见 [crud.md](crud.md)），未手写表格列与分页
- [ ] 看板图表：`Echart` + `ChartCard` + `ChartsPanel`；页面不 `echarts.init`；无数据不画空柱（见 [echarts.md](echarts.md)）
- [ ] 后台壳层：菜单在 `menu.ts`、标题走 `meta.title`、`.view` 不滚、表单页底栏是 flex 兄弟节点（见 [admin-shell.md](admin-shell.md)）
- [ ] Vant 移动包：壳层单滚动、RouteMeta、feedback（[`knowledge/`](knowledge/)）；IDB / PWA 安装分别见 [indexeddb.md](indexeddb.md)、[pwa-install.md](pwa-install.md)  
- [ ] Flutter：命名与目录符合 [flutter.md](flutter.md)（snake_case 文件、View/Repository 后缀）；测试在 `test/` 镜像 `lib/`；生成文件未手改  
- [ ] 后端：先读 [backend.md](backend.md)。Nest 的业务在 `modules/<domain>/`，测试在 `__test__/`，装饰器符合 [nest.md](nest.md)。Go 的包、`*_test.go` 与迁移符合 [go.md](go.md)，不使用 `modules/` 或 `__test__/`  
- [ ] 失败与空态真实展示，不用 `0` 冒充无数据  
- [ ] 改动范围最小  
- [ ] 只有 `main` 时开发在 `main`；有 `dev` 时开发在 `dev`，发版只把 `main` 快进到要上线的提交（见 [engineering.md](engineering.md) §6）  

## 验证

以**当前应用包**的 `package.json` 为准（Flutter 应用以 `pubspec.yaml` 为准；monorepo：进入对应应用包目录，或用 `pnpm --filter <pkg> run <script>` 在根目录执行）。包管理器**默认 pnpm**（`pnpm install`、`pnpm run <script>`）；仅当项目 `packageManager` 字段或锁文件明确使用 npm / yarn / bun 时跟随该项目。只跑 `scripts` 里实际存在的脚本。

| 栈 | 验证 |
|----|------|
| 前端 | `scripts` 中的 `test`、`lint`、`build` |
| Vue2 + IE11 | 上述 + IE11 复测 |
| Flutter / Dart | `flutter analyze`、`flutter test`、`dart format`（CI 加 `--set-exit-if-changed`） |
| 后端 | 对应包 `scripts` 中的 `test`。Go 模块没有该脚本时，跑实施计划里的 `go test ./<包> -run <用例> -count=1` |

验收以 **SDD 规格 + 实施计划** 及仓库 E2E 目录为准。

## 新开仓库清单

- [ ] 启用 skill `dev-standards`（`~/.cursor/skills/dev-standards/`）  
- [ ] 建立 **`docs/SDD/规格文档/`** 与 **`docs/SDD/实施计划/`**（或团队约定的等价路径，并在 `sdd.md` 思路下成对维护）  
- [ ] 写 `docs/项目-业务约定.md`  
- [ ] **不要**再建 `docs/开发规范/通用-*`  
