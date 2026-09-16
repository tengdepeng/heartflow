<template>
  <section class="srp" aria-label="间隔复习">
    <div class="srp-head">
      <div class="srp-title-wrap">
        <span class="srp-title">间隔复习</span>
        <span class="srp-sub">艾宾浩斯 · 到期卡片 · 会话记录</span>
      </div>
      <span class="srp-count">{{ dueCards.length }} 张到期</span>
    </div>

    <!-- 复习统计 -->
    <div class="srp-stats">
      <div class="srp-stat"><b>{{ stats.todayReviewed }}</b><span>今日复习</span></div>
      <div class="srp-stat"><b>{{ stats.dueCount }}</b><span>到期卡片</span></div>
      <div class="srp-stat"><b>{{ Math.round(stats.averageAccuracy * 100) }}%</b><span>平均准确率</span></div>
      <div class="srp-stat"><b>{{ stats.streak }}</b><span>连续天数</span></div>
    </div>

    <!-- 复习会话 -->
    <div v-if="activeSession" class="srp-session">
      <div class="srp-session-head">
        <span class="srp-session-label">复习会话</span>
        <span class="srp-session-progress">{{ activeSession.currentIndex + 1 }} / {{ activeSession.cards.length }}</span>
      </div>

      <div v-if="!sessionDone" class="srp-card">
        <span class="srp-card-word">{{ currentCard?.word }}</span>
        <p class="srp-card-def">{{ currentCard?.definition }}</p>
        <div class="srp-card-meta">
          <span v-if="currentCard" class="srp-card-proficiency" :style="{ color: PROFICIENCY_META[currentCard.proficiency].color }">
            {{ PROFICIENCY_META[currentCard.proficiency].label }}
          </span>
          <span class="srp-card-days">{{ currentCard && currentCard.daysSinceLastReview >= 999 ? '新词' : (currentCard?.daysSinceLastReview ?? 0) + ' 天未复习' }}</span>
        </div>
      </div>

      <div v-else class="srp-session-summary">
        <div class="srp-summary-row">
          <span class="srp-summary-item is-correct"><b>{{ activeSession.correctCount }}</b><span>记得</span></span>
          <span class="srp-summary-item is-wrong"><b>{{ activeSession.incorrectCount }}</b><span>不记得</span></span>
          <span class="srp-summary-item is-skip"><b>{{ activeSession.skippedCount }}</b><span>跳过</span></span>
        </div>
        <p class="srp-summary-text">
          {{ summaryText }}
        </p>
      </div>

      <div v-if="!sessionDone" class="srp-session-actions">
        <button type="button" class="srp-btn srp-btn--wrong" @click="answer(false)">不记得</button>
        <button type="button" class="srp-btn srp-btn--skip" @click="answer(true, true)">跳过</button>
        <button type="button" class="srp-btn srp-btn--correct" @click="answer(true)">记得</button>
      </div>
      <button v-else type="button" class="srp-btn srp-btn--primary" @click="endSession">完成复习</button>
    </div>

    <!-- 到期卡片列表 -->
    <div v-if="!activeSession && dueCards.length" class="srp-block">
      <div class="srp-block-head">
        <span class="srp-block-label">到期卡片</span>
        <button type="button" class="srp-btn srp-btn--sm" @click="startReview">开始复习</button>
      </div>
      <div v-for="c in dueCards.slice(0, 12)" :key="c.wordId" class="srp-card-row">
        <span class="srp-card-row-word">{{ c.word }}</span>
        <span class="srp-card-row-def">{{ c.definition }}</span>
        <span class="srp-card-row-urgency" :class="'urg-' + urgencyLevel(c.urgency)">{{ urgencyLabel(c.urgency) }}</span>
      </div>
    </div>

    <!-- 无到期卡片 -->
    <div v-if="!activeSession && !dueCards.length" class="srp-empty">
      <p v-if="!words.length">添加词汇后，这里会按艾宾浩斯曲线安排复习。</p>
      <p v-else>当前没有到期卡片，保持节奏，继续积累。</p>
    </div>

    <!-- 最近会话 -->
    <div v-if="recentSessions.length" class="srp-block">
      <span class="srp-block-label">最近会话</span>
      <div v-for="s in recentSessions" :key="s.id" class="srp-session-row">
        <span class="srp-session-date">{{ fmt(s.startedAt) }}</span>
        <span class="srp-session-cards">{{ s.cards.length }} 张</span>
        <span class="srp-session-acc">{{ sessionAccuracy(s) }}% 准确</span>
        <span class="srp-session-state" :class="{ 'is-done': s.completedAt }">{{ s.completedAt ? '已完成' : '未完成' }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSpacedRepetition } from '../modules/word-mirror/text-analysis'
import { PROFICIENCY_META } from '../modules/word-mirror/types'
import type { WordEntry } from '../modules/word-mirror/types'
import type { WordItem } from '../modules/word-mirror/word-mirror-store'

const props = defineProps<{ words: WordItem[] }>()

const srs = useSpacedRepetition()
const stats = computed(() => srs.reviewStats.value)
const dueCards = computed(() => srs.getDueCards())
const recentSessions = computed(() =>
  [...srs.reviewSessions.value].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  ).slice(0, 5),
)

