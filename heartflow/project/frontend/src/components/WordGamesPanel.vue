<template>
  <section class="wgp" aria-label="词汇游戏">
    <div class="wgp-head">
      <span class="wgp-title">🎮 词汇游戏</span>
      <span class="wgp-sub">闪卡 · 配对 · 填空 · 词源</span>
    </div>

    <!-- 统计 -->
    <div v-if="stats.totalGames" class="wgp-stats">
      <div class="wgp-stat">
        <span class="wgp-stat-value">{{ stats.totalGames }}</span>
        <span class="wgp-stat-label">完成局数</span>
      </div>
      <div class="wgp-stat">
        <span class="wgp-stat-value">{{ stats.totalRounds }}</span>
        <span class="wgp-stat-label">总题数</span>
      </div>
      <div class="wgp-stat">
        <span class="wgp-stat-value">{{ stats.accuracy }}%</span>
        <span class="wgp-stat-label">正确率</span>
      </div>
    </div>

    <!-- 进行中的游戏 -->
    <div v-if="activeSession && activeSession.completedAt" class="wgp-done">
      <div class="wgp-done-head">
        <div class="wgp-result-ring" :style="resultRing">
          <span class="wgp-result-pct">{{ resultPct }}<i>%</i></span>
        </div>
        <div class="wgp-done-meta">
          <span class="wgp-done-title">🏆 本局完成</span>
          <span class="wgp-done-score">{{ activeSession.correctCount }}/{{ activeSession.totalCount }}</span>
        </div>
      </div>
      <div class="wgp-add-row">
        <button class="wgp-btn wgp-btn--primary" @click="startGame">再来一局</button>
        <button class="wgp-btn" @click="exitGame">关闭</button>
      </div>
    </div>

    <div v-else-if="activeSession && shownRound" class="wgp-play">
      <div class="wgp-play-head">
        <span class="wgp-play-type">{{ GAME_TYPE_META[activeSession.gameType].icon }} {{ GAME_TYPE_META[activeSession.gameType].label }}</span>
        <span class="wgp-play-progress">{{ progress?.current }}/{{ progress?.total }}</span>
      </div>
      <p class="wgp-play-question">{{ shownRound.question }}</p>
      <div class="wgp-play-options">
        <button
          v-for="(opt, idx) in shownRound.options"
          :key="idx"
          class="wgp-option"
          :class="{
            'wgp-option--correct': answered && idx === shownRound.correctIndex,
            'wgp-option--wrong': answered && selectedIndex === idx && idx !== shownRound.correctIndex,
          }"
          :disabled="answered"
          @click="answer(idx)"
        >{{ opt }}</button>
      </div>
      <p v-if="shownRound.hint" class="wgp-play-hint">{{ shownRound.hint }}</p>
      <div v-if="answered" class="wgp-play-feedback" :class="lastCorrect ? 'ok' : 'bad'">
        {{ lastCorrect ? '✓ 回答正确' : '✗ 答错了' }}
        <button class="wgp-btn wgp-btn--small" @click="next">下一题 →</button>
      </div>
    </div>

    <!-- 游戏类型选择 -->
    <div v-else class="wgp-start">
      <div class="wgp-add-label">选择游戏</div>
      <div class="wgp-add-row">
        <button
          v-for="t in GAME_ORDER"
          :key="t"
          class="wgp-chip"
          :class="{ on: formType === t }"
          @click="formType = t"
        >{{ GAME_TYPE_META[t].icon }} {{ GAME_TYPE_META[t].label }}</button>
      </div>
      <div class="wgp-add-row">
        <button class="wgp-btn wgp-btn--primary" :disabled="!canStart" @click="startGame">开始游戏</button>
      </div>
      <p v-if="!words.length" class="wgp-empty">还没有可用的词汇。先在字镜墙中收集词语，再来挑战。</p>
    </div>

    <!-- 会话列表 -->
    <div v-if="sessions.length" class="wgp-list">
      <div v-for="s in sessions" :key="s.id" class="wgp-item">
        <div class="wgp-item-head">
          <span class="wgp-item-type">{{ GAME_TYPE_META[s.gameType].icon }} {{ GAME_TYPE_META[s.gameType].label }}</span>
          <span class="wgp-item-score">{{ s.correctCount }}/{{ s.totalCount }}</span>
          <span class="wgp-item-state" :class="{ done: s.completedAt }">{{ s.completedAt ? '已完成' : '进行中' }}</span>
          <button class="wgp-btn wgp-btn--small" @click="remove(s.id)">删除</button>
        </div>
      </div>
    </div>
    <p v-else-if="!activeSession" class="wgp-empty">暂无游戏记录。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWordGames } from '../modules/word-mirror/word-games'
import { GAME_TYPE_META } from '../modules/word-mirror/types'
import type { WordEntry, WordGameType, WordGameRound } from '../modules/word-mirror/types'

