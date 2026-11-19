# 登录页（壳外 · 全屏）

后台管理的登录页**不走** `default-layout`，单独占满视口。契约与壳层的关系见 [admin-shell.md](admin-shell.md) §6（`/login` 与 `children` 并列）。

栈实现：

| 栈 | 文档 |
|----|------|
| Vue 3 + Element Plus | [vue3-login-page.md](vue3-login-page.md) |

## 1. 职责边界

| 层 | 负责 | 不负责 |
|----|------|--------|
| **路由** | `meta.public: true`、未登录跳转、`redirect` 查询参数 | 登录表单 UI |
| **页面** | 品牌区 + 凭据表单 + 全屏背景 | 侧边栏、顶栏、业务接口拼 URL |
| **`api/auth`** | `login()` 路径与 `requestOptions` | 页面校验规则细节 |
| **`request`** | 解包信封、失败时 `msgError`（ElMessage） | 登录页内嵌错误条 |
| **后端 `AuthService`** | 区分账号不存在 / 停用 / 密码错误 | 前端路由 |

## 2. 布局结构（桌面）

```
┌──────────────────────────────────────────────────────────────┐
│ 全屏背景（壁纸 + 左上→右下深→浅渐变；点缀偏左，右侧留白）    │
│                                    ┌─────────────────────┐   │
│                                    │ logo + Data Hub      │   │
│                                    │      副标题          │   │
│                                    │ ─────────────────── │   │
│                                    │ 登录                │   │
│                                    │ 账号 [___________]   │   │
│                                    │ 密码 [___________]   │   │
│                                    │     [  登录  ]      │   │
│                                    └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

- **单卡片容器**：品牌（`Data Hub` + 产品线副标题）与登录表单在同一张白底卡片内，不拆成左右两块独立 UI。
- **卡片位置**：视口**偏右**对齐（`justify-content: flex-end` + 右侧内边距）；窄屏（≤760px）居中。
- **卡片宽度**：约 `420px`，圆角 + 浅描边 + 阴影；不拉通屏高。

## 3. 表单契约

| 项 | 约定 |
|----|------|
| 表单项布局 | `label-width` 固定（如 `64px`）、`label-position="right"`：**标签与输入同一行**，标签文字在格内右对齐 |
| 字段 | 账号（手机号或登录名）、密码（`show-password`） |
| 客户端校验 | `el-form` + `rules`：空账号「请输入账号」、空密码「请输入密码」；以 `1` 开头的须校验 11 位手机号 |
| 接口失败 | **禁止**在卡片内再放 `el-alert`；走传输层 `showError`（顶部 Message） |
| 登录 API | `request.post` 默认提示失败；`sessionExpiredOn401: false`（错密 401 不算会话失效） |
| 成功 | `setAuthUser` + `markAuthResolved()` + `router.replace(redirect)`；外链 `redirect` 用 `location.assign` |

## 4. 背景与静态资源

| 资源 | 路径 | 说明 |
|------|------|------|
| 壁纸 | `public/login-bg.jpg`（或项目自定） | 生成图按产品线替换；**水平翻转**（`scaleX(-1)`）使点缀在左、右侧给卡片留白 |
| 渐变遮罩 | `::after` 伪元素 | `linear-gradient(to bottom right, 深 → 浅)`，叠在壁纸之上 |
| Logo | 与壳层相同 `public/brand-mark.svg` | 卡片内与侧栏一致，勿另做一套 VI |

## 5. 交互与坑

- **清空账号**：勿在每次 `input` 时把 DOM 值写回 `v-model`（会与 `clearable` 打架）；自动填充仅在 `animationstart`（WebKit autofill）与挂载时从 DOM 拉回**非空**值。
- **跳转登录前残留遮罩**：`onMounted` 清除 `body > .el-loading-mask`。
- **OAuth 口令换票**：可与 Web 登录文案不同，仍可用统一「账号或密码错误」；Web 登录可按内网策略区分「账号不存在」「密码错误」「账号已停用」。

## 6. 自检

- [ ] `/login` 不在 `default-layout` 的 `children` 里
- [ ] 品牌与表单在同一张卡片内
- [ ] 接口失败只用全局 Message，卡片内无失败 `el-alert`
- [ ] `login()` 传 `sessionExpiredOn401: false`
- [ ] 标签与输入同一行，标签宽度固定、右对齐
- [ ] 壁纸翻转后点缀在左，卡片在右
