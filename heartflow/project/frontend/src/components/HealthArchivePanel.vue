<template>
  <section class="hcarch">
    <div class="hcarch-head">
      <div class="hcarch-title-wrap">
        <span class="hcarch-title">🌿 健康档案</span>
        <span class="hcarch-sub">把经络 / 情绪 / 体质的碎记，拢成一册安放</span>
      </div>
      <button class="hcarch-gen" :disabled="!canGenerate" @click="generate">
        {{ generating ? '生成中…' : isSealed ? '⊥ 重新生成' : '+ 生成健康档案' }}
      </button>
    </div>

    <!-- 最新报告：五维评分 -->
    <div v-if="latest" class="hcarch-report" data-test="latest-report">
      <div class="hcarch-score-wrap">
        <div class="hcarch-overall" :style="{ background: ringStyle }">
          <span class="hcarch-overall-num">{{ latest.overallScore }}<i>/100</i></span>
          <span class="hcarch-overall-label">综合</span>
        </div>
        <div class="hcarch-dims">
          <div v-for="d in dims" :key="d.key" class="hcarch-dim">
            <span class="hcarch-dim-label">{{ d.icon }} {{ d.label }}</span>
            <div class="hcarch-dim-bar"><i :style="{ width: d.value + '%' }"></i></div>
            <b>{{ d.value }}</b>
          </div>
        </div>
      </div>
      <p class="hcarch-date">生成于 {{ fmtDate(latest.generatedAt) }}</p>
    </div>

    <!-- 无报告时守候提示 -->
    <p v-else class="hcarch-empty">尚无健康档案。记录几条经络心情后，点「生成健康档案」，不评判、只安放。</p>

    <!-- 经络最需关注 -->
    <div v-if="weakOrgans.length" class="hcarch-weak">
      <span class="hcarch-weak-title">较需关照的经络</span>
      <span v-for="w in weakOrgans" :key="w.organ" class="hcarch-weak-chip">
        {{ w.organ }} · {{ Math.round(w.goodRate * 100) }}%
      </span>
    </div>

    <!-- 情绪-脏腑关联 -->
    <div v-if="moodLinks.length" class="hcarch-moods">
      <span class="hcarch-moods-title">情绪 · 脏腑印记</span>
      <div v-for="l in moodLinks.slice(0, 4)" :key="l.mood + l.organ" class="hcarch-mood">
        <span class="hcarch-mood-name">{{ moodLabel(l.mood) }}</span>
        <span class="hcarch-mood-organ">{{ organLabel(l.organ) }}经</span>
        <div class="hcarch-mood-bar"><i :style="{ width: l.strength * 100 + '%' }"></i></div>
        <span class="hcarch-mood-count">{{ l.count }}次</span>
      </div>
    </div>

    <!-- 建议 -->
    <ul v-if="recommendations.length" class="hcarch-advice">
      <li v-for="r in recommendations.slice(0, 3)" :key="r.id" :class="r.priority">
        <b>{{ r.title }}</b><span>{{ r.description }}</span>
      </li>
    </ul>

    <!-- 历史档案 -->
    <details class="hcarch-history" v-if="history.length > 1">
      <summary>历次档案 · {{ history.length }}</summary>
      <div v-for="(r, i) in history.slice(1)" :key="i" class="hcarch-history-row">
        <span class="hcarch-history-date">{{ fmtDate(r.generatedAt) }}</span>
        <span class="hcarch-history-score">{{ r.overallScore }}</span>
        <span class="hcarch-history-bar"><i :style="{ width: r.overallScore + '%' }"></i></span>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHealthAnalysis } from '../modules/body-wisdom/health-analysis'
import { MERIDIAN_HOURS, type MeridianType, type OrganType } from '../modules/body-wisdom/types'
import type { HealthAnalysisReport, HealthDimension } from '../modules/body-wisdom/health-analysis'

/** 视图层 store 的经络记录（hf:meridian_logs 条目） */
export interface BodyMeridianLogLike {
  hour: number
  feeling: string
  at: string
  organ?: string
  name?: string
  date?: string
}
/** 视图层 store 的心境记录（hf:wisdom_logs 条目） */
export interface BodyWisdomLogLike {
  id: string
  content: string
  at: string
  mood?: string
  insight?: string
}

