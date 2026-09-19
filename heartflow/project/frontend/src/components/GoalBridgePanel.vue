<template>
  <section class="gbp" data-test="goal-bridge-panel" aria-label="留光阁 · 桥接总览">
    <div class="gbp-head">
      <span class="gbp-title">🧭 留光阁 · 桥接总览</span>
      <span class="gbp-badge" data-test="gbp-badge">
        共 {{ summary.total }} 个目标 · 完成 {{ summary.completionRate }}%
      </span>
    </div>

    <!-- 总览 -->
    <div class="gbp-block" data-test="gbp-summary">
      <span class="gbp-block-label">此处 · 一瞥</span>
      <div class="gbp-sumstats">
        <div class="gbp-sum"><b data-test="gbp-total">{{ summary.total }}</b><span>全部目标</span></div>
        <div class="gbp-sum"><b>{{ summary.activeTargets }}</b><span>活跃目标</span></div>
        <div class="gbp-sum"><b>{{ summary.unhealthyCount }}</b><span>需关注</span></div>
        <div class="gbp-sum"><b>{{ summary.oldDreamCount }}</b><span>旧梦</span></div>
      </div>
      <div v-if="tierRows.length && summary.total" class="gbp-tiers" data-test="gbp-tiers">
        <div v-for="t in tierRows" :key="t.key" class="gbp-tier">
          <span class="gbp-tier-label">{{ t.label }}</span>
          <div class="gbp-tier-track">
            <div class="gbp-tier-fill" :style="{ width: tierPct(t) }"></div>
          </div>
          <span class="gbp-tier-num">{{ t.count }}</span>
        </div>
      </div>
    </div>

    <!-- 状态分布 -->
    <div v-if="statusRows.length" class="gbp-block" data-test="gbp-status">
      <span class="gbp-block-label">生长状态分布</span>
      <div class="gbp-status-chips">
        <span v-for="s in statusRows" :key="s.key" class="gbp-chip">{{ s.label }} {{ s.count }}</span>
      </div>
    </div>

    <!-- 活跃目标 -->
    <div v-if="activeTargets.length" class="gbp-block" data-test="gbp-active">
      <span class="gbp-block-label">正在生长 · 活跃目标</span>
      <ul class="gbp-list">
        <li v-for="g in activeTargets" :key="g.id" class="gbp-li">
          <span class="gbp-li-title">{{ g.title }}</span>
          <span class="gbp-li-meta">{{ domainLabel(g.domain) }}</span>
        </li>
      </ul>
    </div>

    <!-- 健康关注 -->
    <div v-if="unhealthy.length" class="gbp-block" data-test="gbp-unhealthy">
      <span class="gbp-block-label">低健康度 · 需要目光</span>
      <ul class="gbp-list">
        <li v-for="h in unhealthy" :key="h.goal.id" class="gbp-li">
          <span class="gbp-li-title">{{ h.goal.title }}</span>
          <span class="gbp-li-tag" :class="`gbp-li-tag--${h.health.level}`">{{ healthLabel(h.health.level) }}</span>
        </li>
      </ul>
    </div>

    <!-- 旧梦潭 -->
    <div class="gbp-block" data-test="gbp-olddreams">
      <span class="gbp-block-label">旧梦潭 · 沉梦 {{ oldDreams.length }} · {{ oldDreamMonths }} 个月</span>
      <ul v-if="oldDreams.length" class="gbp-list gbp-list--old">
        <li v-for="d in oldDreams" :key="d.goal.id" class="gbp-li">
          <span class="gbp-li-title">{{ d.goal.title }}</span>
          <span class="gbp-li-meta">潭底 {{ d.daysInPool }} 天</span>
        </li>
      </ul>
      <p v-else class="gbp-hint">旧梦潭空着，尚未有完成的目标沉入。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGoalBridge, DOMAIN_LABELS, STATUS_LABELS } from '../modules/goal'
import type { GoalStatus, GoalTier } from '../modules/goal'

const bridge = useGoalBridge()

const summary = computed(() => bridge.summary.value)
const activeTargets = computed(() => bridge.activeTargets.value.slice(0, 8))
const unhealthy = computed(() => bridge.unhealthyGoals.value.slice(0, 8))
const oldDreams = computed(() => bridge.oldDreams.value)
const oldDreamMonths = computed(() => bridge.oldDreamsByMonth.value.length)

const TIER_LABELS: Record<GoalTier, string> = { vision: '愿景', target: '目标', plan: '计划' }

const tierRows = computed(() => {
  const s = summary.value
  return (['vision', 'target', 'plan'] as GoalTier[])
    .map(key => ({ key, label: TIER_LABELS[key], count: s.byTier[key], max: s.total }))
})

const statusRows = computed(() => {
  return Object.entries(summary.value.byStatus)
    .map(([key, count]) => ({ key, count, label: STATUS_LABELS[key as GoalStatus] ?? key }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
})

function tierPct(t: { count: number; max: number }): string {
  if (!t.max) return '0%'
  return `${Math.max(4, Math.round((t.count / t.max) * 100))}%`
}

function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS] ?? domain
}

function healthLabel(level: string): string {
  if (level === 'critical') return '危急'
  if (level === 'warning') return '关注'
  return '健康'
}
</script>

<style scoped>
.gbp {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.gbp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.gbp-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.gbp-badge {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
}
.gbp-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
  margin-top: 12px;
}
.gbp-block--first { margin-top: 0; }
.gbp-block:first-child { margin-top: 0; }
.gbp-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}
.gbp-sumstats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.gbp-sum {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  background: rgba(10, 12, 10, 0.5);
  border-radius: 10px;
}
.gbp-sum b {
  font-size: 20px;
  color: #e8e4d8;
}
.gbp-sum span {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.55);
  margin-top: 2px;
}
.gbp-tiers { margin-top: 12px; }
.gbp-tier {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.gbp-tier-label { width: 40px; font-size: 12px; color: rgba(232, 228, 216, 0.7); }
.gbp-tier-track { flex: 1; height: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; overflow: hidden; }
.gbp-tier-fill { height: 100%; background: linear-gradient(90deg, #6a7a5a, #a8b892); border-radius: 6px; }
.gbp-tier-num { width: 20px; text-align: right; font-size: 12px; color: rgba(232, 228, 216, 0.7); }
.gbp-status-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.gbp-chip {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.4);
  color: rgba(232, 228, 216, 0.75);
  font-size: 12px;
}
.gbp-list { list-style: none; margin: 0; padding: 0; }
.gbp-li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 2px;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.12);
  font-size: 13px;
}
.gbp-li:last-child { border-bottom: none; }
.gbp-list--old { max-height: 200px; overflow-y: auto; }
.gbp-li-title { color: #e8e4d8; }
.gbp-li-meta { font-size: 11px; color: rgba(232, 228, 216, 0.5); }
.gbp-li-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}
.gbp-li-tag--warning { color: #c4a05a; background: rgba(196, 160, 90, 0.15); }
.gbp-li-tag--critical { color: #c46a5a; background: rgba(196, 106, 90, 0.15); }
.gbp-li-tag--healthy { color: #8a9a7a; background: rgba(138, 154, 122, 0.15); }
.gbp-hint { margin: 0; color: rgba(232, 228, 216, 0.5); font-size: 12px; }
</style>