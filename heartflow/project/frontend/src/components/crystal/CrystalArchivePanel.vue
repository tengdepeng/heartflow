<template>
  <section class="cry-panel" aria-label="结晶相性图鉴">
    <div class="cry-panel-head">
      <span class="cry-panel-title">📖 结晶相性图鉴</span>
      <span class="cry-panel-sub">形状分布 · 标签相性 · 感悟集</span>
    </div>

    <!-- 形状分布 -->
    <div class="cry-block">
      <span class="cry-block-label">形状分布</span>
      <div v-if="shapeRows.length" class="cry-rows">
        <div v-for="r in shapeRows" :key="r.shape" class="cry-row">
          <span class="cry-row-label">{{ r.icon }} {{ r.label }}</span>
          <div class="cry-row-bar-wrap">
            <div class="cry-row-bar" :style="{ width: r.pct + '%' }"></div>
          </div>
          <span class="cry-row-count">{{ r.count }}</span>
        </div>
      </div>
      <p v-else class="cry-empty">暂无结晶数据。</p>
    </div>

    <!-- 标签相性 -->
    <div class="cry-block">
      <span class="cry-block-label">标签相性</span>
      <div v-if="tagRows.length" class="cry-tags">
        <span v-for="t in tagRows" :key="t.tag" class="cry-tag" :style="{ fontSize: tagSize(t.count) + 'px' }">{{ t.tag }} · {{ t.count }}</span>
      </div>
      <p v-else class="cry-empty">结晶尚未携带标签。</p>
    </div>

    <!-- 感悟集 -->
    <div class="cry-block">
      <span class="cry-block-label">感悟集 · {{ insights.length }}</span>
      <ul v-if="insights.length" class="cry-insights">
        <li v-for="(ins, i) in insights" :key="i" class="cry-insight">
          <span class="cry-insight-dot" :style="{ background: ins.color }"></span>
          <span class="cry-insight-text">{{ ins.text }}</span>
        </li>
      </ul>
      <p v-else class="cry-empty">暂无感悟。专注时记下的笔记将凝为结晶的感悟。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storage } from '../../engine/storage'
import type { TimeCrystal, CrystalShape } from '../../types'

const crystals = ref<TimeCrystal[]>([])

const SHAPE_META: Record<CrystalShape, { label: string; icon: string }> = {
  sphere: { label: '完美之晶', icon: '💎' },
  dodecahedron: { label: '精雕', icon: '✨' },
  octahedron: { label: '成色', icon: '💠' },
  tetrahedron: { label: '初凝', icon: '🔷' },
  irregular: { label: '残晶', icon: '🪨' },
}

const shapeRows = computed(() => {
  const counts = new Map<CrystalShape, number>()
  for (const c of crystals.value) {
    counts.set(c.shape, (counts.get(c.shape) || 0) + 1)
  }
  const rows = [...counts.entries()]
    .map(([shape, count]) => ({
      shape,
      count,
      label: SHAPE_META[shape]?.label ?? shape,
      icon: SHAPE_META[shape]?.icon ?? '💎',
      pct: crystals.value.length ? Math.round(count / crystals.value.length * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
  return rows
})

const tagRows = computed(() => {
  const counts = new Map<string, number>()
  for (const c of crystals.value) {
    for (const t of c.tags) {
      counts.set(t, (counts.get(t) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
})

const insights = computed(() =>
  crystals.value
    .filter(c => c.insight)
    .map(c => ({ text: c.insight as string, color: c.color }))
    .slice(0, 8),
)

function tagSize(count: number): number {
  const max = Math.max(...tagRows.value.map(t => t.count), 1)
  return 10 + Math.round((count / max) * 6)
}

onMounted(() => {
  crystals.value = [...storage.getCrystals()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})
</script>

<style scoped>
.cry-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.cry-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.cry-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}

.cry-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.cry-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cry-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}

.cry-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}

.cry-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cry-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cry-row-label {
  width: 76px;
  font-size: 10px;
  color: var(--text-medium);
  flex-shrink: 0;
}

.cry-row-bar-wrap {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.cry-row-bar {
  height: 100%;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.5);
}

.cry-row-count {
  width: 24px;
  font-size: 10px;
  color: var(--text-low);
  text-align: right;
}

.cry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cry-tag {
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(240, 242, 255, 0.8);
}

.cry-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cry-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.cry-insight-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.cry-insight-text {
  font-size: 11px;
  line-height: 1.6;
  color: rgba(240, 242, 255, 0.8);
}
</style>
