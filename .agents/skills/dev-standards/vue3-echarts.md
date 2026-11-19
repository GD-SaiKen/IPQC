# Vue 3 + Element Plus — ECharts 落地

契约（分工、看板骨架、option 约定）见 [echarts.md](echarts.md)。本文只写 Vue 3 依赖、目录与页面写法。源码模板见 [`knowledge/echarts/vue3/`](knowledge/echarts/vue3/)。

## 1. 前置

- Vue **3.4+**、`<script setup lang="ts">`、Vite。
- 依赖：`echarts@^5` 或 `^6`（与 mold 一致可用 `^6.1`）。**不要**再装 `vue-echarts`；用项目内 `echart.vue` 包装即可。
- Element Plus：`ChartsPanel` 用 `@element-plus/icons-vue` 的 `ArrowDown`。
- 无 SSR 要求；图表仅客户端挂载。

## 2. 文件清单

```text
src/components/kpi-board/
└── kpi-board.vue           # KpiItem / KpiTone

src/components/echart/
└── echart.vue              # 按需注册 + EChartOption + click

src/components/chart-card/
└── chart-card.vue

src/components/charts-panel/
└── charts-panel.vue

src/styles/mixins.scss      # 合并 knowledge/echarts/dashboard-mixins.snippet.scss
```

领域多张图可放 `src/components/<feature>/<feature>-charts.vue`（同步 import `Echart`，不必 async）。

## 3. `echart.vue` 要点

```ts
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
```

- `onMounted`：`echarts.init(el)` → `chart.on('click', …)` → `ResizeObserver` → `chart.resize()`。
- `watch(() => props.option, render, { deep: true })`；`render` 里 `setOption(option, { notMerge: true })`。
- `onBeforeUnmount`：`observer.disconnect()` + `chart.dispose()`。
- 轴类型从 `echarts` 根包 **type-only** 引入：`XAxisComponentOption`、`YAxisComponentOption`。
- 对外 `defineEmits<{ click: [params: unknown] }>()`。

扩展饼图示例：

```ts
import { PieChart } from 'echarts/charts'
import type { PieSeriesOption } from 'echarts/charts'
echarts.use([..., PieChart])
export type EChartOption = ComposeOption<... | PieSeriesOption>
```

## 4. 页面模板片段

```vue
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import ChartCard from '@/components/chart-card/chart-card.vue'
import ChartsPanel from '@/components/charts-panel/charts-panel.vue'
import type { EChartOption } from '@/components/echart/echart.vue'

const Echart = defineAsyncComponent(() => import('@/components/echart/echart.vue'))

const barOption = computed<EChartOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: categories.value },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{ name: '数量', type: 'bar', barMaxWidth: 36, itemStyle: { color: '#3b6fe0' }, data: counts.value }],
}))
</script>

<template>
  <ChartsPanel>
    <ChartCard title="分布">
      <Echart v-if="counts.length" :option="barOption" height="220px" @click="onBarClick" />
      <div v-else class="chart-card__empty">暂无数据</div>
    </ChartCard>
  </ChartsPanel>
</template>
```

## 5. 点击下钻（类型收窄）

```ts
function onBarClick(params: unknown): void {
  const p = params as { name?: string; dataIndex?: number }
  if (p.dataIndex != null) {
  const row = rows.value[p.dataIndex]
  // 改 filters、pagination.page、expandRowKeys…
}
```

echarts 的 `params` 形态随 series 而异；页面只取用到的字段，勿把整个 `params` 塞进 store。

## 6. 与 `trend-charts` 类子组件

- 父页：`ChartsPanel` 内 **一个** `ChartCard` 或直接插槽子组件；子组件根 `grid-column: 1 / -1`，内部 2 列放两个 `Echart`。
- 子组件 **同步** `import EChart from '@/components/echart/echart.vue'`（父页已 async 时，子 chunk 会随面板加载；若面板默认展开，也可在子组件里 async）。
- 折线共用 `buildOption(field)`，系列元数据 `as const` 数组驱动 `legend` + `series`。

## 7. 单测 stub

```ts
import { mount } from '@vue/test-utils'

mount(Page, {
  global: {
    stubs: { ChartsPanel: true, ChartCard: true, Echart: true },
  },
})
```

## 8. 参考实现（mold 仓库）

| 页面 | 图表 |
|------|------|
| `views/workload/index.vue` | 堆叠柱、横向 Top 条、点击切工种 / 展开师傅 |
| `views/projects/index.vue` | 阶段单柱、Top 项目柱；`v-if` 无模具空态 |
| `views/admin/usage/index.vue` | 角色堆叠柱、登录 Top 横条 |
| `components/statistics/trend-charts.vue` | 双折线趋势、`null` 断点 |
