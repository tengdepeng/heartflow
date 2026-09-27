<template>
  <section class="tap-panel" aria-label="时光档案">
    <header class="tap-head">
      <span class="tap-title">🗓️ 时光档案</span>
      <span class="tap-sub">概览 · 情绪曲线 · 规律雷达 · 年度回顾 · 叙事 · 温和洞察</span>
    </header>

    <div v-if="empty" class="tap-empty">
      <span class="tap-empty-icon">◌</span>
      <p>时间之河还静默着。记录一次专注、一段情绪或一篇笔记，档案便会在这里开卷。</p>
    </div>

    <template v-else>
      <!-- 档案概览 -->
      <div class="tap-overview">
        <div class="tap-ov-grid">
          <div class="tap-ov-cell"><span>总条目</span><b>{{ ov.totalItems }}</b></div>
          <div class="tap-ov-cell"><span>活跃天数</span><b>{{ ov.activeDays }}</b></div>
          <div class="tap-ov-cell"><span>连续天</span><b>{{ ov.streak }}</b></div>
          <div class="tap-ov-cell"><span>日均</span><b>{{ ov.dailyAverage }}</b></div>
        </div>
        <div v-if="typeChips.length" class="tap-chips">
          <span v-for="c in typeChips" :key="c.type" class="tap-chip">{{ c.label }} {{ c.count }}</span>
        </div>
      </div>

      <!-- 情绪曲线 -->
      <div class="tap-card">
        <span class="tap-card-t">🌷 情绪曲线</span>
        <div class="tap-emoct">
          <span class="tap-emo-badge" :class="'is-' + emo.trendDirection">{{ emoBadgeText }}</span>
          <span class="tap-emo-desc">{{ emo.trendDescription }}</span>
        </div>
        <div class="tap-emo-turns">
          <span class="tap-emo-turns-t">转折点</span>
          <span class="tap-emo-turns-v">{{ emo.turningPoints.length }} 处</span>
          <span v-for="(tp, i) in emoTurns" :key="i" class="tap-turn-chip">{{ tp.label }}</span>
        </div>
      </div>

      <!-- 规律雷达 -->
      <div class="tap-card">
        <span class="tap-card-t">🔭 规律雷达</span>
        <div class="tap-pat-row">
          <span class="tap-pat-item"><span class="tap-pat-label">周专注高峰</span><b>{{ pat.weeklyPattern.bestDayLabel }}</b></span>
          <span class="tap-pat-item"><span class="tap-pat-label">周专注低谷</span><b>{{ pat.weeklyPattern.worstDayLabel }}</b></span>
        </div>
        <div v-if="pat.weeklyPattern.insight" class="tap-pat-insight">{{ pat.weeklyPattern.insight }}</div>
        <div v-if="seasonalRows.length" class="tap-seasonal">
          <div v-for="(s, i) in seasonalRows" :key="i" class="tap-season-row">
            <span class="tap-season-label">{{ s.label }}</span>
            <span class="tap-season-emo">主导「{{ emoLabel(s.dominantEmotion) }}」</span>
            <span class="tap-season-trend" :class="'is-' + s.trend">{{ s.trend === 'up' ? '↗' : s.trend === 'down' ? '↘' : '→' }} {{ s.trend === 'stable' ? '持平' : '%' }}</span>
          </div>
        </div>
      </div>

      <!-- 年度回顾 -->
      <div class="tap-card">
        <span class="tap-card-t">📚 {{ thisYear }} 年度回顾</span>
        <template v-if="annual">
        <div class="tap-annual-grid">
          <div class="tap-an-cell"><span>专注时长</span><b>{{ fmtHm(annual.stats.totalFocusMinutes) }}</b></div>
          <div class="tap-an-cell"><span>专注天数</span><b>{{ annual.stats.focusDays }}</b></div>
          <div class="tap-an-cell"><span>最长连续</span><b>{{ annual.stats.longestStreak }} 天</b></div>
          <div class="tap-an-cell"><span>结晶</span><b>{{ annual.stats.totalCrystals }}</b></div>
          <div class="tap-an-cell"><span>笔记</span><b>{{ annual.stats.totalNotes }}</b></div>
          <div class="tap-an-cell"><span>情绪记录</span><b>{{ annual.stats.totalEmotions }}</b></div>
          <div class="tap-an-cell"><span>心锚完成</span><b>{{ annual.stats.anchorCompletionRate }}%</b></div>
          <div class="tap-an-cell"><span>最佳月</span><b>{{ annual.stats.bestMonthLabel || '—' }}</b></div>
        </div>
        <div class="tap-annual-meta">
          <span class="tap-amo-item">主导情绪<span>{{ emoLabel(annual.stats.dominantEmotion) }}</span></span>
          <span class="tap-amo-item">情绪健康指数<span>{{ annual.stats.emotionalHealthScore }}</span></span>
          <span class="tap-amo-item">年度等级<span class="tap-level">{{ annual.stats.annualLevel }}</span></span>
        </div>
        <div v-if="annualKeyTags.length" class="tap-chips">
          <span v-for="(t, i) in annualKeyTags" :key="i" class="tap-chip">{{ t.text }}</span>
        </div>
        <p v-if="annual.summary" class="tap-summary">{{ annual.summary }}</p>
        <div v-if="annualMilestones.length" class="tap-miles">
          <span class="tap-miles-t">年度里程碑</span>
          <ul class="tap-miles-list">
            <li v-for="(m, i) in annualMilestones" :key="i">✦ {{ m.title }}</li>
          </ul>
        </div>
        </template>
      </div>

      <!-- 叙事时光 -->
      <div v-if="narrative.daily || narrative.weekly" class="tap-card">
        <span class="tap-card-t">📜 叙事时光</span>
        <div v-if="narrative.daily" class="tap-narr">
          <span class="tap-narr-tag">今日</span>
          <span class="tap-narr-title">{{ narrative.daily.title }}</span>
        </div>
        <div v-if="narrative.weekly" class="tap-narr">
          <span class="tap-narr-tag">本周</span>
          <span class="tap-narr-title">{{ narrative.weekly.title }}</span>
        </div>
        <div class="tap-narr-recent">近 7 份叙事报告已归档</div>
      </div>

      <!-- 温和洞察 -->
      <div v-if="insights.length" class="tap-card">
        <span class="tap-card-t">💡 温和洞察</span>
        <ul class="tap-insights">
          <li v-for="(t, i) in insights" :key="i">• {{ t }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTimelineBridge } from '../modules/timeline/timeline-bridge'
