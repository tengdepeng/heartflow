<template>
  <section class="aop" data-test="advisor-overview-panel" aria-label="幕僚总览">
    <header class="aop-head">
      <div class="aop-head-text">
        <h3 class="aop-title">🧭 幕僚总览</h3>
        <p class="aop-sub">关系网络 · 场景 · 仪式 · 见证 — 四面聚合，一屏尽览幕僚体制</p>
      </div>
    </header>

    <!-- 关系网络概览 -->
    <div class="aop-block" data-test="aop-network">
      <span class="aop-block-label">关系网络</span>
      <div class="aop-network-grid">
        <div class="aop-stat"><b class="aop-stat-num">{{ network.totalRelations }}</b><span class="aop-stat-label">关系数</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ network.totalInteractions }}</b><span class="aop-stat-label">互动次数</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ network.averageCloseness }}</b><span class="aop-stat-label">平均亲密度</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ network.mostConnectedAdvisor || '—' }}</b><span class="aop-stat-label">连接中枢</span></div>
      </div>
      <div v-if="network.strongestBond && network.strongestBond.a" class="aop-bond" data-test="aop-bond">
        <span class="aop-bond-label">最强羁绊</span>
        <b class="aop-bond-pair">{{ strongestPair }}</b>
        <span class="aop-bond-w">亲密度 {{ network.strongestBond.closeness }}</span>
      </div>
      <div v-if="closenessRows.length" class="aop-tiers" data-test="aop-tiers">
        <div v-for="t in closenessRows" :key="t.key" class="aop-tier">
          <span class="aop-tier-name">{{ t.label }}</span>
          <div class="aop-tier-bar"><div class="aop-tier-fill" :style="{ width: tierPct(t.count), background: t.color }"></div></div>
          <b class="aop-tier-count">{{ t.count }}</b>
        </div>
      </div>
      <p v-if="network.totalRelations === 0" class="aop-empty" data-test="aop-network-empty">
        还没有幕僚关系网络，待建立第一段羁绊后显影。
      </p>
    </div>

    <!-- 场景统计 -->
    <div v-if="sceneRows.length" class="aop-block" data-test="aop-scene">
      <span class="aop-block-label">场景统计</span>
      <div class="aop-scene-list">
        <div v-for="sc in sceneRows" :key="sc.sceneId" class="aop-scene">
          <span class="aop-scene-name">{{ sc.name }}</span>
          <div class="aop-scene-bar"><div class="aop-scene-fill" :style="{ width: scenePct(sc) }"></div></div>
          <span class="aop-scene-num">{{ sc.occupancy }}/{{ sc.maxCapacity }}</span>
        </div>
      </div>
    </div>

    <!-- 仪式摘要 -->
    <div v-if="ritual.totalLegacies > 0 || ritual.todayCelebrations > 0 || ritual.upcomingCelebrations > 0 || ritual.activeRetirements > 0 || ritual.completedRetirements > 0" class="aop-block" data-test="aop-ritual">
      <span class="aop-block-label">仪式摘要</span>
      <div class="aop-ritual-grid">
        <div class="aop-stat"><b class="aop-stat-num">{{ ritual.todayCelebrations }}</b><span class="aop-stat-label">今日庆祝</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ ritual.upcomingCelebrations }}</b><span class="aop-stat-label">即将庆祝</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ ritual.activeRetirements }}</b><span class="aop-stat-label">退休进行中</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ ritual.completedRetirements }}</b><span class="aop-stat-label">已退休</span></div>
        <div class="aop-stat"><b class="aop-stat-num">{{ ritual.totalLegacies }}</b><span class="aop-stat-label">遗留物</span></div>
      </div>
    </div>

    <!-- 见证日志摘要 -->
    <div v-if="witness.totalWitnessed > 0" class="aop-block" data-test="aop-witness">
      <span class="aop-block-label">见证日志</span>
      <div class="aop-witness-head">
        <span class="aop-witness-total">累计见证 {{ witness.totalWitnessed }} 次</span>
        <span v-if="witness.unviewedCount > 0" class="aop-witness-unviewed" data-test="aop-witness-unviewed">🔴 {{ witness.unviewedCount }} 未读</span>
      </div>
      <div v-if="witness.eventTypeBreakdown.length" class="aop-witness-types" data-test="aop-witness-types">
        <span v-for="t in witness.eventTypeBreakdown" :key="t.type" class="aop-chip">{{ t.icon }} {{ t.label }} {{ t.count }}</span>
      </div>
      <ul v-if="witness.recentWitnesses.length" class="aop-witness-list" data-test="aop-witness-list">
        <li v-for="w in witness.recentWitnesses" :key="w.id" class="aop-witness-item">
          <span class="aop-witness-icon">{{ witnessIcon(w.eventType) }}</span>
          <span class="aop-witness-title">{{ w.title }}</span>
          <span class="aop-witness-meta">{{ witnessLabel(w.eventType) }}</span>
        </li>
      </ul>
    </div>

    <p v-if="emptyAll" class="aop-empty" data-test="aop-empty">幕僚体系尚未启动，先建立一位幕僚，总览将随之显影。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdvisorBridge } from '../modules/advisor/advisor-bridge'
import { WITNESS_EVENT_META } from '../modules/advisor/types'

