<template>
  <Dialog
    v-model:show="visible"
    class="pwa-install-dialog"
    :show-confirm-button="false"
    :close-on-click-overlay="false"
    :close-on-popstate="false"
    teleport="body"
  >
    <div class="pwa-install" data-testid="pwa-install-prompt">
      <slot name="logo">
        <div class="pwa-install__logo-placeholder" aria-hidden="true" />
      </slot>
      <h2 class="pwa-install__title">{{ title }}</h2>
      <p class="pwa-install__lead">
        <template v-if="iosHint">{{ iosLead }}</template>
        <template v-else>{{ androidLead }}</template>
      </p>
      <ol v-if="iosHint" class="pwa-install__steps">
        <li>点击浏览器底部分享按钮</li>
        <li>选择「添加到主屏幕」</li>
      </ol>
      <p v-if="showBrowserInstallHint" class="pwa-install__browser-hint">
        浏览器也可能在地址栏右侧显示安装图标。若没有，请打开菜单选择「安装应用」或「添加到主屏幕」。
      </p>
      <div class="pwa-install__actions">
        <Button
          v-if="canNativeInstall"
          block
          round
          type="primary"
          :loading="installing"
          data-testid="pwa-install-confirm"
          @click="install"
        >
          安装应用
        </Button>
        <Button
          block
          round
          :type="iosHint ? 'primary' : 'default'"
          data-testid="pwa-install-dismiss"
          @click="dismiss"
        >
          {{ iosHint ? '知道了' : '暂不' }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Button, Dialog } from 'vant';

import { usePwaInstallStore } from '@/stores/pwa-install';

withDefaults(
  defineProps<{
    title?: string;
    iosLead?: string;
    androidLead?: string;
  }>(),
  {
    title: '安装应用',
    iosLead: '添加到主屏幕后，可像 App 一样从桌面全屏打开。',
    androidLead: '安装到本机后，可从桌面直接打开，获得更流畅的全屏体验。',
  },
);

const pwaInstall = usePwaInstallStore();
const { visible, iosHint, installing, canNativeInstall, showBrowserInstallHint } =
  storeToRefs(pwaInstall);
const { dismiss, install } = pwaInstall;
</script>

<style scoped>
.pwa-install {
  padding: 28px 22px 22px;
  text-align: center;
}

.pwa-install__logo-placeholder {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 14px;
  background: var(--van-primary-color, #1989fa);
  opacity: 0.15;
}

.pwa-install__title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--om-text);
}

.pwa-install__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--om-text-muted);
}

.pwa-install__steps {
  margin: 0 0 18px;
  padding-left: 1.2em;
  text-align: left;
  font-size: 14px;
  line-height: 1.65;
}

.pwa-install__browser-hint {
  margin: 0 0 16px;
  padding: 12px;
  border-radius: 12px;
  background: var(--om-accent-bg);
  font-size: 13px;
  line-height: 1.55;
  text-align: left;
}

.pwa-install__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>

<style>
.pwa-install-dialog.van-dialog {
  width: min(92vw, 340px);
  border-radius: 20px;
  overflow: hidden;
}
</style>
