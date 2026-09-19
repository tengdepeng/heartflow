<template>
  <section class="ufw-panel" data-enter aria-label="复垦气象档案">
    <header class="ufw-head">
      <span class="ufw-title">🪴 复垦气象</span>
      <span class="ufw-sub">花园气象 · 今日该拾起 · 拾起时机 · 复垦洞察</span>
    </header>

    <div v-if="empty" class="ufw-empty">
      <span class="ufw-empty-icon">🌱</span>
      <p>{{ insights.length ? insights[0] : '花园还空着。放一件未完成的事进来，它会慢慢变肥沃。' }}</p>
    </div>

    <template v-else>
      <!-- 花园气象 -->
      <div class="ufw-card">
        <span class="ufw-card-t">🌤 花园气象</span>
        <div class="ufw-gauge-wrap">
          <div class="ufw-gauge" :style="{ background: progressRing }">
            <span class="ufw-gauge-num">{{ stats.completionRate }}<i>%</i></span>
          </div>
          <span class="ufw-gauge-label">收束率</span>
        </div>
        <div class="ufw-facts">
          <span>共 {{ stats.total }} 件</span>
          <span>已完成 {{ stats.completed }}</span>
          <span>完成率 {{ stats.completionRate }}%</span>
          <span>活跃 {{ stats.active }}</span>
        </div>

        <div class="ufw-type-head">类型分布</div>
        <div v-if="typeRows.length" class="ufw-dist-rows">
          <div v-for="r in typeRows" :key="r.key" class="ufw-dist-row">
            <span class="ufw-dist-icon">{{ typeMeta(r.key).icon }}</span>
            <span class="ufw-dist-label">{{ typeMeta(r.key).label }}</span>
            <div class="ufw-dist-track">
              <div class="ufw-dist-fill" :style="{ width: r.pct + '%', background: typeMeta(r.key).color }"></div>
            </div>
            <span class="ufw-dist-count">{{ r.count }} · {{ r.pct }}%</span>
          </div>
        </div>

        <div class="ufw-type-head">沉淀分档</div>
        <div class="ufw-dist-rows">
          <div v-for="b in stats.buckets" :key="b.key" class="ufw-dist-row">
            <span class="ufw-dist-icon">{{ bucketMeta(b.key).icon }}</span>
            <span class="ufw-dist-label">{{ bucketMeta(b.key).label }}</span>
            <div class="ufw-dist-track">
              <div class="ufw-dist-fill" :style="{ width: bucketPct(b.key) + '%', background: bucketMeta(b.key).color }"></div>
            </div>
            <span class="ufw-dist-count">{{ b.count }}</span>
          </div>
        </div>
      </div>

      <!-- 今日该拾起 -->
      <div class="ufw-card" v-if="todayPick">
        <span class="ufw-card-t">☀️ 今日该拾起</span>
        <div class="ufw-today">
          <b class="ufw-today-text">「{{ todayPick.item.text }}」</b>
          <span class="ufw-today-reason">{{ todayPick.reason }}</span>
          <span class="ufw-today-score">价值 {{ todayPick.score }}</span>
        </div>
      </div>

      <!-- 拾起时机榜 -->
      <div class="ufw-card" v-if="topPick.length">
        <span class="ufw-card-t">🌱 拾起时机</span>
        <div class="ufw-pick-rows">
          <div v-for="(p, i) in topPick" :key="p.item.id" class="ufw-pick-row">
            <span class="ufw-pick-rank">{{ i + 1 }}</span>
            <span class="ufw-pick-icon">{{ typeMeta(p.item.type).icon }}</span>
            <div class="ufw-pick-main">
              <span class="ufw-pick-text">{{ p.item.text }}</span>
              <span class="ufw-pick-reason">{{ p.reason }}</span>
            </div>
            <span class="ufw-pick-score">{{ p.score }}</span>
          </div>
        </div>
      </div>

      <!-- 复垦洞察 -->
      <div v-if="insights.length" class="ufw-card">
        <span class="ufw-card-t">✦ 复垦洞察</span>
        <ul class="ufw-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  gardenStats,
  rankForPickup,
  pickUpSuggestion,
  gardenInsights,
  type UItem,
  type GardenType,
  type BucketKey,
} from '../modules/unfinished'

const props = defineProps<{ items: UItem[] }>()

