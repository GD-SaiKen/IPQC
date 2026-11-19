import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import { router, resetAuthResolved } from './router'
import { onSessionExpired } from '@/stores/auth'
import '@/styles/ipqc.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

onSessionExpired(() => {
  resetAuthResolved()
  const redirect = router.currentRoute.value.fullPath
  void router.push({ name: 'login', query: { redirect } })
})
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