import type { RiverItemType } from '../modules/timeline/river'

const TYPE_LABELS: Partial<Record<RiverItemType, string>> = {
  session: '专注', crystal: '结晶', note: '笔记', emotion: '情绪', anchor: '心锚',
  body: '身体', habit: '习惯', movement: '运动', rest: '休息', dialogue: '对话', photo: '照片',
}

const EMO_BADGE: Record<string, string> = {
  improving: '心情向好', declining: '心情回落', volatile: '情绪波动', stable: '平稳',
}

const EMOTION_LABELS: Record<string, string> = {
  happy: '喜悦', joy: '雀跃', excited: '兴奋', grateful: '感恩', calm: '平静',
  hopeful: '期许', proud: '自豪', loved: '被爱', motivated: '有动力',
  sad: '难过', angry: '生气', anxious: '焦虑', frustrated: '受挫',
  stressed: '紧绷', disappointed: '失落', lonely: '孤独', neutral: '平稳',
}

function emoLabel(key: string): string {
  return EMOTION_LABELS[key] ?? key
}

const bridge = useTimelineBridge()
onMounted(() => bridge.refreshSource())

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

const empty = computed(() => bridge.timelineOverview.value.totalItems === 0)
const ov = computed(() => bridge.timelineOverview.value)
const pat = computed(() => bridge.patternInsights.value)
const emo = computed(() => bridge.emotionAnalysis.value)
const narrative = computed(() => bridge.narrativeSummary.value)

const seasonalRows = computed(() => {
  const rows = pat.value.seasonalPatterns
  return rows.filter((s) => s.activeDays > 0 && s.totalItems >= 0)
})

const thisYear = computed(() => new Date().getFullYear())
const annual = computed(() =>
  safe(() => bridge.annualReviewModule.generateReview(bridge.items.value, thisYear.value), null),
)
const annualKeyTags = computed(() => annual.value?.stats.topTags.filter((t) => t.frequency > 0).slice(0, 8) ?? [])
const annualMilestones = computed(() => annual.value?.milestones.slice(0, 4) ?? [])

const typeChips = computed(() =>
  ov.value.typeDistribution
    .filter((t) => t.count > 0)
    .map((t) => ({ type: t.type, label: TYPE_LABELS[t.type] ?? t.type, count: t.count })),
)
const emoBadgeText = computed(() => EMO_BADGE[emo.value.trendDirection] ?? '平稳')
const emoTurns = computed(() => emo.value.turningPoints.slice(0, 3))

const insights = computed(() => {
  const out: string[] = []
  try {
    if (pat.value.weeklyPattern.bestDayFocusMinutes > 0) {
      out.push(`${pat.value.weeklyPattern.bestDayLabel}是你一周里专注最高的日子，把要紧事安排在它前后。`)
    }
    if (emo.value.trendDirection === 'declining') out.push(`近期情绪${emo.value.trendDescription}`)
    else if (emo.value.trendDirection === 'volatile') out.push(`近来情绪${emo.value.trendDescription}`)
    else if (emo.value.trendDirection === 'improving') out.push(`情绪${emo.value.trendDescription}`)
    if (annual.value && annual.value.stats.totalFocusMinutes > 0) {
      out.push(`今年已沉淀 ${annual.value.stats.totalCrystals} 份时光结晶与 ${annual.value.stats.totalNotes} 篇笔记。`)
    }
    if (out.length === 0) out.push('时光平稳流淌，日日积累，皆有沉淀。')
  } catch {
    out.push('档案在慢慢丰满，继续记录吧。')
  }
  return out.slice(0, 4)
})

