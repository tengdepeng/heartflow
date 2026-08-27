<template>
  <section class="rs-panel" aria-label="间隔复习会话">
    <div class="rs-panel-head">
      <span class="rs-panel-title">🔁 间隔复习会话</span>
      <span class="rs-panel-sub">艾宾浩斯 · 会话式复习 · 统计沉淀</span>
    </div>

    <!-- 复习概览 -->
    <div class="rs-block">
      <span class="rs-block-label">复习概览</span>
      <div class="rs-stats">
        <div class="rs-stat">
          <span class="rs-stat-num">{{ stats?.totalReviews ?? 0 }}</span>
          <span class="rs-stat-label">总会话</span>
        </div>
        <div class="rs-stat">
          <span class="rs-stat-num">{{ stats?.todayReviewed ?? 0 }}</span>
          <span class="rs-stat-label">今日复习</span>
        </div>
        <div class="rs-stat">
          <span class="rs-stat-num">{{ stats?.dueCount ?? 0 }}</span>
          <span class="rs-stat-label">待复习</span>
        </div>
        <div class="rs-stat">
          <span class="rs-stat-num">{{ Math.round((stats?.averageAccuracy ?? 0) * 100) }}%</span>
          <span class="rs-stat-label">平均准确率</span>
        </div>
        <div class="rs-stat">
          <span class="rs-stat-num">{{ stats?.streak ?? 0 }}</span>
          <span class="rs-stat-label">连续天数</span>
        </div>
      </div>
    </div>

    <!-- 待复习卡片 -->
    <div class="rs-block">
      <span class="rs-block-label">待复习卡片 · {{ dueCards.length }}</span>
      <div v-if="dueCards.length" class="rs-due-list">
        <div v-for="c in dueCards.slice(0, 10)" :key="c.wordId" class="rs-due-row">
          <span class="rs-due-word">{{ c.word }}</span>
          <span class="rs-due-def">{{ c.definition }}</span>
          <span class="rs-due-urgency" :style="{ opacity: 0.3 + c.urgency * 0.7 }">紧急 {{ Math.round(c.urgency * 100) }}%</span>
        </div>
      </div>
      <p v-else class="rs-hint">暂无到期卡片，添加词汇并复习后这里会生成。</p>
      <button class="rs-btn rs-btn-primary" :disabled="!dueCards.length" @click="startReview">
        开始复习（{{ Math.min(dueCards.length, 10) }} 张）
      </button>
    </div>

    <!-- 复习会话 -->
    <div v-if="activeSession" class="rs-block">
      <span class="rs-block-label">复习会话 · {{ activeSession.currentIndex + 1 }} / {{ activeSession.cards.length }}</span>
      <div class="rs-progress">
        <div class="rs-progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div v-if="currentCard" class="rs-card">
        <span class="rs-card-word">{{ currentCard.word }}</span>
        <p class="rs-card-def">{{ currentCard.definition }}</p>
        <span class="rs-card-meta">熟练度 {{ currentCard.proficiency }}/5 · 距上次 {{ currentCard.daysSinceLastReview }} 天</span>
      </div>
      <div class="rs-row">
        <button class="rs-btn rs-btn-correct" @click="answer(true)">✓ 答对</button>
        <button class="rs-btn rs-btn-wrong" @click="answer(false)">✗ 答错</button>
        <button class="rs-btn" @click="answer(false, true)">跳过</button>
      </div>
      <p class="rs-session-meta">答对 {{ activeSession.correctCount }} · 答错 {{ activeSession.incorrectCount }} · 跳过 {{ activeSession.skippedCount }}</p>
    </div>

    <!-- 会话历史 -->
    <div v-if="sessions.length" class="rs-block">
      <span class="rs-block-label">会话历史 · {{ sessions.length }}</span>
      <div v-for="s in sessions.slice(0, 5)" :key="s.id" class="rs-history-row">
        <span class="rs-history-date">{{ fmt(s.startedAt) }}</span>
        <span class="rs-history-count">{{ s.cards.length }} 卡</span>
        <span class="rs-history-result">{{ s.completedAt ? `对 ${s.correctCount} · 错 ${s.incorrectCount}` : '进行中' }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSpacedRepetition } from '../modules/word-mirror/text-analysis'
