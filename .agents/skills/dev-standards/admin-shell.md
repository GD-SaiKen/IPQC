# 后台管理壳层（侧边栏 · 顶栏 · 路由标题 · 页面骨架）

所有「桌面后台管理」界面共用一套壳：左侧分组菜单 + 顶栏（折叠钮 / 返回 / 标题 / 用户区）+ 主内容区。页面只负责往主内容区里塞东西，**不自己画导航、不自己画返回按钮、不自拼 document.title**。

本文是与框架无关的契约。落地实现分两份，只读与当前栈对应的那一份：

| 栈 | 文档 |
|----|------|
| Vue 3 + Element Plus | [vue3-admin-shell.md](vue3-admin-shell.md) |
| Vue 2 + Element UI 2（含 IE11） | [vue2-admin-shell.md](vue2-admin-shell.md) |

列表页的表格部分见 [crud.md](crud.md)，两层不重叠：壳层管「页面放在哪」，CRUD 管「列表长什么样」。

**明确不做**：移动端壳（抽屉式侧栏、`≤760px` 断点、App 式顶部标题栏、`env(safe-area-inset-*)`）。桌面后台只保证 ≥1024px 宽度下的形态；移动 H5 走 [vant.md](vant.md) 那套独立壳，两者不复用。

## 1. 三层职责

| 层 | 文件 | 负责 | 不负责 |
|----|------|------|--------|
| **壳** | `layouts/default-layout/index.vue` | 区域划分、折叠状态、菜单渲染、顶栏标题与返回 | 知道有哪些业务页面 |
| **路由** | `router/index.ts` | 路径、`meta.title`、`meta.parent`、登录与权限守卫、`document.title` | 渲染任何 UI |
| **页面** | `views/<page-kebab>/index.vue` | 自己那一段内容、自己的滚动 | 侧边栏、顶栏、面包屑 |

菜单数据独立成 `layouts/default-layout/menu.ts`，**不写在 layout 的 template 里**。理由很实际：菜单一旦写进组件，加一个页面就要改壳组件，权限过滤也无处安放。

```
layouts/default-layout/
├── index.vue       壳：区域 + 折叠 + 顶栏
└── menu.ts         菜单数据 + active 判定 + 可见性过滤
```

## 2. 区域划分

```
┌──────────────┬───────────────────────────────────────────────┐
│ logo         │ [☰]  ‹返回›  当前页标题            [用户 ▾]  │  topbar 56px
├──────────────┼───────────────────────────────────────────────┤
│ 分组 "我的"  │                                               │
│   · 待办  3  │              main .view                       │
│   · 看板     │        （页面内容，只有这一段在变）           │
│ 分组 "系统"  │                                               │
│   · 用户管理 │                                               │
│   · 角色管理 │                                               │
└──────────────┴───────────────────────────────────────────────┘
   sidebar 240px / 折叠 64px
```

- `.app-layout`：`display:flex`，固定满高
- `.sidebar`：纵向 flex，`logo` 固定高 + `.menu` 独立滚动
- `.main`：纵向 flex，`topbar` 固定高 + `.view` 吃掉剩余
- `.view` 是**唯一的路由出口**，`<router-view />` 放这里

## 3. 尺寸与高度链

| 变量 | 值 | 说明 |
|------|-----|------|
| `$sidebar-width` | `240px` | 展开态 |
| 折叠态宽度 | `64px` | 图标栏，只留 icon |
| `$topbar-height` | `56px` | 顶栏，同时是 logo 区高度 |
| `.view` 内边距 | `20px` | 表单页自己再加 `padding: 20px 24px` |

高度链必须四段都成立，缺一段表格或表单底部就会被裁：

```scss
html, body, #app { height: 100%; }

.app-layout { display: flex; height: 100%; }
.main       { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.view       { flex: 1; min-height: 0; padding: 20px; overflow: hidden; }
```

最后一行是**契约的关键**：`.view` 自己**不滚**，`overflow: hidden`。滚动权交给页面，因为三种页面形态的滚动位置不同——列表页在表格内部滚（表头固定），表单页在 body 区滚（底栏固定），详情页整页滚。壳层如果擅自 `overflow-y: auto`，列表页会出现「外层滚动条 + 表格内滚动条」双滚动条。

页面自己决定滚不滚：需要整页滚的页面在自己的根元素上写 `height: 100%; overflow-y: auto;`。

## 品牌 Logo 与 Favicon

侧栏 `logo-icon` 与浏览器 favicon **共用同一套项目内静态资源**（与 `logo-text` 里的应用名配套，按产品线 VI 自备图形）：

