<template>
  <section class="caparch">
    <div class="caparch-head">
      <div class="caparch-title-wrap">
        <span class="caparch-title">⏳ 胶囊档案</span>
        <span class="caparch-sub">一封封封存与开启，拢成一册安放</span>
      </div>
      <span class="caparch-tag">{{ health.label }}</span>
    </div>

    <!-- 健康圆环 + 三轴 -->
    <div class="caparch-main">
      <div class="caparch-ring" :style="{ background: ringStyle }">
        <span class="caparch-ring-num">{{ health.score }}<i>/100</i></span>
      </div>
      <div class="caparch-axes">
        <div class="caparch-axis">
          <span class="caparch-axis-label">封存活力</span>
          <div class="caparch-bar"><i :style="{ width: health.seal + '%' }"></i></div>
          <b>{{ health.seal }}</b>
        </div>
        <div class="caparch-axis">
          <span class="caparch-axis-label">回望浓度</span>
          <div class="caparch-bar"><i :style="{ width: health.recall + '%' }"></i></div>
          <b>{{ health.recall }}</b>
        </div>
        <div class="caparch-axis">
          <span class="caparch-axis-label">期待浓度</span>
          <div class="caparch-bar"><i :style="{ width: health.anticipation + '%' }"></i></div>
          <b>{{ health.anticipation }}</b>
        </div>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="caparch-metrics">
      <div class="caparch-metric"><b>{{ ov.sealedCount }}</b><span>封存中</span></div>
      <div class="caparch-metric"><b>{{ ov.openedCount }}</b><span>已开启</span></div>
      <div class="caparch-metric"><b>{{ ov.itemCount }}</b><span>封存内容</span></div>
      <div class="caparch-metric"><b>{{ ov.nextOpenDays ?? '—' }}</b><span>最近开启（日）</span></div>
      <div class="caparch-metric"><b>{{ ov.avgSealDays }}</b><span>平均封存（日）</span></div>
    </div>

    <!-- 封存内容类型分布 -->
    <div v-if="typeRows.length" class="caparch-types">
      <div v-for="t in typeRows" :key="t.type" class="caparch-type">
        <span class="caparch-type-icon">{{ t.icon }}</span>
        <span class="caparch-type-label">{{ t.label }}</span>
        <div class="caparch-type-bar"><i :style="{ width: t.percentage + '%' }"></i></div>
        <span class="caparch-type-count">{{ t.count }}条</span>
      </div>
    </div>

    <!-- 每封装载分布 -->
    <div v-if="countRows.length" class="caparch-load">
      <span class="caparch-load-title">每封装载</span>
      <div v-for="r in countRows" :key="r.count" class="caparch-load-row">
        <span class="caparch-load-bucket">{{ r.count }} 条</span>
        <div class="caparch-load-bar"><i :style="{ width: loadWidth(r.capsules) + '%' }"></i></div>
        <span class="caparch-load-count">{{ r.capsules }} 封</span>
      </div>
    </div>

    <!-- 等待分布 -->
    <div v-if="waitRows.length" class="caparch-wait">
      <span class="caparch-wait-title">待开启的远近</span>
      <div v-for="w in waitRows" :key="w.bucket" class="caparch-wait-row">
        <span class="caparch-wait-bucket">{{ w.bucket }}</span>
        <div class="caparch-wait-bar"><i :style="{ width: waitWidth(w.count) + '%' }"></i></div>
        <span class="caparch-wait-count">{{ w.count }}</span>
      </div>
    </div>

    <!-- 节律概要 -->
    <div v-if="ov.totalCount" class="caparch-summary">
      <span v-if="rhy.openRate > 0">· 开启率 {{ rhy.openRate }}%</span>
      <span v-if="rhy.currentStreak >= 2">· 连续 {{ rhy.currentStreak }} 天与封存箱碰面</span>
      <span v-if="ov.openableToday > 0">· {{ ov.openableToday }} 封今日可开启</span>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="caparch-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s.text }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TimeCapsule } from '../modules/capsule'
import {
  capsuleArchiveOverview,
  capsuleItemTypeRows,
  capsuleItemCountRows,
  capsuleWaitRows,
  capsuleRhythm,
  capsuleArchiveHealth,
  capsuleInsights,
} from '../modules/capsule/capsule-archive-analytics'

const props = defineProps<{ capsules: TimeCapsule[] }>()

const ov = ref(capsuleArchiveOverview([], new Date()))
const typeRows = ref(capsuleItemTypeRows([]))
const countRows = ref(capsuleItemCountRows([]))
const waitRows = ref(capsuleWaitRows([], new Date()))
const rhy = ref(capsuleRhythm([], new Date()))
const health = ref(capsuleArchiveHealth([], new Date()))
const insights = ref(capsuleInsights([], new Date()))

