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
          <p class="login-panel__hint">使用本系统手机号与密码登录。</p>
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="64px"
            label-position="right"
            @submit.prevent
          >
            <el-form-item label="手机号" prop="phone">
              <el-input
                ref="phoneRef"
                v-model="form.phone"
                autocomplete="username"
                maxlength="20"
                placeholder="11 位手机号"
              />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                ref="passwordRef"
                v-model="form.password"
                type="password"
                show-password
                autocomplete="current-password"
                placeholder="登录密码"
                @keyup.enter="onSubmit"
              />
            </el-form-item>
            <el-button type="primary" class="login-submit" :loading="submitting" @click="onSubmit">
              登录
            </el-button>
          </el-form>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import { login } from '@/api/auth'
import { markAuthResolved } from '@/router'
import { setAuthUser } from '@/stores/auth'
import { request } from '@/utils/request'

const route = useRoute()
const vueRouter = useRouter()
const formRef = ref<FormInstance>()
const phoneRef = ref<{ focus?: () => void }>()
const passwordRef = ref<{ focus?: () => void }>()
const submitting = ref(false)

const form = reactive({
  phone: '',
  password: '',
})

const rules: FormRules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function redirectTarget(): string {
  const q = route.query.redirect
  if (typeof q === 'string' && q.startsWith('/') && !q.startsWith('//')) {
    return q
  }
  return '/board'
}

function clearStaleLoadingMasks(): void {
  document.querySelectorAll('body > .el-loading-mask').forEach((el) => el.remove())
}

onMounted(() => {
  clearStaleLoadingMasks()
  phoneRef.value?.focus?.()
})

async function onSubmit(): Promise<void> {
  if (submitting.value) {
    return
  }
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    const user = await login({ phone: form.phone.trim(), password: form.password })
    setAuthUser(user)
    markAuthResolved()
    await vueRouter.replace(redirectTarget())
  } catch (error) {
    if (request.isUnauthorized(error)) {
      passwordRef.value?.focus?.()
    }
  } finally {
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
  margin-top: 4px;
}

@media (max-width: 760px) {
  .login-page__content {
    justify-content: center;
    padding: 24px 16px;
  }
}
</style>