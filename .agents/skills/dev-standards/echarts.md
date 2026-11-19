# ECharts 看板图表（KPI 区下的分析图）

桌面管理端统计 / 负载 / 总览页，在 KPI 行之下用 **echarts 按需加载 + 三件套布局** 展示柱状图、折线图；页面只组装 `option`，不在页面里 `echarts.init`。

本文是与框架无关的契约。Vue 3 落地见 [vue3-echarts.md](vue3-echarts.md)；可拷贝源码见 [`knowledge/echarts/`](knowledge/echarts/)。

**明确不做**：流程画布、节点图、甘特、mermaid / vue-flow；移动端 H5 不走本套（见 [vant.md](vant.md)）。**不要**在页面或其它组件里二次 `import 'echarts'` 全量注册。

## 1. 分工

| 层 | 负责 | 不负责 |
|----|------|--------|
| 页面 `views/<page-kebab>/index.vue` | 拉数、`computed` 出 `EChartOption`、空态判断、点击下钻联动筛选/展开 | `init` / `dispose` / `resize` |
| `components/echart/echart.vue` | 按需 `echarts.use`、实例生命周期、`setOption`、`ResizeObserver`、`click` 透传 | 业务配色表以外的领域逻辑 |
| `components/chart-card/`、`components/charts-panel/` | 标题卡片、折叠面板、两列网格、`full` 通栏 | 发请求 |
| 领域子组件（如 `statistics/trend-charts.vue`） | 多张同构折线、占满 `ChartsPanel` 一行 | 改共享 `echart.vue` 注册表 |

一句话：**图表引擎只在 `echart.vue` 里碰一次；页面写 option，布局写壳组件。**

## 2. 五件套与支撑

| 组件 | 路径 | 职责 |
|------|------|------|
| `KpiBoard` | `components/kpi-board/kpi-board.vue` | KPI 指标卡行；导出 `KpiItem` / `KpiTone` |
| `Echart` | `components/echart/echart.vue` | 唯一 echarts 入口；导出 `EChartOption` 类型 |
| `ChartCard` | `components/chart-card/chart-card.vue` | 副标题 + 默认插槽；`full` 占满网格一整行 |
| `ChartsPanel` | `components/charts-panel/charts-panel.vue` | 可折叠「图表分析」区；`body` 为 2 列 grid |
| 看板 mixin | 项目 `styles/mixins.scss`（自 [`knowledge/echarts/dashboard-mixins.snippet.scss`](knowledge/echarts/dashboard-mixins.snippet.scss) 合并） | `dashboard-page-layout` / `dashboard-detail-panel` / `dashboard-table-rows` |

`ChartCard` 与 `ChartsPanel` **不含** echarts 依赖，可单独用于列表型 `full` 槽（近 3 天到期、角色活跃率列表等）。

## 3. 看板页骨架

与 [crud.md](crud.md) 列表明细配合时，推荐统一骨架（ mold 项目称 **看板页**）：

```text
<div class="xxx-page" v-loading="loading">
  <KpiBoard :items="kpiItems" />
  <ChartsPanel>                    <!-- 可选；v-if 权限 / 视图 -->
    <ChartCard title="…">
      <Echart v-if="hasData" … />
      <div v-else class="chart-card__empty">暂无…</div>
    </ChartCard>
    <ChartCard title="…" full> … </ChartCard>
  </ChartsPanel>
  <div class="dashboard-detail-panel">
    <Crud>…</Crud>
  </div>
</div>
```

- 页面根：`@include dashboard-page-layout`（片段见 knowledge）。
- 明细区：统一 `class="dashboard-detail-panel"` + `@include dashboard-detail-panel`，内嵌 `Crud` + `Table`，表格在面板内滚动。
- 需要 44px 行高时：`@include dashboard-table-rows`。
- **不要**为每个看板页再造 `xxx-panel` 私有面板 class。

`KpiItem` 由页面 `computed` 组装：`value` / `label` / `icon`（`@element-plus/icons-vue` 组件）/ 可选 `tone` / 可选 `onClick`+`active` 做可点筛选卡。

## 4. 页面六件事（写图表时）

