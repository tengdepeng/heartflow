<template>
  <section class="sop" aria-label="空间编排">
    <div class="sop-head">
      <span class="sop-title">🎛 空间编排</span>
      <span class="sop-sub">总览 · 转换 · 依赖 · 快照</span>
    </div>

    <div class="sop-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="sop-tab"
        :class="{ on: tab === t.key }"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 总览 -->
    <template v-if="tab === 'overview'">
      <div class="sop-stats">
        <div class="sop-stat">
          <span class="sop-stat-value">{{ stats.total }}</span>
          <span class="sop-stat-label">空间</span>
        </div>
        <div class="sop-stat">
          <span class="sop-stat-value">{{ stats.active }}</span>
          <span class="sop-stat-label">活跃</span>
        </div>
        <div class="sop-stat">
          <span class="sop-stat-value">{{ stats.idle }}</span>
          <span class="sop-stat-label">空闲</span>
        </div>
        <div class="sop-stat">
          <span class="sop-stat-value">{{ stats.error }}</span>
          <span class="sop-stat-label">异常</span>
        </div>
        <div class="sop-stat">
          <span class="sop-stat-value">{{ stats.totalEnters }}</span>
          <span class="sop-stat-label">进入</span>
        </div>
        <div class="sop-stat">
          <span class="sop-stat-value">{{ stats.totalStayMinutes }}</span>
          <span class="sop-stat-label">停留分</span>
        </div>
      </div>

      <p class="sop-subtitle">按分类</p>
      <div v-if="spacesByCategory.length" class="sop-list">
        <div v-for="g in spacesByCategory" :key="g.category" class="sop-group">
          <div class="sop-group-head">
            <span class="sop-group-icon">{{ g.icon }}</span>
            <span class="sop-group-label">{{ g.label }}</span>
            <span class="sop-group-count">{{ g.activeCount }}/{{ g.totalCount }}</span>
          </div>
          <div class="sop-group-spaces">
            <span
              v-for="s in g.spaces"
              :key="s.spaceId"
              class="sop-chip"
              :class="`st-${s.status}`"
            >
              {{ s.spaceId }}
            </span>
          </div>
        </div>
      </div>
      <p v-else class="sop-empty">暂无空间编排数据。</p>
    </template>

    <!-- 转换 -->
    <template v-else-if="tab === 'transition'">
      <div class="sop-actions">
        <select v-model="targetSpaceId" class="sop-select">
          <option v-for="c in allConfigs" :key="c.spaceId" :value="c.spaceId">{{ c.spaceId }}</option>
        </select>
        <button class="sop-btn" :disabled="isTransitioning" @click="handleTransition">转换</button>
        <button class="sop-btn" @click="handlePreloadAll">批量预加载</button>
      </div>
      <p v-if="isTransitioning" class="sop-note">转换中…</p>
      <p v-if="transitionError" class="sop-note sop-note--error">{{ transitionError }}</p>

      <p class="sop-subtitle">最近转换</p>
      <div v-if="recentTransitions.length" class="sop-list">
        <div
          v-for="(t, i) in recentTransitions"
          :key="i"
          class="sop-transition"
          :class="{ fail: !t.success }"
        >
          <span class="sop-transition-route">{{ t.fromSpaceId ?? '—' }} → {{ t.toSpaceId }}</span>
          <span class="sop-transition-meta">{{ t.transitionMs }}ms · {{ formatTime(t.timestamp) }}</span>
          <span v-if="t.error" class="sop-transition-error">{{ t.error }}</span>
        </div>
      </div>
      <p v-else class="sop-empty">暂无转换记录。</p>
    </template>

    <!-- 依赖 -->
    <template v-else-if="tab === 'dependency'">
      <p class="sop-subtitle">加载顺序</p>
      <div class="sop-order">
        <span v-for="(id, i) in loadOrder" :key="id" class="sop-order-step">{{ i + 1 }}. {{ id }}</span>
      </div>

      <p class="sop-subtitle">空间依赖</p>
      <div class="sop-list">
        <div v-for="c in allConfigs" :key="c.spaceId" class="sop-dep">
          <div class="sop-dep-head">
            <span class="sop-dep-name">{{ c.spaceId }}</span>
            <span class="sop-dep-status" :class="`st-${c.status}`">{{ statusLabel(c.status) }}</span>
          </div>
          <div class="sop-dep-meta">
            <span>优先级 {{ c.priority }}</span>
            <span>{{ c.dependencies.length }} 依赖</span>
            <span>{{ c.lazyLoad ? '懒加载' : '即时' }}</span>
            <span>{{ c.preload ? '预加载' : '非预载' }}</span>
          </div>
          <div class="sop-dep-chain">
            <span class="sop-dep-chain-label">链：</span>
            <span v-for="(depId, i) in depChain(c.spaceId)" :key="depId" class="sop-dep-chain-item">
              {{ depId }}<template v-if="i < depChain(c.spaceId).length - 1"> → </template>
            </span>
          </div>
          <div class="sop-dep-actions">
            <button class="sop-btn--small" @click="handleCheckDeps(c.spaceId)">检查依赖</button>
            <button class="sop-btn--small" @click="handleSetPriority(c.spaceId)">优先级+1</button>
            <button class="sop-btn--small" @click="handleToggleLazy(c.spaceId)">切换懒加载</button>
          </div>
          <p
            v-if="depResult && depResult.spaceId === c.spaceId"
            class="sop-dep-result"
            :class="{ ok: depResult.met }"
          >
            {{ depResult.met ? '依赖满足' : `缺少: ${depResult.missing.join('、')}` }}
          </p>
        </div>
      </div>
    </template>

    <!-- 快照 -->
    <template v-else>
      <div class="sop-actions">
        <button class="sop-btn" @click="handleCreateSnapshot">创建快照</button>
        <button class="sop-btn" @click="handleReset">重置编排</button>
      </div>

      <p class="sop-subtitle">快照（最多 10 个）</p>
      <div v-if="snapshots.length" class="sop-list">
        <div v-for="snap in snapshots" :key="snap.timestamp" class="sop-snapshot">
          <span class="sop-snapshot-time">{{ formatTime(snap.timestamp) }}</span>
          <span class="sop-snapshot-count">{{ Object.keys(snap.spaces).length }} 空间</span>
          <span class="sop-snapshot-active">{{ snap.activeSpaceId ?? '无活跃' }}</span>
          <button class="sop-btn--small" @click="handleRestore(snap)">恢复</button>
        </div>
      </div>
      <p v-else class="sop-empty">暂无快照。创建一份试试。</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSpaceOrchestrator } from '../modules/space/space-orchestrator'