const props = defineProps<{
  meridianLogs: BodyMeridianLogLike[]
  wisdomLogs: BodyWisdomLogLike[]
}>()

const health = useHealthAnalysis()
const generating = ref(false)

// ---- store 残片 → health-analysis 结构化记录 ----

/** 净化为合法的经络感受 */
function cleanFeeling(f: string): 'good' | 'ok' | 'bad' {
  return f === 'good' || f === 'ok' || f === 'bad' ? f : 'ok'
}

/** 按时辰及脏腑名推导 MeridianType */
function inferMeridian(hour: number, name?: string): MeridianType {
  const byHour = MERIDIAN_HOURS.find(m => m.hour === hour)
  if (byHour) return byHour.meridian
  const byName = name ? MERIDIAN_HOURS.find(m => m.organ === name) : undefined
  return byName?.meridian ?? 'heart'
}

const meridianRecords = computed(() =>
  props.meridianLogs.map(log => ({
    id: `mr_${log.at}_${log.hour}`,
    meridian: inferMeridian(log.hour, log.name || log.organ),
    feeling: cleanFeeling(log.feeling),
    recordedAt: log.at || new Date().toISOString(),
    hour: log.hour,
  })),
)

const MOOD_SET = new Set(['calm', 'anxious', 'sad', 'happy', 'angry', 'fearful'])
const moodRecords = computed(() =>
  props.wisdomLogs
    .filter(w => w.mood && MOOD_SET.has(w.mood))
    .map(w => ({
      id: w.id,
      mood: w.mood as 'calm' | 'anxious' | 'sad' | 'happy' | 'angry' | 'fearful',
      insight: w.insight || '',
      recordedAt: w.at,
    })),
)

// ---- 报告与衍生视图 ----

const latestReport = computed<HealthAnalysisReport | null>(() => health.latestReport.value as HealthAnalysisReport | null)
const latest = computed(() => latestReport.value)
const history = computed(() => health.getReportHistory(8) as HealthAnalysisReport[])

const canGenerate = computed(() => meridianRecords.value.length > 0 || moodRecords.value.length > 0)
const isSealed = computed(() => (latest.value?.overallScore ?? 0) > 0)

const DIM_META: Record<HealthDimension, { label: string; icon: string }> = {
  meridian: { label: '经络', icon: '🔄' },
  constitution: { label: '体质', icon: '⚖️' },
  mood: { label: '情绪', icon: '💭' },
  rhythm: { label: '作息', icon: '🕐' },
  overall: { label: '综合', icon: '📊' },
}
const dims = computed(() =>
  (['meridian', 'constitution', 'mood', 'rhythm'] as HealthDimension[]).map(key => ({
    key,
    label: DIM_META[key].label,
    icon: DIM_META[key].icon,
    value: latest.value ? latest.value[`${key}Score`] : 0,
  })),
)

const weakOrgans = computed(() =>
  (latest.value?.meridianDetails ?? []).filter(d => d.goodRate < 0.5).slice(0, 4),
)

const moodLinks = computed(() => latest.value?.moodOrganLinks ?? [])

const recommendations = computed(() => latest.value?.recommendations ?? [])

// ---- 文案 ----

const MOOD_LABEL: Record<string, string> = {
  calm: '平静', anxious: '思虑', sad: '低沉', happy: '欣然', angry: '郁怒', fearful: '不安',
}
const ORGAN_LABEL: Record<string, string> = {
  heart: '心', liver: '肝', spleen: '脾', lung: '肺', kidney: '肾',
}
function moodLabel(m: string): string { return MOOD_LABEL[m] || m }
function organLabel(o: OrganType): string { return ORGAN_LABEL[o] || o }

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch { return '' }
}

