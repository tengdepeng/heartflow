<template>
  <section data-enter class="daily-rec-panel wm">
    <div class="drp-head">
      <span class="drp-title">🌞 每日词汇推荐</span>
      <span v-if="stats" class="drp-stats">
        <span>累计 {{ stats.totalRecommendations }}</span>
        <span>完成率 {{ stats.completionRate }}%</span>
        <span v-if="stats.currentStreak">连续 {{ stats.currentStreak }} 天</span>
      </span>
    </div>

    <!-- 未生成今日推荐 -->
    <div v-if="!today" class="drp-empty">
      <p>今天还没有词汇推荐,生成后会按今日日期固定下来。</p>
      <button class="wm-btn" :disabled="generating" @click="generate">
        {{ generating ? '生成中…' : '生成今日推荐' }}
      </button>
    </div>

    <!-- 今日推荐已生成 -->
    <div v-else class="drp-card">
      <div class="drp-card-head">
        <span class="drp-badge">{{ typeLabel(today.type) }}</span>
        <span class="drp-reason">{{ today.reason }}</span>
      </div>

      <div v-if="today.type === 'daily_word'" class="drp-word">
        <div class="drp-word-main">
          <span class="drp-word-char">{{ today.dailyWord?.word }}</span>
          <span class="drp-word-def">{{ today.dailyWord?.definition }}</span>
        </div>
        <p v-if="today.dailyWord?.etymology" class="drp-meta">词源:{{ today.dailyWord.etymology }}</p>
        <p v-if="today.dailyWord?.example" class="drp-meta">例句:{{ today.dailyWord.example }}</p>
      </div>

      <div v-else-if="today.type === 'review'" class="drp-list">
        <span class="drp-list-label">今日待复习</span>
        <span v-for="w in today.reviewWords" :key="w" class="drp-chip">{{ w }}</span>
      </div>

      <div v-else-if="today.type === 'theme' && today.themePack" class="drp-list">
        <span class="drp-list-label">主题·{{ today.themePack.theme }}</span>
        <span v-for="w in today.themePack.coreWords" :key="w" class="drp-chip">{{ w }}</span>
      </div>

      <div v-else-if="today.type === 'personalized' && today.personalizedWords" class="drp-list">
        <span class="drp-list-label">个性化推荐</span>
        <span v-for="w in today.personalizedWords" :key="w.word" class="drp-chip">{{ w.word }}</span>
      </div>

      <p class="drp-tip">💡 {{ today.studyTip }}</p>

      <button v-if="!completed" class="wm-btn" @click="complete">标记完成 ✓</button>
      <span v-else class="drp-done">今日已完成 ✓</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDailyRecommendation, useWordMirror } from '../modules/word-mirror'
import type { WordRecommendationPack } from '../modules/word-mirror/daily-recommendation'
import type { WordEntry } from '../modules/word-mirror/types'
import type { WordItem } from '../modules/word-mirror/word-mirror-store'

function toWordEntry(w: WordItem): WordEntry {
  return {
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: w.proficiency as WordEntry['proficiency'],
    favorite: w.favorite,
    tags: [],
    reviewCount: 0,
    createdAt: w.createdAt,
    lastReviewedAt: w.lastReviewedAt,
  }
}

const vmr = useWordMirror()
const rec = useDailyRecommendation()
const generating = ref(false)

onMounted(() => vmr.load())

const wordEntries = computed<WordEntry[]>(() =>
  vmr.words.value.length ? vmr.words.value.map(toWordEntry) : [],
)

const today = computed<WordRecommendationPack | null>(() => rec.todayRecommendation.value ?? null)

const stats = computed(() =>
  rec.history.value.length ? rec.getRecommendationStats() : null,
)

const completed = computed(() => {
  const t = today.value
  if (!t) return false
  return rec.history.value.some((h) => h.date === t.date && h.type === t.type && h.completed)
})

function typeLabel(type: WordRecommendationPack['type']): string {
  const map: Record<WordRecommendationPack['type'], string> = {
    daily_word: '每日一词',
    review: '复习巩固',
    theme: '主题词汇',
    personalized: '个性推荐',
  }
  return map[type]
}

function generate(): void {
  if (generating.value) return
  generating.value = true
  try {
    rec.generateTodayRecommendation(wordEntries.value)
  } finally {
    generating.value = false
  }
}

function complete(): void {
  const t = today.value
  if (!t) return
  rec.completeRecommendation(t.date, t.type)
}
</script>

<style scoped>
.daily-rec-panel {
  margin: 16px 0;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, #8a9a7a 30%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, #8a9a7a 6%, #1b1f1a);
}
.drp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.drp-title { font-weight: 600; color: #8a9a7a; }
.drp-stats { display: flex; gap: 12px; font-size: 12px; color: #a8b0a4; }
.drp-empty { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.drp-empty p { margin: 0; color: #a8b0a4; font-size: 13px; }
.drp-card { display: flex; flex-direction: column; gap: 10px; }
.drp-card-head { display: flex; align-items: center; gap: 10px; }
.drp-badge {
  padding: 2px 8px; border-radius: 999px; font-size: 12px;
  background: color-mix(in srgb, #8a9a7a 20%, transparent); color: #dfe7da;
}
.drp-reason { font-size: 13px; color: #cdd5c6; }
.drp-word { display: flex; flex-direction: column; gap: 6px; }
.drp-word-main { display: flex; align-items: baseline; gap: 12px; }
.drp-word-char {
  font-size: 34px; font-weight: 700; color: #f0c040; line-height: 1;
}
.drp-word-def { color: #dfe7da; }
.drp-meta { margin: 0; font-size: 13px; color: #a8b0a4; }
.drp-list { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.drp-list-label { color: #a8b0a4; font-size: 13px; }
.drp-chip {
  padding: 2px 8px; border-radius: 6px; font-size: 13px;
  background: color-mix(in srgb, #6b9fc4 18%, transparent); color: #dfe7da;
}
.drp-tip { margin: 0; font-size: 13px; color: #e0a96d; }
.drp-done { color: #8a9a7a; font-size: 13px; }
</style>