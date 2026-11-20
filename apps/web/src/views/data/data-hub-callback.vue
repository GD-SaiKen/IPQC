<template>
  <div class="link-callback">
    <p>{{ statusText }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { finishDataHubLink } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const statusText = ref('正在完成 data-hub 授权…')
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
  const state =
    (typeof route.query.state === 'string' ? route.query.state : undefined) ??
    sessionStorage.getItem('ipqc_data_hub_state') ??
    undefined
  const error = typeof route.query.error === 'string' ? route.query.error : undefined
  sessionStorage.removeItem('ipqc_data_hub_state')

  try {
    await finishDataHubLink({ code, state, error })
    await router.replace({ name: 'data', query: { dataHubLinked: '1' } })
  } catch {
    statusText.value = '授权未完成，请返回数据页重试'
    await router.replace({ name: 'data' })
  }
}
</script>

<style scoped>
.link-callback {
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  font-size: 15px;
}
</style>