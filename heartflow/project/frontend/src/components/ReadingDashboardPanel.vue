<template>
  <section class="rdp-panel" aria-label="阅读总览">
    <div class="rdp-head">
      <span class="rdp-title">📊 阅读总览</span>
      <span class="rdp-sub">藏书 · 进度 · 成就 · 洞察</span>
    </div>

    <!-- 藏书概览 -->
    <div class="rdp-block">
      <h3 class="rdp-block-title">藏书概览</h3>
      <div class="rdp-grid">
        <div class="rdp-cell"><b>{{ summary.totalBooks }}</b><span>总藏书</span></div>
        <div class="rdp-cell"><b>{{ summary.readingBooks }}</b><span>在读</span></div>
        <div class="rdp-cell"><b>{{ summary.finishedBooks }}</b><span>已读完</span></div>
        <div class="rdp-cell"><b>{{ summary.totalPages }}</b><span>总页数</span></div>
        <div class="rdp-cell"><b>{{ summary.totalTimeMinutes }}</b><span>总时长(分)</span></div>
        <div class="rdp-cell"><b>{{ summary.todayMinutes }}</b><span>今日(分)</span></div>
      </div>
    </div>

    <!-- 年度目标 -->
    <div class="rdp-block">
      <h3 class="rdp-block-title">年度目标</h3>
      <div v-if="summary.goalProgress" class="rdp-goal">
        <div class="rdp-goal-bar"><i class="rdp-goal-fill" :style="{ width: goalPct + '%' }"></i></div>
        <div class="rdp-goal-meta">
          <span>年度达成 {{ Math.round(summary.goalProgress.yearlyProgress) }}%</span>
          <span>每日 {{ summary.goalProgress.dailyProgress }} 分</span>
          <span>连续 {{ summary.goalProgress.streak }} 天</span>
        </div>
      </div>
      <p v-else class="rdp-empty">暂无目标，先去设定年度阅读目标。</p>
    </div>

    <!-- 阅读洞察 -->
    <div class="rdp-block">
      <h3 class="rdp-block-title">阅读洞察</h3>
      <div class="rdp-grid">
        <div class="rdp-cell"><b>{{ stats.yearlyBooks }}</b><span>今年已读</span></div>
        <div class="rdp-cell"><b>{{ stats.averageRating }}</b><span>平均评分</span></div>
        <div class="rdp-cell"><b>{{ stats.readingSpeed }}</b><span>速度(页/分)</span></div>
        <div class="rdp-cell"><b>{{ stats.totalReadingMinutes }}</b><span>总时长(分)</span></div>
      </div>

      <!-- 状态分布 -->
      <div class="rdp-dist-label">状态分布</div>
      <div class="rdp-dist" aria-label="状态分布">
        <span v-for="d in statusDistribution" :key="d.status" class="rdp-dist-item">
          <i class="rdp-dist-dot" :style="{ background: d.color }"></i>
          {{ d.icon }} {{ d.label }} {{ d.count }}
        </span>
      </div>

      <!-- 月度趋势 -->
      <div class="rdp-dist-label">月度阅读趋势</div>
      <div class="rdp-trend" aria-label="月度阅读趋势">
        <div
          v-for="t in trendBars"
          :key="t.month"
          class="rdp-trend-col"
          :title="`${t.month} · ${t.books} 本 / ${t.pages} 页`"
        >
          <div class="rdp-trend-track"><i class="rdp-trend-fill" :style="{ height: t.pct + '%' }"></i></div>
          <span class="rdp-trend-label">{{ t.short }}</span>
        </div>
      </div>

      <!-- 最爱作者 -->
      <div class="rdp-chip-row">
        <span class="rdp-chip-label">最爱作者</span>
        <template v-if="stats.favoriteAuthors.length">
          <span v-for="a in stats.favoriteAuthors" :key="a.author" class="rdp-chip">{{ a.author }} ×{{ a.count }}</span>
        </template>
        <span v-else class="rdp-empty-hint">暂无</span>
      </div>

      <!-- 最爱标签 -->
      <div class="rdp-chip-row">
        <span class="rdp-chip-label">最爱标签</span>
        <template v-if="topTags.length">
          <span v-for="t in topTags" :key="t.tag" class="rdp-chip rdp-chip--tag">{{ t.tag }} ×{{ t.count }}</span>
        </template>
        <span v-else class="rdp-empty-hint">暂无</span>
      </div>
    </div>

    <!-- 成就与记录 -->
    <div class="rdp-block">
      <h3 class="rdp-block-title">成就与记录</h3>
      <div class="rdp-grid">
        <div class="rdp-cell"><b>{{ challengeSummary.total }}</b><span>总挑战</span></div>
        <div class="rdp-cell"><b>{{ challengeSummary.active }}</b><span>进行中</span></div>
        <div class="rdp-cell"><b>{{ challengeSummary.completed }}</b><span>已达成</span></div>
        <div class="rdp-cell"><b>{{ summary.totalReviews }}</b><span>书评</span></div>
        <div class="rdp-cell"><b>{{ summary.averageRating }}</b><span>书评均分</span></div>
        <div class="rdp-cell"><b>{{ noteSummary.total }}</b><span>阅读笔记</span></div>
      </div>

      <div v-if="challengeSummary.topProgress.length" class="rdp-top">
        <span class="rdp-top-title">挑战进度前五</span>
        <div v-for="c in challengeSummary.topProgress" :key="c.id" class="rdp-top-item">
          <span class="rdp-top-name">{{ cateIcon(c) }} {{ c.name }}</span>
          <span class="rdp-top-pct">{{ topPct(c) }}%</span>
        </div>
      </div>
      <p v-else class="rdp-empty rdp-empty--small">尚未创建阅读挑战。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useReadingBridge } from '../modules/reading/reading-bridge'
