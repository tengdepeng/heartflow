<template>
  <section class="iap" aria-label="影响力分析">
    <div class="iap-head">
      <div class="iap-title-wrap">
        <span class="iap-title">⚡ 影响力分析</span>
        <span class="iap-sub">谁在连接里举足轻重，一眼看清网络的脉搏</span>
      </div>
      <span v-if="health" class="iap-tag" :style="{ color: healthColor(health.healthScore) }">健康度 {{ health.healthScore }}</span>
    </div>

    <!-- 空态 -->
    <div v-if="!props.contacts.length" class="iap-empty">
      <span class="iap-empty-icon">🕸</span>
      <p class="iap-empty-text">先录入联系人，才能分析人脉网络的影响力结构</p>
    </div>

    <template v-else>
      <!-- 网络健康度 -->
      <div v-if="health" class="iap-block">
        <span class="iap-block-label">网络健康度</span>
        <div class="iap-health">
          <div class="iap-health-ring" :style="{ background: healthRing }">
            <b>{{ health.healthScore }}</b>
            <span>综合</span>
          </div>
          <div class="iap-health-grid">
            <div class="iap-health-item">
              <b>{{ health.density.toFixed(2) }}</b>
              <span>网络密度</span>
            </div>
            <div class="iap-health-item">
              <b>{{ health.avgClusteringCoefficient.toFixed(2) }}</b>
              <span>聚类系数</span>
            </div>
            <div class="iap-health-item">
              <b>{{ health.connectedComponents }}</b>
              <span>连通分量</span>
            </div>
            <div class="iap-health-item">
              <b>{{ health.largestComponentSize }}</b>
              <span>最大分量</span>
            </div>
            <div class="iap-health-item">
              <b>{{ health.diameter }}</b>
              <span>网络直径</span>
            </div>
            <div class="iap-health-item">
              <b>{{ health.avgPathLength.toFixed(1) }}</b>
              <span>平均路径</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 影响力排行 -->
      <div class="iap-block">
        <span class="iap-block-label">影响力排行</span>
        <div class="iap-rank">
          <div
            v-for="s in topScores"
            :key="s.contactId"
            class="iap-rank-row"
            :class="{ selected: selectedId === s.contactId }"
            @click="selectContact(s.contactId)"
          >
            <span class="iap-rank-idx" :class="{ top: s.rank <= 3 }">{{ s.rank }}</span>
            <div class="iap-rank-body">
              <div class="iap-rank-head">
                <b>{{ s.contactName }}</b>
                <span class="iap-rank-trend" :class="`is-${s.trend}`">{{ trendLabel(s.trend) }}</span>
                <span class="iap-rank-score">{{ s.overallInfluence }}</span>
              </div>
              <div class="iap-rank-bar">
                <i :style="{ width: s.overallInfluence + '%' }"></i>
              </div>
              <div class="iap-rank-meta">
                <span>网络 {{ s.networkInfluence }}</span>
                <span>知识 {{ s.knowledgeInfluence }}</span>
                <span>社交 {{ s.socialInfluence }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中联系人的中心度 + 传播力 -->
      <template v-if="selected">
        <div class="iap-block">
          <span class="iap-block-label">{{ selected.name }} · 中心度</span>
          <div class="iap-centrality">
            <div class="iap-cent-item">
              <b>{{ centrality?.compositeCentrality ?? 0 }}</b>
              <span>综合中心度</span>
            </div>
            <div class="iap-cent-item">
              <b>{{ centrality?.degreeCentrality ?? 0 }}</b>
              <span>度中心度</span>
            </div>
            <div class="iap-cent-item">
              <b>{{ centrality?.betweennessCentrality ?? 0 }}</b>
              <span>介数中心度</span>
            </div>
            <div class="iap-cent-item">
              <b>{{ centrality?.closenessCentrality ?? 0 }}</b>
              <span>接近中心度</span>
            </div>
            <div class="iap-cent-item">
              <b>{{ centrality?.eigenvectorCentrality ?? 0 }}</b>
              <span>特征向量</span>
            </div>
          </div>
        </div>

        <div v-if="propagation" class="iap-block">
          <span class="iap-block-label">传播力</span>
          <div class="iap-prop">
            <div class="iap-prop-stat">
              <b>{{ propagation.reachableNodes }}</b>
              <span>可达节点</span>
            </div>
            <div class="iap-prop-stat">
              <b>{{ propagation.avgPropagationDistance }}</b>
              <span>平均传播距离</span>
            </div>
            <div class="iap-prop-stat">
              <b>{{ propagation.propagationEfficiency }}%</b>
              <span>传播效率</span>
            </div>
          </div>
          <div v-if="propagation.criticalPaths.length" class="iap-paths">
            <span class="iap-paths-label">关键传播路径</span>
            <div v-for="(p, i) in propagation.criticalPaths" :key="i" class="iap-path">
              <span class="iap-path-node" v-for="(n, ni) in p" :key="n">
                {{ contactName(n) }}<em v-if="ni < p.length - 1">→</em>
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInfluenceAnalysis } from '../modules/career/skill-path'
import type { Contact, CareerConnection, NetworkTier, NodeType, ConnectionType } from '../modules/career/types'
import type { CareerContact, CareerConnection as ViewConn } from '../modules/career/career'

