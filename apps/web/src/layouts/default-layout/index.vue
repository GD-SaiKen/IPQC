<template>
  <div class="app-layout" :class="{ 'board-mode': boardMode }">
    <aside v-show="!boardMode" class="sidebar" :class="{ 'is-collapsed': collapsed }">
      <div class="logo">
        <div class="logo-icon logo-mark" aria-hidden="true">QA</div>
        <div class="logo-text">
          <strong>IPQC 智能工作台</strong>
          <span>品质保证部 · 前制程</span>
        </div>
      </div>

      <nav class="menu">
        <template v-for="group in menuGroups" :key="group.title">
          <div class="menu-group">
            <span class="mg-dot" :style="{ background: group.dot }" />
            <span class="mg-label">{{ group.title }}</span>
          </div>
          <div
            v-for="item in group.items"
            :key="item.key"
            class="menu-item"
            :class="{ active: isActive(item) }"
            :title="collapsed ? item.label : undefined"
            @click="onMenuClick(item)"
          >
            <span class="mi-icon">
              <el-icon :size="16"><component :is="resolveIcon(item.icon)" /></el-icon>
            </span>
            <span class="mi-label">{{ item.label }}</span>
            <span v-if="item.badge" class="mi-badge">{{ item.badge }}</span>
          </div>
        </template>
      </nav>
    </aside>

    <section class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button
            v-show="!boardMode"
            class="nav-toggle"
            :class="{ 'is-expanded': !showFold }"
            type="button"
            :aria-label="toggleLabel"
            :title="toggleLabel"
            @click="toggle"
          >
            <span class="nav-icon nav-icon-fold">
              <el-icon :size="20"><Fold /></el-icon>
            </span>
            <span class="nav-icon nav-icon-expand">
              <el-icon :size="20"><Expand /></el-icon>
            </span>
          </button>

          <div class="crumb">
            <button
              v-if="parentCrumb"
              class="tb-back"
              type="button"
              aria-label="返回"
              :title="`返回${parentCrumb.label}`"
              @click="goBack"
            >
              <el-icon :size="18"><ArrowLeft /></el-icon>
            </button>
            <div class="tb-title-wrap">
              <el-tooltip
                placement="bottom-start"
                :content="pageTitle"
                :disabled="!titleOverflow"
                trigger="click"
              >
                <span
                  ref="titleRef"
                  class="tb-title"
                  :class="{ 'is-overflow': titleOverflow }"
                >{{ pageTitle }}</span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <div class="topbar-right">
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
          <span v-if="store.lastSavedAt" class="save-hint">已保存 {{ store.lastSavedAt }}</span>
          <el-button text @click="boardMode = !boardMode">
            {{ boardMode ? '显示侧栏' : '看板模式' }}
          </el-button>
        </div>
      </header>

      <main class="view">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Expand, Fold } from '@element-plus/icons-vue'

import { buildIpqcMenuGroups, isMenuItemActive } from './menu'
import type { NavItem } from './menu'
import { resolveIcon } from './icons'
import { usePageTitle } from '@/composables/use-page-title'
import { useSidebar } from '@/composables/use-sidebar'
import { useWorkshopRoute } from '@/composables/use-workshop-route'
import { WORKSHOPS } from '@/domain/ipqc/workshops'
import type { WorkshopFilter } from '@/domain/ipqc/types'
import { useIpqcStore } from '@/stores/ipqc'

const APP_NAME = '品质保证部 · IPQC 智能工作台'

const route = useRoute()
const router = useRouter()
const store = useIpqcStore()
const { collapsed, toggle } = useSidebar()
const { pageTitle: livePageTitle } = usePageTitle()
const { enterWorkshop, backToBoard } = useWorkshopRoute()
const boardMode = ref(false)

const menuGroups = computed(() => buildIpqcMenuGroups(store.workshop))

const chipList = computed(() => ['全部', ...WORKSHOPS.map((w) => w.key)] as WorkshopFilter[])

function isActive(item: NavItem): boolean {
  return isMenuItemActive(item, route.path, route.name as string | null)
}

function onMenuClick(item: NavItem): void {
  if (item.workshopEnter) {
    enterWorkshop(item.workshopEnter)
    return
  }
  if (item.routeName) {
    const ws = store.workshop
    const query = item.routeName === 'board' || ws === '全部' ? undefined : { ws }
    void router.push({ name: item.routeName, query })
  }
}

const showFold = computed(() => !collapsed.value)
const toggleLabel = computed(() => (collapsed.value ? '展开侧边栏' : '收起侧边栏'))

const pageTitle = computed(
  () => livePageTitle.value || ((route.meta.title as string | undefined) ?? '') || APP_NAME
)

const titleRef = ref<HTMLElement | null>(null)
const titleOverflow = ref(false)

function checkTitleOverflow(): void {
  const el = titleRef.value
  titleOverflow.value = !!el && el.scrollWidth > el.clientWidth + 1
}

