<!--
  看板整页示例：KpiBoard + ChartsPanel + dashboard-detail-panel。
  页面 SCSS 需 @use dashboard-mixins 并 @include dashboard-page-layout / dashboard-detail-panel。
-->
<template>
  <div v-loading="loading" class="demo-dashboard-page" element-loading-text="加载中…">
    <KpiBoard :items="kpiItems" :columns="4" />

    <ChartsPanel>
      <ChartCard title="示例分布">
        <Echart v-if="hasChart" :option="barOption" height="220px" />
        <div v-else class="chart-card__empty">暂无数据</div>
      </ChartCard>
    </ChartsPanel>

    <div class="dashboard-detail-panel">
      <Crud :filter-items="filterItems" v-model:filter-values="filters" :pagination="pagination">
        <template #table>
          <Table :columns="columns" :data="rows" row-key="id" />
        </template>
      </Crud>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref } from 'vue';
import { User } from '@element-plus/icons-vue';
import ChartCard from '@/components/chart-card/chart-card.vue';
import ChartsPanel from '@/components/charts-panel/charts-panel.vue';
import { Crud, Table } from '@/components/crud';
import type { ColumnSchema, FilterItem } from '@/components/crud';
import type { EChartOption } from '@/components/echart/echart.vue';
import KpiBoard, { type KpiItem } from '@/components/kpi-board/kpi-board.vue';

const Echart = defineAsyncComponent(() => import('@/components/echart/echart.vue'));

const loading = ref(false);
const hasChart = ref(true);
const filters = reactive({ keyword: '' });
const rows = ref([{ id: 1, name: '示例' }]);

const filterItems: FilterItem[] = [
  { key: 'keyword', type: 'input', placeholder: '搜索', width: '200px' },
];

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 1,
});

const columns: ColumnSchema[] = [
  { type: 'text', prop: 'name', label: '名称', minWidth: 120 },
];

const kpiItems = computed<KpiItem[]>(() => [
  { value: rows.value.length, label: '条数', icon: User, tone: 'primary' },
]);

const barOption = computed<EChartOption>(() => ({
  grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: ['A', 'B'] },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{ type: 'bar', data: [1, 2], barMaxWidth: 36, itemStyle: { color: '#3b6fe0' } }],
}));
</script>

<style lang="scss" scoped>
@use '../dashboard-mixins.snippet.scss' as dashboard;

.demo-dashboard-page {
  @include dashboard.dashboard-page-layout;
}

.dashboard-detail-panel {
  @include dashboard.dashboard-detail-panel;
  @include dashboard.dashboard-table-rows;
}
</style>
