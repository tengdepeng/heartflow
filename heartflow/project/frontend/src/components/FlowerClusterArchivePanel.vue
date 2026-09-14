<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useEmotionGarden } from '@/modules/emotion'

const garden = useEmotionGarden()

const clusters = computed(() => {
  const byType: Record<string, number> = {}
  for (const r of garden.records.value) {
    byType[r.type] = (byType[r.type] || 0) + 1
  }
  return Object.entries(byType).map(([type, count]) => ({ type, count }))
})

const total = computed(() => garden.records.value.length)

const healthScore = computed(() => {
  const c = garden.counts.value
  const happy = c['happy'] || 0
  const base = total.value || 1
  return Math.round((happy / base) * 100)
})

onMounted(() => garden.load())
</script>

<template>
  <section class="gcp">
    <h3 class="gcp-title">花丛分布</h3>

    <template v-if="total === 0">
      <p class="gcp-empty">暂无情绪记录，先去种下一朵花吧。</p>
    </template>

    <template v-else>
      <div class="gcp-metrics">
        <span class="gcp-metric">花丛总数 {{ total }}</span>
        <span class="gcp-metric">情绪种类 {{ clusters.length }}</span>
      </div>

      <ul class="gcp-clusters">
        <li v-for="c in clusters" :key="c.type" class="gcp-cluster">
          {{ c.type }} · {{ c.count }} 株
        </li>
      </ul>

      <div class="gcp-health">
        <span class="gcp-health-label">花田健康分</span>
        <span class="gcp-health-score">{{ healthScore }}</span>
      </div>

      <span class="gcp-lod-tag">高精度</span>
    </template>
  </section>
</template>

<style scoped>
.gcp {
  padding: calc(var(--hf-radius) * 0.8);
  background: var(--hf-surface);
  border: 1px solid var(--hf-border);
  border-radius: var(--hf-radius);
  box-shadow: var(--hf-shadow);
  color: var(--hf-text);
}
.gcp-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--hf-primary);
}
.gcp-empty {
  margin: 0;
  font-size: 13px;
  color: var(--hf-text-muted);
}
.gcp-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.gcp-metric {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--hf-text);
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: 999px;
}
.gcp-clusters {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.gcp-cluster {
  padding: 6px 10px;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--hf-text);
  background: var(--hf-bg);
  border-left: 3px solid var(--hf-primary);
  border-radius: calc(var(--hf-radius) * 0.4);
}
.gcp-health {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.gcp-health-label {
  font-size: 12px;
  color: var(--hf-text-muted);
}
.gcp-health-score {
  font-size: 22px;
  font-weight: 700;
  color: var(--hf-primary);
}
.gcp-lod-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  color: var(--hf-text-muted);
  background: var(--hf-bg);
  border: 1px solid var(--hf-border);
  border-radius: 999px;
}
</style>
