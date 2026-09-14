<template>
  <section class="tmp-panel" data-enter aria-label="蜕变势能档案">
    <header class="tmp-head">
      <span class="tmp-title">🦋 蜕变势能</span>
      <span class="tmp-sub">势能 · 节奏 · 类型热度 · 温和洞察</span>
    </header>

    <div v-if="!records.length" class="tmp-empty">
      <span class="tmp-empty-icon">🌱</span>
      <p>{{ insights.length ? insights[0] : '记录第一段蜕变，让成长有迹可循。' }}</p>
    </div>

    <template v-else>
      <!-- 蜕变势能 -->
      <div class="tmp-card">
        <span class="tmp-card-t">蜕变势能</span>
        <div class="tmp-momentum-head">
          <b class="tmp-score">{{ momentum.score }}</b>
          <span class="tmp-level">{{ levelLabel(momentum.level) }}</span>
          <div class="tmp-momentum-facts">
            <span v-if="momentum.daysSinceLast != null">距上次 {{ momentum.daysSinceLast }} 天</span>
            <span>近7天 · {{ momentum.last7Count }} 次</span>
            <span>近30天 · {{ momentum.last30Count }} 次</span>
            <span v-if="momentum.activeTypes.length">覆盖 {{ momentum.activeTypes.length }} 类变化</span>
          </div>
        </div>
      </div>

      <!-- 蜕变节奏 -->
      <div class="tmp-card">
        <span class="tmp-card-t">蜕变节奏</span>
        <div class="tmp-cad-grid">
          <div class="tmp-cad-cell">
            <span>平均间隔</span>
            <b>{{ cadence.avgIntervalDays != null ? cadence.avgIntervalDays + ' 天' : '—' }}</b>
          </div>
          <div class="tmp-cad-cell">
            <span>最长空窗</span>
            <b>{{ cadence.longestGapDays != null ? cadence.longestGapDays + ' 天' : '—' }}</b>
          </div>
          <div class="tmp-cad-cell">
            <span>连续蜕变</span>
            <b>{{ cadence.currentWeekStreak }} 周</b>
          </div>
          <div class="tmp-cad-cell">
            <span>活跃周数</span>
            <b>{{ cadence.totalActiveWeeks }} 周</b>
          </div>
        </div>
      </div>

      <!-- 类型热度 -->
      <div class="tmp-card" v-if="heat.length">
        <span class="tmp-card-t">类型热度</span>
        <div class="tmp-heat-rows">
          <div v-for="h in heat" :key="h.type" class="tmp-heat-row">
            <span class="tmp-heat-icon">{{ typeMeta(h.type).icon }}</span>
            <span class="tmp-heat-label">{{ typeMeta(h.type).label }}</span>
            <div class="tmp-heat-track">
              <div
                class="tmp-heat-fill"
                :style="{ width: h.ratio + '%', background: typeMeta(h.type).color }"
              ></div>
            </div>
            <span class="tmp-heat-count">{{ h.count }} · {{ h.ratio }}%</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <div v-if="insights.length" class="tmp-card">
        <span class="tmp-card-t">温和洞察</span>
        <ul class="tmp-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Transformation, TransformType } from '../modules/transform'
import {
  transformMomentum,
  transformCadence,
  typeHeat,
  transformInsights,
} from '../modules/transform'

const props = defineProps<{ records: Transformation[] }>()

const TYPE_META: Record<TransformType, { label: string; icon: string; color: string }> = {
  body: { label: '身体', icon: '💪', color: '#5ab8a0' },
  mind: { label: '心智', icon: '🧠', color: '#a07c8c' },
  emotion: { label: '情感', icon: '💖', color: '#d98c7a' },
  social: { label: '社交', icon: '🤝', color: '#f0c040' },
  career: { label: '事业', icon: '🚀', color: '#6b9fc4' },
}

const LEVEL_LABEL: Record<string, string> = {
  sparking: '微光',
  rising: '苏醒',
  steady: '生长',
  thriving: '勃发',
}

const momentum = computed(() => transformMomentum(props.records))
const cadence = computed(() => transformCadence(props.records))
const heat = computed(() => typeHeat(props.records))
const insights = computed(() => transformInsights(props.records))

function typeMeta(t: TransformType) {
  return TYPE_META[t] ?? { label: t, icon: '✦', color: '#d4a574' }
}

function levelLabel(level: string): string {
  return LEVEL_LABEL[level] ?? level
}
</script>

<style scoped>
.tmp-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.tmp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.tmp-title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 1px;
  color: rgba(232, 213, 192, 0.85);
}
.tmp-sub {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: rgba(var(--accent-rgb), 0.35);
}

.tmp-empty {
  text-align: center;
  padding: 28px 0 18px;
}
.tmp-empty-icon {
  font-size: 34px;
  display: block;
  margin-bottom: 8px;
}
.tmp-empty p {
  font-size: 13px;
  color: rgba(232, 213, 192, 0.35);
}

.tmp-card {
  padding: 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.tmp-card-t {
  display: block;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.45);
  margin-bottom: 10px;
}

/* 势能 */
.tmp-momentum-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.tmp-score {
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  color: var(--accent);
}
.tmp-level {
  font-size: 14px;
  padding: 3px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}
.tmp-momentum-facts {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: rgba(232, 213, 192, 0.55);
}

/* 节奏 */
.tmp-cad-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.tmp-cad-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tmp-cad-cell span {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
}
.tmp-cad-cell b {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 热度 */
.tmp-heat-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tmp-heat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.tmp-heat-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
}
.tmp-heat-label {
  width: 40px;
  color: rgba(232, 213, 192, 0.7);
}
.tmp-heat-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--bg-card);
  overflow: hidden;
}
.tmp-heat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
.tmp-heat-count {
  width: 60px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: rgba(232, 213, 192, 0.6);
}

/* 洞察 */
.tmp-insights {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tmp-insights li {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(232, 213, 192, 0.75);
}

@media (max-width: 480px) {
  .tmp-cad-grid { grid-template-columns: 1fr; }
}
</style>