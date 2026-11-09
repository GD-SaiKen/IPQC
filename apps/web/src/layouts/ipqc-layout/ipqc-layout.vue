<template>
  <div class="ipqc-app" :class="{ 'board-mode': boardMode }">
    <aside v-show="!boardMode" class="ipqc-side">
      <div class="ipqc-logo">
        <strong>IPQC</strong>
        <span>智能质量工作台</span>
      </div>
      <nav class="ipqc-nav">
        <template v-if="store.workshop === '全部'">
          <div class="nav-grp">总看板</div>
          <router-link class="nav-item" :class="{ on: route.name === 'board' }" to="/board">
            月度目视化
          </router-link>
          <div class="nav-grp">车间子工作台</div>
          <button
            v-for="w in WORKSHOPS"
            :key="w.key"
            type="button"
            class="nav-item ws-enter"
            @click="enterWorkshop(w.key)"
          >
            <i class="wsdot" :style="{ background: w.color }" />
            {{ w.name }}
            <span class="cnt">进入</span>
          </button>
        </template>
        <template v-else>
          <div class="nav-grp ws-grp">
            <i class="wsdot" :style="{ background: currentWs?.color }" />
            {{ currentWs?.name }} · 子工作台
          </div>
          <router-link
            v-for="item in subNav"
            :key="item.name"
            class="nav-item"
            :class="{ on: route.name === item.name }"
            :to="{ name: item.name, query: { ws: store.workshop } }"
          >
            {{ item.label }}
          </router-link>
          <div class="nav-grp">切换车间</div>
          <button type="button" class="nav-item" @click="backToBoard">← 返回总看板</button>
        </template>
        <div class="nav-grp">系统</div>
        <router-link class="nav-item" :class="{ on: route.name === 'data' }" to="/data">数据与设置</router-link>
      </nav>
    </aside>

    <section class="ipqc-main">
      <header class="ipqc-top">
        <h1>{{ pageTitle }}</h1>
        <div class="ws-chips">
          <button
            v-for="w in chipList"
            :key="w"
            type="button"
            class="chip"
            :class="{ on: store.workshop === w }"
            @click="onChip(w)"
          >
            {{ w === '全部' ? '全部车间' : w }}
          </button>
        </div>
        <div class="top-actions">
          <span v-if="store.lastSavedAt" class="save-hint">已保存 {{ store.lastSavedAt }}</span>
          <el-button text @click="boardMode = !boardMode">{{ boardMode ? '显示侧栏' : '看板模式' }}</el-button>
        </div>
      </header>
      <main class="ipqc-view">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkshopRoute } from '@/composables/use-workshop-route'
import { WORKSHOPS, WS_MAP } from '@/domain/ipqc/workshops'
import { useIpqcStore } from '@/stores/ipqc'
import type { WorkshopFilter } from '@/domain/ipqc/types'

const route = useRoute()
const store = useIpqcStore()
const { enterWorkshop, backToBoard } = useWorkshopRoute()
const boardMode = ref(false)

const subNav = [
  { name: 'dash', label: '车间总览' },
  { name: 'fa', label: '首件巡检检验' },
  { name: 'fqc', label: '终检报告 FQC' },
  { name: 'cmp', label: '零件投诉闭环' },
  { name: 'chk', label: '关键点检排名' },
  { name: 'trn', label: '培训与技能' },
  { name: 'perf', label: '工作绩效' },
]

const currentWs = computed(() => WS_MAP[store.workshop])
const chipList = computed(() => ['全部', ...WORKSHOPS.map((w) => w.key)] as WorkshopFilter[])
const pageTitle = computed(() => (route.meta.title as string) || 'IPQC')

function onChip(w: WorkshopFilter) {
  if (w === '全部') backToBoard()
  else enterWorkshop(w)
}
</script>
