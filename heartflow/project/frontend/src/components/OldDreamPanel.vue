<template>
  <section class="odp" data-test="old-dream-panel" aria-label="旧梦潭">
    <header class="odp-head">
      <div class="odp-head-titles">
        <span class="odp-title">🌊 旧梦潭</span>
        <span class="odp-sub">已完成的目标 · 归档陈列与打捞</span>
      </div>
      <span class="odp-count" data-test="odp-count">{{ overview.total }}</span>
    </header>

    <!-- 检索与领域过滤 -->
    <div class="odp-toolbar">
      <input
        v-model="query"
        class="odp-search"
        data-test="odp-search"
        placeholder="检索已完成的目标…"
        aria-label="检索已完成的目标"
      />
      <div class="odp-domains">
        <button
          v-for="d in domainKeys"
          :key="d"
          type="button"
          class="odp-chip"
          :class="{ on: activeDomain === d }"
          :data-test="`odp-chip-${d}`"
          @click="toggleDomain(d)"
        >
          {{ DOMAIN_LABELS[d] }}
        </button>
      </div>
    </div>

    <!-- 陈列统计 -->
    <div v-if="overview.total" class="odp-stats" data-test="odp-stats">
      <span class="odp-stat">共 {{ overview.total }} 个</span>
      <span class="odp-stat">覆盖 {{ overview.monthCount }} 个月</span>
      <span class="odp-stat">近 30 天完成 {{ overview.recent30 }} 个</span>
    </div>
    <div v-if="overview.byDomain.length" class="odp-domain-bars" data-test="odp-domain-bars">
      <div v-for="b in overview.byDomain" :key="b.domain" class="odp-domain-bar">
        <span class="odp-domain-label">{{ b.label }}</span>
        <div class="odp-domain-track">
          <div class="odp-domain-fill" :style="{ width: barWidth(b.count) }" />
        </div>
        <span class="odp-domain-count">{{ b.count }}</span>
      </div>
    </div>

    <!-- 按月分组陈列 -->
    <template v-if="groups.length">
      <div
        v-for="g in groups"
        :key="g.month"
        class="odp-month-group"
        data-test="odp-month-group"
      >
        <div class="odp-month-label">{{ formatMonth(g.month) }}</div>
        <div
          v-for="d in g.items"
          :key="d.id"
          class="odp-card"
          :data-test="`odp-card-${d.id}`"
        >
          <span class="odp-card-icon">{{ statusIcon(d.status) }}</span>
          <div class="odp-card-info">
            <span class="odp-card-title">{{ d.title }}</span>
            <span class="odp-card-meta">已完成 · {{ formatDate(d.completedAt || d.updatedAt) }}</span>
          </div>
          <span v-if="sunken(d).canResurface" class="odp-sunken">可复苏</span>
          <button
            type="button"
            class="odp-revive"
            :data-test="`odp-revive-${d.id}`"
            @click="emit('revive', d.id)"
          >
            复苏
          </button>
        </div>
      </div>
    </template>
    <p v-else-if="overview.total === 0" class="odp-empty" data-test="odp-empty">暂无已完成的目标</p>
    <p v-else class="odp-empty" data-test="odp-no-match">没有匹配的旧梦</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  filterCompletedGoals,
  groupCompletedByMonth,
  oldDreamOverview,
  toSunkenRecord,
} from '../modules/goal/old-dream'
import { DOMAIN_LABELS } from '../modules/goal/types'
import type { Goal, GoalStatus } from '../modules/goal/types'

const props = defineProps<{ goals: Goal[] }>()
const emit = defineEmits<{ (e: 'revive', id: string): void }>()

const query = ref('')
const activeDomain = ref<Goal['domain'] | ''>('')

const domainKeys = computed(() => Object.keys(DOMAIN_LABELS) as Goal['domain'][])
const overview = computed(() => oldDreamOverview(props.goals, DOMAIN_LABELS))
const filtered = computed(() =>
  filterCompletedGoals(
    props.goals,
    query.value,
    activeDomain.value ? [activeDomain.value] : [],
  ),
)
const groups = computed(() => groupCompletedByMonth(filtered.value))

function toggleDomain(d: Goal['domain']) {
  activeDomain.value = activeDomain.value === d ? '' : d
}

function barWidth(count: number): string {
  return overview.value.total ? `${Math.round((count / overview.value.total) * 100)}%` : '0%'
}

function sunken(d: Goal) {
  return toSunkenRecord(d)
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}年${parseInt(m)}月`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function statusIcon(s: GoalStatus): string {
  const m: Record<string, string> = { seed: '🌱', sprout: '🌿', growing: '🌳', bloom: '🌸', dormant: '💤' }
  return m[s] || '🌱'
}
</script>

<style scoped>
.odp {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.odp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.odp-head-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.odp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong, #d8d3c8);
}

.odp-sub {
  font-size: 11px;
  color: var(--text-dim, #8a8578);
}

.odp-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent, #e0a96d);
}

.odp-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.odp-search {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--line, #4a463d) 60%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-soft, #26241e) 80%, transparent);
  color: var(--text-strong, #d8d3c8);
  font-size: 12px;
  outline: none;
}

.odp-search:focus {
  border-color: var(--accent, #e0a96d);
}

.odp-domains {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.odp-chip {
  padding: 3px 10px;
  border: 1px solid var(--line, #4a463d);
  border-radius: 999px;
  background: transparent;
  color: var(--text-dim, #8a8578);
  font-size: 11px;
  cursor: pointer;
}

.odp-chip.on {
  border-color: var(--accent, #e0a96d);
  color: var(--accent, #e0a96d);
}

.odp-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-soft, #26241e) 60%, transparent);
}

.odp-stat {
  font-size: 12px;
  color: var(--text-dim, #8a8578);
}

.odp-domain-bars {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.odp-domain-bar {
  display: grid;
  grid-template-columns: 44px 1fr 24px;
  align-items: center;
  gap: 8px;
}

.odp-domain-label {
  font-size: 11px;
  color: var(--text-dim, #8a8578);
}

.odp-domain-track {
  height: 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--line, #4a463d) 40%, transparent);
  overflow: hidden;
}

.odp-domain-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--accent, #e0a96d);
  opacity: 0.85;
}

.odp-domain-count {
  font-size: 11px;
  text-align: right;
  color: var(--text-dim, #8a8578);
}

.odp-month-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.odp-month-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim, #8a8578);
  letter-spacing: 0.5px;
}

.odp-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line, #4a463d);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-soft, #26241e) 70%, transparent);
}

.odp-card-icon {
  font-size: 16px;
}

.odp-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.odp-card-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-strong, #d8d3c8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.odp-card-meta {
  font-size: 11px;
  color: var(--text-dim, #8a8578);
}

.odp-sunken {
  font-size: 10px;
  color: var(--accent, #e0a96d);
  border: 1px solid color-mix(in srgb, var(--accent, #e0a96d) 50%, transparent);
  border-radius: 999px;
  padding: 1px 7px;
}

.odp-revive {
  padding: 4px 10px;
  border: 1px solid var(--accent, #e0a96d);
  border-radius: 8px;
  background: transparent;
  color: var(--accent, #e0a96d);
  font-size: 11px;
  cursor: pointer;
}

.odp-revive:hover {
  background: color-mix(in srgb, var(--accent, #e0a96d) 15%, transparent);
}

.odp-empty {
  font-size: 12px;
  color: var(--text-dim, #8a8578);
  text-align: center;
  padding: 14px 0;
}
</style>
