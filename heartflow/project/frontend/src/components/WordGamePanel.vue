<template>
  <section class="wgp">
    <div class="wgp-head">
      <div class="wgp-title-wrap">
        <span class="wgp-title">🎮 字镜游戏</span>
        <span class="wgp-sub">在游戏中把词汇刻进记忆</span>
      </div>
      <span v-if="stats.totalGames" class="wgp-accuracy">总正确率 {{ stats.accuracy }}%</span>
    </div>

    <!-- 游戏统计 -->
    <div v-if="stats.totalGames" class="wgp-stats">
      <div class="wgp-stat">
        <b>{{ stats.totalGames }}</b>
        <span>完成局数</span>
      </div>
      <div class="wgp-stat">
        <b>{{ stats.totalRounds }}</b>
        <span>总回合</span>
      </div>
      <div class="wgp-stat">
        <b>{{ stats.totalCorrect }}</b>
        <span>答对</span>
      </div>
      <div class="wgp-stat">
        <b>{{ stats.accuracy }}%</b>
        <span>正确率</span>
      </div>
    </div>

    <!-- 空态：无词汇 -->
    <div v-if="!words.length" class="wgp-empty">
      <span class="wgp-empty-icon">🎮</span>
      <p>先在词汇自习室添加词汇，才能开始游戏</p>
    </div>

    <template v-else>
      <!-- 游戏选择 -->
      <div v-if="!activeSession" class="wgp-pick">
        <button
          v-for="(meta, type) in GAME_TYPE_META"
          :key="type"
          class="wgp-game"
          :style="{ '--game-accent': gameColor(type) }"
          @click="startGame(type)"
        >
          <span class="wgp-game-icon">{{ meta.icon }}</span>
          <div class="wgp-game-body">
            <b>{{ meta.label }}</b>
            <span>{{ meta.description }}</span>
          </div>
        </button>
      </div>

      <!-- 进行中的游戏 -->
      <div v-else-if="currentRound" class="wgp-play">
        <div class="wgp-play-head">
          <span class="wgp-play-type">{{ GAME_TYPE_META[activeSession.gameType].label }}</span>
          <span class="wgp-play-progress">{{ progress.current }} / {{ progress.total }}</span>
        </div>
        <div class="wgp-progress-bar">
          <i :style="{ width: (progress.current / progress.total) * 100 + '%' }"></i>
        </div>

        <p class="wgp-question">{{ currentRound.question }}</p>
        <p v-if="currentRound.hint" class="wgp-hint">💡 {{ currentRound.hint }}</p>

        <div class="wgp-options">
          <button
            v-for="(opt, i) in currentRound.options"
            :key="i"
            class="wgp-option"
            :class="optionClass(i)"
            :disabled="answered"
            @click="answer(i)"
          >
            <span class="wgp-option-idx">{{ String.fromCharCode(65 + i) }}</span>
            <span>{{ opt }}</span>
            <span v-if="answered && i === currentRound.correctIndex" class="wgp-option-mark ok">✓</span>
            <span v-else-if="answered && picked === i" class="wgp-option-mark bad">✗</span>
          </button>
        </div>

        <div v-if="answered" class="wgp-feedback" :class="lastCorrect ? 'is-ok' : 'is-bad'">
          {{ lastCorrect ? '答对了！' : `正确答案：${currentRound.options[currentRound.correctIndex]}` }}
        </div>

        <button v-if="answered" class="wgp-next" @click="next">
          {{ progress.current >= progress.total ? '查看结果' : '下一题' }}
        </button>
      </div>

      <!-- 结算 -->
      <div v-else-if="activeSession && progress.current >= progress.total" class="wgp-result">
        <div class="wgp-result-score" :style="{ background: resultRing }">
          <b>{{ progress.percentage }}%</b>
          <span>正确率</span>
        </div>
        <p class="wgp-result-text">
          共 {{ progress.total }} 题，答对 {{ progress.correct }} 题
          <span v-if="progress.percentage >= 80">，词根已深植！</span>
          <span v-else-if="progress.percentage >= 60">，渐入佳境。</span>
          <span v-else>，再多练几次。</span>
        </p>
        <div class="wgp-result-actions">
          <button class="wgp-btn" @click="startGame(activeSession.gameType)">再来一局</button>
          <button class="wgp-btn is-ghost" @click="exitGame">换游戏</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWordGames } from '../modules/word-mirror/word-games'
import { GAME_TYPE_META } from '../modules/word-mirror/types'
import type { WordEntry, WordGameType, WordGameSession, WordGameRound } from '../modules/word-mirror/types'
import type { WordItem } from '../modules/word-mirror/word-mirror-store'

const props = defineProps<{ words: WordItem[] }>()

const games = useWordGames()

const activeSession = ref<WordGameSession | null>(null)
const picked = ref<number | null>(null)
const answered = ref(false)
const lastCorrect = ref(false)

const stats = computed(() => games.getGameStats())
const currentRound = computed<WordGameRound | null>(() =>
  activeSession.value ? games.getCurrentRound(activeSession.value.id) : null
)
const progress = computed(() =>
  activeSession.value ? games.getProgress(activeSession.value.id) ?? { current: 0, total: 0, correct: 0, percentage: 0 }
  : { current: 0, total: 0, correct: 0, percentage: 0 }
)

function toEntries(): WordEntry[] {
  return props.words.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as 1 | 2 | 3 | 4 | 5,
    favorite: w.favorite,
    tags: [],
    createdAt: w.createdAt,
    lastReviewedAt: w.lastReviewedAt,
    reviewCount: 0,
  }))
}

