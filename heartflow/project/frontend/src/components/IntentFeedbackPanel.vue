<template>
  <section class="ifp" aria-label="意图反馈学习">
    <div class="ifp-head">
      <span class="ifp-title">🧠 意图反馈学习</span>
      <span class="ifp-sub">学习 · 反馈 · 权重</span>
    </div>

    <!-- 学习统计 -->
    <div class="ifp-stats">
      <div class="ifp-stat">
        <span class="ifp-stat-value">{{ stats.totalFeedback }}</span>
        <span class="ifp-stat-label">反馈总数</span>
      </div>
      <div class="ifp-stat">
        <span class="ifp-stat-value">{{ correctionRateText }}</span>
        <span class="ifp-stat-label">修正率</span>
      </div>
      <div class="ifp-stat">
        <span class="ifp-stat-value">{{ stats.intentCount }}</span>
        <span class="ifp-stat-label">学习意图</span>
      </div>
      <div class="ifp-stat">
        <span class="ifp-stat-value">{{ lastTrainedText }}</span>
        <span class="ifp-stat-label">最近训练</span>
      </div>
    </div>

    <!-- 关键词权重 -->
    <div v-if="weightEntries.length" class="ifp-block">
      <div class="ifp-block-title">关键词权重</div>
      <div class="ifp-weight-list">
        <div v-for="entry in weightEntries" :key="entry.intent" class="ifp-weight">
          <div class="ifp-weight-head">
            <span class="ifp-weight-icon">{{ intentIcon(entry.intent) }}</span>
            <span class="ifp-weight-name">{{ intentLabel(entry.intent) }}</span>
            <span class="ifp-weight-count">{{ entry.keywords.length }} 词</span>
          </div>
          <div class="ifp-weight-tags">
            <span v-for="kw in entry.keywords" :key="kw.word" class="ifp-kw">
              {{ kw.word }} <b>{{ fmtWeight(kw.weight) }}</b>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近反馈 -->
    <div v-if="recentFeedbacks.length" class="ifp-block">
      <div class="ifp-block-title">最近反馈</div>
      <div class="ifp-fb-list">
        <div v-for="(fb, i) in recentFeedbacks" :key="i" class="ifp-fb">
          <div class="ifp-fb-head">
            <span class="ifp-fb-input">{{ fb.input }}</span>
            <span class="ifp-fb-badge" :class="fb.confirmed ? 'ifp-fb-badge--ok' : 'ifp-fb-badge--fix'">
              {{ fb.confirmed ? '已确认' : '已修正' }}
            </span>
          </div>
          <div class="ifp-fb-meta">
            <span>{{ intentLabel(fb.parsedIntent) }}</span>
            <span v-if="fb.correctedIntent && fb.correctedIntent !== fb.parsedIntent">
              → {{ intentLabel(fb.correctedIntent) }}
            </span>
            <span class="ifp-fb-time">{{ fmtTime(fb.feedbackAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空态 + 重置 -->
    <div v-if="!weightEntries.length && !recentFeedbacks.length" class="ifp-empty">
      <p>暂无学习数据。对话反馈会沉淀为关键词权重与修正记录。</p>
    </div>

    <div class="ifp-foot">
      <button class="ifp-btn ifp-btn--danger" :disabled="!stats.totalFeedback" @click="resetNow">重置学习</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useIntentFeedbackLearning } from '../modules/mirror/dialogue-persistence'
import { INTENT_INFO } from '../modules/mirror/intents'

const { feedbacks, learningModel, learningStats, resetLearning } = useIntentFeedbackLearning()

const stats = computed(() => learningStats.value)
const correctionRateText = computed(() => `${Math.round(stats.value.correctionRate * 100)}%`)
const lastTrainedText = computed(() => {
  const at = stats.value.lastTrainedAt
  if (!at) return '—'
  const d = new Date(at)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const weightEntries = computed(() => {
  const weights = learningModel.value.keywordWeights
  return Object.entries(weights)
    .map(([intent, kws]) => ({
      intent,
      keywords: Object.entries(kws)
        .map(([word, weight]) => ({ word, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6),
    }))
    .filter(e => e.keywords.length > 0)
})

const recentFeedbacks = computed(() => [...feedbacks.value].reverse().slice(0, 8))

function intentLabel(intent: string): string {
  return INTENT_INFO[intent as keyof typeof INTENT_INFO]?.label ?? intent
}

function intentIcon(intent: string): string {
  return INTENT_INFO[intent as keyof typeof INTENT_INFO]?.icon ?? '❓'
}

function fmtWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1)
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function resetNow(): void {
  resetLearning()
}
</script>

<style scoped>
.ifp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 18px 20px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 520px;
}

.ifp-head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
}
.ifp-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.ifp-sub {
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.ifp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ifp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ifp-stat-value {
  font-size: 15px;
  font-weight: 600;
  color: rgba(196, 160, 184, 0.95);
}
.ifp-stat-label {
  font-size: 10px;
  color: var(--text-low);
}

.ifp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ifp-block-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-medium);
  text-align: center;
}

/* 权重 */
.ifp-weight-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ifp-weight {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ifp-weight-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ifp-weight-icon {
  font-size: 14px;
}
.ifp-weight-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.85);
}
.ifp-weight-count {
  font-size: 10px;
  color: var(--text-low);
}
.ifp-weight-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ifp-kw {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  color: rgba(var(--accent-rgb), 0.75);
  background: rgba(var(--accent-rgb), 0.1);
}
.ifp-kw b {
  font-weight: 600;
  opacity: 0.8;
}

/* 反馈 */
.ifp-fb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ifp-fb {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ifp-fb-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ifp-fb-input {
  flex: 1;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ifp-fb-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
}
.ifp-fb-badge--ok {
  color: rgba(138, 154, 122, 0.9);
  background: rgba(138, 154, 122, 0.12);
}
.ifp-fb-badge--fix {
  color: rgba(196, 106, 90, 0.9);
  background: rgba(196, 106, 90, 0.12);
}
.ifp-fb-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--text-low);
}
.ifp-fb-time {
  margin-left: auto;
}

.ifp-empty {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
  text-align: center;
  line-height: 1.6;
}

.ifp-foot {
  display: flex;
  justify-content: flex-end;
}
.ifp-btn {
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid rgba(196, 106, 90, 0.25);
  background: rgba(196, 106, 90, 0.12);
  color: rgba(240, 242, 255, 0.85);
  cursor: pointer;
  transition: background 0.2s ease;
}
.ifp-btn:hover:not(:disabled) {
  background: rgba(196, 106, 90, 0.22);
}
.ifp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
