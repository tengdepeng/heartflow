<script setup lang="ts">
import { useEnvironmentTemplates } from '@/modules/customization/environment-template-manager'

const { templates, builtinCount, customCount } = useEnvironmentTemplates()
</script>

<template>
  <section class="etp">
    <h3 class="etp-title">◈ 环境模板</h3>
    <p class="etp-sub">环境模板 · 内置 {{ builtinCount }} / 自定义 {{ customCount }}</p>

    <div class="etp-section">
      <h4 class="etp-section__title">全部模板</h4>
      <ul v-if="templates.length" class="etp-list">
        <li v-for="t in templates" :key="t.id" class="etp-item">
          <span class="etp-item__name">{{ t.name }}</span>
          <span class="etp-item__meta">{{ t.atmosphere }}</span>
        </li>
      </ul>
      <p v-else class="etp-empty">暂无模板。</p>
    </div>
  </section>
</template>

<style scoped>
.etp {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.etp-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.etp-sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.etp-section__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
}
.etp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.etp-item {
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
.etp-item__name {
  font-size: 13px;
  color: var(--hf-text);
}
.etp-item__meta {
  font-size: 11px;
  color: var(--hf-text-muted);
}
.etp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
</style>
