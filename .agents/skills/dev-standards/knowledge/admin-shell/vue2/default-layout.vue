<template>
  <!--
    后台管理壳层：侧边栏 + 顶栏 + 路由出口。复制到 src/layouts/default-layout.vue
    - 桌面端专用，无 ≤760px 抽屉分支
    - 高链：.app-layout(100%) → .main(flex:1, column) → .view(flex:1, min-height:0)
    - .view 不滚（overflow: hidden），滚动权在页面：列表页滚表格、表单页滚 body、详情页整页滚
    - Element UI 2 的图标是字体类名，所以用 <i :class="item.icon" />，不是 <component :is>
  -->
  <div class="app-layout">
    <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
      <div class="logo">
        <div class="logo-icon"><i class="el-icon-s-tools" /></div>
        <div class="logo-text">
          <strong>{{ appName }}</strong>
          <span v-if="appNameEn">{{ appNameEn }}</span>
        </div>
      </div>

      <nav class="menu">
        <template v-for="group in menuGroups">
          <div :key="group.title + '-group'" class="menu-group">
            <span class="mg-dot" :style="{ background: group.dot }" />
            <span class="mg-label">{{ group.title }}</span>
          </div>
          <div
            v-for="item in group.items"
            :key="item.key"
            class="menu-item"
            :class="{ active: isActive(item) }"
            :title="collapsed ? item.label : ''"
            @click="onMenuClick(item)"
          >
            <span class="mi-icon"><i :class="item.icon" /></span>
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
            @click="toggleSidebar"
          >
            <span class="nav-icon nav-icon-fold"><i class="el-icon-s-fold" /></span>
            <span class="nav-icon nav-icon-expand"><i class="el-icon-s-unfold" /></span>
          </button>

          <div class="crumb">
            <button
              v-if="parentName"
              class="tb-back"
              type="button"
              aria-label="返回"
              :title="'返回' + parentTitle"
              @click="goBack"
            >
              <i class="el-icon-arrow-left" />
            </button>
            <div class="tb-title-wrap">
              <el-tooltip
                placement="bottom-start"
                :content="pageTitle"
                :disabled="!titleOverflow"
                trigger="click"
              >
                <span ref="title" class="tb-title" :class="{ 'is-overflow': titleOverflow }">
                  {{ pageTitle }}
                </span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <div class="topbar-right">
          <slot name="topbar-right" />
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user">
              <span class="avatar">{{ avatarChar }}</span>
              <div class="user-info">
                <span class="user-name">{{ operatorName }}</span>
                <span v-if="operatorRole" class="user-role">{{ operatorRole }}</span>
              </div>
            </div>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="profile" icon="el-icon-user">个人信息</el-dropdown-item>
              <el-dropdown-item command="logout" icon="el-icon-switch-button">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </header>

      <main class="view">
        <router-view />
      </main>
    </section>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { NAV_GROUPS, filterMenuGroups, isMenuItemActive } from './menu';
import type { NavGroup, NavItem } from './menu';
import { pageTitleState } from '@/domain/page-title';
import {
  getAvatarChar,
  getOperatorName,
  getOperatorRole,
  signOut,
  sessionState,
} from '@/domain/session';

