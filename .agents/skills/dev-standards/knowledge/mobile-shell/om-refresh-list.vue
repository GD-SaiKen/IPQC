<template>
  <PullRefresh
    v-model="refreshingModel"
    class="om-refresh-list"
    :disabled="disabled"
    pulling-text="下拉即可刷新"
    loosing-text="释放即可刷新"
    loading-text="加载中..."
    @refresh="emit('refresh')"
  >
    <List
      v-model:loading="loadingModel"
      class="om-refresh-list__list"
      :finished="finished"
      :finished-text="contentEmpty ? '' : finishedText"
      :immediate-check="immediateCheck"
      :offset="offset"
      :loading-text="loadingText"
      @load="emit('load')"
    >
      <slot />
    </List>
  </PullRefresh>
</template>

<script setup lang="ts">
import { List, PullRefresh } from 'vant'

withDefaults(
  defineProps<{
    finished?: boolean
    finishedText?: string
    immediateCheck?: boolean
    offset?: number | string
    disabled?: boolean
    /** 无列表数据时隐藏「没有更多了」，并配合空状态居中 */
    contentEmpty?: boolean
    /** 为空时不展示 List 底部 loading（仅分页加载更多时可传文案） */
    loadingText?: string
  }>(),
  {
    finished: true,
    finishedText: '没有更多了',
    contentEmpty: false,
    immediateCheck: true,
    offset: 300,
    disabled: false,
    loadingText: '',
  },
)

const emit = defineEmits<{
  refresh: []
  load: []
}>()

const refreshingModel = defineModel<boolean>('refreshing', { default: false })
const loadingModel = defineModel<boolean>('loading', { default: false })
</script>

<style scoped>
.om-refresh-list {
  --om-refresh-list-empty-min-height: 52dvh;
  min-height: 100%;
  /* 勿在此层设 overflow 滚动：会与 .mobile-app__main 形成嵌套滚动，
     PullRefresh 误判 scrollTop 恒为 0，导致未滚到顶也会触发刷新 */
}

.om-refresh-list :deep(.van-pull-refresh__head) {
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.om-refresh-list__list :deep(.empty-state--list),
.om-refresh-list__list :deep(.om-list-empty-placeholder) {
  box-sizing: border-box;
  min-height: var(--om-refresh-list-empty-min-height);
  padding: 40px var(--van-padding-md) 32px;
  justify-content: center;
}

.om-refresh-list__list :deep(.van-list__finished-text) {
  margin-top: 8px;
  padding: 28px var(--van-padding-md) 40px;
  color: var(--om-text-muted);
  font-size: var(--om-font-micro);
  line-height: 1.5;
}
</style>