import type { OrchestrationSnapshot } from '../modules/space/space-orchestrator'

const {
  isTransitioning,
  transitionError,
  spacesByCategory,
  orchestrationStats,
  recentTransitions,
  getAllConfigs,
  getConfig,
  areDependenciesMet,
  getDependencyChain,
  getLoadOrder,
  transitionTo,
  preloadAll,
  setPriority,
  setLazyLoad,
  createSnapshot,
  restoreSnapshot,
  getSnapshots,
  reset,
} = useSpaceOrchestrator()

const tab = ref<'overview' | 'transition' | 'dependency' | 'snapshot'>('overview')
const tabs = [
  { key: 'overview', label: '总览' },
  { key: 'transition', label: '转换' },
  { key: 'dependency', label: '依赖' },
  { key: 'snapshot', label: '快照' },
] as const

const targetSpaceId = ref('')
const depResult = ref<{ spaceId: string; met: boolean; missing: string[] } | null>(null)

const stats = computed(() => orchestrationStats.value)
const allConfigs = computed(() => getAllConfigs())
const loadOrder = computed(() => getLoadOrder())
const snapshots = computed(() => getSnapshots())

const STATUS_LABELS: Record<string, string> = {
  idle: '空闲',
  loading: '加载中',
  active: '活跃',
  inactive: '停用',
  error: '异常',
  hidden: '隐藏',
  maintenance: '维护',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
}

function depChain(id: string): string[] {
  return getDependencyChain(id)
}

function handleTransition(): void {
  if (targetSpaceId.value) {
    transitionTo(targetSpaceId.value)
  }
}

function handlePreloadAll(): void {
  preloadAll()
}

function handleCheckDeps(id: string): void {
  depResult.value = { spaceId: id, ...areDependenciesMet(id) }
}

function handleSetPriority(id: string): void {
  const cur = getConfig(id)
  if (cur) setPriority(id, cur.priority + 1)
}

