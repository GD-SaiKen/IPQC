<template>
  <!--
    后台管理壳层：侧边栏 + 顶栏 + 路由出口。复制到 src/layouts/default-layout/index.vue
    - 桌面端专用，无 ≤760px 抽屉分支
    - 高链：.app-layout(100%) → .main(flex:1, column) → .view(flex:1, min-height:0)
    - .view 不滚（overflow: hidden），滚动权在页面：列表页滚表格、表单页滚 body、详情页整页滚
  -->
  <div class="app-layout">
    <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
      <div class="logo">
        <div class="logo-icon" aria-hidden="true">
          <img class="logo-mark" src="/brand-mark.svg" width="32" height="32" alt="" />
        </div>
        <div class="logo-text">
          <strong>{{ appName }}</strong>
          <span v-if="appNameEn">{{ appNameEn }}</span>
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
          <!-- 折叠钮：两个图标绝对定位叠住，按状态交叉淡入淡出，不闪 -->
          <button
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
          <slot name="topbar-right" />
          <el-dropdown trigger="click" @command="onUserCommand">
            <div class="user">
              <span class="avatar">{{ avatarChar }}</span>
              <div class="u-info">
                <span class="u-name">{{ displayName }}</span>
                <span v-if="displayRole" class="u-role">{{ displayRole }}</span>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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
import { ArrowLeft, Expand, Fold, SwitchButton, User } from '@element-plus/icons-vue'

import { NAV_GROUPS, filterMenuGroups, isMenuItemActive } from './menu'
import type { NavItem } from './menu'
import { resolveIcon } from './icons'
import { useSession, useUserDisplay } from './session'
import { usePageTitle } from '../../composables/use-page-title'
import { useSidebar } from '../../composables/use-sidebar'

const props = withDefaults(
  defineProps<{
    /** 应用名，显示在侧栏 logo 与 document.title 后缀 */
    appName: string
    /** 侧栏 logo 的第二行（英文名 / 副标题），不传则只显示一行 */
    appNameEn?: string
    /** 菜单白名单（key 数组）。不传表示不过滤 */
    allowedKeys?: string[]
    /** 菜单角标：{ 菜单 key: 数量 }。壳不负责算这些数 */
    badges?: Record<string, number>
    /** 退出登录后跳到哪 */
    loginRoute?: string
    /** 「个人信息」菜单跳到哪 */
    profileRoute?: string
  }>(),
  {
    appNameEn: '',
    allowedKeys: undefined,
    badges: () => ({}),
    loginRoute: '/login',
    profileRoute: '/profile',
  },
)

const route = useRoute()
const router = useRouter()
const { collapsed, toggle } = useSidebar()
const { pageTitle: livePageTitle } = usePageTitle()
const { logout } = useSession()
const { avatarChar, displayName, displayRole } = useUserDisplay()

// ==================== 菜单 ====================

const menuGroups = computed(() => {
  const groups = filterMenuGroups(NAV_GROUPS, props.allowedKeys)
  // 角标由外部注入，菜单数据本身保持常量
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      badge: props.badges[item.key] || undefined,
    })),
  }))
})

function isActive(item: NavItem): boolean {
  return isMenuItemActive(item, route.path, route.name)
}

function onMenuClick(item: NavItem): void {
  if (item.routeName) {
    void router.push({ name: item.routeName })
    return
  }
  // 跳当前路由会重复导航，必须先比一下
  if (route.path !== item.route) void router.push(item.route)
}

// ==================== 折叠钮 ====================

/** 展开态显示 Fold（点它收起），折叠态显示 Expand */
const showFold = computed(() => !collapsed.value)
const toggleLabel = computed(() => (collapsed.value ? '展开侧边栏' : '收起侧边栏'))

// ==================== 标题 ====================

const pageTitle = computed(
  () => livePageTitle.value || ((route.meta.title as string | undefined) ?? '') || props.appName,
)

/** 单行省略的溢出判定：+1 是舍入容差，不写会在刚好撑满时误判 */
const titleRef = ref<HTMLElement | null>(null)
const titleOverflow = ref(false)

function checkTitleOverflow(): void {
  const el = titleRef.value
  titleOverflow.value = !!el && el.scrollWidth > el.clientWidth + 1
}

function onTitleLayoutChange(): void {
  void nextTick(checkTitleOverflow)
}

// 三个触发点缺一不可：标题变了（内容变宽）、路由变了（返回钮显隐改变可用宽）、窗口变了
watch(() => [pageTitle.value, route.path], onTitleLayoutChange)

// ==================== 返回 ====================

const parentCrumb = computed(() => {
  const parent = route.meta.parent as { name: string; query?: Record<string, string> } | undefined
  if (!parent) return null
  const parentRoute = router.getRoutes().find((r) => r.name === parent.name)
  if (!parentRoute) return null
  return {
    label: (parentRoute.meta.title as string | undefined) ?? parent.name,
    to: { name: parent.name, query: parent.query ?? {} },
  }
})

/**
 * 优先回退：同一个二级页常能从多个入口进来，回退才符合直觉。
 * 无站内历史（直接刷新 / 新标签打开）时才 push 到 meta.parent。
 */
function goBack(): void {
  if (!parentCrumb.value) return
  const state = window.history.state as { back?: unknown } | null
  if (state && state.back != null) router.back()
  else void router.push(parentCrumb.value.to)
}

// ==================== 用户区 ====================

function onUserCommand(command: string): void {
  if (command === 'logout') {
    logout()
    void router.push(props.loginRoute)
    return
  }
  if (command === 'profile') void router.push(props.profileRoute)
}

// ==================== 文档标题 ====================

watch(
  () => pageTitle.value,
  (title) => {
    document.title = title && title !== props.appName ? `${title} · ${props.appName}` : props.appName
  },
  { immediate: true },
)

// ==================== 生命周期 ====================

onMounted(() => {
  onTitleLayoutChange()
  window.addEventListener('resize', checkTitleOverflow)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkTitleOverflow)
})
</script>

<style lang="scss" scoped>
/* ==================== 高度链 ==================== */
.app-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

/* ==================== 侧边栏 ==================== */
.sidebar {
  display: flex;
  flex-direction: column;
  /* width 与 min-width 必须一起改，只改 width 会被内容撑回去 */
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

  .logo-icon {
    display: flex;
    flex: none;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border-radius: 4px;
  }

  .logo-mark {
    display: block;
    width: 32px;
    height: 32px;
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

/* ---- 折叠态：64px 图标栏 ---- */
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

    /* 用 display:none 而不是 opacity:0，否则仍占位会挤出一条滚动条 */
    .mi-label,
    .mi-badge {
      display: none;
    }
  }
}

/* ==================== 主区 ==================== */
.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

/* ==================== 顶栏 ==================== */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
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

/* 折叠钮：白底上必须常显描边，否则和背景融为一体 */
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

  /* 两态图标交叉：各占一格绝对定位，按状态淡入淡出 + 旋转归位 */
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

  /* tooltip 触发器要占满可用宽度，否则和 .tb-title 一起被内容宽度收缩，省略号不出来 */
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
  gap: 16px;
  flex: none;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #3b6fe0;
    color: #fff;
    font-size: 13px;
  }

  .u-info {
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    .u-name {
      font-size: 13px;
      color: #1f2733;
    }

    .u-role {
      font-size: 11px;
      color: #7a8494;
    }
  }
}

/* ==================== 内容区 ==================== */
/* 滚动权在页面：这里不滚，否则列表页会出现「外层 + 表格内」双滚动条 */
.view {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow: hidden;
}
</style>
