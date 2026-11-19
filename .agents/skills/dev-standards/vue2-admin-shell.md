# 后台壳层 · Vue 2 + Element UI 2 实现

契约见 [admin-shell.md](admin-shell.md)。本文只讲这一栈怎么写、哪里会踩坑，并列出与 Vue 3 的**行为差异**。参考实现来自 `develop-model/web`（Vue 2.7 + Element UI 2 + vue-router 3，IE11 目标）。

## 1. 文件落位

```
src/
├── layouts/default-layout.vue      壳（单文件，菜单含在 data 里或拆 menu.ts）
├── components/form-page/form-page.vue
├── components/section-card/section-card.vue
└── router/index.ts
```

Vue 2 侧习惯是单文件壳 + 菜单内联在 `data()` 里。菜单项超过 10 条时再拆 `menu.ts`（纯数据，不依赖 Vue）。**不要在 `data()` 里写 `this.$route`**——`data` 执行时 `this.$route` 已可用，但把它快照进 data 会导致路由变化后高亮不更新，active 判定必须走 `computed` 或 `methods`。

## 2. 壳组件

### 2.1 结构骨架

```vue
<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ 'is-open': sidebarOpen, 'is-collapsed': desktopCollapsed }">
      <div class="logo">
        <div class="logo-icon"><i class="el-icon-s-tools" /></div>
        <div class="logo-text">
          <strong>{{ appName }}</strong>
          <span>{{ appNameEn }}</span>
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
            @click="onMenuClick(item)"
          >
            <span class="mi-icon"><i :class="item.icon" /></span>
            <span class="mi-label">{{ item.label }}</span>
            <span v-if="item.badge" class="mi-badge">{{ item.badge }}</span>
          </div>
        </template>
      </nav>
    </aside>

    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />

    <section class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="nav-toggle"
            :class="{ 'is-expanded': !navShowFold }"
            type="button"
            :aria-label="navToggleLabel"
            :title="navToggleLabel"
            @click="toggleSidebar"
          >
            <span class="nav-icon nav-icon-fold"><i class="el-icon-s-fold" /></span>
            <span class="nav-icon nav-icon-expand"><i class="el-icon-s-unfold" /></span>
          </button>

          <div class="crumb">
            <button
              v-if="showBack"
              class="tb-back"
              type="button"
              aria-label="返回"
              :title="`返回${parentTitle}`"
              @click="goBack"
            >
              <i class="el-icon-arrow-left" />
            </button>
            <div class="tb-title-wrap">
              <span ref="title" class="tb-title" :class="{ 'is-overflow': titleOverflow }">
                {{ pageTitle }}
              </span>
            </div>
          </div>
        </div>

        <div class="topbar-right">
          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user">
              <span class="avatar">{{ avatarChar }}</span>
              <div class="user-info">
                <span class="user-name">{{ operatorName }}</span>
                <span class="user-role">{{ operatorRole }}</span>
              </div>
            </div>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="profile" icon="el-icon-user">个人信息</el-dropdown-item>
              <el-dropdown-item command="logout" icon="el-icon-switch-button">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </header>

      <main class="view"><router-view /></main>
    </section>
  </div>
</template>
```

### 2.2 图标是 class，不是组件

Element UI 2 没有 `@element-plus/icons-vue`，图标是**字体类名**：

```html
<i class="el-icon-s-fold" />
<i class="el-icon-s-unfold" />
<i class="el-icon-arrow-left" />
```

所以 `<component :is="item.icon" />` 在这里**不适用**——必须 `<i :class="item.icon" />`。菜单数据里的 `icon` 字段直接存类名字符串（`'el-icon-s-grid'`），不存组件名。

折叠钮也可以用 `<el-button type="text" :icon="navToggleIcon" />`，但这样只能单图标切换、做不了交叉动画；要动效就用原生的两个 `<i>`。

### 2.3 折叠状态

