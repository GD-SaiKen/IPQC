# 后台壳层 · Vue 3 + Element Plus 实现

契约见 [admin-shell.md](admin-shell.md)。本文只讲这一栈怎么写、哪里会踩坑。参考实现来自 `mold/frontend`（Vue 3.5 + Element Plus + Vite）。

## 1. 文件落位

```
src/
├── layouts/default-layout/
│   ├── index.vue        壳
│   └── menu.ts          菜单数据 + active + 可见性
├── composables/
│   ├── use-page-title.ts   全局页面标题单例
│   └── use-sidebar.ts      折叠状态 + 持久化
├── components/form-page/form-page.vue
├── components/section-card/section-card.vue
├── components/title-hint-badge/title-hint-badge.vue
└── router/index.ts
```

目录用 `layouts/default-layout/index.vue` 而不是 `AppLayout.vue`：以后出现第二种壳（如「无侧栏的极简壳」）时，`layouts/<shell-name>/` 直接并列，不影响引用路径。

侧栏图形与 favicon 用**本项目** `public/brand-mark.svg` 与 `public/favicon.ico`（见 [admin-shell.md § 品牌 Logo 与 Favicon](admin-shell.md#品牌-logo-与-favicon)）：满幅 32×32 SVG 时 `logo-icon` 内 `<img class="logo-mark">` **32×32 铺满**、容器勿再叠蓝底；`index.html` 挂双 `link rel="icon"`。**不要**从 skill 的 `knowledge/admin-shell/brand/` 原样拷贝。

## 2. 壳组件

### 2.1 结构骨架

```vue
<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ 'is-collapsed': sidebarCollapsed }">
      <div class="logo">
        <div class="logo-icon" aria-hidden="true">
          <img class="logo-mark" src="/brand-mark.svg" width="32" height="32" alt="" />
        </div>
        <div class="logo-text">
          <strong>{{ appName }}</strong>
          <span>{{ appNameEn }}</span>
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
            @click="onMenuClick(item)"
          >
            <span class="mi-icon">
              <el-icon :size="16"><component :is="iconOf(item.icon)" /></el-icon>
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
          <button class="nav-toggle" :class="{ 'is-expanded': !navShowFold }" type="button"
                  :aria-label="navToggleLabel" :title="navToggleLabel" @click="toggleSidebar">
            <span class="nav-icon nav-icon-fold"><el-icon :size="20"><Fold /></el-icon></span>
            <span class="nav-icon nav-icon-expand"><el-icon :size="20"><Expand /></el-icon></span>
          </button>

          <div class="crumb">
            <button v-if="parentCrumb" class="tb-back" type="button" aria-label="返回"
                    :title="`返回${parentCrumb.label}`" @click="topbarBack">
              <el-icon :size="18"><ArrowLeft /></el-icon>
            </button>
            <div class="tb-title-wrap">
              <el-tooltip placement="bottom-start" :content="pageTitle"
                          :disabled="!titleOverflow" trigger="click">
                <span ref="titleRef" class="tb-title" :class="{ 'is-overflow': titleOverflow }">
                  {{ pageTitle }}
                </span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <div class="topbar-right">
          <el-dropdown trigger="click" @command="onUserCommand">
            <div class="user">
              <span class="avatar">{{ avatarChar }}</span>
              <div class="u-info">
                <span class="u-name">{{ currentUser?.name }}</span>
                <span class="u-role">{{ currentUser?.role }}</span>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人信息
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="view"><router-view /></main>
    </section>
  </div>
</template>
```

### 2.2 图标怎么拿到

菜单项里存的是字符串（`'Folder'`、`'Setting'`），模板里要换成组件。有两条路：

**A. 显式映射（推荐）** —— 只有真的会用的十几个，打包器能 tree-shake：

```ts
import { Bell, Document, Expand, Fold, Folder, Setting, User } from '@element-plus/icons-vue'

const ICONS = { Bell, Document, Expand, Fold, Folder, Setting, User } as const
function iconOf(name: string) {
  return ICONS[name as keyof typeof ICONS] ?? ICONS.Document
}
```

**B. 全量注册** —— `for (const [k, v] of Object.entries(ElementPlusIconsVue)) app.component(k, v)`。方便，但会把 200+ 图标打进首屏包。后台管理端图标总量有限，A 方案更划算。

`<component :is>` 传字符串只在全局注册过时才有用；用 A 方案必须传**组件对象**，不能直接 `:is="item.icon"`。

### 2.3 折叠状态

```ts
const STORAGE_KEY = 'app:sidebar-collapsed'

export function useSidebar() {
  const collapsed = ref(localStorage.getItem(STORAGE_KEY) === '1')
  watch(collapsed, (v) => localStorage.setItem(STORAGE_KEY, v ? '1' : '0'))
  function toggle() { collapsed.value = !collapsed.value }
  return { collapsed, toggle }
}
```

放在 `composables/` 而不是壳内 `ref`，是因为将来收起态可能影响别的组件（比如某些页面要按可用宽度重排）。`localStorage` 读写在 `try/catch` 里更稳（隐私模式下会抛异常），骨架里省略了。

## 3. 菜单数据

```ts
// layouts/default-layout/menu.ts
export interface NavItem {
  key: string
  label: string
  icon: string
  route: string
  routeName?: string
  badge?: number
}

export interface NavGroup {
  title: string
  dot: string
  items: NavItem[]
}

export function isMenuItemActive(item: NavItem, path: string, name?: string | null): boolean {
  if (item.routeName) return name === item.routeName
  return path === item.route || path.startsWith(item.route + '/')
}

/** 按白名单过滤，并丢掉空分组 */
export function filterMenuGroups(groups: NavGroup[], allowed?: string[]): NavGroup[] {
  if (!allowed) return groups
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => allowed.includes(it.key)) }))
    .filter((g) => g.items.length > 0)
}
```

壳里 `const menuGroups = computed(() => filterMenuGroups(RAW_MENU, visibleKeys))`。

权限过滤的两种写法，按项目实际情况选：

| 写法 | 适用 | 代价 |
|------|------|------|
| 白名单 `allowed: string[]` | 后端返回 `permissions` 数组 | 菜单 key 必须与后端权限码对应 |
| 谓词 `hidden?: (ctx) => boolean` | 权限逻辑在前端（如 `auth.isSystemAdmin`） | 每条菜单要知道怎么判，容易散 |

骨架给白名单版，谓词版在 `filterMenuGroups` 里换一行即可。

**角标数字不要写死在菜单里**：`badge` 从 store 或 composable 取（`todoCount.value`、`unreadCount.value`），菜单数据本身是常量。

## 4. 页面标题

```ts
// composables/use-page-title.ts
import { ref } from 'vue'

/** 全局单例：页面写、壳读 */
const pageTitle = ref('')

export function usePageTitle() {
  return {
    pageTitle,
    setPageTitle: (text: string) => { pageTitle.value = text },
  }
}
```

壳里：

```ts
const { pageTitle: livePageTitle } = usePageTitle()
const pageTitle = computed(() => livePageTitle.value || (route.meta.title ?? '') || APP_NAME)
```

页面的用法（详情页带业务名时）：

```ts
const { setPageTitle } = usePageTitle()
watch(() => detail.value?.name, (name) => setPageTitle(name ?? ''))
onBeforeUnmount(() => setPageTitle(''))   // 必须清，否则回列表页还挂着详情标题
```

`onBeforeUnmount` 里清空是硬要求。页面卸载时 `pageTitle` 还是旧值，回到一级页会看到上一个页面的标题。

## 5. 顶栏标题溢出检测

```ts
const titleRef = ref<HTMLElement | null>(null)
const titleOverflow = ref(false)

function checkTitleOverflow() {
  const el = titleRef.value
  titleOverflow.value = !!el && el.scrollWidth > el.clientWidth + 1
}
const onLayoutChange = () => void nextTick(checkTitleOverflow)

watch(() => [pageTitle.value, route.path], onLayoutChange)
onMounted(() => {
  onLayoutChange()
  window.addEventListener('resize', checkTitleOverflow)
})
onBeforeUnmount(() => window.removeEventListener('resize', checkTitleOverflow))
```

三个触发点少一个都会错：标题变了（内容变宽）、路由变了（返回按钮显隐改变可用宽度）、窗口变了。

`el-tooltip` 默认 `trigger="hover"`，标题用 `trigger="click"` 更好——溢出时鼠标划过顶栏就想看全名，hover 容易误触；click 是明确意图。两者都可，项目内保持一致即可。

## 6. 表单页 `FormPage`

```vue
<template>
  <div class="form-page" v-loading="busy" element-loading-text="处理中…"
       :class="{ 'form-page--locked': busy }">
    <div v-if="showHeader || $slots.header" class="form-page__header">
      <slot name="header">
        <div class="form-page__header-left">
          <el-button link :icon="ArrowLeft" @click="emit('cancel')">返回</el-button>
          <span class="form-page__title">{{ title }}</span>
        </div>
      </slot>
    </div>

    <div class="form-page__body"><slot /></div>

    <div class="form-page__footer">
      <slot name="footer-extra" />
      <div class="form-page__actions">
        <el-button :disabled="busy" @click="emit('cancel')">{{ cancelText }}</el-button>
        <el-button v-if="showDraft" :loading="drafting" :disabled="busy" @click="emit('draft')">
          {{ draftText }}
        </el-button>
        <el-button v-if="showSubmit" type="primary" :loading="submitting"
                   :disabled="nativeDisabled" @click="emit('submit')">
          {{ submitText }}
        </el-button>
      </div>
    </div>
  </div>
</template>
```

关键 props：`title`、`showHeader`（顶栏已有标题时可传 `false`）、`cancelText` / `draftText` / `submitText`、`showDraft`、`showSubmit`、`submitDisabled`、`submitDisabledClickable`、`submitting`、`drafting`。

`submitDisabledClickable` 这个开关解决一个真实矛盾：条件不满足时按钮要「看起来不可用」，但用户点它应该弹出「为什么不能提交」的说明。于是走 `aria-disabled` + 软灰（`opacity: .55`）而不是原生 `disabled`——原生 `disabled` 的按钮点不动，说明永远出不来。

```ts
const busy = computed(() => props.submitting || props.drafting)
const softBlocked = computed(() => props.submitDisabled && props.submitDisabledClickable && !busy.value)
const nativeDisabled = computed(() => busy.value || (props.submitDisabled && !props.submitDisabledClickable))
```

loading 挂在**整页容器**上并 `:deep()` 改 `.el-loading-mask` 为 `position: absolute; inset: 0`。挂 body 上时，滚动后遮罩只盖住可视窗口，底部会露出一条没被遮住的内容。

## 7. 内容分块 `SectionCard`

```vue
<SectionCard badge="1" title="项目信息" tooltip="带 * 为必填">
  <el-input v-model="form.name" />
</SectionCard>
```

| prop | 类型 | 说明 |
|------|------|------|
| `title` | `string` | 必填 |
| `badge` | `string` | 传则渲染主色胶囊标题（步骤序号） |
| `subtitle` | `string` | 标题行右侧辅助文字 |
| `tooltip` | `string` | 标题说明角标 |
| `collapsible` / `collapsed` | `boolean` | 配合 `v-model:collapsed` |

折叠三件事，缺一个体验就坏：

1. 内容用 `v-show` 不用 `v-if` —— 折叠不丢子组件内部状态
2. 标题行加 `role="button"` + `tabindex="0"` + `keydown.enter/space` —— 键盘可操作
3. 收起后去掉标题行的下边框与下边距 —— 否则卡片退化成「一条线 + 空白」

```ts
/** 只有 collapsible 时才真的收起；非折叠区块忽略 collapsed */
const collapsedNow = computed(() => props.collapsible && props.collapsed)
```

这个守卫不能省：调用方 `<SectionCard :collapsed="false">` 时如果按 `props.collapsed` 直接算，某些动态场景会被误判成收起。

## 8. 路由

```ts
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    parent?: { name: string; query?: Record<string, string> }
    requiredAdminMaintainer?: boolean
    requiredSystemAdmin?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/login/index.vue'), meta: { title: '登录' } },
    {
      path: '/',
      component: () => import('@/layouts/default-layout/index.vue'),
      redirect: '/todos',
      children: [
        { path: 'todos', name: 'todos', component: () => import('@/views/todos/index.vue'), meta: { title: '我的待办' } },
        { path: 'projects/:id/edit', name: 'project-edit', component: () => import('@/views/projects/edit.vue'),
          meta: { title: '编辑项目', parent: { name: 'projects' } } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
})
```

`redirect` 指向一个有意义的首页，不要留空——空 `redirect` 时访问 `/` 会白屏。

## 9. 与 Element Plus 的坑

| 现象 | 原因 | 解法 |
|------|------|------|
| 折叠后侧栏被文案撑回原宽 | 只改了 `width` | `width` 与 `min-width` 同时改 |
| 标题不省略 | `el-tooltip` 的触发器不占满宽度 | `:deep(.el-tooltip__trigger) { display:block; max-width:100%; overflow:hidden }` |
| 折叠钮白底上看不见 | 按钮无边框 | 常显 `1px solid $color-border` |
| 换图标时闪一下 | 单图标直接换 `:is` | 双图标绝对定位 + 交叉过渡 |
| 底栏遮住最后一屏内容 | 底栏用了 `position: fixed` | 改三段 flex，底栏 `flex: none` |
| loading 遮罩只盖半屏 | 遮罩挂在滚动容器上 | 挂整页容器 + `inset: 0` |
| 菜单高亮不准 | 只比较 `route.path === item.route` | 加前缀匹配与 `/` 边界 |
| `NavigationDuplicated` | 点当前路由又 push 一次 | `route.path !== item.route` 才 push |
| 折叠态仍有滚动条 | 文案用 `opacity: 0` 隐藏 | 用 `display: none` |

## 9.1 列表页：状态开关与编辑抽屉

契约见 [admin-shell.md](admin-shell.md) 列表节、[crud.md](crud.md) §5.5–5.6。

- 二元状态：`Table` 的 `#col-<prop>` + `el-switch`（`inline-prompt`）
- 编辑/新建：`el-drawer` + `Form`，`label-position="right"`，引入 `list-form-drawer.scss`

## 10. 验证

- 冷启动直接访问二级页 URL：顶栏出现返回钮，标题正确，`document.title` 带后缀
- 从列表页进详情再返回：回到列表且筛选/分页状态还在（验证 `router.back()`）
- 折叠侧栏 → 刷新 → 仍是折叠态（验证持久化）
- 长标题（>40 字）溢出时出现省略号，点标题能看全；返回一级页后标题不残留
- 缩放到 1024px 宽：侧栏不折行，顶栏标题仍单行
- 表单页滚到底：底栏仍在，最后一行内容不被遮

## 11. 易错点

1. **登录页放进 `children`** —— 未登录也渲染侧边栏，且守卫重定向时会闪一下壳。
2. **`.view` 加 `overflow-y: auto`** —— 列表页立刻出现双滚动条（外层 + 表格内）。滚动权必须留给页面。
3. **`onBeforeUnmount` 没清 `pageTitle`** —— 详情页返回后，列表页顶栏还挂着详情标题。
4. **`titleOverflow` 只在 `onMounted` 算一次** —— 路由跳到更长的标题后不重新判定，tooltip 永远不出现。
5. **菜单写进 layout template** —— 加一个页面就要改壳，权限过滤没地方放。
6. **`startsWith(item.route)` 裸判** —— `/admin/users-v2` 会命中 `/admin/users`。
7. **`badge` 写死数字** —— 待办数、未读数必须从数据源取。
8. **底栏 `position: fixed`** —— 脱出高度链，滚动遮内容、弹窗压遮罩。
9. **图标 `<component :is="item.icon" />` 传字符串** —— 没全局注册时渲染成未知元素，控制台一串警告。
