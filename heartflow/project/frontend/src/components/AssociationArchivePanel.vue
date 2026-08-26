<template>
  <section class="aap">
    <div class="aap-head">
      <div class="aap-title-wrap">
        <span class="aap-title">🕸 关联档案</span>
        <span class="aap-sub">记录彼此相连的这张网，拢成一册安放</span>
      </div>
      <span class="aap-tag">{{ health.label }}</span>
    </div>

    <!-- 图谱圆环 + 三轴 -->
    <div class="aap-main">
      <div class="aap-ring" :style="{ background: ringStyle }">
        <span class="aap-ring-num">{{ health.score }}<i>/100</i></span>
      </div>
      <div class="aap-axes">
        <div class="aap-axis">
          <span class="aap-axis-label">涉域广度</span>
          <div class="aap-bar"><i :style="{ width: health.breadth + '%' }"></i></div>
          <b>{{ health.breadth }}</b>
        </div>
        <div class="aap-axis">
          <span class="aap-axis-label">连线密度</span>
          <div class="aap-bar"><i :style="{ width: health.density + '%' }"></i></div>
          <b>{{ health.density }}</b>
        </div>
        <div class="aap-axis">
          <span class="aap-axis-label">关联强度</span>
          <div class="aap-bar"><i :style="{ width: health.strength + '%' }"></i></div>
          <b>{{ health.strength }}</b>
        </div>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="aap-metrics">
      <div class="aap-metric"><b>{{ ov.nodeCount }}</b><span>记录节点</span></div>
      <div class="aap-metric"><b>{{ ov.linkCount }}</b><span>关联连线</span></div>
      <div class="aap-metric"><b>{{ ov.domainCount }}</b><span>涉域</span></div>
      <div class="aap-metric"><b>{{ ov.pairCount }}</b><span>域对</span></div>
      <div class="aap-metric"><b>{{ ov.avgStrength }}</b><span>平均强度</span></div>
    </div>

    <!-- 关联类型分布 -->
    <div v-if="types.length" class="aap-types">
      <div v-for="t in types" :key="t.type" class="aap-type">
        <span class="aap-type-icon">{{ t.icon }}</span>
        <span class="aap-type-label">{{ t.label }}</span>
        <div class="aap-type-bar"><i :style="{ width: t.percentage + '%' }"></i></div>
        <span class="aap-type-count">{{ t.count }}条</span>
      </div>
    </div>

    <!-- 域对分布 -->
    <div v-if="pairs.length" class="aap-pairs">
      <div v-for="p in pairs.slice(0, 5)" :key="p.source + p.target" class="aap-pair">
        <span class="aap-pair-label">{{ p.source }} × {{ p.target }}</span>
        <div class="aap-pair-bar"><i :style="{ width: p.percentage + '%' }"></i></div>
        <span class="aap-pair-count">{{ p.count }}</span>
      </div>
    </div>

    <!-- 小结 -->
    <div v-if="ov.nodeCount" class="aap-summary">
      <span v-if="ov.isolatedCount > 0">· {{ ov.isolatedCount }} 条记录暂居网外</span>
      <span v-if="ov.hubDegree >= 2">· 枢纽「{{ ov.hubLabel }}」牵 {{ ov.hubDegree }} 线</span>
      <span v-if="ov.recent30Links > 0">· 近30天新织 {{ ov.recent30Links }} 条</span>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="aap-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s.text }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AssociationGraph } from '../modules/association/types'
import {
  associationArchiveOverview,
  linkTypeRows,
  domainPairRows,
  associationArchiveHealth,
  associationInsights,
} from '../modules/association/association-archive-analytics'

const props = defineProps<{ graph: AssociationGraph }>()

const ov = ref(associationArchiveOverview({ nodes: [], links: [] }, new Date()))
const types = ref(linkTypeRows({ nodes: [], links: [] }))
const pairs = ref(domainPairRows({ nodes: [], links: [] }))
const health = ref(associationArchiveHealth({ nodes: [], links: [] }))
const insights = ref(associationInsights({ nodes: [], links: [] }, new Date()))

function refresh() {
  const now = new Date()
  ov.value = associationArchiveOverview(props.graph, now)
  types.value = linkTypeRows(props.graph)
  pairs.value = domainPairRows(props.graph)
  health.value = associationArchiveHealth(props.graph)
  insights.value = associationInsights(props.graph, now)
}

watch(() => props.graph, () => refresh(), { deep: true })

// 图谱圆环：低→沉静的蓝紫，高→清透的靛
const ringStyle = computed(() => {
  const s = health.value.score
  const hue = s >= 80 ? 218 : s >= 60 ? 224 : s >= 40 ? 238 : 252
  return `conic-gradient(hsl(${hue} 48% 58%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

refresh()
</script>

<style scoped>
.aap {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.aap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.aap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.aap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d6caf0); }
.aap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.aap-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #b9b0e8; white-space: nowrap; }

.aap-main { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
.aap-ring {
  width: 92px; height: 92px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.aap-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(15, 13, 20, 0.92); }
.aap-ring-num { position: relative; font-size: 20px; font-weight: 400; color: #e0d9f5; letter-spacing: 0.5px; }
.aap-ring-num i { font-style: normal; font-size: 10px; opacity: 0.5; }

.aap-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.aap-axis { display: flex; align-items: center; gap: 10px; }
.aap-axis-label { width: 62px; font-size: 11px; color: rgba(226, 220, 240, 0.55); flex-shrink: 0; }
.aap-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.aap-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(218 48% 58%), hsl(252 48% 55%)); }
.aap-axis b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(226, 220, 240, 0.7); }

.aap-metrics { display: flex; gap: 8px; margin-bottom: 14px; }
.aap-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.aap-metric b { font-size: 15px; font-weight: 500; color: var(--text-high, #d6caf0); }
.aap-metric span { font-size: 10px; color: rgba(226, 220, 240, 0.4); }

.aap-types { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.aap-type { display: flex; align-items: center; gap: 10px; }
.aap-type-icon { width: 20px; text-align: center; }
.aap-type-label { width: 64px; font-size: 12px; color: rgba(226, 220, 240, 0.65); }
.aap-type-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.aap-type-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); background: linear-gradient(90deg, hsl(218 48% 58%), hsl(252 48% 55%)); }
.aap-type-count { width: 44px; text-align: right; font-size: 11px; color: rgba(226, 220, 240, 0.5); }

.aap-pairs { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.aap-pair { display: flex; align-items: center; gap: 10px; }
.aap-pair-label { width: 92px; font-size: 11px; color: rgba(226, 220, 240, 0.55); flex-shrink: 0; }
.aap-pair-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.aap-pair-bar i { display: block; height: 100%; border-radius: 999px; background: rgba(226, 220, 240, 0.35); }
.aap-pair-count { width: 24px; text-align: right; font-size: 11px; color: rgba(226, 220, 240, 0.5); }

.aap-summary { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; color: rgba(226, 220, 240, 0.45); margin-bottom: 12px; }
.aap-summary span { border-left: 2px solid rgba(var(--accent-rgb), 0.25); padding-left: 8px; }

.aap-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.aap-insights li { font-size: 12px; line-height: 1.65; color: rgba(226, 220, 240, 0.6); }
.aap-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>