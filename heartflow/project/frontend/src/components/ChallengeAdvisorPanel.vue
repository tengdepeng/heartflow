<template>
  <section class="cap" aria-label="挑战顾问">
    <div class="cap-head">
      <span class="cap-title">🧭 挑战顾问</span>
      <span class="cap-sub">基于你的习惯画像，推荐最合适的挑战</span>
    </div>

    <!-- 习惯画像 -->
    <div class="cap-profile">
      <div class="cap-level">
        <b class="cap-level-name">{{ profile.levelLabel }}</b>
        <span class="cap-level-sub">Lv.{{ profile.level }} · {{ profile.activeHabits }} 个活跃习惯</span>
      </div>
      <div class="cap-profile-stats">
        <div class="cap-stat"><b>{{ Math.round(profile.completionRate * 100) }}%</b><span>完成率</span></div>
        <div class="cap-stat"><b>{{ profile.avgStreak }}</b><span>平均连续</span></div>
        <div class="cap-stat"><b>{{ Math.round(profile.diversityScore * 100) }}%</b><span>多样性</span></div>
        <div class="cap-stat"><b>{{ profile.maxStreak }}</b><span>最长连续</span></div>
      </div>
    </div>

    <!-- 难度升级评估 -->
    <div class="cap-block">
      <span class="cap-block-label">难度评估</span>
      <div class="cap-diff">
        <span class="cap-diff-item">
          当前 <b :style="{ color: diffColor(diff.currentLevel) }">{{ diffLabel(diff.currentLevel) }}</b>
        </span>
        <span class="cap-arrow">→</span>
        <span class="cap-diff-item">
          建议 <b :style="{ color: diffColor(diff.recommendedLevel) }">{{ diffLabel(diff.recommendedLevel) }}</b>
        </span>
      </div>
      <p class="cap-diff-suggestion">{{ diff.suggestion }}</p>
      <div v-if="diff.upgradeConditions.length" class="cap-conditions">
        <span
          v-for="(c, i) in diff.upgradeConditions"
          :key="i"
          class="cap-condition"
          :class="{ met: diff.metConditions.includes(c) }"
        >
          {{ diff.metConditions.includes(c) ? '✓' : '○' }} {{ c }}
        </span>
      </div>
    </div>

    <!-- 推荐挑战列表 -->
    <div class="cap-block">
      <span class="cap-block-label">智能推荐</span>
      <p v-if="recommendations.length === 0" class="cap-empty">还没有足够数据生成推荐，先添加一些习惯吧。</p>
      <div v-else class="cap-recs">
        <div v-for="rec in recommendations" :key="rec.id" class="cap-rec" :class="'pr-' + rec.priority">
          <div class="cap-rec-head">
            <b class="cap-rec-title">{{ rec.title }}</b>
            <span class="cap-rec-score">{{ rec.score }}</span>
          </div>
          <p class="cap-rec-desc">{{ rec.description }}</p>
          <p class="cap-rec-reason">{{ rec.reason }}</p>
          <div class="cap-rec-meta">
            <span class="cap-rec-chip" :style="{ color: diffColor(rec.difficulty) }">
              {{ diffLabel(rec.difficulty) }}
            </span>
            <span class="cap-rec-chip">{{ rec.duration }} 天</span>
            <span v-if="rec.suggestedHabits.length" class="cap-rec-chip">
              {{ rec.suggestedHabits.length }} 个习惯
            </span>
          </div>
          <div class="cap-rec-actions">
            <span v-if="rec.suggestedReward" class="cap-rec-reward">🎁 {{ rec.suggestedReward }}</span>
            <button class="cap-btn" @click="adopt(rec)">采纳挑战</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 习惯关联洞察 -->
    <div v-if="correlationInsights.length" class="cap-block">
      <span class="cap-block-label">习惯关联</span>
      <ul class="cap-insights">
        <li v-for="(s, i) in correlationInsights" :key="i">{{ s }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChallengeRecommender } from '../modules/discipline/challenge-recommender'
import { useHabitCorrelation } from '../modules/discipline/habit-correlation'
import { HABIT_DIFFICULTY_META } from '../modules/discipline/types'
import type { Habit, DisciplineChallenge } from '../modules/discipline/types'
import type { ChallengeRecommendation } from '../modules/discipline/challenge-recommender'

const props = defineProps<{
  habits: Habit[]
  challenges: DisciplineChallenge[]
}>()

const emit = defineEmits<{ (e: 'adopt', rec: ChallengeRecommendation): void }>()

const recommender = useChallengeRecommender()
const correlationStore = useHabitCorrelation()

const activeHabits = computed(() => props.habits.filter(h => h.enabled))
const profile = computed(() => recommender.buildProfile(activeHabits.value, props.challenges))
const diff = computed(() => recommender.assessDifficulty(activeHabits.value, profile.value))
const recommendations = computed(() => recommender.recommend(activeHabits.value, props.challenges, profile.value))
const correlationInsights = ref<string[]>([])