const props = defineProps<{
  contacts: CareerContact[]
  connections: ViewConn[]
}>()

const analysis = useInfluenceAnalysis()

// ---- 视图层数据 → types.ts 结构适配 ----
const TIER_MAP: Record<string, NetworkTier> = { core: 'core', active: 'active', extended: 'extended', edge: 'peripheral' }
const NODE_MAP: Record<string, NodeType> = {
  mentor: 'mentor', colleague: 'colleague', superior: 'superior', subordinate: 'subordinate',
  client: 'client', partner: 'partner', peer: 'peer', friend: 'friend',
  vendor: 'supplier', investor: 'investor', alumni: 'alumni',
}
const CONN_STRENGTH: Record<string, number> = {
  strong: 8, medium: 5, weak: 2, collaboration: 6, referral: 5, mentorship: 7,
}

function toContacts(): Contact[] {
  return props.contacts.map(c => ({
    id: c.id,
    name: c.name,
    role: c.role,
    tier: TIER_MAP[c.tier] ?? 'peripheral',
    nodeType: NODE_MAP[c.nodeType] ?? 'peer',
    affinity: c.affinity,
    tags: c.tags,
    note: c.note,
    firstContactAt: new Date().toISOString(),
    contactCount: 0,
  }))
}

function toConns(): CareerConnection[] {
  return props.connections.map(c => ({
    id: c.id,
    fromId: c.fromId,
    toId: c.toId,
    type: (c.type === 'strong' || c.type === 'medium' || c.type === 'weak' ? 'collaboration' : c.type) as ConnectionType,
    description: c.description,
    strength: CONN_STRENGTH[c.type] ?? 5,
    createdAt: new Date().toISOString(),
  }))
}

const adaptedContacts = computed(() => toContacts())
const adaptedConns = computed(() => toConns())

const scores = computed(() => analysis.computeInfluenceScores(adaptedContacts.value, adaptedConns.value))
const health = computed(() => analysis.computeNetworkHealth(adaptedContacts.value, adaptedConns.value))
const topScores = computed(() => scores.value.slice(0, 8))

const selectedId = ref<string | null>(null)
const selected = computed(() => props.contacts.find(c => c.id === selectedId.value) ?? null)
const centrality = computed(() =>
  selectedId.value ? analysis.computeCentrality(selectedId.value, adaptedContacts.value, adaptedConns.value) : null,
)
const propagation = computed(() =>
  selectedId.value ? analysis.computePropagation(selectedId.value, adaptedContacts.value, adaptedConns.value) : null,
)