import { CHALLENGE_TYPE_META } from '../modules/reading/challenges'
import type { ReadingChallenge } from '../modules/reading/challenges'
import { READING_STATUS_META } from '../modules/reading/types'
import type { ReadingStatus } from '../modules/reading/types'

const bridge = useReadingBridge()

const summary = bridge.summary
const challengeSummary = bridge.challengeSummary
const noteSummary = bridge.noteSummary

const stats = computed(() =>
  bridge.dashboard.computeReadingStats(bridge.books.value, bridge.challenges.getActiveChallenges()),
)

const statusDistribution = computed(() => {
  const dist = stats.value.statusDistribution
  return (Object.keys(READING_STATUS_META) as ReadingStatus[]).map(st => ({
    status: st,
    label: READING_STATUS_META[st].label,
    icon: READING_STATUS_META[st].icon,
    color: READING_STATUS_META[st].color,
    count: dist[st] || 0,
  }))
})

const goalPct = computed(() => {
  const g = summary.value.goalProgress
  if (!g) return 0
  return Math.max(0, Math.min(100, Math.round(g.yearlyProgress)))
})

const trendBars = computed(() => {
  const months = stats.value.monthlyTrend
  const max = months.reduce((m, t) => Math.max(m, t.pages), 1)
  return months.map(t => ({
    month: t.month,
    short: String(Number(t.month.slice(5))),
    pct: max > 0 ? Math.max(4, Math.round((t.pages / max) * 100)) : 4,
    books: t.books,
    pages: t.pages,
  }))
})

const topTags = computed(() => stats.value.favoriteTags.slice(0, 6))

function cateIcon(c: ReadingChallenge): string {
  return CHALLENGE_TYPE_META[c.type]?.icon || '🏆'
}

function topPct(c: ReadingChallenge): number {
  if (!c.target) return 0
  return Math.round((c.progress / c.target) * 100)
}

onMounted(() => {
  bridge.initialize()
})
</script>

<style scoped>
.rdp-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
}

.rdp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rdp-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
  letter-spacing: 1px;
}

.rdp-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.4);
  letter-spacing: 1px;
}

.rdp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rdp-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.rdp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.rdp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 8px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  text-align: center;
}

.rdp-cell b {
  font-size: 20px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.2;
}

.rdp-cell span {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.rdp-goal {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rdp-goal-bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
}

.rdp-goal-fill {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #c49a5a, #8a9a7a);
  transition: width 0.3s;
}

.rdp-goal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.rdp-dist-label {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.rdp-dist {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rdp-dist-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rdp-dist-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rdp-trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 84px;
  padding: 4px 2px 0;
}

.rdp-trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}

.rdp-trend-track {
  flex: 1;
  width: 100%;
  max-width: 22px;
  display: flex;
  align-items: flex-end;
  background: rgba(var(--accent-rgb), 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.rdp-trend-fill {
  display: block;
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(180deg, #c49a5a, #8a9a7a);
  opacity: 0.85;
}

.rdp-trend-label {
  font-size: 10px;
  color: var(--text-low);
}

.rdp-chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.rdp-chip-label {
  font-size: 11px;
  color: var(--text-low);
  margin-right: 2px;
}

.rdp-chip {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 3px 9px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.rdp-chip--tag {
  background: rgba(196, 154, 90, 0.08);
  border-color: rgba(196, 154, 90, 0.18);
}

.rdp-top {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rdp-top-title {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.rdp-top-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.4);
}

.rdp-top-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rdp-top-pct {
  color: var(--accent);
  font-weight: 500;
  flex-shrink: 0;
}

.rdp-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 8px 0;
}

.rdp-empty--small {
  text-align: left;
  padding: 4px 0;
}

.rdp-empty-hint {
  font-size: 11px;
  color: var(--text-low);
}

@media (max-width: 480px) {
  .rdp-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .rdp-cell b {
    font-size: 17px;
  }
}
</style>