function refreshCorrelation() {
  const correlations = correlationStore.analyzeCorrelations(activeHabits.value)
  correlationInsights.value = correlationStore.generateRecommendations(correlations)
}

watch(
  () => [activeHabits.value, props.challenges],
  () => refreshCorrelation(),
  { deep: true },
)

refreshCorrelation()

function adopt(rec: ChallengeRecommendation) {
  emit('adopt', rec)
}

function diffLabel(d: keyof typeof HABIT_DIFFICULTY_META): string {
  return HABIT_DIFFICULTY_META[d]?.label || d
}
function diffColor(d: keyof typeof HABIT_DIFFICULTY_META): string {
  return HABIT_DIFFICULTY_META[d]?.color || '#94a3b8'
}
</script>

<style scoped>
.cap {
  margin-top: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--color-surface, rgba(30, 41, 59, 0.6));
  border: 1px solid var(--color-border, #334155);
}
.cap-head { margin-bottom: 14px; }
.cap-title { font-size: 14px; font-weight: 600; color: var(--color-accent, #f59e0b); }
.cap-sub { display: block; margin-top: 3px; font-size: 11px; color: var(--color-text-muted, #94a3b8); }

.cap-profile {
  display: flex; align-items: center; gap: 14px;
  padding: 12px; border-radius: 12px;
  background: rgba(var(--accent-rgb, 245, 158, 11), 0.04);
  border: 1px solid var(--color-border, #334155);
}
.cap-level { display: flex; flex-direction: column; gap: 3px; min-width: 90px; }
.cap-level-name { font-size: 16px; font-weight: 700; color: var(--color-text, #e2e8f0); }
.cap-level-sub { font-size: 10px; color: var(--color-text-muted, #94a3b8); }
.cap-profile-stats { flex: 1; display: flex; gap: 6px; }
.cap-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 2px; border-radius: 10px; background: rgba(0, 0, 0, 0.12);
}
.cap-stat b { font-size: 15px; font-weight: 600; color: var(--color-text, #e2e8f0); font-variant-numeric: tabular-nums; }
.cap-stat span { font-size: 10px; color: var(--color-text-muted, #94a3b8); }

.cap-block { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--color-border, #334155); }
.cap-block-label { font-size: 12px; color: var(--color-text-muted, #94a3b8); letter-spacing: 0.5px; }

.cap-diff { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--color-text-muted, #94a3b8); }
.cap-diff-item { display: flex; align-items: center; gap: 5px; }
.cap-diff-item b { font-size: 14px; }
.cap-arrow { color: var(--color-accent, #f59e0b); }
.cap-diff-suggestion { margin: 0; font-size: 11px; color: var(--color-text-muted, #94a3b8); line-height: 1.5; }
.cap-conditions { display: flex; flex-wrap: wrap; gap: 5px; }
.cap-condition {
  font-size: 10px; padding: 3px 8px; border-radius: 10px;
  border: 1px solid var(--color-border, #334155); color: var(--color-text-muted, #94a3b8);
}
.cap-condition.met { color: #8a9a7a; border-color: rgba(138, 154, 122, 0.4); }

.cap-empty { margin: 4px 0; font-size: 12px; color: var(--color-text-muted, #94a3b8); font-style: italic; }
.cap-recs { display: flex; flex-direction: column; gap: 8px; }
.cap-rec {
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px; border-radius: 12px;
  background: var(--color-surface, rgba(30, 41, 59, 0.5));
  border: 1px solid var(--color-border, #334155);
}
.cap-rec.pr-high { border-left: 3px solid var(--color-accent, #f59e0b); }
.cap-rec.pr-medium { border-left: 3px solid #6b9fc4; }
.cap-rec.pr-low { border-left: 3px solid #8a9a7a; }
.cap-rec-head { display: flex; align-items: center; justify-content: space-between; }
.cap-rec-title { font-size: 13px; font-weight: 600; color: var(--color-text, #e2e8f0); }
.cap-rec-score {
  font-size: 14px; font-weight: 700; color: var(--color-accent, #f59e0b);
  font-variant-numeric: tabular-nums;
}
.cap-rec-desc { margin: 0; font-size: 12px; color: var(--color-text, #e2e8f0); line-height: 1.5; }
.cap-rec-reason { margin: 0; font-size: 11px; color: var(--color-text-muted, #94a3b8); line-height: 1.5; font-style: italic; }
.cap-rec-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.cap-rec-chip {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: rgba(0, 0, 0, 0.15); border: 1px solid var(--color-border, #334155);
}
.cap-rec-actions { display: flex; align-items: center; gap: 10px; }
.cap-rec-reward { font-size: 11px; color: var(--color-text-muted, #94a3b8); }
.cap-btn {
  margin-left: auto;
  padding: 5px 12px; border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-accent, #f59e0b);
  font-size: 12px; font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.cap-btn:hover { background: rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.45); }

.cap-insights { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.cap-insights li { font-size: 11px; color: var(--color-text-muted, #94a3b8); line-height: 1.5; }
.cap-insights li::before { content: '✦ '; color: var(--color-accent, #f59e0b); }
</style>