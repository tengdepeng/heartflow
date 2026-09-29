<template>
  <section class="dwp">
    <div class="dwp-head">
      <div class="dwp-title-wrap">
        <span class="dwp-title">📖 每日荐字</span>
        <span class="dwp-sub">每天一个字，把词汇边界向外推一寸</span>
      </div>
      <button class="dwp-refresh" :disabled="!words.length" @click="generate">换一批</button>
    </div>

    <!-- 统计 -->
    <div v-if="stats" class="dwp-stats">
      <div class="dwp-stat">
        <b>{{ stats.totalRecommendations }}</b>
        <span>累计推荐</span>
      </div>
      <div class="dwp-stat">
        <b>{{ stats.currentStreak }}</b>
        <span>连续天数</span>
      </div>
      <div class="dwp-stat">
        <b>{{ stats.completionRate }}%</b>
        <span>完成率</span>
      </div>
      <div class="dwp-stat">
        <b>{{ stats.longestStreak }}</b>
        <span>最长连续</span>
      </div>
    </div>

    <!-- 今日推荐 -->
    <div v-if="pack" class="dwp-pack">
      <div class="dwp-pack-type" :style="{ color: typeColor(pack.type) }">
        {{ typeLabel(pack.type) }}
      </div>

      <!-- 每日一词 -->
      <div v-if="pack.dailyWord" class="dwp-daily">
        <div class="dwp-word-line">
          <span class="dwp-word">{{ pack.dailyWord.word }}</span>
          <span class="dwp-def">{{ pack.dailyWord.definition }}</span>
        </div>
        <p class="dwp-example">「{{ pack.dailyWord.example }}」</p>
        <div class="dwp-etym">
          <span class="dwp-etym-label">词源</span>
          <span>{{ pack.dailyWord.etymology }}</span>
        </div>
        <div v-if="pack.dailyWord.relatedWords.length" class="dwp-tags">
          <span v-for="r in pack.dailyWord.relatedWords" :key="r" class="dwp-tag">{{ r }}</span>
        </div>
        <p v-if="pack.dailyWord.funFact" class="dwp-fun">✨ {{ pack.dailyWord.funFact }}</p>
      </div>

      <!-- 复习推荐 -->
      <div v-else-if="pack.reviewWords?.length" class="dwp-review">
        <div class="dwp-review-chips">
          <span v-for="w in pack.reviewWords" :key="w" class="dwp-chip">{{ w }}</span>
        </div>
      </div>

      <!-- 主题包 -->
      <div v-else-if="pack.themePack" class="dwp-theme">
        <div class="dwp-theme-head">
          <span class="dwp-theme-icon">{{ pack.themePack.icon }}</span>
          <div>
            <b class="dwp-theme-name">{{ pack.themePack.theme }}</b>
            <p class="dwp-theme-desc">{{ pack.themePack.description }}</p>
          </div>
        </div>
        <div class="dwp-theme-cols">
          <div class="dwp-theme-col">
            <span class="dwp-theme-col-label">核心词汇</span>
            <div class="dwp-theme-chips">
              <span v-for="w in pack.themePack.coreWords" :key="w" class="dwp-chip is-core">{{ w }}</span>
            </div>
          </div>
          <div class="dwp-theme-col">
            <span class="dwp-theme-col-label">扩展词汇</span>
            <div class="dwp-theme-chips">
              <span v-for="w in pack.themePack.extendedWords" :key="w" class="dwp-chip">{{ w }}</span>
            </div>
          </div>
        </div>
        <p class="dwp-writing-prompt">✍️ {{ pack.themePack.writingPrompt }}</p>
      </div>

      <!-- 个性化推荐 -->
      <div v-else-if="pack.personalizedWords?.length" class="dwp-personal">
        <div v-for="pw in pack.personalizedWords" :key="pw.word" class="dwp-personal-item">
          <div class="dwp-personal-head">
            <b>{{ pw.word }}</b>
            <span class="dwp-personal-score" :style="{ color: scoreColor(pw.matchScore) }">{{ pw.matchScore }}%</span>
          </div>
          <p class="dwp-personal-def">{{ pw.definition }}</p>
          <p class="dwp-personal-reason">{{ pw.reason }}</p>
        </div>
      </div>

      <!-- 推荐理由与学习建议 -->
      <div class="dwp-advice">
        <p class="dwp-reason">{{ pack.reason }}</p>
        <p class="dwp-tip">💡 {{ pack.studyTip }}</p>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="dwp-empty">
      <span class="dwp-empty-icon">📖</span>
      <p>点击下方按钮生成今日推荐，或先添加词汇以获得复习与个性化推荐</p>
      <button class="dwp-btn" @click="generate">生成今日推荐</button>
    </div>

    <!-- 历史 -->
    <div v-if="history.length" class="dwp-history">
      <span class="dwp-history-label">推荐足迹</span>
      <div class="dwp-history-list">
        <div v-for="h in history.slice(0, 8)" :key="h.date + h.type" class="dwp-history-item">
          <span class="dwp-history-date">{{ h.date }}</span>
          <span class="dwp-history-type">{{ typeLabel(h.type) }}</span>
          <span class="dwp-history-dot" :class="{ done: h.completed }">{{ h.completed ? '✓' : '·' }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDailyRecommendation } from '../modules/word-mirror/daily-recommendation'