function fmtHm(min: number): string {
  if (!min) return '0 分'
  if (min < 60) return `${min} 分`
  return `${Math.floor(min / 60)} 小时${min % 60 ? ' ' + (min % 60) + ' 分' : ''}`
}
</script>

<style scoped>
.tap-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; color: #d9decf; }
.tap-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 12px; }
.tap-title { font-weight: 600; }
.tap-sub { font-size: 12px; color: #8a9a7a; }

.tap-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 10px; text-align: center; }
.tap-empty-icon { font-size: 34px; opacity: 0.4; }
.tap-empty p { font-size: 13px; color: #8a9a7a; max-width: 420px; line-height: 1.6; }

.tap-overview { background: #161a15; border-radius: 10px; padding: 11px; margin-bottom: 8px; }
.tap-ov-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tap-ov-cell { display: flex; flex-direction: column; gap: 3px; }
.tap-ov-cell span { font-size: 11px; color: #8a9a7a; }
.tap-ov-cell b { font-size: 15px; font-variant-numeric: tabular-nums; }

.tap-card { background: #161a15; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
.tap-card-t { display: block; font-size: 12px; color: #e8c060; margin-bottom: 9px; }

.tap-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
.tap-chip { font-size: 11px; padding: 3px 9px; border-radius: 12px; background: rgba(232, 192, 96, 0.12); color: #e8c060; }

.tap-emoct { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tap-emo-badge { font-size: 12px; padding: 3px 10px; border-radius: 10px; font-weight: 600; }
.tap-emo-badge.is-improving { background: rgba(138, 202, 112, 0.18); color: #8aca70; }
.tap-emo-badge.is-declining { background: rgba(196, 106, 90, 0.18); color: #dc9b8a; }
.tap-emo-badge.is-volatile { background: rgba(224, 160, 109, 0.18); color: #e0a96d; }
.tap-emo-badge.is-stable { background: rgba(138, 154, 122, 0.18); color: #8a9a7a; }
.tap-emo-desc { font-size: 12px; color: #b7c0a8; }
.tap-emo-turns { display: flex; align-items: center; gap: 7px; margin-top: 9px; flex-wrap: wrap; }
.tap-emo-turns-t { font-size: 11px; color: #8a9a7a; }
.tap-emo-turns-v { font-size: 12px; color: #d9decf; font-variant-numeric: tabular-nums; }
.tap-turn-chip { font-size: 11px; padding: 2px 8px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #b7c0a8; }

.tap-pat-row { display: flex; gap: 16px; flex-wrap: wrap; }
.tap-pat-item { display: flex; align-items: baseline; gap: 7px; font-size: 12px; color: #b7c0a8; }
.tap-pat-label { color: #8a9a7a; }
.tap-pat-item b { color: #e8c060; font-weight: 600; }
.tap-pat-insight { font-size: 12px; color: #b7c0a8; margin-top: 8px; line-height: 1.5; }
.tap-seasonal { display: flex; flex-direction: column; gap: 5px; margin-top: 9px; }
.tap-season-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.tap-season-label { width: 44px; color: #d9decf; }
.tap-season-emo { flex: 1; color: #b7c0a8; }
.tap-season-trend { color: #e8c060; font-variant-numeric: tabular-nums; }

.tap-annual-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tap-an-cell { display: flex; flex-direction: column; gap: 3px; }
.tap-an-cell span { font-size: 11px; color: #8a9a7a; }
.tap-an-cell b { font-size: 15px; font-variant-numeric: tabular-nums; }
.tap-annual-meta { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; }
.tap-amo-item { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: #8a9a7a; }
.tap-amo-item span { color: #d9decf; }
.tap-level { color: #e8c060 !important; font-weight: 600; }
.tap-summary { font-size: 12px; color: #b7c0a8; line-height: 1.6; margin: 10px 0 0; }
.tap-miles { margin-top: 10px; }
.tap-miles-t { font-size: 12px; color: #8a9a7a; }
.tap-miles-list { margin: 6px 0 0; padding-left: 2px; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.tap-miles-list li { font-size: 12px; color: #b7c0a8; line-height: 1.5; }

.tap-narr { display: flex; gap: 9px; align-items: baseline; padding: 6px 0; }
.tap-narr-tag { font-size: 11px; padding: 2px 8px; border-radius: 8px; background: rgba(232, 192, 96, 0.12); color: #e8c060; flex-shrink: 0; }
.tap-narr-title { font-size: 12px; color: #d9decf; }
.tap-narr-recent { font-size: 11px; color: #8a9a7a; margin-top: 5px; }

.tap-insights { margin: 0; padding-left: 2px; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.tap-insights li { font-size: 12px; color: #b7c0a8; line-height: 1.6; }

@media (max-width: 680px) {
  .tap-ov-grid, .tap-annual-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>