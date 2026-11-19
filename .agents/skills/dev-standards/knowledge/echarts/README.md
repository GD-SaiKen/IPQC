# 桌面看板套件（KPI + 图表 + 布局 mixin，可直接拷贝源码）

规范说明见 [echarts.md](../../echarts.md)、[vue3-echarts.md](../../vue3-echarts.md)。本目录是 **Vue 3 + Element Plus** 看板页完整骨架：**KpiBoard**、图表三件套、**dashboard** SCSS 片段。

## 拷贝到哪

| 本目录 | 目标路径 |
|--------|----------|
| `vue3/kpi-board.vue` | `src/components/kpi-board/kpi-board.vue` |
| `vue3/echart.vue` | `src/components/echart/echart.vue` |
| `vue3/chart-card.vue` | `src/components/chart-card/chart-card.vue` |
| `vue3/charts-panel.vue` | `src/components/charts-panel/charts-panel.vue` |
| `dashboard-mixins.snippet.scss` | 合并进 `src/styles/mixins.scss`（或 `@use` 相对路径） |

## 文件清单

| 文件 | 职责 |
|------|------|
| `kpi-board.vue` | KPI 指标卡网格；`KpiItem` 类型；可点筛选 `onClick` / `active` |
| `echart.vue` | echarts 按需注册、生命周期、resize、`EChartOption`、`click` |
| `chart-card.vue` | 图表卡片标题 + 插槽；`full` 通栏 |
| `charts-panel.vue` | 可折叠图表区，2 列 grid |
| `dashboard-mixins.snippet.scss` | `dashboard-page-layout` / `dashboard-detail-panel` / `dashboard-table-rows` |
| `example-charts.snippet.vue` | 仅图表区装配示例 |
| `example-dashboard-page.snippet.vue` | KPI + 图表 + Crud 明细整页示例 |

## 依赖（package.json）

```json
"echarts": "^6.1.0"
```

另需 `element-plus`、`@element-plus/icons-vue`（仅 `charts-panel`）。

## 拷贝后必改项

- 若项目 SCSS 有 `$color-*` 变量，可将组件中的 `var(--el-*)` 换回项目 token（mold 仓库仍用 `$color-*` 亦可）。
- 项目有 `when-mobile`（`html.is-mobile`）双通道时，可将 mixin 片段里的 `@media (max-width: 760px)` 换成 `@include when-mobile`。
- 新增图表类型：只改 `echart.vue` 的 `echarts.use` 与 `EChartOption`。

## 改造纪律

需要 `@/api` 字段名的 `option` 组装留在 `views/` 或 `components/<domain>/`，**不要**写进 `echart.vue`。判定标准：**脱离业务能否单独跑起来**。
