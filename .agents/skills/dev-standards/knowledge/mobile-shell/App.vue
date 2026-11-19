<template>
  <div class="mobile-app">
    <AppNavBar />
    <main class="mobile-app__main" :class="{ 'mobile-app__main--embed': mainEmbed }">
      <RouterView />
    </main>
    <VanTabbar v-if="showTabbar" route fixed placeholder class="mobile-app__tabbar">
      <VanTabbarItem to="/" icon="wap-home-o">首页</VanTabbarItem>
      <VanTabbarItem to="/gallery" icon="photo-o">图库</VanTabbarItem>
      <VanTabbarItem v-if="auth.canSend" to="/send" icon="volume-o">发通知</VanTabbarItem>
      <VanTabbarItem to="/notifications" :badge="badge">
        <template #icon>
          <BellOIcon class="mobile-app__tabbar-bell-o" />
        </template>
        通知
      </VanTabbarItem>
      <VanTabbarItem to="/me" icon="user-o">我的</VanTabbarItem>
    </VanTabbar>
    <PwaInstallPrompt />
  </div>
</template>

<script setup lang="ts">
import { Tabbar as VanTabbar, TabbarItem as VanTabbarItem } from 'vant';
import { computed, onMounted, onUnmounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppNavBar from '@/components/common/app-nav-bar.vue';
import BellOIcon from '@/components/icons/bell-o-icon.vue';
import PwaInstallPrompt from '@/components/common/pwa-install-prompt.vue';
import { useAuthStore } from '@/stores/auth';
import { usePwaInstallStore } from '@/stores/pwa-install';
import { useUnreadStore } from '@/stores/unread';

const route = useRoute();
const auth = useAuthStore();
const unread = useUnreadStore();
const pwaInstall = usePwaInstallStore();

const badge = computed(() => (unread.count > 0 ? String(unread.count) : undefined));
const showTabbar = computed(() => !route.meta.hideNav);
const mainEmbed = computed(() => Boolean(route.meta.mainEmbed));

function onVisibility(): void {
  if (document.visibilityState === 'visible' && auth.isLoggedIn) void unread.refresh();
}

onMounted(() => {
  pwaInstall.bootstrap();
  if (auth.isLoggedIn) void unread.refresh();
  document.addEventListener('visibilitychange', onVisibility);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<style scoped>
.mobile-app__tabbar-bell-o {
  font-size: var(--van-tabbar-item-icon-size);
}
</style>
