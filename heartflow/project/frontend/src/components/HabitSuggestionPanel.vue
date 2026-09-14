<script setup lang="ts">
import { computed } from 'vue'
import { useDisciplineBridge } from '@/modules/discipline/workshop-bridge'

const props = defineProps<{ bridge: ReturnType<typeof useDisciplineBridge> }>()

// 优先用引擎维护的 suggestions ref；fallback 到 generateSuggestions()（视图测试 mock 仅提供后者）
const suggestions = computed<Array<{ id: string; name: string; reason: string }>>(() => {
  const b = props.bridge
  if (b.suggestions && Array.isArray(b.suggestions.value)) return b.suggestions.value
  return b.generateSuggestions ? b.generateSuggestions() : []
})

function adopt(id: string) {
  props.bridge.adoptSuggestion(id)
}
</script>

<template>
  <section class="hsp">
    <h3 class="hsp-title">💡 习惯建议</h3>
    <p class="hsp-sub">互补习惯 · 一键采纳 · 自律加码</p>

    <h4 class="hsp-rec-title">为你推荐</h4>
    <ul v-if="suggestions.length" class="hsp-list">
      <li v-for="s in suggestions" :key="s.id" class="hsp-item">
        <div class="hsp-item__main">
          <span class="hsp-item__name">{{ s.name }}</span>
          <span class="hsp-item__meta">{{ s.reason }}</span>
        </div>
        <button class="hsp-btn" type="button" @click="adopt(s.id)">采纳</button>
      </li>
    </ul>
    <p v-else class="hsp-empty">暂无建议</p>
  </section>
</template>

<style scoped>
.hsp {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.hsp-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.hsp-sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.hsp-rec-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
}
.hsp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.hsp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: calc(var(--hf-radius) * 0.5);
}
.hsp-item__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hsp-item__name {
  font-size: 13px;
  color: var(--hf-text);
}
.hsp-item__meta {
  font-size: 11px;
  color: var(--hf-text-muted);
}
.hsp-btn {
  flex: none;
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background: var(--hf-primary);
  border: none;
  border-radius: 999px;
  cursor: pointer;
}
.hsp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
</style>