function startGame(type: WordGameType) {
  const entries = toEntries()
  if (!entries.length) return
  const session = games.createSession(type, entries)
  activeSession.value = session
  picked.value = null
  answered.value = false
  lastCorrect.value = false
}

function answer(i: number) {
  if (answered.value || !activeSession.value) return
  lastCorrect.value = games.submitAnswer(activeSession.value.id, i)
  picked.value = i
  answered.value = true
}

function next() {
  if (!activeSession.value) return
  picked.value = null
  answered.value = false
  lastCorrect.value = false
  if (progress.value.current >= progress.value.total) {
    // 已结束，停留在结算界面（currentRound 为 null）
  }
}

function exitGame() {
  activeSession.value = null
  picked.value = null
  answered.value = false
}

function optionClass(i: number) {
  if (!answered.value) return ''
  if (i === currentRound.value?.correctIndex) return 'is-correct'
  if (picked.value === i) return 'is-wrong'
  return 'is-dim'
}

const GAME_COLORS: Record<WordGameType, string> = {
  flashcard: '#f0c040',
  match: '#6b9fc4',
  'fill-blank': '#8a9a7a',
  'etymology-quiz': '#d98c7a',
}

function gameColor(type: WordGameType) {
  return GAME_COLORS[type]
}

const resultRing = computed(() => {
  const p = progress.value.percentage
  const hue = p >= 80 ? 150 : p >= 60 ? 130 : p >= 40 ? 38 : 22
  return `conic-gradient(hsl(${hue} 50% 55%) ${p * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${p * 3.6}deg)`
})
</script>

<style scoped>
.wgp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.wgp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.wgp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.wgp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.wgp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.wgp-accuracy { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #8ab87a; white-space: nowrap; }

.wgp-stats { display: flex; gap: 8px; margin-bottom: 14px; }
.wgp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.wgp-stat b { font-size: 17px; font-weight: 600; color: var(--text-high, #d8c3a5); }
.wgp-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.wgp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.wgp-empty-icon { font-size: 30px; opacity: 0.5; }
.wgp-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.wgp-pick { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.wgp-game { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; border: 1px solid var(--border, rgba(255,255,255,0.08)); background: rgba(255,255,255,0.02); color: inherit; text-align: left; cursor: pointer; transition: all 0.25s ease; font-family: inherit; }
.wgp-game:hover { background: rgba(255,255,255,0.05); border-color: var(--game-accent, #8a9a7a); transform: translateY(-2px); }
.wgp-game-icon { font-size: 22px; color: var(--game-accent, #8a9a7a); flex-shrink: 0; }
.wgp-game-body { display: flex; flex-direction: column; gap: 3px; }
.wgp-game-body b { font-size: 13px; color: var(--text-high, #d8c3a5); }
.wgp-game-body span { font-size: 10px; color: rgba(232, 221, 208, 0.5); }

.wgp-play-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wgp-play-type { font-size: 11px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.7); }
.wgp-play-progress { font-size: 11px; color: rgba(232, 221, 208, 0.5); font-variant-numeric: tabular-nums; }
.wgp-progress-bar { height: 5px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; margin-bottom: 16px; }
.wgp-progress-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #8a9a7a, #6b9fc4); transition: width 0.3s ease; }

.wgp-question { font-size: 15px; color: var(--text-high, #d8c3a5); line-height: 1.6; margin: 0 0 6px; }
.wgp-hint { font-size: 11px; color: rgba(232, 221, 208, 0.45); margin: 0 0 14px; }

.wgp-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.wgp-option { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(232, 221, 208, 0.8); font-size: 13px; font-family: inherit; cursor: pointer; text-align: left; transition: all 0.2s; }
.wgp-option:hover:not(:disabled) { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.06); }
.wgp-option:disabled { cursor: default; }
.wgp-option.is-correct { border-color: #8a9a7a; background: rgba(138,154,122,0.14); color: #cfe0c0; }
.wgp-option.is-wrong { border-color: #c46a5a; background: rgba(196,106,90,0.12); color: #e0b0a0; }
.wgp-option.is-dim { opacity: 0.4; }
.wgp-option-idx { width: 22px; height: 22px; border-radius: 50%; background: rgba(var(--accent-rgb), 0.12); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-high); flex-shrink: 0; }
.wgp-option-mark { margin-left: auto; font-weight: 600; }
.wgp-option-mark.ok { color: #8a9a7a; }
.wgp-option-mark.bad { color: #c46a5a; }

.wgp-feedback { font-size: 12px; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; }
.wgp-feedback.is-ok { background: rgba(138,154,122,0.12); color: #cfe0c0; }
.wgp-feedback.is-bad { background: rgba(196,106,90,0.12); color: #e0b0a0; }

.wgp-next { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.wgp-next:hover { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }

.wgp-result { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 0; }
.wgp-result-score { width: 96px; height: 96px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.wgp-result-score::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(18,14,11,0.9); }
.wgp-result-score b { position: relative; font-size: 24px; font-weight: 500; color: #ecd6b5; }
.wgp-result-score span { position: relative; font-size: 10px; color: rgba(232,221,208,0.5); }
.wgp-result-text { font-size: 13px; color: rgba(232, 221, 208, 0.65); margin: 0; }
.wgp-result-actions { display: flex; gap: 10px; }
.wgp-btn { padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.wgp-btn:hover { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.wgp-btn.is-ghost { background: transparent; }

@media (max-width: 640px) {
  .wgp { padding: 14px 14px; }
  .wgp-pick { grid-template-columns: 1fr; }
}
</style>