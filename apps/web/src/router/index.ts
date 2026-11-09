import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/default-layout/index.vue'),
    children: [
      {
        path: '',
        redirect: '/board',
      },
      {
        path: 'board',
        name: 'board',
        component: () => import('@/views/board/index.vue'),
        meta: { title: '总看板', viewKey: 'board', workshopMode: 'all' },
      },
      {
        path: 'dash',
        name: 'dash',
        component: () => import('@/views/dash/index.vue'),
        meta: {
          title: '车间总览',
          viewKey: 'dash',
          workshopMode: 'workshop',
          parent: { name: 'board' },
        },
      },
      {
        path: 'fa',
        name: 'fa',
        component: () => import('@/views/fa/index.vue'),
        meta: {
          title: '首件巡检检验',
          viewKey: 'fa',
          workshopMode: 'workshop',
          parent: { name: 'dash' },
        },
      },
      {
        path: 'fqc',
        name: 'fqc',
        component: () => import('@/views/fqc/index.vue'),
        meta: {
          title: '终检报告 FQC',
          viewKey: 'fqc',
          workshopMode: 'workshop',
          parent: { name: 'dash' },
        },
      },
      {
        path: 'cmp',
        name: 'cmp',
        component: () => import('@/views/cmp/index.vue'),
        meta: {
          title: '零件投诉闭环',
          viewKey: 'cmp',
          workshopMode: 'workshop',
          parent: { name: 'dash' },
        },
      },
      {
        path: 'chk',
        name: 'chk',
        component: () => import('@/views/chk/index.vue'),
        meta: {
          title: '关键点检排名',
          viewKey: 'chk',
          workshopMode: 'workshop',
          parent: { name: 'dash' },
        },
      },
      {
        path: 'trn',
        name: 'trn',
        component: () => import('@/views/trn/index.vue'),
        meta: {
          title: '培训与技能',
          viewKey: 'trn',
          workshopMode: 'workshop',
          parent: { name: 'dash' },
        },
      },
      {
        path: 'perf',
        name: 'perf',
        component: () => import('@/views/perf/index.vue'),
        meta: {
          title: '工作绩效',
          viewKey: 'perf',
          workshopMode: 'workshop',
          parent: { name: 'dash' },
        },
      },
      {
        path: 'data',
        name: 'data',
        component: () => import('@/views/data/index.vue'),
        meta: { title: '数据与设置', viewKey: 'data', workshopMode: 'any' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const ws = (to.query.ws as string) || '全部'
  const mode = to.meta.workshopMode as string | undefined
  if (mode === 'workshop' && (!ws || ws === '全部')) {
    return { path: '/board', query: { ws: '全部' } }
  }
  if (mode === 'all' && ws !== '全部' && to.name !== 'data') {
    /* 车间子页由布局导航进入 */
  }
  return true
})