import type { WordEntry } from '../modules/word-mirror/types'
import type { WordItem } from '../modules/word-mirror/word-mirror-store'

const props = defineProps<{ words: WordItem[] }>()

const rec = useDailyRecommendation()

// 组合式函数返回对象内的 ref 不会自动解包，抽成顶层 computed
const pack = computed(() => rec.todayRecommendation.value)
const history = computed(() => rec.history.value)
const stats = computed(() => rec.getRecommendationStats())

// WordItem → WordEntry 安全映射（缺 tags/reviewCount 补默认）
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

function generate() {
  rec.generateTodayRecommendation(toEntries())
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  daily_word: { label: '每日一词', color: '#f0c040' },
  review: { label: '复习巩固', color: '#6b9fc4' },
  theme: { label: '主题词汇包', color: '#8a9a7a' },
  personalized: { label: '个性化推荐', color: '#d98c7a' },
}

function typeLabel(t: string) {
  return TYPE_META[t]?.label ?? t
}
function typeColor(t: string) {
  return TYPE_META[t]?.color ?? '#8a9a7a'
}
function scoreColor(v: number) {
  if (v >= 85) return '#8a9a7a'
  if (v >= 75) return '#f0c040'
  return '#c46a5a'
}

onMounted(() => {
  if (!pack.value) generate()
})
</script>

<style scoped>
.dwp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.dwp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.dwp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.dwp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.dwp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.dwp-refresh { font-size: 11px; padding: 5px 14px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.08); color: var(--accent, #d4a574); font-family: inherit; cursor: pointer; transition: all 0.2s; }
.dwp-refresh:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.dwp-refresh:disabled { opacity: 0.35; cursor: not-allowed; }

.dwp-stats { display: flex; gap: 8px; margin-bottom: 14px; }
.dwp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.dwp-stat b { font-size: 17px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.dwp-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.dwp-pack { padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.dwp-pack-type { font-size: 11px; letter-spacing: 1px; margin-bottom: 10px; }

.dwp-word-line { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.dwp-word { font-size: 26px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); letter-spacing: 4px; }
.dwp-def { font-size: 13px; color: rgba(232, 221, 208, 0.7); }
.dwp-example { font-size: 12px; color: rgba(232, 221, 208, 0.55); margin: 8px 0; line-height: 1.6; }
.dwp-etym { display: flex; gap: 8px; align-items: baseline; font-size: 11px; color: rgba(232, 221, 208, 0.5); margin-bottom: 8px; }
.dwp-etym-label { color: rgba(var(--accent-rgb), 0.6); flex-shrink: 0; }
.dwp-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.dwp-tag { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); }
.dwp-fun { font-size: 11px; color: rgba(232, 221, 208, 0.5); margin: 0; line-height: 1.6; }

.dwp-review-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dwp-chip { font-size: 12px; padding: 4px 12px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.1); color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.dwp-chip.is-core { background: rgba(var(--accent-rgb), 0.18); font-weight: 500; }

.dwp-theme-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.dwp-theme-icon { font-size: 26px; }
.dwp-theme-name { font-size: 16px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.dwp-theme-desc { font-size: 11px; color: rgba(232, 221, 208, 0.5); margin: 2px 0 0; }
.dwp-theme-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
.dwp-theme-col { display: flex; flex-direction: column; gap: 6px; }
.dwp-theme-col-label { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.dwp-theme-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.dwp-writing-prompt { font-size: 11px; color: rgba(232, 221, 208, 0.55); margin: 0; line-height: 1.6; }

.dwp-personal { display: flex; flex-direction: column; gap: 8px; }
.dwp-personal-item { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.dwp-personal-head { display: flex; align-items: center; justify-content: space-between; }
.dwp-personal-head b { font-size: 14px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.dwp-personal-score { font-size: 12px; font-weight: 500; }
.dwp-personal-def { font-size: 12px; color: rgba(232, 221, 208, 0.65); margin: 4px 0 2px; }
.dwp-personal-reason { font-size: 10px; color: rgba(232, 221, 208, 0.45); margin: 0; }

.dwp-advice { margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); }
.dwp-reason { font-size: 11px; color: rgba(232, 221, 208, 0.55); margin: 0 0 4px; }
.dwp-tip { font-size: 11px; color: rgba(var(--accent-rgb), 0.75); margin: 0; }

.dwp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.dwp-empty-icon { font-size: 30px; opacity: 0.5; }
.dwp-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }
.dwp-btn { font-size: 12px; padding: 7px 18px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-family: inherit; cursor: pointer; transition: all 0.2s; }
.dwp-btn:hover { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }

.dwp-history { margin-top: 14px; }
.dwp-history-label { font-size: 10px; letter-spacing: 1px; color: rgba(232, 221, 208, 0.4); }
.dwp-history-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.dwp-history-item { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); font-size: 10px; color: rgba(232, 221, 208, 0.5); }
.dwp-history-date { color: rgba(232, 221, 208, 0.4); }
.dwp-history-type { color: rgba(232, 221, 208, 0.6); }
.dwp-history-dot { color: rgba(232, 221, 208, 0.3); }
.dwp-history-dot.done { color: #8a9a7a; }

@media (max-width: 640px) {
  .dwp { padding: 14px 14px; }
  .dwp-theme-cols { grid-template-columns: 1fr; }
}
</style>