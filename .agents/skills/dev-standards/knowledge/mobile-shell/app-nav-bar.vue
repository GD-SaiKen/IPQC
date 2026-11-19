<template>
  <VanNavBar
    v-if="visible"
    :title="title"
    :left-arrow="showBack"
    :right-text="navOverride.rightText"
    fixed
    placeholder
    safe-area-inset-top
    class="mobile-app__navbar"
    @click-left="onBack"
    @click-right="onRight"
  >
    <template v-if="navOverride.rightLabel" #right>
      <span class="app-nav-bar__muted">{{ navOverride.rightLabel }}</span>
    </template>
  </VanNavBar>
</template>

<script setup lang="ts">
import { NavBar as VanNavBar } from 'vant';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getAppNavBarOverride,
  resetAppNavBarOverride,
} from '@/composables/use-app-nav-bar';

const navOverride = getAppNavBarOverride();

const route = useRoute();
const router = useRouter();

watch(
  () => route.fullPath,
  () => resetAppNavBarOverride(),
);

const visible = computed(() => !route.meta.hideNav);
const title = computed(() => navOverride.title ?? route.meta.navTitle ?? '');
const showBack = computed(() => Boolean(route.meta.navBack));

function onBack(): void {
  router.back();
}

function onRight(): void {
  navOverride.onRightClick?.();
}
</script>

<style scoped>
.app-nav-bar__muted {
  font-size: 11px;
  color: var(--om-text-muted, #969799);
}
</style>