import type { ReviewSession } from '../modules/word-mirror/text-analysis'
import type { WordEntry } from '../modules/word-mirror/types'

const props = defineProps<{ words: WordEntry[] }>()

const srs = useSpacedRepetition()
onMounted(() => {
  srs.loadSessions()
  srs.generateReviewCards(props.words)
  srs.computeStats()
})

const activeSession = ref<ReviewSession | null>(null)

const dueCards = computed(() => srs.getDueCards())
const stats = computed(() => srs.reviewStats.value)
const sessions = computed(() => [...srs.reviewSessions.value].sort((a, b) => b.startedAt.localeCompare(a.startedAt)))

const currentCard = computed(() => {
  if (!activeSession.value) return null
  return activeSession.value.cards[activeSession.value.currentIndex] ?? null
})

const progressPct = computed(() => {
  if (!activeSession.value || !activeSession.value.cards.length) return 0
  return Math.round((activeSession.value.currentIndex / activeSession.value.cards.length) * 100)
})

function startReview() {
  activeSession.value = srs.startSession(props.words, Math.min(dueCards.value.length, 10))
}

function answer(correct: boolean, skipped = false) {
  if (!activeSession.value) return
  const updated = srs.recordAnswer(activeSession.value.id, correct, skipped)
  if (updated) {
    activeSession.value = { ...updated }
    if (updated.completedAt) {
      srs.generateReviewCards(props.words)
      srs.computeStats()
    }
  }
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.rs-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.rs-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.rs-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.rs-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.rs-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.rs-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.rs-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.rs-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.rs-stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #c9d6b8;
}
.rs-stat-label {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
}
.rs-due-list {
  margin-bottom: 8px;
}
.rs-due-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.1);
  font-size: 12px;
}
.rs-due-row:last-child {
  border-bottom: none;
}
.rs-due-word {
  flex-shrink: 0;
  color: #e8e4d8;
  font-weight: 600;
}
.rs-due-def {
  flex: 1;
  color: rgba(232, 228, 216, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rs-due-urgency {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(240, 192, 64, 0.9);
}
.rs-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
  margin: 0 0 8px;
}
.rs-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 6px;
  color: rgba(232, 228, 216, 0.85);
  font-size: 12px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.rs-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.rs-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rs-btn-primary {
  background: rgba(138, 154, 122, 0.3);
  border-color: rgba(138, 154, 122, 0.6);
  color: #e8e4d8;
}
.rs-btn-correct {
  border-color: rgba(138, 154, 122, 0.6);
  color: #c9d6b8;
}
.rs-btn-wrong {
  border-color: rgba(196, 106, 90, 0.6);
  color: #d98c7a;
}
.rs-progress {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  margin-bottom: 10px;
}
.rs-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), rgba(138, 154, 122, 0.9));
  transition: width 0.3s ease;
}
.rs-card {
  text-align: center;
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  margin-bottom: 10px;
}
.rs-card-word {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #e8e4d8;
}
.rs-card-def {
  font-size: 14px;
  color: rgba(232, 228, 216, 0.75);
  margin: 6px 0;
}
.rs-card-meta {
  font-size: 11px;
  color: rgba(232, 228, 216, 0.45);
}
.rs-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.rs-session-meta {
  text-align: center;
  font-size: 11px;
  color: rgba(232, 228, 216, 0.5);
  margin: 8px 0 0;
}
.rs-history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.1);
  font-size: 12px;
}
.rs-history-row:last-child {
  border-bottom: none;
}
.rs-history-date {
  flex-shrink: 0;
  color: rgba(232, 228, 216, 0.6);
}
.rs-history-count {
  flex: 1;
  color: rgba(232, 228, 216, 0.5);
}
.rs-history-result {
  color: rgba(232, 228, 216, 0.7);
}
</style>
