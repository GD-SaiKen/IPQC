# CRUD 列表容器（筛选 · 表格 · 分页 · 表单）

后台列表页的四块能力抽成一套 **schema 驱动**的组件：页面只声明列、字段、筛选项，不写 `el-table-column`、不拼 URL。

本文是与框架无关的契约。落地实现分两份，只读与当前栈对应的那一份：

| 栈 | 文档 |
|----|------|
| Vue 3 + Element Plus | [vue3-crud.md](vue3-crud.md) |
| Vue 2 + Element UI 2（含 IE11） | [vue2-crud.md](vue2-crud.md) |

**明确不做**：移动端卡片模式、`≤760px` 断点、`mobile-table.vue`（移动端适配另开任务）；权限指令、导出、行内编辑、拖拽排序也各有归属，不要顺手塞进通用层。

## 1. 分工

| 层 | 负责 | 不负责 |
|----|------|--------|
| 页面 `views/<page-kebab>/index.vue` | 查询状态、调 API、组装 `columns` / `sections`、业务回调 | 拼 URL、写 `el-table-column` |
| `src/components/crud/` | 布局、渲染、分页联动、表单校验的机械部分 | 发请求、业务字段、跳路由 |
| `src/api/<module-kebab>.ts` | 路径常量与请求函数（见 [http-client.md](http-client.md)） | 任何 UI 依赖 |

一句话：**组件不知道业务，页面不写表格结构。**

## 2. 五件套与支撑文件

| 组件 | 文件 | 职责 |
|------|------|------|
| `Crud` | `crud.vue` | 容器：筛选条 → 表格区 → 分页三段的布局与槽位，**自身不渲染表格** |
| `Table` | `table.vue` | `ColumnSchema[]` → 列；单元格、操作按钮、空表；对外暴露选择与布局方法 |
| `TableFilters` | `table-filters.vue` | `FilterItem[]` → 输入框 / 下拉，输入防抖，向上抛变化 |
| `Pagination` | `pagination.vue` | `el-pagination` 的配置包装 |
| `Form` | `form.vue` | 分区 + 字段 schema → 表单项；`validate()` / `getModel()` / `clearErrors()` |
| 纯函数 | `column-sizing.ts` | 列宽、固定列、操作列宽的解析（可单测，不含 DOM） |
| 纯函数 | `action-button-icons.ts` | 操作列按钮默认图标（按 `label` 匹配；Vue 3 版） |
| 类型 | `types.ts` | 上述全部 schema 与 props 类型 |

`index.ts` 只做 re-export，页面从目录入口导入：`import { Crud, Table } from '@/components/crud'`，类型同入口导出。

## 3. 装配关系

```text
<Crud :filter-items="filterItems" :pagination="pagination">
  #filters-actions                        → 新建 / 导出 / 重置按钮（页面自己的）
  #table
    <Table :columns="columns" :data="rows" :loading="loading" />
      #col-<prop>                         → type='custom' 的单元格
      #expand                             → type='expand' 的展开行
</Crud>

<Form v-model="formModel" :sections="formSections" />   → 弹窗或详情，独立使用
```

`Crud` 不替页面决定表格：表格由页面显式放进 `#table`。这样同页双表、分段表（进行中 / 已完成）都不用改容器。

**替代关系**：新页面不要再用「`el-table` + 手写 `el-table-column` + 手写分页 + 手写筛选行」的旧写法。旧页面可继续维护，改造时随需求迁移。

## 4. 通用层与项目私有的界线

| 内容 | 归属 |
|------|------|
| 列类型（`text` / `tag` / `date` / `image` / `custom` / `action` …）、列宽、对齐、固定列 | **通用层** |
| 筛选控件、分页、表单字段渲染、校验的机械部分 | **通用层** |
| 行点击跳业务详情、成员/头像单元格、权限按钮、按钮图标 enrich | **页面**：`custom` 列 + 插槽，或 `buttons` 里的回调 |
| 主题色、圆角、间距 mixin | **项目样式**；通用组件只消费项目 SCSS 变量 |

判定标准只有一条：**换一个业务还能用 → 通用；需要 import `@/api`、`@/stores`、`vue-router` → 页面。**

从既有项目搬这套组件时，先把项目私有的单元格（如「项目成员」「项目看板跳转」）挪成 `#col-<prop>` 插槽并从 `table.vue` 里删掉，否则组件不可移植。表格只需保留 `#col-*` 与 `#expand` 两个槽，就够覆盖自定义列与展开子表。

