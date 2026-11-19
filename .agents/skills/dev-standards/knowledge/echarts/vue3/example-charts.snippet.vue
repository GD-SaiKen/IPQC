<!--
  看板页图表区示例片段：拷到 views/<page>/index.vue 的 ChartsPanel 内，接真实 API 后替换 demoData。
  契约见 dev-standards/echarts.md
-->
<template>
  <ChartsPanel>
    <ChartCard title="类目分布（示例柱）">
      <Echart v-if="demoData.length" :option="barOption" height="220px" @click="onBarClick" />
      <div v-else class="chart-card__empty">暂无数据</div>
    </ChartCard>
    <ChartCard title="Top 排行（示例横条）">
      <Echart v-if="demoData.length" :option="hbarOption" height="220px" />
      <div v-else class="chart-card__empty">暂无数据</div>
    </ChartCard>
  </ChartsPanel>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import ChartCard from '@/components/chart-card/chart-card.vue';
import ChartsPanel from '@/components/charts-panel/charts-panel.vue';
import type { EChartOption } from '@/components/echart/echart.vue';

const Echart = defineAsyncComponent(() => import('@/components/echart/echart.vue'));

const demoData = ref([
  { name: 'A', value: 12 },
  { name: 'B', value: 8 },
  { name: 'C', value: 3 },
]);

const barOption = computed<EChartOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: demoData.value.map((d) => d.name) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: '数量',
      type: 'bar',
      barMaxWidth: 36,
      itemStyle: { color: '#3b6fe0' },
      data: demoData.value.map((d) => d.value),
    },
  ],
}));

const hbarOption = computed<EChartOption>(() => {
  const sorted = [...demoData.value].sort((a, b) => a.value - b.value);
  return {
    tooltip: {},
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: sorted.map((d) => d.name) },
    series: [
      {
        name: '数量',
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: { color: '#3b6fe0' },
        data: sorted.map((d) => d.value),
      },
    ],
  };
});

function onBarClick(params: unknown): void {
  const p = params as { name?: string };
  if (p.name) console.debug('drill:', p.name);
}
</script>
