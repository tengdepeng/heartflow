<template>
  <section class="cstp-panel" aria-label="澄明统计">
    <!-- 空态（无冥想也无释怀） -->
    <template v-if="!hasData">
      <div class="cstp-head">
        <span class="cstp-title">✨ 澄明统计</span>
        <span class="cstp-badge cstp-badge-neutral">数据未显影</span>
      </div>
      <p class="cstp-empty">
        还没有可供统计的澄明记录。随着冥想与释怀的沉淀，澄明趋势、光照强度与最佳冥想时段便会在此显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="cstp-head">
        <span class="cstp-title">✨ 澄明统计</span>
        <span class="cstp-badge" :class="clarityBadge.cls">{{ clarityBadge.text }}</span>
      </div>

      <!-- 澄明状态 -->
      <div class="cstp-block" v-if="stats">
        <h3 class="cstp-block-title">澄明状态</h3>
        <div class="cstp-clarity-row">
          <span class="cstp-clarity-icon">{{ clarityIcon(stats.currentClarity) }}</span>
          <span class="cstp-clarity-label">{{ clarityLabel(stats.currentClarity) }}</span>
          <span class="cstp-clarity-note">{{ clarityNote(stats.currentClarity) }}</span>
        </div>
      </div>

      <!-- 冥想统计 -->
      <div class="cstp-block" v-if="stats">
        <h3 class="cstp-block-title">冥想统计</h3>
        <div class="cstp-stats">
          <div class="cstp-stat">
            <span class="cstp-stat-num">{{ stats.totalMeditations }}</span>
            <span class="cstp-stat-label">总次数</span>
          </div>
          <div class="cstp-stat">
            <span class="cstp-stat-num">{{ stats.totalMeditationMinutes }}<small>min</small></span>
            <span class="cstp-stat-label">总时长</span>
          </div>
          <div class="cstp-stat">
            <span class="cstp-stat-num">{{ stats.monthlyMeditations }}</span>
            <span class="cstp-stat-label">本月</span>
          </div>
          <div class="cstp-stat">
            <span class="cstp-stat-num">{{ stats.streak }}<small>天</small></span>
            <span class="cstp-stat-label">连续</span>
          </div>
        </div>
        <p v-if="stats.bestStreak > stats.streak" class="cstp-hint">最长连续 {{ stats.bestStreak }} 天</p>
      </div>

      <!-- 释怀统计 -->
      <div class="cstp-block" v-if="stats">
        <h3 class="cstp-block-title">释怀统计</h3>
        <div class="cstp-release">
          <div class="cstp-release-rate">
            <span class="cstp-release-num">{{ stats.releaseCompletionRate }}<small>%</small></span>
            <span class="cstp-release-label">释怀完成率</span>
          </div>
          <div class="cstp-release-bar">
            <div class="cstp-release-fill" :style="{ width: pct(stats.releaseCompletionRate) }"></div>
          </div>
        </div>
      </div>

      <!-- 冥想类型分布 -->
      <div class="cstp-block" v-if="stats && stats.meditationTypeDistribution.length">
        <h3 class="cstp-block-title">冥想类型分布</h3>
        <div class="cstp-types">
          <div
            v-for="d in sortedTypes"
            :key="d.type"
            class="cstp-type"
          >
            <span class="cstp-type-icon">{{ typeIcon(d.type) }}</span>
            <span class="cstp-type-label">{{ typeLabel(d.type) }}</span>
            <div class="cstp-type-bar">
              <div class="cstp-type-fill" :style="{ width: pct(typePct(d)) }"></div>
            </div>
            <span class="cstp-type-num">{{ d.count }}次</span>
          </div>
        </div>
      </div>

      <!-- 澄明趋势（最近 30 天） -->
      <div class="cstp-block" v-if="stats">
        <h3 class="cstp-block-title">澄明趋势 · 近 30 天</h3>
        <div class="cstp-trend">
          <div
            v-for="t in stats.clarityTrend"
            :key="t.date"
            class="cstp-trend-col"
            :title="`${t.date} · ${clarityLabel(t.level)} (${t.score})`"
          >
            <div
              class="cstp-trend-fill"
              :style="{ height: pct(Math.max(4, t.score)), background: levelColor(t.level) }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 光照强度趋势（最近 30 天） -->
      <div class="cstp-block" v-if="stats">
        <h3 class="cstp-block-title">光照强度 · 近 30 天</h3>
        <div class="cstp-trend">
          <div
            v-for="t in stats.lightIntensityTrend"
            :key="t.date"
            class="cstp-trend-col"
            :title="`${t.date} · ${t.intensity}`"
          >
            <div
              class="cstp-trend-fill cstp-trend-fill--light"
              :style="{ height: pct(Math.max(4, t.intensity)) }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 最佳时段与推荐 -->
      <div class="cstp-block" v-if="stats">
        <h3 class="cstp-block-title">节奏与建议</h3>
        <div class="cstp-recommend">
          <div class="cstp-rec-item">
            <span class="cstp-rec-label">最佳冥想时段</span>
            <span class="cstp-rec-value">{{ stats.bestTimeOfDay }}</span>
          </div>
          <div class="cstp-rec-item">
            <span class="cstp-rec-label">推荐冥想类型</span>
            <span class="cstp-rec-value">{{ typeIcon(stats.recommendedType) }} {{ typeLabel(stats.recommendedType) }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="cstp-insights">
        <li v-for="ins in insights" :key="ins.title" class="cstp-insight">
          <span class="cstp-insight-mark">✦</span>
          <span class="cstp-insight-text">
            <b>{{ ins.title }}</b>
            <span>{{ ins.description }}</span>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLightPavilion } from '../modules/light/pavilion'