const activeSession = ref(srs.reviewSessions.value.find(s => !s.completedAt) ?? null)
const sessionDone = computed(() => {
  const s = activeSession.value
  return !!s && s.currentIndex >= s.cards.length
})
const currentCard = computed(() => {
  const s = activeSession.value
  return s && !sessionDone.value ? s.cards[s.currentIndex] : null
})

const summaryText = computed(() => {
  const s = activeSession.value
  if (!s) return ''
  const total = s.correctCount + s.incorrectCount
  if (total === 0) return '本次会话没有作答记录。'
  const acc = Math.round((s.correctCount / total) * 100)
  if (acc >= 80) return `本次复习准确率 ${acc}%，记忆保持得很好，继续保持！`
  if (acc >= 50) return `本次复习准确率 ${acc}%，有进步空间，多复习几次会记得更牢。`
  return `本次复习准确率 ${acc}%，这些词还需要更多巩固。`
})

function toWordEntries(): WordEntry[] {
  return props.words.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as WordEntry['proficiency'],
    favorite: w.favorite,
    tags: [],
    createdAt: w.createdAt,
    lastReviewedAt: w.lastReviewedAt,
    reviewCount: 0,
  }))
}

function startReview() {
  const entries = toWordEntries()
  if (!entries.length) return
  const session = srs.startSession(entries, 10)
  activeSession.value = session
}

function answer(correct: boolean, skipped = false) {
  const s = activeSession.value
  if (!s || sessionDone.value) return
  srs.recordAnswer(s.id, correct, skipped)
}

function endSession() {
  activeSession.value = null
  srs.computeStats()
}

function urgencyLevel(u: number): string {
  if (u >= 0.8) return 'high'
  if (u >= 0.4) return 'mid'
  return 'low'
}
function urgencyLabel(u: number): string {
  if (u >= 0.8) return '紧急'
  if (u >= 0.4) return '较急'
  return '待复习'
}
function sessionAccuracy(s: { correctCount: number; incorrectCount: number }): number {
  const total = s.correctCount + s.incorrectCount
  return total > 0 ? Math.round((s.correctCount / total) * 100) : 0
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
  srs.loadSessions()
  if (props.words.length) {
    srs.generateReviewCards(toWordEntries())
  }
  srs.computeStats()
})
</script>

<style scoped>
.srp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.srp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.srp-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.srp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
.srp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.srp-count {
  flex-shrink: 0;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
}

.srp-stats {
  display: flex;
  gap: 8px;
}
.srp-stat {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.srp-stat b {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.3;
}
.srp-stat span {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ---- 会话 ---- */
.srp-session {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.srp-session-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.srp-session-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}
.srp-session-progress {
  font-size: 11px;
  color: var(--text-muted);
}
.srp-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  text-align: center;
}
.srp-card-word {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 2px;
}
.srp-card-def {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}
.srp-card-meta {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 11px;
}
.srp-card-proficiency {
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--card-bg);
}
.srp-card-days {
  color: var(--text-muted);
}
.srp-session-actions {
  display: flex;
  gap: 8px;
}
.srp-session-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.srp-summary-row {
  display: flex;
  gap: 8px;
}
.srp-summary-item {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  background: var(--card-bg);
}
.srp-summary-item b {
  display: block;
  font-size: 18px;
  font-weight: 600;
}
.srp-summary-item span {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}
.srp-summary-item.is-correct b { color: #8a9a7a; }
.srp-summary-item.is-wrong b { color: #c46a5a; }
.srp-summary-item.is-skip b { color: #f0c040; }
.srp-summary-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ---- 按钮 ---- */
.srp-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.srp-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.4);
  color: var(--text-primary);
}
.srp-btn--correct {
  border-color: rgba(139, 154, 122, 0.4);
  background: rgba(139, 154, 122, 0.1);
  color: #8a9a7a;
}
.srp-btn--wrong {
  border-color: rgba(196, 106, 90, 0.4);
  background: rgba(196, 106, 90, 0.08);
  color: #c46a5a;
}
.srp-btn--skip {
  border-color: rgba(240, 192, 64, 0.4);
  background: rgba(240, 192, 64, 0.08);
  color: #f0c040;
}
.srp-btn--primary {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}
.srp-btn--sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  flex: 0 0 auto;
  padding: 4px 12px;
  font-size: 11px;

  min-height: 26px;
}

/* ---- 到期卡片 ---- */
.srp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.srp-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.srp-block-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
.srp-card-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
}
.srp-card-row-word {
  flex: 0 0 90px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.srp-card-row-def {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.srp-card-row-urgency {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
}
.srp-card-row-urgency.urg-high {
  background: rgba(196, 106, 90, 0.15);
  color: #c46a5a;
}
.srp-card-row-urgency.urg-mid {
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.srp-card-row-urgency.urg-low {
  background: rgba(139, 154, 122, 0.15);
  color: #8a9a7a;
}

.srp-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
}
.srp-empty p {
  margin: 0;
}

/* ---- 最近会话 ---- */
.srp-session-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  font-size: 11px;
}
.srp-session-date {
  color: var(--text-secondary);
}
.srp-session-cards {
  color: var(--text-muted);
}
.srp-session-acc {
  margin-left: auto;
  color: var(--text-secondary);
}
.srp-session-state {
  padding: 1px 8px;
  border-radius: 8px;
  color: var(--text-muted);
  background: var(--card-bg);
}
.srp-session-state.is-done {
  color: #8a9a7a;
  background: rgba(139, 154, 122, 0.12);
}
</style>