const ringStyle = computed(() => {
  const s = latest.value?.overallScore ?? 0
  const hue = s >= 75 ? 140 : s >= 55 ? 150 : s >= 35 ? 160 : 180
  return `conic-gradient(hsl(${hue} 40% 50%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

function generate() {
  if (!canGenerate.value || generating.value) return
  generating.value = true
  try {
    health.generateReport(meridianRecords.value, moodRecords.value)
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.hcarch {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.hcarch-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.hcarch-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.hcarch-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d6caf0); }
.hcarch-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.hcarch-gen {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   font-size: 11px; padding: 4px 12px; border-radius: 999px; background: rgba(var(--accent-rgb), 0.12); color: #b9d8b0; border: 1px solid rgba(var(--accent-rgb), 0.2); cursor: pointer; white-space: nowrap; 
  min-height: 26px;
}
.hcarch-gen:disabled { opacity: 0.35; cursor: not-allowed; }

.hcarch-report { margin-bottom: 12px; }
.hcarch-score-wrap { display: flex; align-items: center; gap: 20px; }
.hcarch-overall {
  width: 84px; height: 84px; border-radius: 50%; position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
}
.hcarch-overall::before { content: ''; position: absolute; inset: 7px; border-radius: 50%; background: rgba(15, 13, 20, 0.92); }
.hcarch-overall-num { position: relative; font-size: 18px; font-weight: 400; color: #dce8d8; }
.hcarch-overall-num i { font-style: normal; font-size: 9px; opacity: 0.5; }
.hcarch-overall-label { position: relative; font-size: 10px; color: rgba(226, 232, 240, 0.5); margin-top: 1px; }
.hcarch-dims { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.hcarch-dim { display: flex; align-items: center; gap: 10px; }
.hcarch-dim-label { width: 68px; font-size: 11px; color: rgba(226, 232, 240, 0.55); flex-shrink: 0; }
.hcarch-dim-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.hcarch-dim-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(150 40% 50%), hsl(160 40% 45%)); }
.hcarch-dim b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(226, 232, 240, 0.7); }
.hcarch-date { margin: 10px 0 0; font-size: 10px; color: rgba(226, 232, 240, 0.35); }

.hcarch-empty { font-size: 12px; line-height: 1.7; color: rgba(226, 232, 240, 0.5); }

.hcarch-weak { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.hcarch-weak-title { font-size: 11px; color: rgba(226, 232, 240, 0.5); padding-top: 2px; }
.hcarch-weak-chip { font-size: 11px; padding: 2px 10px; border-radius: 999px; background: rgba(180, 130, 90, 0.14); color: #d8b89a; }

.hcarch-moods { margin-bottom: 12px; }
.hcarch-moods-title { display: block; font-size: 11px; color: rgba(226, 232, 240, 0.5); margin-bottom: 6px; }
.hcarch-mood { display: flex; align-items: center; gap: 10px; padding: 3px 0; }
.hcarch-mood-name { width: 44px; font-size: 11px; color: rgba(226, 232, 240, 0.65); }
.hcarch-mood-organ { width: 56px; font-size: 11px; color: rgba(226, 232, 240, 0.45); }
.hcarch-mood-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.hcarch-mood-bar i { display: block; height: 100%; border-radius: 999px; background: rgba(190, 150, 130, 0.6); }
.hcarch-mood-count { width: 40px; text-align: right; font-size: 11px; color: rgba(226, 232, 240, 0.5); }

.hcarch-advice { list-style: none; margin: 0 0 12px; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 7px; }
.hcarch-advice li { font-size: 12px; line-height: 1.6; color: rgba(226, 232, 240, 0.6); display: flex; gap: 8px; }
.hcarch-advice li b { color: rgba(226, 232, 240, 0.8); font-weight: 500; flex-shrink: 0; }
.hcarch-advice li.high b { color: #d8b89a; }

.hcarch-history { border-top: 1px dashed rgba(var(--accent-rgb), 0.14); padding-top: 10px; }
.hcarch-history summary { font-size: 11px; color: rgba(226, 232, 240, 0.5); cursor: pointer; margin-bottom: 6px; }
.hcarch-history-row { display: flex; align-items: center; gap: 10px; padding: 2px 0; }
.hcarch-history-date { width: 72px; font-size: 11px; color: rgba(226, 232, 240, 0.5); }
.hcarch-history-score { width: 26px; text-align: right; font-size: 11px; color: rgba(226, 232, 240, 0.7); }
.hcarch-history-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.hcarch-history-bar i { display: block; height: 100%; border-radius: 999px; background: rgba(160, 190, 150, 0.6); }
</style>