## 5. 类型契约

### 5.1 列（`ColumnSchema`）

`type` 决定渲染方式，其余字段是各类型共享的基础属性：

| `type` | 必填 | 渲染 |
|--------|------|------|
| `selection` | — | 多选列，左固定，`reserve-selection` |
| `index` | — | 序号列，左固定，`startIndex` 起始（分页时页面传入 `(page-1)*pageSize+1`） |
| `text` | `prop` | 文本；空值显示 `—`；配 `onClick` 则渲染为可点链接 |
| `image` | `prop` | 缩略图，可配 `previewSrcList` 指定预览数组字段 |
| `tag` | `prop` | 标签，`tagMap` 值→类型映射，缺省用 `tagType` |
| `date` | `prop` | 日期格式化，空值 `—` |
| `custom` | `prop` | 走 `#col-${prop}`（或 `slotName`）插槽 |
| `action` | `buttons` | 操作列，右固定，超 `maxVisible`（默认 3）折叠为「更多」 |
| `expand` | — | 展开列，内容走 `#expand` |

基础属性（所有列可用）：

| 字段 | 说明 |
|------|------|
| `label` / `prop` | 表头与字段名 |
| `width` / `minWidth` | 显式宽度；只给 `minWidth` 默认弹性铺满 |
| `align` / `headerAlign` | 对齐，未设 `headerAlign` 时随 `align` |
| `sortable` | `true` / `'custom'` |
| `showOverflowTooltip` | 长文本省略 + 悬浮全文 |
| `formatter(value, row, index)` | 单元格文本格式化，返回 `''` 时按空值显示 `—` |
| `className` / `fixed` / `flex` | 附加类名、固定列、强制弹性 |
| `actionLabels(row)` | `custom` 当操作列用时，返回该行可见按钮文案，供扫描全表计算列宽 |

`ActionButton`：`{ label, type?, icon?, tooltip?, onClick(row, index), hidden?(row) }`。

- **默认图标**：`label` 为「查看 / 详情」「编辑 / 修改」「删除」等常用文案时，`Table` 自动补图标（映射表见各栈 `action-button-icons.*`，可在项目里扩展 `DEFAULT_ACTION_BUTTON_ICONS`）。
- **`icon`**：Vue 3 传 `@element-plus/icons-vue` 组件；Vue 2 传 `el-icon-xxx` 类名字符串。显式传 `icon: false` 可关闭图标；未传且无默认映射时不显示图标。
- 列宽估算会按「是否显示图标」计入 16px，与渲染一致。

### 5.2 筛选（`FilterItem`）

| 字段 | 说明 |
|------|------|
| `key` | 唯一标识，对应筛选值对象的 key |
| `label` | 左侧文字，可省（仅用 placeholder 提示） |
| `type` | `input` / `select`（Vue 2 参考实现另有 `daterange`） |
| `options` | `select` 的 `{ label, value }[]` |
| `placeholder` / `width` / `clearable` / `debounceMs` | 控件表现 |
| `pinned` | 筛选条可折叠时，收起后仍展示（可选能力） |

### 5.3 分页（`PaginationConfig`）

`{ page, pageSize, total, layout?, pageSizes?, onPageChange?(page), onSizeChange?(size) }`。

`layout` 默认 `'total, sizes, prev, pager, next, jumper'`，`pageSizes` 默认 `[10, 20, 50, 100]`。`page` 从 1 开始，`pageSize` 上限 100，与 [SKILL.md](SKILL.md)「分页查询参数」一致。

### 5.4 表单（`FormSection` / `FormField`）

分区 `FormSection`：`{ title?, description?, fields, cols?(默认 1), hidden?, collapsible?, defaultCollapsed?, slotName?, boxed? }`。`slotName` 有值时整段渲染插槽、忽略 `fields`；`boxed` 让分区带边框与浅色表头，用于弹窗内区隔。

字段 `FormField`：`{ type, prop, label?, rules?, options?, hidden?, width?, colSpan?, … }`。

