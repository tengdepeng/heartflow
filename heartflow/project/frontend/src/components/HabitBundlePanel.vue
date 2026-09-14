<script setup lang="ts">
import { useDisciplineBridge } from '@/modules/discipline/workshop-bridge'

const props = defineProps<{ bridge: ReturnType<typeof useDisciplineBridge> }>()

const { bundles, BUNDLE_PRESETS, createBundleFromPreset } = props.bridge

function quickBuild(preset: (typeof BUNDLE_PRESETS)[number]) {
  createBundleFromPreset(preset, props.bridge.habits?.value ?? [])
}
</script>

<template>
  <section class="hbp">
    <h3 class="hbp-title">◈ 习惯组合</h3>
    <p class="hbp-sub">预设速建</p>

    <div class="hbp-presets">
      <button
        v-for="p in BUNDLE_PRESETS"
        :key="p.name"
        class="hbp-preset"
        type="button"
        @click="quickBuild(p)"
      >
        {{ p.name }}
      </button>
    </div>

    <h4 class="hbp-list-title">全部组合</h4>
    <ul v-if="bundles.length" class="hbp-list">
      <li v-for="b in bundles" :key="b.id" class="hbp-item">
        <span class="hbp-item__name">{{ b.name }}</span>
        <span class="hbp-item__meta">{{ b.habitIds.length }} 习惯 · x{{ b.bonusMultiplier }}</span>
      </li>
    </ul>
    <p v-else class="hbp-empty">还没有习惯组合</p>
  </section>
</template>

<style scoped>
.hbp {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.hbp-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.hbp-sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--hf-text-muted);
}
.hbp-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.hbp-preset {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--hf-text);
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: 999px;
  cursor: pointer;
}
.hbp-preset:hover {
  border-color: var(--hf-primary);
  color: var(--hf-primary);
}
.hbp-list-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hf-text);
}
.hbp-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.hbp-item {
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
.hbp-item__name {
  font-size: 13px;
  color: var(--hf-text);
}
.hbp-item__meta {
  font-size: 11px;
  color: var(--hf-text-muted);
}
.hbp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--hf-text-muted);
}
</style>