const stats = computed(() => gardenStats(props.items))
// 收束率圆环色：从尘青到成熟金（并入自 GardenMomentumPanel）
const progressRing = computed(() => {
  const r = stats.value.completionRate
  const hue = r >= 60 ? 38 : r >= 30 ? 48 : 168
  return `conic-gradient(hsl(${hue} 60% 55%) ${r * 3.6}deg, rgba(var(--accent-rgb), 0.1) ${r * 3.6}deg)`
})
const ranked = computed(() => rankForPickup(props.items))
const todayPick = computed(() => pickUpSuggestion(props.items))
const insights = computed(() => gardenInsights(props.items))
const empty = computed(() => props.items.length === 0)

const topPick = computed(() => ranked.value.slice(0, 5))

const activeByType = computed(() => {
  const total = props.items.filter((i) => !i.completed).length || 1
  return (Object.keys(stats.value.byType) as GardenType[]).map((k) => ({
    key: k,
    count: stats.value.byType[k],
    pct: Math.round((stats.value.byType[k] / total) * 100),
  }))
})

const typeRows = computed(() => activeByType.value.filter((r) => r.count > 0))

function bucketPct(key: BucketKey): number {
  const active = stats.value.active || 1
  const b = stats.value.buckets.find((x) => x.key === key)
  return b ? Math.round((b.count / active) * 100) : 0
}

const TYPE_META: Record<GardenType, { icon: string; label: string; color: string }> = {
  seed: { icon: '🌰', label: '种子', color: '#8a9a7a' },
  book: { icon: '📖', label: '开了头的书', color: '#7a88b8' },
  draft: { icon: '✍️', label: '半截笔记', color: '#e8b860' },
}

const BUCKET_META: Record<BucketKey, { icon: string; label: string; color: string }> = {
  fresh: { icon: '🌱', label: '新芽', color: '#8a9a7a' },
  maturing: { icon: '🌿', label: '渐长', color: '#5aa07a' },
  dusty: { icon: '🪶', label: '蒙尘', color: '#e8b860' },
  forgotten: { icon: '🌫️', label: '遗忘', color: '#9a9a88' },
}

function typeMeta(k: GardenType) {
  return TYPE_META[k]
}
function bucketMeta(k: BucketKey) {
  return BUCKET_META[k]
}
</script>

<style scoped>
.ufw-panel {
  margin-bottom: 28px;
}
.ufw-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.ufw-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-high);
}
.ufw-sub {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}
.ufw-empty {
  padding: 20px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px dashed rgba(var(--accent-rgb), 0.2);
  text-align: center;
}
.ufw-empty-icon {
  display: block;
  font-size: 22px;
  margin-bottom: 8px;
}
.ufw-empty p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.ufw-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(55, 48, 40, 0.45);
  border: 1px solid rgba(232, 184, 96, 0.14);
  margin-bottom: 12px;
}
.ufw-card-t {
  display: block;
  font-size: 12px;
  color: #e8b860;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
}
.ufw-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.ufw-gauge-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.ufw-gauge {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.ufw-gauge::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: var(--bg-card);
}
.ufw-gauge-num {
  position: relative;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high);
}
.ufw-gauge-num i {
  font-style: normal;
  font-size: 9px;
  opacity: 0.55;
  margin-left: 1px;
}
.ufw-gauge-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
.ufw-facts span {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(232, 184, 96, 0.08);
  letter-spacing: 0.3px;
}
.ufw-type-head {
  font-size: 11px;
  color: var(--text-muted);
  margin: 10px 0 6px;
  letter-spacing: 1px;
}
.ufw-dist-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ufw-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ufw-dist-icon {
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}
.ufw-dist-label {
  font-size: 11px;
  color: var(--text-secondary);
  width: 66px;
  flex-shrink: 0;
}
.ufw-dist-track {
  flex: 1;
  height: 6px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.ufw-dist-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}
.ufw-dist-count {
  font-size: 10px;
  color: var(--text-muted);
  width: 52px;
  text-align: right;
  flex-shrink: 0;
}
.ufw-today {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ufw-today-text {
  font-size: 14px;
  color: var(--text-high);
  line-height: 1.5;
}
.ufw-today-reason {
  font-size: 12px;
  color: var(--text-secondary);
}
.ufw-today-score {
  font-size: 10px;
  color: #8a9a7a;
  letter-spacing: 0.5px;
}
.ufw-pick-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ufw-pick-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
}
.ufw-pick-rank {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  width: 16px;
  text-align: center;
}
.ufw-pick-icon {
  flex-shrink: 0;
}
.ufw-pick-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ufw-pick-text {
  font-size: 13px;
  color: var(--text-high);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ufw-pick-reason {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ufw-pick-score {
  font-size: 12px;
  color: #8a9a7a;
  flex-shrink: 0;
}
.ufw-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ufw-insights li {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>