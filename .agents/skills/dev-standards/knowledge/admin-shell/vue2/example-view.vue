<template>
  <!--
    详情页示例：整页滚 + SectionCard 堆叠 + 动态标题。复制到 src/views/orders/detail.vue
    路由写法：
      { path: 'orders/:id', name: 'order-detail', component: () => import('@/views/orders/detail.vue'),
        meta: { title: '工单详情', parent: 'orders' } }
    注意根元素自己滚（.detail-page），因为壳层的 .view 是 overflow: hidden。
  -->
  <div class="detail-page">
    <SectionCard title="基本信息" :subtitle="order ? '#' + order.code : ''">
      <div class="kv">
        <span class="kv__k">单号</span><span class="kv__v">{{ order ? order.code : '-' }}</span>
        <span class="kv__k">标题</span><span class="kv__v">{{ order ? order.title : '-' }}</span>
        <span class="kv__k">负责人</span><span class="kv__v">{{ order ? order.owner : '-' }}</span>
        <span class="kv__k">金额</span><span class="kv__v">{{ order ? order.amount : '-' }}</span>
      </div>
    </SectionCard>

    <SectionCard
      title="处理记录"
      subtitle="共 3 条"
      tooltip="按时间倒序，只展示本工单的流转记录"
      collapsible
      :collapsed.sync="logCollapsed"
    >
      <ul class="log">
        <li v-for="i in 3" :key="i">第 {{ 4 - i }} 步 · 处理人 张三 · 2026-11-0{{ i }}</li>
      </ul>
    </SectionCard>

    <SectionCard badge="1" title="步骤胶囊标题（用于填写类页面）">
      <p class="muted">同一页里 badge 形态与文字形态不要混用，层级会乱。</p>
    </SectionCard>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import SectionCard from '@/components/section-card/section-card.vue';
import { setPageTitle } from '@/domain/page-title';

interface OrderDetail {
  code: string;
  title: string;
  owner: string;
  amount: number;
}

export default Vue.extend({
  name: 'OrderDetailPage',
  components: { SectionCard },
  data() {
    return {
      order: null as OrderDetail | null,
      logCollapsed: false,
    };
  },
  watch: {
    '$route.params.id': {
      immediate: true,
      handler(id: string) {
        // TODO: 换成真实接口 → api/order.ts 的 getOrder(id)
        this.order = {
          code: 'WO-2026-' + String(id).padStart(3, '0'),
          title: '示例工单',
          owner: '张三',
          amount: 12000,
        };
      },
    },
    // 顶栏标题带上业务名：比只显示「工单详情」有用得多
    'order.code': {
      immediate: true,
      handler(code: string | undefined) {
        setPageTitle(code ? `工单 ${code}` : '');
      },
    },
  },
  // 必须清空，否则回到列表页顶栏还挂着详情标题
  beforeDestroy() {
    setPageTitle('');
  },
});
</script>

<style lang="scss" scoped>
/* .view 不滚，所以详情页自己承担滚动 */
.detail-page {
  height: 100%;
  overflow-y: auto;
}

.kv {
  display: grid;
  grid-template-columns: 88px 1fr 88px 1fr;
  gap: 10px 16px;
  font-size: 14px;
}

.kv__k {
  color: #7a8494;
}

.kv__v {
  color: #1f2733;
}

.log {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.9;
  color: #566070;
}

.muted {
  margin: 0;
  font-size: 13px;
  color: #7a8494;
}
</style>