| `type` | 控件 | 关键配置 |
|--------|------|----------|
| `input` / `textarea` | `el-input` | `rows`、`maxlength`、`showWordLimit`、`showPassword`、`suffix` |
| `select` | `el-select` | `options`、`multiple`、`filterable`、`allowCreate` |
| `radio` / `checkbox` | `el-radio-group` / `el-checkbox-group` | `options` |
| `switch` | `el-switch` | — |
| `date` | `el-date-picker` | `format` / `valueFormat`（两栈占位符写法不同！） |
| `number` | `el-input-number` | `min` / `max` / `step` |
| `readonly` | 纯文本 | `formatter(value, model)` |
| `custom` | 插槽 `#form-${prop}` | `slotName` |

`hidden` 支持 `boolean | ((model) => boolean)`，用于「选了 A 才显示 B」。`colSpan` 按分区 `cols` 的倍数占列。

`FormFieldRule`：`{ required?, message?, trigger?, min?, max?, pattern?, validator? }`。

### 5.5 列内二元状态（启用 / 停用）

字段只有**两种互斥状态**（启用与停用、开与关）时：

| 项 | 约定 |
|----|------|
| 列类型 | `type: 'custom'`，`prop` 与字段名一致，`align: 'center'`，宽度约 `100` |
| 控件 | `el-switch`，`:model-value` 绑布尔或自行换算；`inline-prompt` + `active-text` / `inactive-text` 显示短中文 |
| 交互 | `@change` 调 `PATCH`；行级 `loading` 防连点；成功后可就地改行数据，失败由传输层提示并 `load()` 对齐 |
| 禁止 | 操作列「启停」按钮与编辑表单里的状态下拉与列开关三处并存 |

### 5.6 列表编辑抽屉（`el-drawer` + `Form`）

短表单（字段不多、无需整页 `FormPage`）的**新建 / 编辑**：

| 项 | 约定 |
|----|------|
| 容器 | `el-drawer`，`direction="rtl"`，`size` 通常 `480px`～`560px`，`destroy-on-close` |
| 结构 | `list-form-drawer__body`（滚动）+ `list-form-drawer__footer`（取消 / 确定）；class `list-form-drawer` |
| 表单 | 共用 `Form`；`label-position="right"`，`label-width` 固定（如 `96px`～`112px`） |
| 校验 | 字段 `rules` 默认 **`trigger: 'blur'`**（`form.vue` 对未写 `trigger` 的规则补 `blur`）；提交时 `await formRef.validate()` |
| 样式 | 见 [`knowledge/crud/list-form-drawer.scss`](knowledge/crud/list-form-drawer.scss) |

整页级编辑、多分区长表单仍用 [admin-shell.md](admin-shell.md) 的 `FormPage`，不要塞进窄抽屉。

## 6. 列宽与对齐（顺序即优先级）

`resolveColSizing(col)` 的解析顺序，不要在多处重复实现：

1. `flex === false` 且只给 `minWidth` → 当作固定宽（`width = minWidth`）。
2. 日期 / 时间列：`width` 不足 152 时抬到 168，`minWidth` 不低于 152（表头 4–6 字 + `YYYY-MM-DD HH:mm`）。
3. 操作列（`type='action'` 或 `label='操作'`）：不给 `width`，`minWidth` 保底 88，实际宽度按按钮文案扫描全表取最宽一行（见下）。
4. 都没给宽度时按表头关键词 / 字段名给默认值：长文本类给 `minWidth: 180`，状态类 100，图片 100，其余 `minWidth: 120`。

常用常量统一放 `COL_WIDTH`：`selection 50`、`index 56`、`text 120`、`longTextMin 180`、`date 112`、`dateTime 168`、`dateTimeMin 152`、`status 100`、`image 100`、`actionMin 88`。

**表头关键词表（项目维护）**：什么算「长文本」「左对齐」，由项目在 `column-sizing.ts` 顶部维护两组关键词 / 字段名，不要把这些业务词散落到 `table.vue` 的渲染分支里。

- 长文本：`说明`、`问题`、`描述`、`任务`，字段名 `desc` / `description` / `note` / `result`。
- 左对齐：长文本 + 项目 / 品号 / 品名等业务名，其余居中。显式 `align` 永远优先。

**操作列宽度**：按钮数量与文案常随行状态变化，固定 `width` 必然截断或留白。做法是按可见按钮文案估算（`图标 16 + 文案字数 × 14 + 间距 12`），扫全表取最大值，`minWidth` 为下限；列宽变化后 `nextTick` 调一次表格 `doLayout()`，否则固定列会错位。