function handleToggleLazy(id: string): void {
  const cur = getConfig(id)
  if (cur) setLazyLoad(id, !cur.lazyLoad)
}

function handleCreateSnapshot(): void {
  createSnapshot()
}

function handleRestore(snap: OrchestrationSnapshot): void {
  restoreSnapshot(snap)
}

function handleReset(): void {
  reset()
}

function formatTime(ts: string): string {
  return ts.slice(5, 16).replace('T', ' ')
}
</script>

<style scoped>
.sop {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(120, 140, 120, 0.25));
  border-radius: 12px;
  background: var(--surface, rgba(20, 26, 20, 0.6));
}
.sop-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sop-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.sop-sub {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
}
.sop-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.sop-tab {
  padding: 5px 14px;
  border: 1px solid rgba(120, 140, 120, 0.2);
  border-radius: 999px;
  background: transparent;
  color: var(--text-dim, #9aa59a);
  font-size: 12px;
  cursor: pointer;
}
.sop-tab.on {
  background: rgba(138, 154, 122, 0.18);
  border-color: rgba(138, 154, 122, 0.4);
  color: var(--text, #e8ece4);
}
.sop-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sop-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  min-width: 64px;
}
.sop-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent, #8a9a7a);
}
.sop-stat-label {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.sop-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #8a9a7a);
  margin: 4px 0 0;
}
.sop-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sop-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.sop-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sop-group-icon {
  font-size: 15px;
}
.sop-group-label {
  font-size: 13px;
  color: var(--text, #e8ece4);
  flex: 1;
}
.sop-group-count {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.sop-group-spaces {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.sop-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-dim, #9aa59a);
}
.sop-chip.st-active {
  background: rgba(138, 154, 122, 0.18);
  color: var(--accent, #8a9a7a);
}
.sop-chip.st-error {
  background: rgba(196, 106, 90, 0.18);
  color: #c46a5a;
}
.sop-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.sop-select {
  padding: 6px 8px;
  border: 1px solid rgba(120, 140, 120, 0.25);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--text, #e8ece4);
  font-size: 12px;
  max-width: 200px;
}
.sop-btn {
  padding: 6px 14px;
  border: 1px solid rgba(138, 154, 122, 0.35);
  border-radius: 8px;
  background: rgba(138, 154, 122, 0.1);
  color: var(--text, #e8ece4);
  font-size: 12px;
  cursor: pointer;
}
.sop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sop-btn--small {
  padding: 3px 10px;
  border: 1px solid rgba(120, 140, 120, 0.25);
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim, #9aa59a);
  font-size: 11px;
  cursor: pointer;
}
.sop-note {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
  margin: 0;
}
.sop-note--error {
  color: #c46a5a;
}
.sop-transition {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
}
.sop-transition.fail {
  background: rgba(196, 106, 90, 0.08);
}
.sop-transition-route {
  color: var(--text, #e8ece4);
  flex: 1;
}
.sop-transition-meta {
  color: var(--text-dim, #9aa59a);
  font-size: 11px;
}
.sop-transition-error {
  color: #c46a5a;
  font-size: 11px;
}
.sop-order {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sop-order-step {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.12);
  color: var(--text-dim, #9aa59a);
}
.sop-dep {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.sop-dep-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sop-dep-name {
  font-size: 13px;
  color: var(--text, #e8ece4);
  flex: 1;
}
.sop-dep-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-dim, #9aa59a);
}
.sop-dep-status.st-active {
  background: rgba(138, 154, 122, 0.18);
  color: var(--accent, #8a9a7a);
}
.sop-dep-status.st-error {
  background: rgba(196, 106, 90, 0.18);
  color: #c46a5a;
}
.sop-dep-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.sop-dep-chain {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.sop-dep-chain-label {
  color: var(--accent, #8a9a7a);
}
.sop-dep-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.sop-dep-result {
  font-size: 11px;
  margin: 0;
  color: #c46a5a;
}
.sop-dep-result.ok {
  color: var(--accent, #8a9a7a);
}
.sop-snapshot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
}
.sop-snapshot-time {
  color: var(--text, #e8ece4);
  flex: 1;
}
.sop-snapshot-count {
  color: var(--text-dim, #9aa59a);
  font-size: 11px;
}
.sop-snapshot-active {
  color: var(--accent, #8a9a7a);
  font-size: 11px;
}
.sop-empty {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
  margin: 0;
}
</style>
