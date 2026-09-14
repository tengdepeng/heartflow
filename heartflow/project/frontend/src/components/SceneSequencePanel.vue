<script setup lang="ts">
import { useSceneSequences } from '@/modules/customization/scene-sequences'

const { sequences, totalSteps } = useSceneSequences()
</script>

<template>
  <section class="ssp">
    <h3 class="ssp-title">✦ 场景序列</h3>
    <p class="ssp-sub">场景序列 · 共 {{ totalSteps }} 步</p>

    <div class="ssp-section">
      <h4 class="ssp-section__title">我的序列</h4>
      <ul v-if="sequences.length" class="ssp-list">
        <li v-for="s in sequences" :key="s.id" class="ssp-item">
          <span class="ssp-item__name">{{ s.name }}</span>
          <span class="ssp-item__meta">{{ s.steps.length }} 步 · {{ s.enabled ? '启用' : '停用' }}</span>
        </li>
      </ul>
      <p v-else class="ssp-empty">还没有序列，新建一个开始编排吧。</p>
    </div>
  </section>
</template>

<style scoped>
.ssp {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.ssp-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.ssp-sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.ssp-section__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
}
.ssp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ssp-item {
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
.ssp-item__name {
  font-size: 13px;
  color: var(--hf-text);
}
.ssp-item__meta {
  font-size: 11px;
  color: var(--hf-text-muted);
}
.ssp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
</style>