```ts
data() {
  return {
    sidebarCollapsed: localStorage.getItem('app:sidebar-collapsed') === '1',
  }
},
watch: {
  sidebarCollapsed(v: boolean) {
    localStorage.setItem('app:sidebar-collapsed', v ? '1' : '0')
  },
},
```

`localStorage` 在 IE11 隐私模式下会抛异常，正式项目要包 `try/catch`。

## 3. 菜单数据与 active

```ts
interface MenuItem {
  key: string
  label: string
  icon: string        // el-icon-* 类名
  route: string
  prefix?: boolean    // 详情页子路径也高亮时置 true
  badge?: number
}

interface MenuGroup {
  title: string
  dot: string
  items: MenuItem[]
}
```

active 判定用 `prefix` 显式开关，而不是一律前缀匹配：

```ts
isActive(item: MenuItem) {
  if (item.prefix) {
    // 详情页 /knowledge/rsr/RSR-2026-092 也要让「RSR 失败案例分析库」保持高亮
    return this.$route.path === item.route || this.$route.path.indexOf(`${item.route}/`) === 0
  }
  return this.$route.path === item.route
}
```

为什么不一概前缀匹配：`/knowledge`（总览）与 `/knowledge/rsr`（子库）会互相抢高亮。总览项不置 `prefix`、子库项置 `prefix`，两个都能正确命中。

`indexOf(route + '/') === 0` 与 `startsWith(route + '/')` 等价，前者是为了 IE11 不必 polyfill `startsWith`（`@babel/preset-env` 的 `useBuiltIns: 'usage'` 会注入，但少一处是一处）。

## 4. 顶栏标题

Vue 2 没有全局单例 composable 的天然写法，用 `Vue.observable` 造一个：

```ts
// src/domain/page-title.ts
import Vue from 'vue'

/** 全局响应式标题容器：页面写、壳读 */
export const pageTitleState = Vue.observable({ title: '' })

export function setPageTitle(text: string): void {
  pageTitleState.title = text
}
```

壳里：

```ts
computed: {
  pageTitle() {
    const meta = this.$route.meta || {}
    return pageTitleState.title || meta.title || this.appName
  },
}
```

页面（详情页）里：

```ts
created() {
  setPageTitle('')
},
watch: {
  'detail.name'(name: string) {
    setPageTitle(name || '')
  },
},
beforeDestroy() {
  setPageTitle('')
},
```

`beforeDestroy` 里清空是硬要求（Vue 2 是 `beforeDestroy`，不是 `onBeforeUnmount`）。

标题溢出检测与 Vue 3 相同，但注意 `$refs` 的类型断言：

```ts
checkTitleOverflow() {
  const el = this.$refs.title as HTMLElement | undefined
  this.titleOverflow = !!el && el.scrollWidth > el.clientWidth + 1
}
```

`nextTick` 里调，并在 `watch: { $route }` 与窗口 `resize` 时各重算一次。

## 5. 返回按钮

Vue 2 的 `vue-router@3` 也有 `window.history.state`，同样能判断「有没有站内来源」：

```ts
goBack() {
  const parent = this.$route.meta && this.$route.meta.parent
  if (!parent) return
  const state = window.history.state as { back?: unknown } | null
  if (state && state.back != null) {
    this.$router.back()
    return
  }
  const params = typeof this.$route.meta.parentParams === 'function'
    ? this.$route.meta.parentParams(this.$route)
    : {}
  this.$router.push({ name: parent, params })
}
```

`parentParams` 是 Vue 2 侧的一个补充：父路由需要动态参数时（如返回 `/knowledge/:moduleCode`），用函数从当前路由算参数，比在 meta 里写死 `query` 灵活。

只从 `meta.parent` 拿名字、**不拿完整路径**：`name` 跳转不依赖父路由的 path 拼法变化。

## 6. 路由

