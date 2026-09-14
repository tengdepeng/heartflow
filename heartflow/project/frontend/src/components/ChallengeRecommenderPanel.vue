<template>
  <div class="crp-panel">
    <header class="crp-head">
      <span class="crp-title">🧭 智能挑战推荐</span>
      <span class="crp-sub">基于习惯画像的自适应挑战</span>
    </header>

    <!-- 习惯画像 -->
    <div class="crp-block">
      <div class="crp-block-label">当前画像</div>
      <div v-if="profile.activeHabits > 0" class="crp-profile">
        <div class="crp-level">
          <span class="crp-level-tag">{{ profile.levelLabel }}</span>
          <span class="crp-level-num">Lv.{{ profile.level }}</span>
        </div>
        <div class="crp-metrics">
          <div class="crp-metric" v-for="m in profileMetrics" :key="m.label">
            <span class="crp-metric-val">{{ m.value }}</span>
            <span class="crp-metric-label">{{ m.label }}</span>
          </div>
        </div>
      </div>
      <div v-else class="crp-empty-profile">
        尚无活跃习惯，先创建 1-2 个简单习惯开启画像
      </div>
    </div>

    <!-- 难度评估 -->
    <div v-if="profile.activeHabits > 0" class="crp-block">
      <div class="crp-block-label">难度评估</div>
      <div class="crp-grade" :class="assessmentReady ? 'ready' : 'pending'">
        <span class="crp-grade-badge">{{ assessmentReady ? '可升级' : '保持' }}</span>
        <span class="crp-grade-text">{{ assessment.suggestion }}</span>
      </div>
      <div v-if="assessment.unmetConditions.length" class="crp-conditions">
        <div
          v-for="(cond, i) in assessment.upgradeConditions"
          :key="i"
          class="crp-cond"
          :class="{ met: assessment.metConditions.includes(cond) }"
        >
          <span class="crp-cond-mark">{{ assessment.metConditions.includes(cond) ? '✓' : '○' }}</span>
          <span class="crp-cond-text">{{ cond }}</span>
        </div>
      </div>
    </div>

    <!-- 推荐列表 -->
    <div v-if="recommendations.length" class="crp-block">
      <div class="crp-block-head">
        <span class="crp-block-label">为你推荐</span>
        <button class="crp-refresh" type="button" @click="regenerate">重新生成</button>
      </div>
      <div class="crp-recs">
        <div
          v-for="rec in recommendations"
          :key="rec.id"
          class="crp-rec"
          :class="{ 'is-adopted': rec.adopted, [`prio-${rec.priority}`]: true }"
        >
          <div class="crp-rec-top">
            <span class="crp-rec-title">{{ rec.title }}</span>
            <span class="crp-rec-sc">{{ rec.score }}</span>
          </div>
          <div class="crp-rec-desc">{{ rec.description }}</div>
          <div class="crp-rec-meta">
            <span class="crp-chip">{{ diffLabel(rec.difficulty) }}</span>
            <span class="crp-chip">{{ rec.duration }} 天</span>
            <span class="crp-chip" v-if="rec.suggestedHabits.length">关联 {{ rec.suggestedHabits.length }} 习惯</span>
          </div>
          <div class="crp-rec-reason">💡 {{ rec.reason }}</div>
          <div class="crp-rec-reward" v-if="rec.suggestedReward">🎁 {{ rec.suggestedReward }}</div>
          <button
            class="crp-adopt"
            type="button"
            :disabled="rec.adopted"
            @click="adopt(rec)"
          >
            {{ rec.adopted ? '已采纳' : '采纳挑战' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 自适应挑战 -->
    <div v-if="profile.activeHabits > 0" class="crp-block">
      <div class="crp-block-label">自适应挑战</div>
      <div class="crp-adaptive">
        <div class="crp-adaptive-desc">
          {{ adaptive ? adaptive.description : '加载中…' }}
        </div>
        <button
          class="crp-adopt crp-adopt--adaptive"
          type="button"
          :disabled="adaptiveAdopted"
          @click="adopt(adaptive!)"
        >
          {{ adaptiveAdopted ? '已采纳' : '采纳自适应挑战' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChallengeRecommender } from '../modules/discipline/challenge-recommender'
import type { ChallengeRecommendation } from '../modules/discipline/challenge-recommender'
import type { Habit, DisciplineChallenge, HabitDifficulty } from '../modules/discipline/types'
import { HABIT_DIFFICULTY_META } from '../modules/discipline/types'

const props = defineProps<{
  habits: Habit[]
  challenges: DisciplineChallenge[]
  onCreateChallenge: (
    title: string,
    description: string,
    duration: number,
    habits: string[],
    reward?: string,
  ) => DisciplineChallenge
}>()

const recEngine = useChallengeRecommender()

const profile = computed(() => recEngine.buildProfile(props.habits, props.challenges))
const assessment = computed(() => recEngine.assessDifficulty(props.habits, profile.value))
const assessmentReady = computed(() => assessment.value.readyForUpgrade)
const recommendations = ref<ChallengeRecommendation[]>([])
const adaptive = ref<ChallengeRecommendation | null>(null)

const profileMetrics = computed(() => {
  const p = profile.value
  return [
    { label: '活跃习惯', value: p.activeHabits },
    { label: '完成率', value: `${Math.round(p.completionRate * 100)}%` },
    { label: '平均连打', value: p.avgStreak },
    { label: '多样性', value: `${Math.round(p.diversityScore * 100)}%` },
  ]
})

const adaptiveAdopted = computed(() => adaptive.value ? adaptive.value.adopted : false)

function generateRecs() {
  recommendations.value = recEngine.recommend(props.habits, props.challenges, profile.value)
  adaptive.value = recEngine.generateAdaptiveChallenge(props.habits, props.challenges, profile.value)
}

function regenerate() {
  generateRecs()
}

function adopt(rec: ChallengeRecommendation) {
  if (rec.adopted) return
  recEngine.adoptRecommendation(rec, props.onCreateChallenge)
}

function diffLabel(d: HabitDifficulty): string {
  return HABIT_DIFFICULTY_META[d]?.label ?? d
}

generateRecs()
</script>

<style scoped>
.crp-panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--color-border, #334155);
}

.crp-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.crp-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #e2e8f0);
}

.crp-sub {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.crp-block {
  background: var(--bg-card, rgba(22, 19, 16, 0.4));
  border: 1px solid var(--color-border, #334155);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.crp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent, #f59e0b);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.crp-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.crp-profile {
  display: flex;
  gap: 14px;
  align-items: center;
}

.crp-level {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.crp-level-tag {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #e2e8f0);
}

.crp-level-num {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
}

.crp-metrics {
  display: flex;
  gap: 16px;
  flex: 1;
}

.crp-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.crp-metric-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #e2e8f0);
}

.crp-metric-label {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
}

.crp-empty-profile {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
}

.crp-grade {
  display: flex;
  align-items: center;
  gap: 10px;
}

.crp-grade-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.crp-grade.ready .crp-grade-badge {
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.15);
  border: 1px solid rgba(138, 154, 122, 0.4);
}

.crp-grade.pending .crp-grade-badge {
  color: #f0c040;
  background: rgba(240, 192, 64, 0.12);
  border: 1px solid rgba(240, 192, 64, 0.35);
}

.crp-grade-text {
  font-size: 13px;
  color: var(--color-text, #e2e8f0);
}

.crp-conditions {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.crp-cond {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.crp-cond.met {
  color: #8a9a7a;
}

.crp-cond-mark {
  flex-shrink: 0;
}

.crp-refresh {
  font-size: 12px;
  color: var(--color-accent, #f59e0b);
  background: transparent;
  border: none;
  cursor: pointer;
}

.crp-refresh:hover {
  text-decoration: underline;
}

.crp-recs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crp-rec {
  border: 1px solid var(--color-border, #334155);
  border-radius: 10px;
  padding: 10px 12px;
  opacity: 1;
}

.crp-rec.is-adopted {
  opacity: 0.55;
}

.crp-rec-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.crp-rec-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #e2e8f0);
}

.crp-rec-sc {
  font-size: 14px;
  font-weight: 700;
}

.prio-high .crp-rec-sc { color: #f0c040; }
.prio-medium .crp-rec-sc { color: #8a9a7a; }
.prio-low .crp-rec-sc { color: #94a3b8; }

.crp-rec-desc {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  margin: 4px 0;
}

.crp-rec-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.crp-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border, #334155);
  color: var(--color-text-muted, #94a3b8);
}

.crp-rec-reason, .crp-rec-reward {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  line-height: 1.5;
}

.crp-adopt {
  margin-top: 8px;
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(138, 154, 122, 0.45);
  background: rgba(138, 154, 122, 0.15);
  color: #8a9a7a;
  cursor: pointer;
}

.crp-adopt:disabled {
  opacity: 0.5;
  cursor: default;
}

.crp-adopt--adaptive {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.4);
  background: rgba(240, 192, 64, 0.1);
}

.crp-adaptive {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.crp-adaptive-desc {
  flex: 1;
  font-size: 13px;
  color: var(--color-text, #e2e8f0);
}
</style>