const props = defineProps<{
  words?: WordEntry[]
}>()

const {
  sessions,
  createSession,
  submitAnswer,
  getCurrentRound,
  getProgress,
  getGameStats,
  removeSession,
} = useWordGames()

const GAME_ORDER: WordGameType[] = ['flashcard', 'match', 'fill-blank', 'etymology-quiz']

const formType = ref<WordGameType>('flashcard')
const activeSessionId = ref('')
const answered = ref(false)
const selectedIndex = ref(-1)
const lastCorrect = ref(false)
const displayRound = ref<WordGameRound | null>(null)

const words = computed<WordEntry[]>(() => props.words ?? [])
const canStart = computed(() => words.value.length > 0)
const stats = computed(() => getGameStats())
const activeSession = computed(() => sessions.value.find((s) => s.id === activeSessionId.value) ?? null)
const currentRound = computed<WordGameRound | null>(() =>
  activeSessionId.value ? getCurrentRound(activeSessionId.value) : null,
)
const shownRound = computed<WordGameRound | null>(() => (answered.value ? displayRound.value : currentRound.value))
const progress = computed(() => (activeSessionId.value ? getProgress(activeSessionId.value) : null))

function startGame() {
  if (!canStart.value) return
  const session = createSession(formType.value, words.value)
  activeSessionId.value = session.id
  answered.value = false
  selectedIndex.value = -1
  displayRound.value = getCurrentRound(session.id)
}

function answer(idx: number) {
  if (!activeSessionId.value || answered.value) return
  displayRound.value = currentRound.value
  lastCorrect.value = submitAnswer(activeSessionId.value, idx)
  selectedIndex.value = idx
  answered.value = true
}

function next() {
  answered.value = false
  selectedIndex.value = -1
  if (activeSession.value?.completedAt) {
    activeSessionId.value = ''
  }
}

function exitGame() {
  activeSessionId.value = ''
  answered.value = false
}

function remove(id: string) {
  if (activeSessionId.value === id) {
    activeSessionId.value = ''
  }
  removeSession(id)
}

// 结算进度弧线环（并入自 WordGamePanel）：正确率 0~100 映射为弧线
const resultPct = computed(() => {
  const s = activeSession.value
  return s && s.totalCount ? Math.round((s.correctCount / s.totalCount) * 100) : 0
})
const resultRing = computed(() => {
  const p = resultPct.value
  const hue = p >= 80 ? 150 : p >= 60 ? 130 : p >= 40 ? 38 : 22
  return `conic-gradient(hsl(${hue} 50% 55%) ${p * 3.6}deg, rgba(255,255,255,0.06) ${p * 3.6}deg)`
})
</script>

<style scoped>
.wgp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.wgp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.wgp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wgp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wgp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.wgp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.wgp-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f0c040;
}
.wgp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.wgp-start,
.wgp-play,
.wgp-done {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
}
.wgp-add-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wgp-add-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.wgp-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}
.wgp-chip.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.wgp-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.wgp-btn:hover:not(:disabled) {
  border-color: #f0c040;
  color: #f0c040;
}
.wgp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.wgp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
}
.wgp-btn--small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  font-size: 11px;

  min-height: 26px;
}
.wgp-play-head,
.wgp-done-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wgp-play-type,
.wgp-done-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wgp-play-progress,
.wgp-done-score {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wgp-play-question {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wgp-play-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wgp-option {
  padding: 8px 12px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e6e1);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}
.wgp-option:hover:not(:disabled) {
  border-color: #f0c040;
}
.wgp-option--correct {
  border-color: #8a9a7a;
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.1);
}
.wgp-option--wrong {
  border-color: #c46a5a;
  color: #c46a5a;
  background: rgba(196, 106, 90, 0.1);
}
.wgp-play-hint {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
.wgp-play-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}
.wgp-play-feedback.ok {
  color: #8a9a7a;
}
.wgp-play-feedback.bad {
  color: #c46a5a;
}
.wgp-done-icon {
  font-size: 16px;
}
.wgp-done-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wgp-result-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}
.wgp-result-ring::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: rgba(22, 26, 21, 0.92);
}
.wgp-result-pct {
  position: relative;
  font-size: 15px;
  font-weight: 700;
  color: #f0c040;
  font-variant-numeric: tabular-nums;
}
.wgp-result-pct i {
  font-style: normal;
  font-size: 9px;
  opacity: 0.6;
  margin-left: 1px;
}
.wgp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wgp-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.wgp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wgp-item-type {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wgp-item-score {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wgp-item-state {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  background: rgba(255, 255, 255, 0.04);
}
.wgp-item-state.done {
  color: #8a9a7a;
  border: 1px solid rgba(138, 154, 122, 0.35);
}
.wgp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.53));
}
</style>