import { useClarityDashboard } from '../modules/light/guided-meditation'
import { MEDITATION_TYPE_META, CLARITY_LEVEL_META } from '../modules/light/types'
import type { MeditationType, ClarityLevel } from '../modules/light/types'

const pavilion = useLightPavilion()
const cd = useClarityDashboard()

const activeMeditations = computed(() => pavilion.meditations.value.filter(m => !m.archived))
const activeReleases = computed(() => pavilion.releases.value.filter(r => !r.archived))

const stats = computed(() =>
  cd.computeClarityStats(activeMeditations.value, activeReleases.value, pavilion.lightState.value),
)

const hasData = computed(() => activeMeditations.value.length > 0 || activeReleases.value.length > 0)

const clarityBadge = computed(() => {
  const map: Record<ClarityLevel, { text: string; cls: string }> = {
    crystal: { text: '澄澈', cls: 'cstp-badge-positive' },
    clear: { text: '晴朗', cls: 'cstp-badge-positive' },
    neutral: { text: '平和', cls: 'cstp-badge-warn' },
    unclear: { text: '微朦', cls: 'cstp-badge-warn' },
    clouded: { text: '阴翳', cls: 'cstp-badge-neutral' },
  }
  return map[stats.value.currentClarity] || map.clouded
})

const sortedTypes = computed(() => {
  const dist = stats.value.meditationTypeDistribution
  return [...dist].sort((a, b) => b.minutes - a.minutes)
})

const maxTypeMinutes = computed(() => {
  const dist = sortedTypes.value
  if (!dist.length) return 1
  return Math.max(...dist.map(d => d.minutes), 1)
})

function typePct(d: { minutes: number }): number {
  return Math.round((d.minutes / maxTypeMinutes.value) * 100)
}

const insights = computed(() => {
  const out: { title: string; description: string }[] = []
  if (!stats.value) return out
  const s = stats.value

  const clarityNoteVal = clarityNote(s.currentClarity)
  out.push({
    title: '澄明状态',
    description: `当前${clarityLabel(s.currentClarity)}，${clarityNoteVal}。`,
  })

  if (s.totalMeditations > 0) {
    out.push({
      title: '冥想概览',
      description: `累计${s.totalMeditations} 次、${s.totalMeditationMinutes} 分钟，本月 ${s.monthlyMeditations} 次，连续 ${s.streak} 天。`,
    })
  }

  if (activeReleases.value.length > 0) {
    out.push({
      title: '释怀成效',
      description: `${activeReleases.value.length} 条释怀，完成率 ${s.releaseCompletionRate}%。`,
    })
  }

  if (s.bestTimeOfDay) {
    out.push({
      title: '最佳节奏',
      description: `你通常在${s.bestTimeOfDay}最投入当下，可优先安排冥想。推荐尝试${typeLabel(s.recommendedType)}。`,
    })
  }

  return out.slice(0, 3)
})

function pct(v: number): string {
  return `${Math.max(0, Math.min(100, Math.round(v)))}%`
}