Vue 2 项目的 `RouteMeta` 扩充写在 `shims-vue.d.ts` 或 `router/index.ts` 里：

```ts
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    parent?: string                                   // 父路由 name
    parentParams?: (route: Route) => Record<string, any>
    requiredAdmin?: boolean
  }
}

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/sign-out', name: 'sign-out', component: SignOut, meta: { title: '已退出' } },
    {
      path: '/',
      component: DefaultLayout,
      redirect: '/knowledge',
      children: [
        { path: 'knowledge', name: 'knowledge', component: Knowledge, meta: { title: '知识库总览' } },
        { path: 'knowledge/:moduleCode/:id', name: 'knowledge-detail', component: Detail,
          meta: { title: '详情', parent: 'knowledge', parentParams: (r) => ({ moduleCode: r.params.moduleCode }) } },
      ],
    },
    { path: '*', redirect: '/' },
  ],
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
})
```

Vue 2 的兜底路由是 `{ path: '*' }`，不是 Vue 3 的 `'/:pathMatch(.*)*'`。

## 7. 表单页 `FormPage`（Vue 2 写法）

```vue
<template>
  <div class="form-page" v-loading="busy" element-loading-text="处理中…"
       :class="{ 'form-page--locked': busy }">
    <div v-if="showHeader || $slots.header" class="form-page__header">
      <slot name="header">
        <div class="form-page__header-left">
          <el-button type="text" icon="el-icon-arrow-left" @click="$emit('cancel')">返回</el-button>
          <span class="form-page__title">{{ title }}</span>
        </div>
      </slot>
    </div>

    <div class="form-page__body"><slot /></div>

    <div class="form-page__footer">
      <slot name="footer-extra" />
      <div class="form-page__actions">
        <el-button size="small" :disabled="busy" @click="$emit('cancel')">{{ cancelText }}</el-button>
        <el-button v-if="showDraft" size="small" :loading="drafting" :disabled="busy"
                   @click="onDraft">{{ draftText }}</el-button>
        <el-button v-if="showSubmit" size="small" type="primary" :loading="submitting"
                   :disabled="nativeDisabled" @click="onSubmit">{{ submitText }}</el-button>
      </div>
    </div>
  </div>
</template>
```

`el-button type="text"` 是 Element UI 2 的链接按钮（Element Plus 是 `link`）。`v-loading` 是指令不是组件，`element-loading-text` 是修饰属性，不能写成 `:text`。

「灰显但仍可点」在 Vue 2 里同样要做，只是没有 `aria-disabled` 的习惯用法，靠 class + 不设 `disabled`：

```ts
nativeDisabled() {
  return this.busy || (this.submitDisabled && !this.submitDisabledClickable)
},
```

## 8. 内容分块 `SectionCard`（Vue 2 写法）

```vue
<SectionCard badge="1" title="项目信息" tooltip="带 * 为必填">
  <el-input v-model="form.name" />
</SectionCard>
```

折叠用 `.sync`：

```vue
<SectionCard title="成员" collapsible :collapsed.sync="membersCollapsed">...</SectionCard>
```

```ts
props: {
  badge: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  tooltip: { type: String, default: '' },
  collapsible: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
},
computed: {
  collapsedNow(): boolean {
    return this.collapsible && this.collapsed
  },
},
methods: {
  toggleCollapsed() {
    if (!this.collapsible) return
    this.$emit('update:collapsed', !this.collapsed)
  },
},
```

模板里 `.sync` 展开成 `:collapsed` + `@update:collapsed`，与 Vue 3 的 `v-model:collapsed` 是同一件事，**语法不同、语义相同**。

标题说明角标在 Vue 2 里直接用 `el-tooltip` 包一个小圆点即可，不必单独抽 `TitleHintBadge` 组件：

```html
<el-tooltip :content="tooltip" placement="top" :open-delay="200">
  <sup class="section-card__hint" />
</el-tooltip>
```

## 9. 与 Vue 3 / Element Plus 的差异对照

