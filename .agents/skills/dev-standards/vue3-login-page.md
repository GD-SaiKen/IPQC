# 登录页 · Vue 3 + Element Plus 实现

契约见 [login-page.md](login-page.md)。参考实现：`data-hub` 仓库 `apps/web/src/views/login/index.vue`。

## 1. 文件落位

```
src/views/login/index.vue     唯一路由入口
src/api/auth.ts               login() + sessionExpiredOn401
src/utils/request.ts          RequestOptions.sessionExpiredOn401
public/login-bg.jpg           全屏壁纸（按项目替换）
public/brand-mark.svg         与壳层共用
```

路由（与壳并列）：

```ts
{
  path: '/login',
  name: 'login',
  component: () => import('@/views/login/index.vue'),
  meta: { public: true },
},
```

## 2. DOM 骨架

```vue
<div class="login-root">
  <div class="login-page__backdrop" aria-hidden="true" />
  <div class="login-page__content">
    <section class="login-panel">
      <header class="login-panel__brand"><!-- mark + h1 + 副标题 --></header>
      <div class="login-panel__body">
        <h2>登录</h2>
        <el-form label-width="64px" label-position="right" :rules="rules">...</el-form>
      </div>
    </section>
  </div>
</div>
```

背景分层（`login-page__backdrop`）：

```scss
.login-page__backdrop::before {
  background: url('/login-bg.jpg') center / cover no-repeat;
  transform: scaleX(-1); // 点缀在左
}
.login-page__backdrop::after {
  background: linear-gradient(to bottom right, rgba(深) 0%, …, rgba(浅) 100%);
}
```

## 3. 表单与 API

```typescript
// api/auth.ts
export function login(input: LoginInput, options?: RequestOptions) {
  return request.post(AUTH_API.LOGIN, input, {
    sessionExpiredOn401: false,
    ...options,
  })
}
```

```typescript
// submit：校验通过后 login()；失败由拦截器 msgError，catch 里只做聚焦等收尾
try {
  const result = await login({ loginName, password })
  setAuthUser(result.user)
  markAuthResolved()
  await router.replace(redirect)
} catch (error) {
  if (request.isUnauthorized(error)) passwordRef.value?.focus?.()
}
```

**不要**在登录页 `catch` 里再 `msgError`（会与拦截器重复）。

## 4. 自动填充与清空

```typescript
function syncAutofillFromDom(): void {
  const loginName = loginNameRef.value?.input?.value ?? ''
  if (loginName && loginName !== form.loginName) form.loginName = loginName
  // 密码同理；仅当 DOM 非空才写入
}
```

- 监听：仅 `animationstart`（`login-autofill-start` 动画名）+ `onMounted` 延迟拉一次。
- **不要**给原生 `input` 绑 `input → syncAutofillFromDom`。

## 5. 后端错误文案（内网）

`AuthService.validateCredentials` 建议拆分：

| 场景 | `message` |
|------|-----------|
| 无用户 | 账号不存在 |
| `status !== 'active'` | 账号已停用，请联系管理员 |
| 密码不匹配 | 密码错误 |

## 6. 样式要点

- 主色与壳层一致（如 `#3b6fe0` 按钮）。
- `.login-page__content`：`display:flex; justify-content:flex-end; align-items:center; min-height:100vh`。
- `.login-panel`：固定最大宽度、半透明白底可选 `backdrop-filter`。
