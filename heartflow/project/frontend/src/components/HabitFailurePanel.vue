<script setup lang="ts">
import { computed } from 'vue'
import { useDisciplineBridge } from '@/modules/discipline/workshop-bridge'

const props = defineProps<{ bridge: ReturnType<typeof useDisciplineBridge> }>()

// failures 在视图测试 mock 中未提供 → 空安全 fallback 为 []
const failures = computed(() => props.bridge.failures?.value ?? [])
</script>

<template>
  <section class="hfa">
    <h3 class="hfa-title">🙏 失败分析</h3>
    <p class="hfa-sub">中断复盘 · 恢复建议 · 重新出发</p>

    <h4 class="hfa-rec-title">失败记录</h4>
    <ul v-if="failures.length" class="hfa-list">
      <li v-for="f in failures" :key="f.id" class="hfa-item">
        <span class="hfa-item__name">{{ f.habitName }}</span>
        <span class="hfa-item__meta">{{ f.reason }}</span>
      </li>
    </ul>
    <p v-else class="hfa-empty">暂无失败记录</p>
  </section>
</template>

<style scoped>
.hfa {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.hfa-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.hfa-sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.hfa-rec-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
}
.hfa-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.hfa-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: calc(var(--hf-radius) * 0.5);
}
.hfa-item__name {
  font-size: 13px;
  color: var(--hf-text);
}
.hfa-item__meta {
  font-size: 11px;
  color: var(--hf-text-muted);
}
.hfa-empty {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
</style>