## 7. 页面侧的六件事

一个列表页固定只写这六件，多出来的逻辑先想清楚该放 `domain/` 还是 `api/`：

1. **查询状态初值**：`reactive` 的筛选对象 + `page` / `pageSize`，初值来自一个 `emptyXxxFilters()` 纯函数，重置按钮复用它。
2. **`columns` 用 `computed`**：依赖权限、当前 Tab、行状态时不要用 `const`；`action` 列的 `buttons` 随权限增减。
3. **`load()`**：`loading = true` → 请求 → 赋值 → `finally` 收尾。失败不清空上一次的数据，让错误提示与旧数据并存比白屏好。
4. **分页**：服务端分页把 `page` / `pageSize` 带进请求、`total` 取后端返回值；内存分页用 `slice` 切片、`total` 取过滤后长度。两种都别让 `total` 与当前页数据脱节（改了筛选必须 `page = 1`）。
5. **空态**：`Table` 内建「暂无数据」；需要业务引导（「还没有批次，去数据源同步」）时在 `#table` 里表格下方加一行文案，别改组件。
6. **失败**：走 [http-client.md](http-client.md) 的统一提示，页面不重复弹窗；要自定义文案就传 `requestOptions.errorMessage`。

## 8. 布局与高度链

`Crud` 是 `flex` 纵向三段：筛选条（`flex-shrink: 0`）→ 表格区（`flex: 1; min-height: 0`）→ 分页（`flex-shrink: 0`）。

表格区是**唯一**的滚动容器：`overflow: hidden` + 内层表格 `height: 100%`。这要求父级每一层都有确定高度，缺一层就会出现「滚动条沉到内容底部、看不见」。页面根节点因此要 `display: flex; flex-direction: column; height: 100%; min-height: 0`。

不传 `height` 时由 `ResizeObserver` 量容器高度回写数值，表格内部滚动最可靠；含 `expand` 列时改用 `height="100%"`（数值高度与展开行组合会塌缩）。空表要垂直居中，需让 `el-table__body-wrapper` 吃掉剩余高度。

## 9. 命名与单测

- 目录固定 `src/components/crud/`，多组件目录的入口用语义化文件名（`crud.vue` / `table.vue`），**不叫 `index.vue`**；`index.ts` 只做导出。
- 纯函数（列宽、单元格文本、按钮折叠切片）必须落在 `column-sizing.ts` 一类无 DOM 文件里，单测放 `src/__test__/components/crud/<name>.test.ts`，镜像 `src/` 路径。
- 组件行为（选了行向外抛、空表文案）用 `@vue/test-utils` 挂载测；不测 Element 自身渲染细节。
- 页面级 schema（`columns` / `sections`）放页面目录的 `xxx-columns.ts`，与页面单测一起维护。

## 10. 自检

- [ ] 页面里没有 `el-table-column`、没有拼 URL、没有手写分页
- [ ] `columns` / `sections` 是 `computed`（随权限或 Tab 变化时）
- [ ] 改动筛选后 `page` 归 1
- [ ] 空态区分「还没有数据」与「筛选无结果」
- [ ] 操作列没有写死 `width`，或已配 `actionLabels`
- [ ] 项目私有单元格走插槽，通用层没有 `@/api`、`vue-router`、`@/stores` 引用
- [ ] 二元状态列用 `custom` + `el-switch`（`inline-prompt`），编辑表单不重复状态
- [ ] 列表编辑用抽屉 + `Form`（`label-position="right"`、失焦校验），非必须不用 `el-dialog`
- [ ] 没有引入移动端分支
- [ ] 新增纯函数有 `src/__test__/components/crud/` 下的单测

## 11. 可拷贝骨架

不想从零拼这五件套，直接拷现成源码：

| 栈 | 目录 | 落地 |
|----|------|------|
| Vue 3 | `knowledge/crud/vue3/` | → `src/components/crud/`（Element Plus） |
| Vue 2 | `knowledge/crud/vue2/` | → `src/components/crud/`（Element UI 2） |

每个目录都带一份 `example-page.vue`（含假数据），复制成 `views/<模块>/index.vue` 就能跑；`mockQuery()` 换成真实接口时连函数一起删。骨架已剥离项目私有单元格、移动端分支和项目 SCSS 变量，直接可移植。细则见 [knowledge/crud/README.md](knowledge/crud/README.md)。
