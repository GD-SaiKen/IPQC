import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getCurrentUser } from '@/api/auth'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import { authState, setAuthUser } from '@/stores/auth'

const WS_KEYS = new Set<string>(['全部', ...WORKSHOPS.map((w) => w.key)])

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
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
      {
        path: 'data/data-hub/callback',
        name: 'data-hub-callback',
        component: () => import('@/views/data/data-hub-callback.vue'),
        meta: { title: '连接 data-hub', viewKey: 'data', workshopMode: 'any' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

let authResolved = false

router.beforeEach(async (to) => {
  if (to.meta.public) {
    return true
  }

  if (!authResolved) {
    try {
      setAuthUser(await getCurrentUser())
    } catch {
      setAuthUser(null)
    }
    authResolved = true
  }

  if (!authState.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const ws = String(to.query.ws ?? '全部')
  const mode = to.meta.workshopMode
  if (mode === 'workshop' && (ws === '全部' || !WS_KEYS.has(ws))) {
    return { path: '/board', query: { ws: '全部' } }
  }

  return true
})

export function markAuthResolved(): void {
  authResolved = true
}

export function resetAuthResolved(): void {
  authResolved = false
}
