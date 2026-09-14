<template>
  <section class="spr-panel" aria-label="空间 · 路线谱">
    <header class="spr-head">
      <div>
        <span class="spr-title">◈ 空间 · 路线谱</span>
        <span class="spr-sub">基于空间模板与编排规则的路由构成与访问分析</span>
      </div>
      <div class="spr-actions">
        <button class="spr-btn" @click="syncFromGraph">⟳ 同步房间布线</button>
        <button class="spr-btn spr-btn--ghost" @click="resetAll">重置</button>
      </div>
    </header>

    <!-- 概览统计 -->
    <div class="spr-stats">
      <div class="spr-stat">
        <b class="spr-stat-num">{{ routeStats.totalRoutes }}</b>
        <span class="spr-stat-label">路线总数</span>
      </div>
      <div class="spr-stat">
        <b class="spr-stat-num">{{ routeStats.activeRoutes }}</b>
        <span class="spr-stat-label">启用中</span>
      </div>
      <div class="spr-stat">
        <b class="spr-stat-num">{{ routeStats.totalAccesses }}</b>
        <span class="spr-stat-label">累计访问</span>
      </div>
      <div class="spr-stat">
        <b class="spr-stat-num">{{ routeStats.avgLoadTimeMs }}<i>ms</i></b>
        <span class="spr-stat-label">平均加载</span>
      </div>
    </div>

    <!-- 加载策略分布 -->
    <div class="spr-block">
      <h4 class="spr-block-title">加载策略分布</h4>
      <div class="spr-strategy">
        <div v-for="s in strategyRows" :key="s.strategy" class="spr-strategy-row">
          <span class="spr-strategy-label">{{ s.label }}</span>
          <span class="spr-strategy-track"><i :style="{ width: s.percent + '%' }"></i></span>
          <span class="spr-strategy-val">{{ s.count }}</span>
        </div>
      </div>
    </div>

    <!-- 来源构成 -->
    <div class="spr-block">
      <h4 class="spr-block-title">来源构成</h4>
      <div class="spr-source">
        <span v-for="s in sourceRows" :key="s.source" class="spr-source-chip">
          {{ s.label }}<i>{{ s.count }}</i>
        </span>
      </div>
    </div>

    <!-- 热门 / 最近 / 最慢 -->
    <div class="spr-grid">
      <div class="spr-block">
        <h4 class="spr-block-title">热门路线</h4>
        <ul v-if="hotRoutes.length" class="spr-list">
          <li v-for="(r, idx) in hotRoutes" :key="'hot_' + r.name" class="spr-row">
            <span class="spr-rank">{{ idx + 1 }}</span>
            <span class="spr-row-name">{{ r.name }}</span>
            <span class="spr-row-meta">{{ r.path }}</span>
            <b class="spr-row-val">{{ r.accessCount }}</b>
          </li>
        </ul>
        <p v-else class="spr-empty">尚无访问热度数据</p>
      </div>

      <div class="spr-block">
        <h4 class="spr-block-title">最近访问</h4>
        <ul v-if="recentRoutes.length" class="spr-list">
          <li v-for="r in recentRoutes" :key="'recent_' + r.name" class="spr-row">
            <span class="spr-dot" />
            <span class="spr-row-name">{{ r.name }}</span>
            <span class="spr-row-meta spr-row-time">{{ fmtTime(r.lastAccessedAt) }}</span>
          </li>
        </ul>
        <p v-else class="spr-empty">暂无最近访问</p>
      </div>

      <div class="spr-block">
        <h4 class="spr-block-title">加载最慢</h4>
        <ul v-if="slowestRoutes.length" class="spr-list">
          <li v-for="r in slowestRoutes" :key="'slow_' + r.name" class="spr-row">
            <span class="spr-slow">{{ r.avgLoadTimeMs }}ms</span>
            <span class="spr-row-name">{{ r.name }}</span>
          </li>
        </ul>
        <p v-else class="spr-empty">暂无加载耗时数据</p>
      </div>
    </div>

    <!-- 接入动态 -->
    <div class="spr-block">
      <h4 class="spr-block-title">接入动态</h4>
      <ul v-if="recentEvents.length" class="spr-events">
        <li v-for="e in recentEvents" :key="e.timestamp + e.routeName" class="spr-event">
          <span class="spr-event-type" :class="'spr-et--' + e.type">{{ eventTypeLabel(e.type) }}</span>
          <span class="spr-event-name">{{ e.routeName }}</span>
          <span :class="['spr-event-flag', e.success ? 'is-ok' : 'is-fail']">{{ e.success ? '✓' : '✗' }}</span>
          <span class="spr-event-time">{{ fmtTime(e.timestamp) }}</span>
        </li>
      </ul>
      <p v-else class="spr-empty">暂无接入动态</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useDynamicRoutes,
  LOAD_STRATEGY_LABELS,
} from '../modules/space/dynamic-routes'
import type {
  RouteLoadStrategy,
  RouteSource,
  RouteRegistrationEvent,
} from '../modules/space/dynamic-routes'

const routeStore = useDynamicRoutes()

const routeStats = computed(() => routeStore.routeStats.value)
const routesByStrategy = computed(() => routeStore.routesByStrategy.value)
const routesBySource = computed(() => routeStore.routesBySource.value)
const recentEvents = computed(() => routeStore.recentEvents.value)
const hotRoutes = computed(() => routeStore.getHotRoutes(5))
const recentRoutes = computed(() => routeStore.getRecentRoutes(5))
const slowestRoutes = computed(() => routeStore.getSlowestRoutes(5))

