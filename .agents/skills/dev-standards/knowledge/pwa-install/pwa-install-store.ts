import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import {
  type BeforeInstallPromptEvent,
  clearDismissedAt,
  isIosSafariLike,
  isStandaloneDisplayMode,
  shouldOfferPwaInstall,
  writeDismissedAt,
} from '@/utils/pwa-install';

export const usePwaInstallStore = defineStore('pwa-install', () => {
  const visible = ref(false);
  const iosHint = ref(false);
  const installing = ref(false);
  const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null);
  const bootstrapped = ref(false);

  const canNativeInstall = computed(() => deferredPrompt.value != null);
  const showBrowserInstallHint = computed(
    () => visible.value && !iosHint.value && !canNativeInstall.value,
  );

  let iosTimer: number | undefined;
  let listenersAttached = false;

  function onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    deferredPrompt.value = event as BeforeInstallPromptEvent;
    iosHint.value = false;
    if (shouldOfferPwaInstall()) {
      visible.value = true;
    }
  }

  function onAppInstalled() {
    clearDismissedAt();
    deferredPrompt.value = null;
    visible.value = false;
  }

  function attachListeners() {
    if (listenersAttached || typeof window === 'undefined') return;
    listenersAttached = true;
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
  }

  function detachListeners() {
    if (!listenersAttached || typeof window === 'undefined') return;
    listenersAttached = false;
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', onAppInstalled);
    if (iosTimer !== undefined) {
      clearTimeout(iosTimer);
      iosTimer = undefined;
    }
  }

  function bootstrap() {
    if (bootstrapped.value) return;
    bootstrapped.value = true;

    if (isStandaloneDisplayMode()) return;

    attachListeners();

    if (isIosSafariLike()) {
      iosHint.value = true;
      iosTimer = window.setTimeout(() => {
        if (!deferredPrompt.value && shouldOfferPwaInstall()) {
          visible.value = true;
        }
      }, 800);
    }
  }

  function dismiss() {
    visible.value = false;
    writeDismissedAt();
  }

  async function install() {
    const promptEvent = deferredPrompt.value;
    if (!promptEvent) return;
    installing.value = true;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      installing.value = false;
      deferredPrompt.value = null;
      visible.value = false;
    }
  }

  function openPrompt() {
    if (isStandaloneDisplayMode()) return;
    attachListeners();
    if (isIosSafariLike()) {
      iosHint.value = true;
      visible.value = true;
      return;
    }
    iosHint.value = false;
    visible.value = true;
  }

  function shouldShowInstallEntry(): boolean {
    return !isStandaloneDisplayMode();
  }

  return {
    visible,
    iosHint,
    installing,
    canNativeInstall,
    showBrowserInstallHint,
    bootstrap,
    dismiss,
    install,
    openPrompt,
    shouldShowInstallEntry,
    detachListeners,
  };
});