1. **异步加载** `Echart`：`defineAsyncComponent(() => import('@/components/echart/echart.vue'))`。echarts 体积大，面板默认折叠时首屏可省 chunk。
2. **类型**：`import type { EChartOption } from '@/components/echart/echart.vue'`；`const fooOption = computed<EChartOption>(() => ({ … }))`。
3. **空态**：无数据时不挂载 `Echart`，用 `ChartCard` 内 `div.chart-card__empty`（文案由页面写）。不要用全 0 数组「画一根 flat 柱」冒充无数据。
4. **计数轴**：任务数、套数等用 `yAxis: { minInterval: 1 }`（或横向图的 `xAxis` value 轴）。
5. **null 与断点**：比率缺失用 `null` 进 series，`connectNulls: false`；tooltip 的 `valueFormatter` 对 `null` 显示 `—`。不要用 `0` 冒充「无样本」。
6. **下钻**：`@click` 里把 `params` 收窄为 `{ name?, dataIndex? }`，改筛选 / 分页 / `expandRowKeys`，必要时 `scrollIntoView` 明细区。

## 5. option 约定（本项目已用形态）

在共享组件已注册 **Bar + Line + Grid + Tooltip + Legend + Canvas** 的前提下，页面 option 保持克制：

| 场景 | 形态 | 备注 |
|------|------|------|
| 类目单柱 | `xAxis: category` + `series: [{ type: 'bar', barMaxWidth: 36 }]` | 主色常用 `#3b6fe0` |
| 堆叠柱 | 同一 `stack` + 两段 `bar` | 如在办 / 超期、活跃 / 未活跃 |
| 横向 Top N | `yAxis: category` + `xAxis: value`；**数据 reverse** 让最大值在上 |
| 多折线趋势 | `legend` + 多 `line`；主轴 `0–100` + `axisLabel: '{value}%'` | 月份 label 在页面拼 |
| grid | `containLabel: true`，`left/right/top/bottom` 偏小边距 | 勿让轴标签被裁切 |

新增图表类型（饼图、仪表盘等）：**只改** `echart.vue` 的 `echarts.use([…])` 与 `EChartOption` 联合类型，不在页面散落 `import from 'echarts/charts'`。

`setOption` 使用 `{ notMerge: true }`（组件内已固定）：页面改 option 时整包替换，避免残留 series。

## 6. ChartsPanel 布局规则

- 默认 **2 列** grid；`ChartCard--full` 或子组件根上 `grid-column: 1 / -1` 占满一行。
- 一行内要放 **两张并排图** 时：可抽成单一子组件（内部再 `grid-template-columns: 1fr 1fr`），子组件根也需 `grid-column: 1 / -1`（见趋势双折线）。
- `ChartsPanel` 默认 `defaultOpen: false`；需要首屏展开的页传 `default-open`。

## 7. 样式与主题

- 图表区壳层优先用 **`var(--el-*)`** 与 Element Plus 对齐；禁止在看板页另起一套色板 / 阴影 / 圆角体系。
- series `itemStyle.color` 可用业务语义色（超期 `#d64545`、警告 `#d9822b`），与 KPI `tone` 一致即可。
- `Echart` 默认高度 `240px`；看板卡片内常用 `220px` / `280px`，由 props `height` 传入。

## 8. 测试

- 页面单测：`stubs: { Echart: true, ChartCard: true, ChartsPanel: true }`（或只 stub `Echart`），不断言 canvas。
- 不为 echarts 写像素级快照；重要逻辑测 **computed option 的 data 映射** 可抽纯函数单测。

## 9. 通用层与项目私有

| 内容 | 归属 |
|------|------|
| init/dispose/resize、按需注册、点击透传 | **通用** `echart.vue` |
| 折叠面板、卡片标题、空态 class 名 | **通用** `chart-card` / `charts-panel` |
| 柱颜色、类目字段、下钻改哪个筛选项 | **页面**或 **领域** `components/<domain>/…-charts.vue` |
| `KpiBoard`、看板 mixin 片段 | **通用** [`knowledge/echarts/`](knowledge/echarts/) |
| 领域 KPI 字段映射（读哪个 API、点击切什么筛选） | **页面** |

判定标准：**换一张看板还能用 → 通用；依赖 `@/api` 字段名 → 页面。**
