<template>
  <section class="sp-panel" aria-label="空间格局">
    <div class="sp-panel-head">
      <span class="sp-panel-title">🧿 空间格局</span>
      <span class="sp-panel-sub">四象方位 · 探索版图</span>
    </div>

    <div class="sp-block">
      <span class="sp-block-label">
        方位覆盖 {{ pattern.coverage }}/4<template v-if="pattern.dominant"> · 主聚 {{ dominantLabel }}</template>
      </span>
      <div class="sp-grid">
        <div
          v-for="q in pattern.quadrants"
          :key="q.key"
          class="sp-quad"
          :class="{ dominant: q.key === pattern.dominant, empty: q.count === 0 }"
          :style="{ borderColor: q.color }"
        >
          <span class="sp-quad-icon" :style="{ color: q.color }">{{ q.icon }}</span>
          <span class="sp-quad-name">{{ q.animal }} · {{ q.label }}方</span>
          <span class="sp-quad-count">{{ q.count }}</span>
          <div class="sp-quad-bar"><div class="sp-quad-fill" :style="{ width: q.pct + '%', background: q.color }" /></div>
          <span class="sp-quad-places">{{ q.places.slice(0, 3).join('、') }}<template v-if="q.places.length > 3">…</template></span>
        </div>
      </div>
      <div v-if="pattern.nsSpread || pattern.ewSpread" class="sp-span">
        空间跨度 南北 {{ pattern.nsSpread }}° × 东西 {{ pattern.ewSpread }}°
      </div>
    </div>

    <div class="sp-block" v-if="insights.length">
      <span class="sp-block-label">格局洞察</span>
      <p v-for="(ins, i) in insights" :key="i" class="sp-insight">{{ ins }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Place } from '../modules/map/map'
import {
  spatialPatternOverview,
  spatialInsights,
  QUADRANT_MAP,
} from '../modules/map/spatial-pattern'

const props = defineProps<{ places: Place[] }>()

const pattern = computed(() => spatialPatternOverview(props.places))
const insights = computed(() => spatialInsights(props.places))
const dominantLabel = computed(() =>
  pattern.value.dominant ? QUADRANT_MAP[pattern.value.dominant].animal : '',
)
</script>

<style scoped>
.sp-panel {
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
.sp-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.sp-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.sp-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.sp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.sp-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.sp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.sp-quad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid;
  border-left: 3px solid;
}
.sp-quad.empty {
  opacity: 0.45;
}
.sp-quad-icon {
  font-size: 16px;
}
.sp-quad-name {
  font-size: 11px;
  color: rgba(240, 242, 255, 0.8);
}
.sp-quad-count {
  font-size: 16px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.sp-quad-bar {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.sp-quad-fill {
  height: 100%;
  border-radius: 3px;
}
.sp-quad-places {
  font-size: 10px;
  color: var(--text-low);
  text-align: center;
  line-height: 1.4;
  min-height: 14px;
}
.sp-span {
  font-size: 11px;
  color: var(--text-low);
}
.sp-insight {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(240, 242, 255, 0.7);
  padding-left: 10px;
  border-left: 2px solid rgba(224, 122, 95, 0.4);
}
</style>