记反了会白调半天：

| 关注点 | Vue 2 + Element UI 2 | Vue 3 + Element Plus |
|--------|----------------------|----------------------|
| 图标 | `<i class="el-icon-s-fold" />` | `<el-icon><Fold /></el-icon>` |
| 菜单 icon 字段 | `'el-icon-s-grid'` | `'Grid'` + 本地映射表 |
| 链接按钮 | `type="text"` | `link` |
| 下拉菜单容器 | `<el-dropdown-menu slot="dropdown">` | `<template #dropdown>` |
| 双向绑定 | `:collapsed.sync="x"` | `v-model:collapsed="x"` |
| 深度选择器 | `::v-deep` | `:deep()` |
| 销毁钩子 | `beforeDestroy` | `onBeforeUnmount` |
| 全局响应式容器 | `Vue.observable({})` | `ref()` 模块单例 |
| 兜底路由 | `{ path: '*' }` | `{ path: '/:pathMatch(.*)*' }` |
| 路由实例 | `new VueRouter({ mode: 'history' })` | `createRouter({ history: createWebHistory() })` |
| 重复导航 | 报 `NavigationDuplicated`（需手动吞） | 静默 resolve |
| 弹窗显隐 | `:visible.sync="x"` | `v-model="x"` |

Vue 2 的 `NavigationDuplicated` 建议在 router 里统一吞掉，否则控制台一堆红字：

```ts
const push = VueRouter.prototype.push
VueRouter.prototype.push = function (location: any) {
  return push.call(this, location).catch((err: Error) => err)
}
```

## 10. IE11 硬约束

这一栈如果还要支持 IE11，壳层额外注意：

- **不要用 CSS 变量**传主题色，Sass 变量编译成字面量
- `gap` 在 flex 里 IE11 不生效 —— 用 `margin` 或 `padding` 兜底，侧栏菜单项之间用 `margin: 2px 0`
- `position: sticky` 不生效 —— 分页条不要依赖 sticky
- `window.history.state` 在 IE11 有，但 `visualViewport` 没有 —— 只用 `resize` 监听
- `localStorage` 在隐私模式抛异常，读写包 `try/catch`
- `Array.prototype.includes`、`String.prototype.startsWith` 靠 `@babel/preset-env` 的 `useBuiltIns: 'usage'` + `core-js@3`

## 11. 验证

- 冷启动直接访问二级页 URL：出现返回按钮，标题与 `document.title` 正确
- 从列表进详情再返回：回到列表且筛选状态还在
- 折叠侧栏 → 刷新 → 仍是折叠态
- `prefix: true` 的子库菜单在详情页仍高亮；总览菜单不会被子库抢高亮
- **IE11 复测**：侧栏折叠宽度、菜单 hover、下拉、返回、长标题省略

## 12. 易错点

1. **`<component :is="item.icon" />` 传类名** —— Element UI 2 的图标是字体类，必须 `<i :class>`。
2. **active 判定写进 `data()`** —— `data` 只算一次，路由变了高亮不动。
3. **一律前缀匹配** —— `/knowledge` 与 `/knowledge/rsr` 互相抢高亮，用 `prefix` 显式开关。
4. **`.sync` 忘了加** —— 折叠按钮点了没反应，因为父级没接 `update:collapsed`。
5. **`beforeDestroy` 没清 `pageTitle`** —— 详情页返回后顶栏挂着旧标题。
6. **`::v-deep` 写成 `:deep()`** —— Vue 2 + `sass-loader` 下 `:deep()` 不生效，样式穿透失败。
7. **`el-dropdown-menu slot="dropdown"`** 漏了 —— 下拉点开是空的（内容渲染到默认插槽里）。
8. **底栏 `position: fixed`** —— 与 Vue 3 同样的问题，脱出高度链。
9. **`gap` 当布局主力** —— IE11 不支持，间距全丢。