const maxWait = ref(1)
const maxCapsules = ref(1)

function refresh(now = new Date()) {
  ov.value = capsuleArchiveOverview(props.capsules, now)
  typeRows.value = capsuleItemTypeRows(props.capsules)
  countRows.value = capsuleItemCountRows(props.capsules)
  waitRows.value = capsuleWaitRows(props.capsules, now)
  rhy.value = capsuleRhythm(props.capsules, now)
  health.value = capsuleArchiveHealth(props.capsules, now)
  insights.value = capsuleInsights(props.capsules, now)
  maxWait.value = Math.max(1, ...waitRows.value.map(w => w.count))
  maxCapsules.value = Math.max(1, ...countRows.value.map(r => r.capsules))
}

watch(() => props.capsules, () => refresh(), { deep: true })

// 圆环：低→沉静的靛紫，高→清透的暖金
const ringStyle = computed(() => {
  const s = health.value.score
  const hue = s >= 80 ? 40 : s >= 60 ? 272 : s >= 40 ? 252 : 232
  return `conic-gradient(hsl(${hue} 46% 58%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

function waitWidth(count: number): number {
  return maxWait.value > 0 ? Math.round((count / maxWait.value) * 100) : 0
}

function loadWidth(capsules: number): number {
  return maxCapsules.value > 0 ? Math.round((capsules / maxCapsules.value) * 100) : 0
}

refresh()
</script>

<style scoped>
.caparch {
  margin: 8px auto 0;
  max-width: 640px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.caparch-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.caparch-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.caparch-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.caparch-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.caparch-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #b9b0e8; white-space: nowrap; }

.caparch-main { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
.caparch-ring {
  width: 92px; height: 92px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.caparch-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(15, 13, 20, 0.92); }
.caparch-ring-num { position: relative; font-size: 20px; font-weight: 400; color: #e0d9f5; letter-spacing: 0.5px; }
.caparch-ring-num i { font-style: normal; font-size: 10px; opacity: 0.5; }

.caparch-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.caparch-axis { display: flex; align-items: center; gap: 10px; }
.caparch-axis-label { width: 62px; font-size: 11px; color: rgba(226, 220, 240, 0.55); flex-shrink: 0; }
.caparch-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.caparch-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(272 46% 58%), hsl(40 46% 55%)); }
.caparch-axis b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(226, 220, 240, 0.7); }

.caparch-metrics { display: flex; gap: 8px; margin-bottom: 14px; }
.caparch-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.caparch-metric b { font-size: 15px; font-weight: 500; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.caparch-metric span { font-size: 10px; color: rgba(226, 220, 240, 0.4); }

.caparch-types { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.caparch-type { display: flex; align-items: center; gap: 10px; }
.caparch-type-icon { width: 20px; text-align: center; }
.caparch-type-label { width: 64px; font-size: 12px; color: rgba(226, 220, 240, 0.65); }
.caparch-type-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.caparch-type-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); background: linear-gradient(90deg, hsl(272 46% 58%), hsl(252 46% 55%)); }
.caparch-type-count { width: 44px; text-align: right; font-size: 11px; color: rgba(226, 220, 240, 0.5); }

.caparch-load { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.caparch-load-title { font-size: 11px; color: rgba(226, 220, 240, 0.5); margin-bottom: 2px; }
.caparch-load-row { display: flex; align-items: center; gap: 10px; }
.caparch-load-bucket { width: 64px; font-size: 11px; color: rgba(226, 220, 240, 0.55); flex-shrink: 0; }
.caparch-load-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.caparch-load-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(272 46% 58%), hsl(40 46% 55%)); }
.caparch-load-count { width: 34px; text-align: right; font-size: 11px; color: rgba(226, 220, 240, 0.5); }

.caparch-wait { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.caparch-wait-title { font-size: 11px; color: rgba(226, 220, 240, 0.5); margin-bottom: 2px; }
.caparch-wait-row { display: flex; align-items: center; gap: 10px; }
.caparch-wait-bucket { width: 64px; font-size: 11px; color: rgba(226, 220, 240, 0.55); flex-shrink: 0; }
.caparch-wait-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.caparch-wait-bar i { display: block; height: 100%; border-radius: 999px; background: rgba(226, 220, 240, 0.35); }
.caparch-wait-count { width: 24px; text-align: right; font-size: 11px; color: rgba(226, 220, 240, 0.5); }

.caparch-summary { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; color: rgba(226, 220, 240, 0.45); margin-bottom: 12px; }
.caparch-summary span { border-left: 2px solid rgba(var(--accent-rgb), 0.25); padding-left: 8px; }

.caparch-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.caparch-insights li { font-size: 12px; line-height: 1.65; color: rgba(226, 220, 240, 0.6); }
.caparch-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>