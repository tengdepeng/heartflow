<template>
  <section class="cap">
    <div class="cap-head">
      <div class="cap-title-wrap">
        <span class="cap-title">🕸 业脉档案</span>
        <span class="cap-sub">每一根关系的线，都是职业这棵树的根</span>
      </div>
      <span class="cap-tag">{{ health.label }}</span>
    </div>

    <!-- 业脉圆环 + 三轴 -->
    <div class="cap-main">
      <div class="cap-ring" :style="{ background: ringStyle }">
        <span class="cap-ring-num">{{ health.score }}<i>/100</i></span>
      </div>
      <div class="cap-axes">
        <div class="cap-axis">
          <span class="cap-axis-label">广度</span>
          <div class="cap-bar"><i :style="{ width: health.breadth + '%' }"></i></div>
          <b>{{ health.breadth }}</b>
        </div>
        <div class="cap-axis">
          <span class="cap-axis-label">深度</span>
          <div class="cap-bar"><i :style="{ width: health.depth + '%' }"></i></div>
          <b>{{ health.depth }}</b>
        </div>
        <div class="cap-axis">
          <span class="cap-axis-label">活力</span>
          <div class="cap-bar"><i :style="{ width: health.vitality + '%' }"></i></div>
          <b>{{ health.vitality }}</b>
        </div>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="cap-metrics">
      <div class="cap-metric"><b>{{ ov.totalContacts }}</b><span>联系人</span></div>
      <div class="cap-metric"><b>{{ ov.coreContacts }}</b><span>核心圈</span></div>
      <div class="cap-metric"><b>{{ ov.activeProjects }}</b><span>在途项目</span></div>
      <div class="cap-metric"><b>{{ ov.avgAffinity }}</b><span>均亲密度</span></div>
      <div class="cap-metric"><b>{{ ov.totalConnections }}</b><span>连接</span></div>
    </div>

    <!-- 圈层分布 -->
    <div v-if="ov.totalContacts" class="cap-block">
      <span class="cap-block-label">圈层分布</span>
      <div v-for="t in tiers" :key="t.key" class="cap-row">
        <span class="cap-row-label">{{ t.label }}</span>
        <div class="cap-row-bar">
          <i :style="{ width: t.pct + '%', background: t.color }"></i>
        </div>
        <span class="cap-row-count">{{ t.count }}</span>
      </div>
    </div>

    <!-- 亲密度分档 -->
    <div v-if="ov.totalContacts" class="cap-block">
      <span class="cap-block-label">亲密度分档</span>
      <div v-for="b in bucketList" :key="b.key" class="cap-row">
        <span class="cap-row-label">{{ b.label }}</span>
        <div class="cap-row-bar">
          <i :style="{ width: b.pct + '%', background: b.color }"></i>
        </div>
        <span class="cap-row-count">{{ b.count }}</span>
      </div>
    </div>

    <!-- 角色构成 -->
    <div v-if="nodes.length" class="cap-block">
      <span class="cap-block-label">角色构成</span>
      <div v-for="n in nodes" :key="n.key" class="cap-row">
        <span class="cap-row-label">{{ n.icon }} {{ n.label }}</span>
        <div class="cap-row-bar">
          <i :style="{ width: n.pct + '%', background: n.color }"></i>
        </div>
        <span class="cap-row-count">{{ n.count }}</span>
      </div>
    </div>

    <!-- 项目状态 -->
    <div v-if="ov.totalProjects" class="cap-block">
      <span class="cap-block-label">项目状态</span>
      <div v-for="s in statuses" :key="s.key" class="cap-row">
        <span class="cap-row-label">{{ s.label }}</span>
        <div class="cap-row-bar">
          <i :style="{ width: s.pct + '%', background: s.color }"></i>
        </div>
        <span class="cap-row-count">{{ s.count }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="cap-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CareerContact, CareerProject, CareerConnection } from '../modules/career/career'
import {
  careerOverview,
  careerTierRows,
  careerNodeRows,
  affinityBuckets,
  careerStatusRows,
  careerHealth,
  careerInsights,
} from '../modules/career/career-analytics'

const props = defineProps<{ contacts: CareerContact[]; projects: CareerProject[]; connections: CareerConnection[] }>()

const ov = ref(careerOverview([], [], []))
const tiers = ref(careerTierRows([]))
const nodes = ref(careerNodeRows([]))
const buckets = ref(affinityBuckets([]))
const statuses = ref(careerStatusRows([]))
const health = ref(careerHealth([], [], []))
const insights = ref<string[]>([])

function refresh() {
  ov.value = careerOverview(props.contacts, props.projects, props.connections)
  tiers.value = careerTierRows(props.contacts)
  nodes.value = careerNodeRows(props.contacts, 8)
  buckets.value = affinityBuckets(props.contacts)
  statuses.value = careerStatusRows(props.projects)
  health.value = careerHealth(props.contacts, props.projects, props.connections)
  insights.value = careerInsights(props.contacts, props.projects, props.connections, 4)
}

watch(
  () => [props.contacts, props.projects, props.connections],
  () => refresh(),
  { deep: true }
)

const bucketList = computed(() => [buckets.value.high, buckets.value.mid, buckets.value.low])

// 业脉圆环：低→荒土褐，高→繁木青金
const ringStyle = computed(() => {
  const s = health.value.score
  const hue = s >= 80 ? 150 : s >= 60 ? 130 : s >= 40 ? 34 : 22
  return `conic-gradient(hsl(${hue} 55% 55%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

refresh()
</script>

<style scoped>
.cap {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.cap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.cap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.cap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.cap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.cap-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.cap-main { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
.cap-ring {
  width: 92px; height: 92px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.cap-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(18, 14, 11, 0.92); }
.cap-ring-num { position: relative; font-size: 20px; font-weight: 400; color: #ecd6b5; letter-spacing: 0.5px; }
.cap-ring-num i { font-style: normal; font-size: 10px; opacity: 0.5; }

.cap-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.cap-axis { display: flex; align-items: center; gap: 10px; }
.cap-axis-label { width: 34px; font-size: 11px; color: rgba(232, 221, 208, 0.55); flex-shrink: 0; }
.cap-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.cap-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(130 55% 55%), hsl(38 60% 62%)); }
.cap-axis b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(232, 221, 208, 0.7); }

.cap-metrics { display: flex; gap: 8px; margin-bottom: 14px; }
.cap-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.cap-metric b { font-size: 15px; font-weight: 500; color: var(--text-high, #d8c3a5); }
.cap-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.cap-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.cap-block-label { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); margin-bottom: 2px; }
.cap-row { display: flex; align-items: center; gap: 10px; }
.cap-row-label { width: 72px; font-size: 12px; color: rgba(232, 221, 208, 0.65); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cap-row-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.cap-row-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.cap-row-count { width: 26px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.5); }

.cap-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.cap-insights li { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 208, 0.6); }
.cap-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>