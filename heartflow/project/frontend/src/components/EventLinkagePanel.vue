<template>
  <section class="el-panel" aria-label="事件关联">
    <div class="el-panel-head">
      <span class="el-panel-title">🔗 事件关联</span>
      <span class="el-panel-sub">因果链 · 事件簇 · 跨房间联动</span>
    </div>

    <!-- 页签切换 -->
    <div class="el-tabs">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="el-tab"
        :class="{ 'el-tab--active': tab === t.value }"
        @click="tab = t.value"
      >{{ t.label }}</button>
    </div>

    <!-- 事件链 -->
    <div v-if="tab === 'chains'" class="el-block">
      <span class="el-block-label">事件链（{{ chains.length }}）</span>
      <div v-if="chains.length" class="el-chain-list">
        <div v-for="c in chains" :key="c.id" class="el-chain">
          <div class="el-chain-head">
            <span class="el-chain-type">{{ chainTypeLabel(c.chainType) }}</span>
            <span class="el-chain-strength">{{ Math.round(c.strength * 100) }}%</span>
          </div>
          <p class="el-chain-desc">{{ c.description }}</p>
          <div class="el-chain-track">
            <div class="el-chain-fill" :style="{ width: Math.round(c.strength * 100) + '%' }"></div>
          </div>
          <div class="el-chain-meta">
            <span>{{ c.timeSpan }}</span>
            <span>{{ c.events.length }} 个事件</span>
            <span>{{ roomLabel(c.events[0]?.roomSource) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="el-hint">未发现事件链。时间线中相邻的事件会自动串联。</p>
    </div>

    <!-- 事件簇 -->
    <div v-if="tab === 'clusters'" class="el-block">
      <span class="el-block-label">事件簇（{{ clusters.length }}）</span>
      <div v-if="clusters.length" class="el-cluster-list">
        <div v-for="cl in clusters" :key="cl.id" class="el-cluster">
          <div class="el-cluster-head">
            <span class="el-cluster-type">{{ clusterTypeLabel(cl.clusterType) }}</span>
            <span class="el-cluster-score">{{ cl.relevanceScore.toFixed(2) }} 分</span>
          </div>
          <p class="el-cluster-center">{{ cl.center.summary.snippet || '（无摘要）' }}</p>
          <div class="el-cluster-related">
            <span v-for="r in cl.related" :key="r.indexId" class="el-cluster-chip">{{ r.summary.snippet || '…' }}</span>
          </div>
          <div class="el-cluster-meta">
            <span>{{ cl.related.length + 1 }} 个事件</span>
            <span>{{ roomLabel(cl.center.roomSource) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="el-hint">未发现事件簇。同一时段内密集发生的事件会自动聚类。</p>
    </div>

    <p v-if="props.entries.length === 0" class="el-hint">暂无时间线条目可分析。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEventLinkage } from '../modules/timeline-index/aggregation'
import type { EventChain, EventCluster } from '../modules/timeline-index/aggregation'
import type { IndexEntry } from '../modules/timeline-index'

const props = defineProps<{ entries: IndexEntry[] }>()

const TABS = [
  { value: 'chains', label: '事件链' },
  { value: 'clusters', label: '事件簇' },
] as const

const tab = ref<string>('chains')
const linkage = useEventLinkage(() => props.entries)

const chains = computed<EventChain[]>(() => {
  if (props.entries.length === 0) return []
  return linkage.discoverChains(props.entries)
})

const clusters = computed<EventCluster[]>(() => {
  if (props.entries.length === 0) return []
  return linkage.discoverClusters(props.entries)
})

watch(() => props.entries.length, () => {
  if (props.entries.length > 0) linkage.analyze('', '')
})

function chainTypeLabel(t: EventChain['chainType']): string {
  return { 'cause-effect': '因果', sequential: '序列', related: '相关', milestone: '里程碑' }[t] || t
}

function clusterTypeLabel(t: string): string {
  const map: Record<string, string> = {
    emotion_cluster: '情绪簇',
    note_cluster: '笔记簇',
    anchor_cluster: '锚点簇',
    crystal_cluster: '结晶簇',
    session_cluster: '专注簇',
    output_cluster: '输出簇',
    mixed_cluster: '混合簇',
  }
  return map[t] || t
}

function roomLabel(room: string): string {
  const map: Record<string, string> = {
    study: '思绪书房', emotion: '情绪花房', anchor: '逐日心锚',
    goal: '留光阁', timeline: '时间长廊', home: '家',
  }
  return map[room] || room || '—'
}
</script>

<style scoped>
.el-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.el-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.el-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.el-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.el-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.el-tab {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.el-tab:hover { border-color: rgba(140, 160, 190, 0.4); }
.el-tab--active {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.el-block { margin-bottom: 10px; }
.el-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.el-chain, .el-cluster {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.el-chain-head, .el-cluster-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.el-chain-type, .el-cluster-type {
  font-size: 12px;
  font-weight: 600;
  color: #9fc4e8;
}
.el-chain-strength, .el-cluster-score {
  font-size: 12px;
  color: #8a97ad;
}
.el-chain-desc, .el-cluster-center {
  font-size: 13px;
  color: #c6d0e0;
  margin: 0 0 6px;
  line-height: 1.5;
}
.el-chain-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(140, 160, 190, 0.15);
  overflow: hidden;
  margin-bottom: 6px;
}
.el-chain-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #6b9fc4, #9fc4e8);
}
.el-chain-meta, .el-cluster-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #7a879c;
}
.el-cluster-related {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.el-cluster-chip {
  font-size: 11px;
  color: #aab6c9;
  background: rgba(140, 160, 190, 0.1);
  border-radius: 6px;
  padding: 2px 8px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
</style>