function onTitleLayoutChange(): void {
  void nextTick(checkTitleOverflow)
}

const parentCrumb = computed(() => {
  const parent = route.meta.parent as { name: string; query?: Record<string, string> } | undefined
  if (!parent) return null
  const parentRoute = router.getRoutes().find((r) => r.name === parent.name)
  if (!parentRoute) return null
  const query = { ...(parent.query ?? {}) }
  const ws = route.query.ws as string | undefined
  if (ws && ws !== '全部' && parent.name !== 'board') {
    query.ws = ws
  }
  return {
    label: (parentRoute.meta.title as string | undefined) ?? String(parent.name),
    to: { name: parent.name, query },
  }
})

watch(() => [pageTitle.value, route.path, route.meta.parent], onTitleLayoutChange)

function goBack(): void {
  if (!parentCrumb.value) return
  const state = window.history.state as { back?: unknown } | null
  if (state && state.back != null) router.back()
  else void router.push(parentCrumb.value.to)
}

function onChip(w: WorkshopFilter): void {
  if (w === '全部') backToBoard()
  else enterWorkshop(w)
}

watch(
  () => pageTitle.value,
  (title) => {
    document.title = title && title !== APP_NAME ? `${title} · ${APP_NAME}` : APP_NAME
  },
  { immediate: true }
)

onMounted(() => {
  onTitleLayoutChange()
  window.addEventListener('resize', checkTitleOverflow)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkTitleOverflow)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.board-mode .sidebar {
  display: none;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #e3e8f0;
  color: #566070;
  transition: width 0.24s ease, min-width 0.24s ease;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid #e3e8f0;
  overflow: hidden;

  .logo-icon.logo-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 10px rgba(29, 78, 216, 0.25);
  }

  .logo-text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
    min-width: 0;

    strong {
      font-size: 14px;
      font-weight: 600;
      color: #1f2733;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    span {
      font-size: 10px;
      letter-spacing: 0.04em;
      color: #7a8494;
      white-space: nowrap;
    }
  }
}

.menu {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
  overflow-x: hidden;
}

.menu-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 8px 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #7a8494;
  white-space: nowrap;

  .mg-dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 4px;
  font-size: 14px;
  color: #566070;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  .mi-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 20px;
    height: 20px;
  }

  .mi-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mi-badge {
    flex: none;
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: #f56c6c;
    color: #fff;
    font-size: 11px;
    line-height: 18px;
    text-align: center;
  }

  &:hover {
    background: #f1f5fb;
    color: #1f2733;
  }

  &.active {
    background: #eaf1fd;
    color: #3b6fe0;
  }
}

.sidebar.is-collapsed {
  width: 64px;
  min-width: 64px;

  .logo {
    justify-content: center;
    padding: 0;

    .logo-text {
      display: none;
    }
  }

  .menu {
    padding: 12px 8px;
  }

  .menu-group {
    justify-content: center;
    padding: 8px 0;
    gap: 0;

    .mg-dot {
      width: 4px;
      height: 4px;
    }

    .mg-label {
      display: none;
    }
  }

  .menu-item {
    justify-content: center;
    padding: 10px 0;

    .mi-label,
    .mi-badge {
      display: none;
    }
  }
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  gap: 12px;
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid #e3e8f0;
  background: #ffffff;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.nav-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  overflow: hidden;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: transparent;
  color: #566070;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover {
    border-color: #3b6fe0;
    background: #eaf1fd;
    color: #3b6fe0;
  }

  .nav-icon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: rotate(-120deg) scale(0.6);
    transition: opacity 0.24s ease, transform 0.24s ease;
  }

  .nav-icon-fold {
    opacity: 1;
    transform: rotate(0) scale(1);
  }

  &.is-expanded {
    .nav-icon-fold {
      opacity: 0;
      transform: rotate(120deg) scale(0.6);
    }

    .nav-icon-expand {
      opacity: 1;
      transform: rotate(0) scale(1);
    }
  }
}

.crumb {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tb-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: #ffffff;
  color: #566070;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;

  &:hover {
    border-color: #3b6fe0;
    color: #3b6fe0;
  }
}

.tb-title-wrap {
  flex: 1;
  min-width: 0;
  overflow: hidden;

  :deep(.el-tooltip__trigger) {
    display: block;
    max-width: 100%;
    overflow: hidden;
  }
}

.tb-title {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 17px;
  font-weight: 600;
  color: #1f2733;

  &.is-overflow {
    cursor: pointer;
  }
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  max-width: 55%;
}

.ws-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.chip {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #566070;

  &.on {
    background: #3b6fe0;
    color: #fff;
    border-color: #3b6fe0;
  }
}

.save-hint {
  font-size: 12px;
  color: #7a8494;
  white-space: nowrap;
}

.view {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow: hidden;
  background: #f4f7fb;
}
</style>