function selectContact(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function contactName(id: string) {
  return props.contacts.find(c => c.id === id)?.name ?? id
}

function trendLabel(t: string) {
  return t === 'rising' ? '上升' : t === 'declining' ? '下降' : '稳定'
}

function healthColor(v: number) {
  if (v >= 60) return '#8a9a7a'
  if (v >= 35) return '#d89a5a'
  return '#c46a5a'
}

const healthRing = computed(() => {
  const s = health.value?.healthScore ?? 0
  const hue = s >= 60 ? 150 : s >= 35 ? 38 : 22
  return `conic-gradient(hsl(${hue} 45% 50%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})
</script>

<style scoped>
.iap {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.iap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.iap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.iap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.iap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.iap-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); white-space: nowrap; }

.iap-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 0; text-align: center; }
.iap-empty-icon { font-size: 30px; opacity: 0.5; }
.iap-empty-text { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.iap-block { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; padding-top: 14px; border-top: 1px solid rgba(var(--accent-rgb), 0.1); }
.iap-block-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }

.iap-health { display: flex; align-items: center; gap: 20px; padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03); }
.iap-health-ring { width: 84px; height: 84px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.iap-health-ring::before { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: rgba(18,14,11,0.9); }
.iap-health-ring b { position: relative; font-size: 22px; font-weight: 500; color: #ecd6b5; }
.iap-health-ring span { position: relative; font-size: 9px; color: rgba(232,221,208,0.5); }
.iap-health-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.iap-health-item { display: flex; flex-direction: column; gap: 2px; }
.iap-health-item b { font-size: 15px; font-weight: 500; color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }
.iap-health-item span { font-size: 10px; color: rgba(232, 221, 208, 0.45); }

.iap-rank { display: flex; flex-direction: column; gap: 8px; }
.iap-rank-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.25s ease; }
.iap-rank-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.14); }
.iap-rank-row.selected { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.08); }
.iap-rank-idx { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 11px; color: rgba(232,221,208,0.6); flex-shrink: 0; }
.iap-rank-idx.top { background: rgba(240,192,64,0.16); color: #f0c040; }
.iap-rank-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.iap-rank-head { display: flex; align-items: center; gap: 8px; }
.iap-rank-head b { font-size: 12px; color: var(--text-high, #d8c3a5); font-weight: 500; }
.iap-rank-trend { font-size: 9px; padding: 1px 6px; border-radius: 6px; }
.iap-rank-trend.is-rising { background: rgba(138,154,122,0.18); color: #8a9a7a; }
.iap-rank-trend.is-declining { background: rgba(196,106,90,0.16); color: #c46a5a; }
.iap-rank-trend.is-stable { background: rgba(138,154,168,0.14); color: #8a9aa8; }
.iap-rank-score { margin-left: auto; font-size: 14px; font-weight: 500; color: #ecd6b5; font-variant-numeric: tabular-nums; }
.iap-rank-bar { height: 5px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.iap-rank-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(138,154,122,0.5), #8a9a7a); }
.iap-rank-meta { display: flex; gap: 12px; font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.iap-centrality { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.iap-cent-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.iap-cent-item b { font-size: 15px; font-weight: 500; color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }
.iap-cent-item span { font-size: 9px; color: rgba(232, 221, 208, 0.45); text-align: center; }

.iap-prop { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.iap-prop-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.iap-prop-stat b { font-size: 16px; font-weight: 500; color: var(--text-high, #d8c3a5); font-variant-numeric: tabular-nums; }
.iap-prop-stat span { font-size: 9px; color: rgba(232, 221, 208, 0.45); }
.iap-paths { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.iap-paths-label { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.iap-path { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 11px; color: rgba(232, 221, 208, 0.6); }
.iap-path-node em { color: rgba(var(--accent-rgb), 0.5); margin: 0 2px; font-style: normal; }

@media (max-width: 640px) {
  .iap { padding: 14px 14px; }
  .iap-health { flex-direction: column; align-items: flex-start; }
  .iap-health-grid { width: 100%; grid-template-columns: repeat(3, 1fr); }
  .iap-centrality { grid-template-columns: repeat(3, 1fr); }
}
</style>