const bridge = useAdvisorBridge()

const network = computed(() => bridge.relationNetwork.value)
const sceneRows = computed(() => bridge.sceneStats.value)
const ritual = computed(() => bridge.ritualSummary.value)
const witness = computed(() => bridge.witnessLogSummary.value)

const TIER_META: { key: keyof typeof network.value.closenessDistribution; label: string; color: string }[] = [
  { key: 'intimate', label: '密友', color: '#c46a5a' },
  { key: 'close', label: '亲近', color: '#8a9a7a' },
  { key: 'moderate', label: '随缘', color: '#d0b269' },
  { key: 'distant', label: '疏淡', color: '#9aa0ab' },
]

const closenessRows = computed(() =>
  TIER_META.map(t => ({ key: t.key, label: t.label, color: t.color, count: network.value.closenessDistribution[t.key] }))
)

const strongestPair = computed(() => {
  const b = network.value.strongestBond
  return b && b.a ? `${b.a} × ${b.b}` : ''
})

const emptyAll = computed(() =>
  network.value.totalRelations === 0 &&
  sceneRows.value.length === 0 &&
  ritual.value.totalLegacies === 0 &&
  witness.value.totalWitnessed === 0
)

function tierPct(count: number): string {
  const total = network.value.totalRelations
  if (!total) return '0%'
  return `${Math.max(2, Math.round((count / total) * 100))}%`
}

function scenePct(sc: { occupancy: number; maxCapacity: number }): string {
  if (!sc.maxCapacity) return '0%'
  return `${Math.max(2, Math.round((sc.occupancy / sc.maxCapacity) * 100))}%`
}

function witnessIcon(type: string): string {
  return WITNESS_EVENT_META[type as keyof typeof WITNESS_EVENT_META]?.icon ?? '📌'
}

function witnessLabel(type: string): string {
  return WITNESS_EVENT_META[type as keyof typeof WITNESS_EVENT_META]?.label ?? type
}
</script>

<style scoped>
.aop {
  background: radial-gradient(120% 100% at 0% 0%, rgba(197, 163, 128, 0.10), transparent 55%), rgba(255, 250, 242, 0.82);
  border: 1px solid rgba(180, 140, 96, 0.22);
  border-radius: 16px;
  padding: 18px 20px 20px;
  box-shadow: 0 8px 28px rgba(120, 90, 50, 0.08);
}
.aop-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.aop-head-text { display: flex; flex-direction: column; gap: 2px; }
.aop-title { margin: 0; font-size: 17px; font-weight: 700; color: #4a3b28; letter-spacing: .5px; }
.aop-sub { margin: 0; font-size: 12px; color: #8b7a63; }
.aop-block { margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(180, 140, 96, 0.25); }
.aop-block-label { font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #a0804f; text-transform: uppercase; }
.aop-network-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
.aop-stat { background: rgba(244, 235, 220, 0.6); border: 1px solid rgba(180, 140, 96, 0.18); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 2px; align-items: center; }
.aop-stat-num { font-size: 20px; font-weight: 700; color: #4a3b28; }
.aop-stat-label { font-size: 11px; color: #9c8b75; }
.aop-bond { margin-top: 10px; display: flex; align-items: center; gap: 10px; font-size: 13px; }
.aop-bond-label { color: #a0804f; font-weight: 600; }
.aop-bond-pair { color: #7a5a2e; font-weight: 600; }
.aop-bond-w { color: #9c8b75; }
.aop-tiers { margin-top: 10px; display: flex; flex-direction: column; gap: 7px; }
.aop-tier { display: grid; grid-template-columns: 42px 1fr 26px; align-items: center; gap: 8px; font-size: 12px; }
.aop-tier-name { color: #7a6c55; }
.aop-tier-bar { height: 8px; background: rgba(180, 140, 96, 0.14); border-radius: 99px; overflow: hidden; }
.aop-tier-fill { height: 100%; border-radius: 99px; }
.aop-tier-count { text-align: right; color: #4a3b28; font-weight: 600; }
.aop-scene-list { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.aop-scene { display: grid; grid-template-columns: 84px 1fr 52px; align-items: center; gap: 10px; font-size: 12px; }
.aop-scene-name { color: #7a6c55; }
.aop-scene-bar { height: 8px; background: rgba(180, 140, 96, 0.14); border-radius: 99px; overflow: hidden; }
.aop-scene-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #d0b269, #c46a5a); }
.aop-scene-num { text-align: right; color: #9c8b75; }
.aop-ritual-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 10px; }
.aop-witness-head { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 12px; color: #9c8b75; }
.aop-witness-unviewed { color: #c46a5a; font-weight: 600; }
.aop-witness-types { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.aop-chip { background: rgba(197, 163, 128, 0.16); border: 1px solid rgba(180, 140, 96, 0.2); border-radius: 99px; padding: 3px 10px; font-size: 12px; color: #7a5a2e; }
.aop-witness-list { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.aop-witness-item { display: flex; align-items: center; gap: 9px; font-size: 13px; }
.aop-witness-icon { font-size: 15px; }
.aop-witness-title { color: #4a3b28; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aop-witness-meta { color: #b3a690; font-size: 12px; }
.aop-empty { margin: 12px 0 0; font-size: 13px; color: #9c8b75; }
</style>