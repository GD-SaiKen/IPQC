# CRUD 五件套（可直接拷贝源码）

规范说明见上级目录 [crud.md](../../crud.md)（契约）、[vue3-crud.md](../../vue3-crud.md)、[vue2-crud.md](../../vue2-crud.md)。本目录是**桌面管理端**的列表页骨架：`筛选条 + 表格 + 分页 + 抽屉/弹窗表单`，按栈分成两份，互不复用。

不含移动端适配（无 `≤760px` 断点、无 `mobile-table.vue`、无 `useMediaQuery`）。移动 H5 请走 [vant.md](../../vant.md) 那套。

## 拷贝到哪

| 本目录 | 目标路径 |
|--------|----------|
| `vue3/*` | `src/components/crud/`（Vue 3 + Element Plus） |
| `vue2/*` | `src/components/crud/`（Vue 2.7 + Element UI 2） |

两套文件名一致，整目录复制即可，页面按 `import { Crud, Table, Form } from '@/components/crud'` 引用。

## 文件清单

| 文件 | 职责 | 备注 |
|------|------|------|
| `crud.vue` | 页面骨架：筛选条 → 表格板块 → 分页 | 只管布局与高度链，不碰数据 |
| `table.vue` | 表格：schema → 列，高度测量，把 `$listeners` 透传给 `el-table` | 页面不写死列 |
| `table-column.vue` | 单列渲染（`custom` / `tag` / `date` / `action` / `expand` / `group`） | 仅 Vue 2：需要命令式注册列 |
| `form.vue` | 表单弹窗内容：`sections` → `el-form-item`，自带 `validate()` / `clearErrors()` | |
| `table-filters.vue` | 筛选条：`input`（防抖）/ `select` / `daterange` | |
| `pagination.vue` | 分页条 | 32px 高对齐，修掉 Element small 的 22px 压缩 |
| `table-header-label.vue` | 表头折叠提示 + `!` 徽标 | 仅 Vue 2（Vue 3 走 `header` 插槽） |
| `debounced-input.vue` | 防抖输入框 | 仅 Vue 3 |
| `column-sizing.ts` | 列宽 / 对齐 / fixed 解析（`COL_WIDTH` 常量表） | 两栈逻辑相同，是**唯一真源** |
| `action-button-icons.ts` | 操作列默认图标（查看 / 编辑 / 删除等） | 仅 Vue 3 |
| `date-format.ts` | `formatDisplay()` | 仅 Vue 2 |
| `row-expand-click.ts` | 展开行点击不误触 | 仅 Vue 3 |
| `types.ts` | `ColumnSchema` / `FilterItem` / `FormSection` / `PaginationConfig` | 契约 |
| `example-page.vue` | **标准列表页写法**，含假数据 | 复制成 `views/<模块>/index.vue` |

`example-page.vue` 里 `mockQuery()` 整块是假数据，接真实接口时连函数一起删掉。

## 拷贝后必改项

- `example-page.vue`：`mockQuery` 换成 `api/<module>.ts` 的 `listXxx(params)`；`OrderRow` 换成业务类型
- `column-sizing.ts` 的 `COL_WIDTH`：按本项目的表格密度调（默认按 1440 宽设计）
- `types.ts` 的 `TimeDisplayMode` / `ColumnType`：按需增删
- 样式里的色值：骨架已把项目私有 SCSS 变量（`$color-border` 等）内联成字面量，换成自己的设计 token

## 依赖

Vue 3 侧：`element-plus`、`dayjs`（`table-column` 日期格式化；若项目已用别的日期库，替换 `formatDisplay` 调用点）。

Vue 2 侧：`element-ui@2`、`vue@2.7`、`typescript` + `vue-class-component` 类型（`Vue.extend` 已够用）。IE11 目标需保留 `element-ui/lib/index.js` 全量引入与 `@babel/preset-env` 的 `useBuiltIns: 'usage'`。

## 改造纪律

需要 import `@/api` / `@/stores` / `vue-router` 的单元格，一律不进这个目录，改成页面里的 `#col-<prop>` 插槽。判定标准就一句话：**能不能脱离业务独立跑**。把项目私有单元格塞进 `table.vue`，这个目录下次就没法移植了。