const STORAGE_KEY = 'app:sidebar-collapsed';

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default Vue.extend({
  name: 'DefaultLayout',
  props: {
    appName: { type: String, required: true },
    appNameEn: { type: String, default: '' },
    /** 菜单白名单（key 数组）。不传表示不过滤 */
    allowedKeys: { type: Array as PropType<string[]>, default: undefined },
    /** 菜单角标：{ 菜单 key: 数量 }。壳不负责算这些数 */
    badges: { type: Object as PropType<Record<string, number>>, default: () => ({}) },
    loginRoute: { type: String, default: '/login' },
    profileRoute: { type: String, default: '/profile' },
  },
  data() {
    return {
      collapsed: readStoredCollapsed(),
      titleOverflow: false,
    };
  },
  computed: {
    menuGroups(): NavGroup[] {
      const allowed = this.allowedKeys as string[] | undefined;
      const groups = filterMenuGroups(NAV_GROUPS, allowed);
      // 角标由外部注入，菜单数据本身保持常量
      return groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          badge: (this.badges as Record<string, number>)[item.key] || undefined,
        })),
      }));
    },
    /** 展开态显示 fold（点它收起），折叠态显示 unfold */
    showFold(): boolean {
      return !this.collapsed;
    },
    toggleLabel(): string {
      return this.collapsed ? '展开侧边栏' : '收起侧边栏';
    },
    pageTitle(): string {
      const meta = this.$route.meta || {};
      return (
        pageTitleState.title ||
        (meta.title as string | undefined) ||
        (this.appName as string)
      );
    },
    parentName(): string {
      const meta = this.$route.meta || {};
      return (meta.parent as string | undefined) || '';
    },
    parentTitle(): string {
      if (!this.parentName) return '';
      const found = this.$router
        .getRoutes()
        .find((r) => r.name === this.parentName);
      return (found && (found.meta.title as string | undefined)) || this.parentName;
    },
    operatorName(): string {
      // 依赖 sessionState 保证响应式（getOperatorName 内部读的是它）
      return sessionState.user ? getOperatorName() : '未登录';
    },
    operatorRole(): string {
      return sessionState.user ? getOperatorRole() : '';
    },
    avatarChar(): string {
      return sessionState.user ? getAvatarChar() : '未';
    },
  },
  watch: {
    collapsed(value: boolean) {
      try {
        localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
      } catch {
        /* 存不进去不影响功能 */
      }
    },
    pageTitle: {
      immediate: true,
      handler() {
        this.updateDocumentTitle();
        this.onTitleLayoutChange();
      },
    },
    // 路由变化会改变标题可用宽度（返回钮显隐），必须重算溢出
    $route() {
      this.onTitleLayoutChange();
    },
  },
  mounted() {
    this.onTitleLayoutChange();
    window.addEventListener('resize', this.checkTitleOverflow);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkTitleOverflow);
  },
  methods: {
    toggleSidebar() {
      this.collapsed = !this.collapsed;
    },
    isActive(item: NavItem): boolean {
      return isMenuItemActive(item, this.$route.path);
    },
    onMenuClick(item: NavItem) {
      // 跳当前路由会抛 NavigationDuplicated，必须先比一下
      if (this.$route.path !== item.route) this.$router.push(item.route);
    },
    updateDocumentTitle() {
      const appName = this.appName as string;
      document.title =
        this.pageTitle && this.pageTitle !== appName
          ? `${this.pageTitle} · ${appName}`
          : appName;
    },
    /** 单行省略的溢出判定：+1 是舍入容差，不写会在刚好撑满时误判 */
    checkTitleOverflow() {
      const el = this.$refs.title as HTMLElement | undefined;
      this.titleOverflow = !!el && el.scrollWidth > el.clientWidth + 1;
    },
    onTitleLayoutChange() {
      this.$nextTick(this.checkTitleOverflow);
    },
    /**
     * 优先回退：同一个二级页常能从多个入口进来，回退才符合直觉。
     * 无站内历史（直接刷新 / 新标签打开）时才 push 到 meta.parent。
     */
    goBack() {
      if (!this.parentName) return;
      const state = window.history.state as { back?: unknown } | null;
      if (state && state.back != null) {
        this.$router.back();
        return;
      }
      const meta = this.$route.meta || {};
      const params =
        typeof meta.parentParams === 'function'
          ? (meta.parentParams as (r: unknown) => Record<string, unknown>)(this.$route)
          : {};
      this.$router.push({ name: this.parentName, params });
    },
    handleUserCommand(command: string) {
      if (command === 'logout') {
        signOut();
        this.$router.push(this.loginRoute);
        return;
      }
      if (command === 'profile') this.$router.push(this.profileRoute);
    },
  },
});
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
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    background: #3b6fe0;
    color: #fff;
    font-size: 16px;
  }

  .logo-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.3;

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
  /* IE11 的 flex 不认 gap，靠 margin 兜底间距 */
  margin: 2px 0;
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
    font-size: 16px;
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

    .mi-icon {
      color: #3b6fe0;
    }
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
  flex: 1;
  min-width: 0;
  overflow: hidden;

  > * + * {
    margin-left: 14px;
  }
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
  padding: 0;
  overflow: hidden;
  border: 1px solid #e3e8f0;
  border-radius: 4px;
  background: transparent;
  color: #566070;
  font-size: 18px;
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
  flex: 1;
  min-width: 0;
  overflow: hidden;

  > * + * {
    margin-left: 10px;
  }
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
  font-size: 14px;
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
  ::v-deep .el-tooltip__trigger {
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
  flex: none;

  > * + * {
    margin-left: 16px;
  }
}

.user {
  display: flex;
  align-items: center;
  cursor: pointer;

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 30px;
    height: 30px;
    margin-right: 8px;
    border-radius: 50%;
    background: #3b6fe0;
    color: #fff;
    font-size: 13px;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    line-height: 1.3;

    .user-name {
      font-size: 13px;
      color: #1f2733;
    }

    .user-role {
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