| 项 | 约定 |
|----|------|
| 落位 | 各 Web 应用 **`public/brand-mark.svg`** + **`public/favicon.ico`**（文件名可改，但侧栏与 `index.html` 须同源） |
| 画布 | 建议 **32×32**，圆角 **4px**；主色与壳层 active / 主钮对齐（常见 `#3b6fe0`） |
| 侧栏显示 | `logo-icon` 区域 **32×32**；`brand-mark.svg` 为**满幅底图**时 `<img>` **32×32 铺满**，`logo-icon` **不再**叠同色 `background`（避免 20px 缩图显得过小） |
| 禁止 | **勿**将 skill 内 [`knowledge/admin-shell/brand/`](knowledge/admin-shell/brand/) 的通用模板原样拷进业务仓库；该目录仅作尺寸与导出脚本参考 |
| 文案 | 仅 `logo-text` 换 **应用名** / 英文副标题 |

`index.html` 至少挂 ICO，建议同时挂 SVG：

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/brand-mark.svg" type="image/svg+xml" />
```

侧栏（Vue 3 示例）：

```vue
<div class="logo-icon" aria-hidden="true">
  <img class="logo-mark" src="/brand-mark.svg" width="32" height="32" alt="" />
</div>
```

```scss
.logo-icon {
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
```

若 SVG **不含**满幅底、仅为透明底图形，可保留 `logo-icon` 的 `background: #3b6fe0`，图形尺寸建议 **20×20** 居中。

`favicon.ico` 由项目自维护的 SVG 导出（Pillow / `render-favicon.mjs` 等，可参考 knowledge 下脚本改路径后在本仓运行）。`document.title` 后缀用各项目 `appName`；图形不随路由标题变。

## 4. 侧边栏

### 菜单数据结构

```ts
interface NavItem {
  key: string          // 唯一标识，用于 active 判定与权限白名单
  label: string        // 显示文案
  icon: string         // 图标组件名（Element Plus icons 的导出名）
  route: string        // 目标路径
  routeName?: string   // 有动态参数时用 name 跳转，优先于 route
  badge?: number       // 数字角标，0 或空不显示
}

interface NavGroup {
  title: string        // 分组标题
  dot: string          // 分组标题前的小圆点色值
  items: NavItem[]
}
```

分组小圆点不是装饰：它给「我的工作台 / 系统管理 / 知识库」这类分组一个颜色锚点，比纯文字分组扫读快得多。色值直接写在数据里，不放进 SCSS 变量表。

### 折叠两态

| 态 | 宽度 | logo | 分组标题 | 菜单项 |
|----|------|------|----------|--------|
| 展开 | 240px | 图标 + 双行文案 | 显示圆点 + 文字 | 图标 + 文案 + 角标 |
| 折叠 | 64px | 只留图标居中 | 只留圆点（缩到 4px） | 只留图标居中 |

折叠实现用 `width` / `min-width` 同时过渡 `transition: width .24s ease, min-width .24s ease`。**必须设 `min-width`**：只改 `width` 时 flex 子项会被内容撑开，收起后文案把宽度顶回去。

折叠态用 `display: none` 隐藏文案，不做 `opacity: 0`——不然折叠后仍占位，64px 里挤出滚动条。

### active 判定

优先级：`routeName` → 前缀匹配 → 精确匹配。

```ts
function isActive(item: NavItem): boolean {
  if (item.routeName) return route.name === item.routeName
  return route.path === item.route || route.path.startsWith(item.route + '/')
}
```

前缀匹配是必需的：`/knowledge/reports/123` 要命中 `/knowledge/reports` 这条菜单。但只做前缀匹配会误判 `/admin/users-v2` 命中 `/admin/users`，所以补了 `/` 边界。**不要**用 `startsWith(item.route)` 裸判。

### 点击导航

```ts
function onMenuClick(item: NavItem) {
  if (item.routeName) void router.push({ name: item.routeName })
  else if (route.path !== item.route) void router.push(item.route)
}
```

`route.path !== item.route` 这个判断不是优化，是防报错：跳到当前路由会抛 `NavigationDuplicated`（Vue Router 3）或触发无意义的守卫链（Vue Router 4）。

## 5. 顶栏

三块：左（折叠钮 + 返回 + 标题）、右（通知 + 用户菜单）。

### 折叠按钮

一个 34×34 的方钮，**描边常显**（透明底 + 1px 边框），否则白底顶栏上按钮会消失。hover 时边框与文字变主色。

图标做两态交叉动画，不是直接换 `<component :is>`：

- 两个图标绝对定位叠在同一格
- 非激活态：`opacity: 0; transform: rotate(-120deg) scale(0.6)`
- 激活态：`opacity: 1; transform: rotate(0) scale(1)`
- 过渡 `opacity .24s, transform .24s`

直接换图标会「闪一下」，交叉动画是壳层唯一值得做的动效。

图标语义按状态取反，别记混：

| 当前态 | 显示的图标 | 点击后 |
|--------|-----------|--------|
| 展开（240px） | `Fold`（收起来） | 收起 |
| 折叠（64px） | `Expand`（展开来） | 展开 |

### 返回按钮

只在 `meta.parent` 存在时显示（二级/三级页），一级页没有。

```ts
function topbarBack() {
  const s = window.history.state as { back?: unknown } | null
  // 有站内来源就回退（保留来源页的筛选/分页状态）；直接刷新到达时才 push parent
  if (s && s.back != null) router.back()
  else router.push(parentCrumb.to)
}
```

优先 `router.back()` 而不是 `router.push(parent)`：同一个二级页常能从多个入口进入（列表页 → 详情，或看板 → 详情），`push(parent)` 会把用户扔到固定那一页，回退才符合直觉。

### 标题

来源优先级从高到低：

1. 页面运行时写入的标题（`usePageTitle().setPageTitle()`）——用于「详情页标题要带业务名」的场景
2. `route.meta.title`
3. 应用名兜底

同时 `router.afterEach` 写 `document.title = title ? \`${title} · ${APP_NAME}\` : APP_NAME`。两处都要写：顶栏是给人看的，`document.title` 是给浏览器标签页和收藏夹看的。

标题用单行 `text-overflow: ellipsis`，不换行、不撑高顶栏。溢出时才挂 tooltip：

```ts
titleOverflow.value = el.scrollWidth > el.clientWidth + 1
```

`+1` 是舍入容差，不写会在刚好撑满时误判溢出。这个判定必须在**路由变化后**（返回按钮显隐会改标题可用宽度）和**视口变化后**各重算一次，`nextTick` 里做。

tooltip 触发器要占满可用宽度，否则 `text-overflow` 不生效：

```scss
.tb-title-wrap :deep(.el-tooltip__trigger) {
  display: block;
  max-width: 100%;
  overflow: hidden;
}
```

### 用户区

圆形头像（取姓名首字）+ 两行（姓名 / 角色）+ 下拉（个人信息 / 退出登录）。角色行是必要的——同一页面不同角色能做的操作不同，顶栏常驻显示角色省掉一次「我是什么角色」的心算。

## 6. 路由契约

```ts
declare module 'vue-router' {
  interface RouteMeta {
    title?: string                                        // 顶栏标题 + document.title
    parent?: { name: string; query?: Record<string, string> }  // 顶栏返回目标
    requiredAdminMaintainer?: boolean                     // 权限标记，守卫读
    requiredSystemAdmin?: boolean
  }
}
```

| meta 字段 | 谁读 | 缺失时 |
|-----------|------|--------|
| `title` | 顶栏标题、`document.title` | 顶栏空白，标签页只显示应用名 |
| `parent` | 顶栏返回按钮 | 不显示返回按钮（视为一级页） |
| 权限标记 | `beforeEach` | 不校验，登录即可访问 |

路由结构固定两层：

```ts
{ path: '/login', ... }                       // 无壳
{ path: '/', component: Layout, redirect: '/xxx', children: [...] }  // 有壳
{ path: '/:pathMatch(.*)*', redirect: '/' }   // 兜底
```

登录页**必须在壳外**：套在 `children` 里会导致未登录时也渲染侧边栏。全屏布局、单卡片、背景与表单契约见 [login-page.md](login-page.md)；Vue 3 实现见 [vue3-login-page.md](vue3-login-page.md)。

侧边栏没有菜单项对应的页面（如 `/projects/:id/edit`）也放在 `children` 里，它需要壳（要顶栏标题和返回），只是不出现在菜单中——菜单是白名单，不是路由的镜像。

## 7. 页面结构（三种形态）

`.view` 里只应有这三种形态之一，不要混。

### A. 列表页

页面根元素不滚，交给 `Crud` 内部的表格滚：

```vue
<Crud :filter-items="filters" v-model:filter-values="filterValues" :pagination="pagination">
  <template #table><Table :columns="columns" :data="rows" :loading="loading" /></template>
</Crud>
```

`Crud` 自带 `height: 100%`，页面根元素给 `height: 100%; min-height: 0`。详见 [crud.md](crud.md)。

**列表内二元状态（启用 / 停用等）**：只用列内 `el-switch`，配 `inline-prompt` 在开关上写短文案（如「启 / 停」），走 `type: 'custom'` + `#col-<prop>`；切换即调 `PATCH` 更新该字段。**不要**同时在操作列再放「启停」，也不要在编辑表单里重复选状态（状态与编辑表单职责分离）。

**列表内的「编辑 / 新建」**：优先 **`el-drawer`（`direction="rtl"`）+ `Form`**，不用窄 `el-dialog`。抽屉正文可滚、底栏固定（`flex` 兄弟，非 `position: fixed`）；样式见 [`knowledge/crud/list-form-drawer.scss`](knowledge/crud/list-form-drawer.scss) 与 [`list-form-drawer.snippet.vue`](knowledge/crud/vue3/list-form-drawer.snippet.vue)。整页独占的复杂新建/编辑仍用下文 **B. 表单页 `FormPage`**。

### B. 表单页（新建 / 编辑）

三段式：页头（可选）+ 可滚 body + **固定底栏**。用 `FormPage` 承载：

```
┌────────────────────────────────────────┐
│ ‹返回›  表单标题                        │  header   flex: none
├────────────────────────────────────────┤
│ SectionCard 1                          │
│ SectionCard 2                          │  body     flex: 1, overflow-y: auto
│ SectionCard 3                          │
├────────────────────────────────────────┤
│                      取消  存草稿  提交 │  footer   flex: none
└────────────────────────────────────────┘
```

底栏必须是 `flex: none` 的兄弟节点，不能 `position: fixed`。`fixed` 会脱出高度链，滚动时遮住最后一屏内容，弹窗打开时还可能压在遮罩之上。三段式 flex 天然做到「底栏常驻、只有 body 滚」。

`FormPage` 的 `busy`（提交中或存草稿中）要同时锁 body，并把 loading 挂在整页容器上而不是 body 上——挂 body 时滚动会让遮罩只盖住可视区，底部露白。

### C. 详情页

多个 `SectionCard` 纵向堆叠，页面根元素自己滚：

```vue
<div class="detail-page">   <!-- height:100%; overflow-y:auto -->
  <SectionCard title="基本信息">...</SectionCard>
  <SectionCard title="成员" subtitle="共 5 人">...</SectionCard>
</div>
```

`SectionCard` 是唯一的内容分块单元，两种标题形态：

| 形态 | 用法 | 场景 |
|------|------|------|
| 步骤胶囊 | 传 `badge="1"` `"2"` … | 按步骤填写的表单 |
| 文字标题 | 不传 `badge` | 详情、任务处置 |

可选的 `tooltip` 渲染成标题后的灰点，鼠标悬浮出说明；`subtitle` 是标题行右侧的辅助文字（条数、只读提示）。`collapsible` 时标题行整行可点（回车/空格同样可切），内容用 `v-show` 隐藏而非销毁——折叠不该丢掉子组件里的填写或上传中间态。

## 8. 状态归属

| 状态 | 放哪 | 为什么 |
|------|------|--------|
| 侧边栏折叠 | 壳内 `ref` + `localStorage` | 用户偏好，刷新后应保持 |
| 当前页标题 | 全局单例 composable | 页面写、壳读，中间无父子关系 |
| 菜单数据 | `menu.ts` 常量 | 常量 + 权限过滤，不需要响应式源 |
| 用户信息 | `stores/auth` | 跨页共享，守卫也要读 |
| 菜单角标数 | 各自 composable / store | 由业务数据聚合，壳不该知道怎么算 |

`usePageTitle` 用模块级 `ref` 做全局单例——多个页面同时挂载（如 Tab 缓存）时，后写入的会覆盖先写入的，这是已知且可接受的取舍；真要支持多 Tab，标题得改成 `route.name → title` 的映射表。

## 9. 自检

- [ ] 登录页在壳外，`children` 里没有登录路由
- [ ] 菜单数据在 `menu.ts`，没写进 layout 的 template
- [ ] 折叠后宽度真的变 64px（`width` 与 `min-width` 一起改）
- [ ] 折叠钮图标与状态取反正确（展开态显示 Fold）
- [ ] `isActive` 有 `/` 边界，`/admin/users` 不误命中 `/admin/users-v2`
- [ ] 点当前菜单项不重复导航
- [ ] `document.title` 带应用名后缀，`afterEach` 里写
- [ ] 顶栏标题单行省略，溢出才挂 tooltip，路由变化后重算
- [ ] `.view` 是 `overflow: hidden`，滚动权在页面
- [ ] 表单页底栏是 flex 兄弟节点，不是 `position: fixed`
- [ ] 二元状态用列内 `el-switch`（`inline-prompt`），编辑抽屉里不重复状态字段
- [ ] 列表编辑用 `el-drawer` + 固定底栏，非窄弹窗
- [ ] 没有移动端断点分支（`≤760px`、`safe-area-inset`；**业务编辑抽屉**与侧栏无关，允许使用）

## 10. 可拷贝骨架

不想从零拼，直接拷现成源码：

| 栈 | 目录 | 落地 |
|----|------|------|
| Vue 3 | `knowledge/admin-shell/vue3/` | `layouts/default-layout/` + `composables/` + `components/form-page/` + `components/section-card/` |
| Vue 2 | `knowledge/admin-shell/vue2/` | 同上（`Vue.extend` 写法） |

细则见 [knowledge/admin-shell/README.md](knowledge/admin-shell/README.md)。