function clarityLabel(l: ClarityLevel): string {
  return CLARITY_LEVEL_META[l]?.label || l
}
function clarityIcon(l: ClarityLevel): string {
  return CLARITY_LEVEL_META[l]?.icon || '✨'
}
function clarityNote(l: ClarityLevel): string {
  const map: Record<ClarityLevel, string> = {
    crystal: '状态难得，继续静心守护',
    clear: '思绪通明，保持这份觉察',
    neutral: '平稳如水，可再添一份专注',
    unclear: '略见微朦，建议小憩或冥想',
    clouded: '此刻蒙尘，不妨先做一次呼吸冥想',
  }
  return map[l] || ''
}
function levelColor(l: ClarityLevel): string {
  return CLARITY_LEVEL_META[l]?.color || '#8a9a7a'
}
function typeLabel(t: MeditationType): string {
  return MEDITATION_TYPE_META[t]?.label || t
}
function typeIcon(t: MeditationType): string {
  return MEDITATION_TYPE_META[t]?.icon || '🧘'
}
</script>

<style scoped>
.cstp-panel {
  background: var(--bg-card, rgba(22, 19, 16, 0.72));
  border: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  border-radius: var(--radius-lg, 16px);
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow, 0 4px 24px rgba(0, 0, 0, 0.4));
}

.cstp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.cstp-title {
  font-family: var(--font-serif, Georgia, 'Songti SC', serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.cstp-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.cstp-badge-positive {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.35);
  background: rgba(240, 192, 64, 0.12);
}

.cstp-badge-warn {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.35);
  background: rgba(138, 154, 122, 0.12);
}

.cstp-badge-neutral {
  color: #9a8f80;
  border-color: rgba(154, 143, 128, 0.3);
  background: rgba(154, 143, 128, 0.1);
}

.cstp-empty {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 13px;
  line-height: 1.7;
}

.cstp-block {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
}

.cstp-block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  margin-bottom: 10px;
}

.cstp-hint {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  line-height: 1.6;
  margin-top: 8px;
}

/* ---- 澄明状态 ---- */
.cstp-clarity-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cstp-clarity-icon {
  font-size: 26px;
}

.cstp-clarity-label {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.cstp-clarity-note {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* ---- 统计格 ---- */
.cstp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cstp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: rgba(154, 143, 128, 0.08);
}

.cstp-stat-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #e8e0d8);
}

.cstp-stat-num small {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.65;
  margin-left: 2px;
}

.cstp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

/* ---- 释怀统计 ---- */
.cstp-release {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cstp-release-rate {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.cstp-release-num {
  font-size: 26px;
  font-weight: 700;
  color: #f0c040;
}

.cstp-release-num small {
  font-size: 13px;
  font-weight: 400;
}

.cstp-release-label {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.cstp-release-bar {
  height: 7px;
  border-radius: 4px;
  background: rgba(154, 143, 128, 0.15);
  overflow: hidden;
}

.cstp-release-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}

/* ---- 冥想类型分布 ---- */
.cstp-types {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.cstp-type {
  display: grid;
  grid-template-columns: 22px 1fr 68px 42px;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.cstp-type-icon {
  font-size: 14px;
}

.cstp-type-label {
  color: var(--text-primary, #e8e0d8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cstp-type-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(154, 143, 128, 0.15);
  overflow: hidden;
}

.cstp-type-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
}

.cstp-type-num {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  text-align: right;
}

/* ---- 趋势图 ---- */
.cstp-trend {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 64px;
}

.cstp-trend-col {
  flex: 1;
  min-width: 2px;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.cstp-trend-fill {
  width: 100%;
  border-radius: 2px 2px 0 0;
  min-height: 4px;
}

.cstp-trend-fill--light {
  background: linear-gradient(180deg, #f0c040, #8a9a7a);
  opacity: 0.8;
}

/* ---- 节奏与建议 ---- */
.cstp-recommend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cstp-rec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.cstp-rec-label {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.cstp-rec-value {
  color: var(--text-primary, #e8e0d8);
}

/* ---- 温和洞察 ---- */
.cstp-insights {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 16px 0 0;
  border-top: 1px solid var(--border-light, rgba(212, 165, 116, 0.08));
  padding-top: 14px;
}

.cstp-insight {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
}

.cstp-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}

.cstp-insight-text {
  display: flex;
  flex-direction: column;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.cstp-insight-text b {
  color: var(--text-primary, #e8e0d8);
  font-weight: 600;
}

@media (max-width: 480px) {
  .cstp-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>