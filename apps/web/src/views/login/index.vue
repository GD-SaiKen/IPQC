<template>
  <div class="login-root">
    <div class="login-page__backdrop" aria-hidden="true" />

    <div class="login-page__content">
      <section class="login-panel" aria-labelledby="login-heading">
        <header class="login-panel__brand">
          <div class="login-brand__mark" aria-hidden="true">QA</div>
          <div class="login-brand__copy">
            <h1 class="login-brand__name">IPQC 智能工作台</h1>
            <p class="login-brand__tag">品质保证部 · 前制程</p>
          </div>
        </header>

        <div class="login-panel__body">
          <h2 id="login-heading" class="login-panel__title">登录</h2>
          <p class="login-panel__hint">使用 data-hub 统一账号登录，密码只在 data-hub 输入。</p>
          <el-button type="primary" class="login-submit" :loading="submitting" @click="onLogin">
            使用 data-hub 登录
          </el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { startDataHubLogin } from '@/api/auth'

const REDIRECT_KEY = 'ipqc_login_redirect'

const route = useRoute()
const submitting = ref(false)

function clearStaleLoadingMasks(): void {
  document.querySelectorAll('body > .el-loading-mask').forEach((el) => el.remove())
}

onMounted(() => {
  clearStaleLoadingMasks()
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/board'
  sessionStorage.setItem(REDIRECT_KEY, redirect)
})

async function onLogin(): Promise<void> {
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    const { authorizeUrl } = await startDataHubLogin()
    const state = new URL(authorizeUrl).searchParams.get('state')
    if (state) {
      sessionStorage.setItem('ipqc_oauth_state', state)
    }
    window.location.assign(authorizeUrl)
  } catch {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-root {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #f0f4f8;
}

.login-page__backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    135deg,
    #1e3a5f 0%,
    #2563eb 35%,
    #e2e8f0 70%,
    #f8fafc 100%
  );
}

.login-page__content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 24px 8vw;
  box-sizing: border-box;
}

.login-panel {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
  padding: 28px 32px 32px;
}

.login-panel__brand {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 24px;
}

.login-brand__mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.login-brand__name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.login-brand__tag {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.login-panel__title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.login-panel__hint {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.5;
  color: #64748b;
}

.login-submit {
  width: 100%;
  height: 40px;
}

@media (max-width: 760px) {
  .login-page__content {
    justify-content: center;
    padding: 24px 16px;
  }
}
</style>