const STRATEGY_ORDER: RouteLoadStrategy[] = ['eager', 'lazy', 'preload', 'idle']
const strategyRows = computed(() => {
  const total = Math.max(routeStats.value.totalRoutes, 1)
  return STRATEGY_ORDER.map(strategy => ({
    strategy,
    label: LOAD_STRATEGY_LABELS[strategy],
    count: routesByStrategy.value[strategy].length,
    percent: Math.round((routesByStrategy.value[strategy].length / total) * 100),
  }))
})

const SOURCE_LABEL: Record<RouteSource, string> = {
  static: '静态',
  dynamic: '动态',
  template: '模板',
  plugin: '插件',
  user: '用户',
}
const SOURCE_ORDER: RouteSource[] = ['static', 'dynamic', 'template', 'plugin', 'user']
const sourceRows = computed(() =>
  SOURCE_ORDER.map(source => ({
    source,
    label: SOURCE_LABEL[source],
    count: routesBySource.value[source].length,
  })).filter(s => s.count > 0),
)

const EVENT_LABEL: Record<RouteRegistrationEvent['type'], string> = {
  register: '注册',
  unregister: '注销',
  update: '更新',
  preload: '预加载',
}
function eventTypeLabel(t: RouteRegistrationEvent['type']): string {
  return EVENT_LABEL[t] ?? t
}

function fmtTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function syncFromGraph(): void {
  routeStore.initializeStaticRoutes()
}

function resetAll(): void {
  routeStore.reset()
}
</script>

<style scoped>
.spr-panel {
  margin: 18px 0;
  padding: 20px;
  border-radius: 16px;
  background: rgba(32, 38, 30, 0.4);
  border: 1px solid rgba(138, 154, 122, 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.spr-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.spr-title {
  display: block;
  font-size: 14px;
  letter-spacing: 2px;
  color: rgba(138, 154, 122, 0.85);
}
.spr-sub { display: block; font-size: 11px; opacity: 0.5; margin-top: 4px; }
.spr-actions { display: flex; gap: 6px; flex-shrink: 0; }
.spr-btn {
  padding: 5px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;
  border: 1px solid rgba(138, 154, 122, 0.25); background: rgba(138, 154, 122, 0.14);
  color: #8a9a7a; font-family: inherit;
}
.spr-btn:hover { background: rgba(138, 154, 122, 0.24); }
.spr-btn--ghost { background: transparent; color: rgba(232, 228, 216, 0.6); }

.spr-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.spr-stat {
  display: flex; flex-direction: column; gap: 3px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(138, 154, 122, 0.08);
}
.spr-stat-num { font-size: 22px; font-weight: 600; color: #8a9a7a; line-height: 1.1; }
.spr-stat-num i { font-style: normal; font-size: 12px; opacity: 0.6; margin-left: 2px; }
.spr-stat-label { font-size: 11px; opacity: 0.55; }

.spr-block {
  padding: 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(138, 154, 122, 0.06);
}
.spr-block-title { margin: 0 0 10px; font-size: 12px; letter-spacing: 1px; color: rgba(232, 228, 216, 0.75); }
.spr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

.spr-strategy { display: flex; flex-direction: column; gap: 7px; }
.spr-strategy-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.spr-strategy-label { width: 58px; text-align: right; opacity: 0.65; flex-shrink: 0; }
.spr-strategy-track {
  flex: 1; height: 5px; border-radius: 3px; overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.spr-strategy-track i {
  display: block; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.45), #8a9a7a);
}
.spr-strategy-val { width: 20px; text-align: right; opacity: 0.7; font-variant-numeric: tabular-nums; }

.spr-source { display: flex; flex-wrap: wrap; gap: 6px; }
.spr-source-chip {
  padding: 3px 10px; border-radius: 999px; font-size: 11px;
  background: rgba(138, 154, 122, 0.08); border: 1px solid rgba(138, 154, 122, 0.14);
  color: rgba(232, 228, 216, 0.8);
}
.spr-source-chip i { font-style: normal; opacity: 0.55; margin-left: 4px; }

.spr-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.spr-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.spr-rank {
  width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(138, 154, 122, 0.14); color: #8a9a7a; font-size: 11px;
}
.spr-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(138, 154, 122, 0.5); flex-shrink: 0; }
.spr-row-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(232, 228, 216, 0.9); }
.spr-row-meta { font-size: 11px; opacity: 0.45; flex-shrink: 0; }
.spr-row-time { font-variant-numeric: tabular-nums; }
.spr-row-val { font-size: 12px; color: #8a9a7a; flex-shrink: 0; }
.spr-slow { font-size: 11px; color: #e0b060; flex-shrink: 0; }
.spr-empty { font-size: 11px; opacity: 0.45; margin: 0; }

.spr-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.spr-event { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.spr-event-type {
  padding: 1px 8px; border-radius: 6px; font-size: 11px; flex-shrink: 0;
  background: rgba(138, 154, 122, 0.1); color: rgba(232, 228, 216, 0.8);
}
.spr-et--unregister { background: rgba(224, 96, 96, 0.12); color: #e08080; }
.spr-et--update { background: rgba(232, 192, 96, 0.12); color: #e8c060; }
.spr-et--preload { background: rgba(159, 198, 255, 0.1); color: #9fc6ff; }
.spr-event-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.spr-event-flag { flex-shrink: 0; }
.spr-event-flag.is-ok { color: #8a9a7a; }
.spr-event-flag.is-fail { color: #e08080; }
.spr-event-time { font-size: 11px; opacity: 0.45; flex-shrink: 0; font-variant-numeric: tabular-nums; }

@media (max-width: 720px) {
  .spr-stats { grid-template-columns: repeat(2, 1fr); }
  .spr-grid { grid-template-columns: 1fr; }
  .spr-head { flex-direction: column; }
}
</style>