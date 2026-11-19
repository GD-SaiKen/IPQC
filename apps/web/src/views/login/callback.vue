<template>
  <div class="login-callback">
    <p>{{ statusText }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { finishDataHubLogin } from '@/api/auth'
import { markAuthResolved } from '@/router'
import { setAuthUser } from '@/stores/auth'

const REDIRECT_KEY = 'ipqc_login_redirect'

const route = useRoute()
const router = useRouter()
const statusText = ref('正在完成登录…')
let completing = false

onMounted(() => {
  void complete()
})

async function complete(): Promise<void> {
  if (completing) {
    return
  }
  completing = true
  const code = typeof route.query.code === 'string' ? route.query.code : undefined
  const stateFromQuery = typeof route.query.state === 'string' ? route.query.state : undefined
  const state =
    stateFromQuery ?? sessionStorage.getItem('ipqc_oauth_state') ?? undefined
  const error = typeof route.query.error === 'string' ? route.query.error : undefined

  sessionStorage.removeItem('ipqc_oauth_state')

  try {
    const user = await finishDataHubLogin({ code, state, error })
    setAuthUser(user)
    markAuthResolved()
    const redirect = sessionStorage.getItem(REDIRECT_KEY) ?? '/board'
    sessionStorage.removeItem(REDIRECT_KEY)
    if (/^https?:\/\//i.test(redirect)) {
      window.location.assign(redirect)
      return
    }
    await router.replace(redirect)
  } catch {
    statusText.value = '登录未完成，请返回重试'
    await router.replace({ name: 'login' })
  }
}
</script>

<style scoped>
.login-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  font-size: 15px;
}
</style>
