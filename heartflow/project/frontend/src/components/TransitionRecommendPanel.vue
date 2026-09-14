<template>
  <section class="trp-panel" aria-label="转业 · 转型推荐">
    <header class="trp-head">
      <span class="trp-title">◈ 转业 · 转型推荐</span>
      <span class="trp-sub">技能 · 人脉 · 里程碑 综合评估的可行转型方向</span>
    </header>

    <!-- 当前角色 + 生成 -->
    <div class="trp-console">
      <input
        v-model="currentRole"
        class="trp-role"
        type="text"
        placeholder="当前角色，如：前端工程师"
        aria-label="当前角色"
        @keyup.enter="generate"
      />
      <button class="trp-run" :disabled="running || !dataReady" @click="generate">
        <template v-if="running">分析中…</template>
        <template v-else>✦ 生成推荐</template>
      </button>
    </div>

    <!-- 空态 -->
    <p v-if="!dataReady" class="trp-empty">
      先补充技能图谱与人脉，再来生成转型推荐
    </p>
    <p
      v-else-if="result && result.recommendations.length === 0"
      class="trp-empty trp-empty-warn"
    >{{ result.summary }}</p>

    <template v-else-if="result">
      <p class="trp-summary">{{ result.summary }}</p>

      <ol class="trp-list">
        <li v-for="rec in result.recommendations" :key="rec.targetRole.role" class="trp-card">
          <!-- 排名 + 角色 -->
          <div class="trp-card-head">
            <span class="trp-rank">#{{ rec.rank }}</span>
            <div class="trp-role-box">
              <b class="trp-role">{{ rec.targetRole.role }}</b>
              <span class="trp-industry">{{ rec.targetRole.industry }}</span>
            </div>
            <span class="trp-match">
              {{ rec.overallMatch }}<em>% 匹配</em>
            </span>
          </div>

          <!-- 四维匹配条 -->
          <div class="trp-bars">
            <div v-for="b in barRows(rec)" :key="b.key" class="trp-bar">
              <span class="trp-bar-label">{{ b.label }}</span>
              <span class="trp-bar-track"><i :style="{ width: b.value + '%' }"></i></span>
              <span class="trp-bar-val">{{ b.value }}</span>
            </div>
          </div>

          <!-- 策略 / 时长 / 难度 -->
          <div class="trp-meta">
            <span class="trp-chip">{{ strategyIcon(rec.strategy) }} {{ strategyLabel(rec.strategy) }}</span>
            <span class="trp-chip">约 {{ rec.estimatedMonths }} 个月</span>
            <span class="trp-chip">{{ difficultyDot(rec.difficulty) }} 难度 {{ rec.difficulty }}/5</span>
          </div>

          <!-- 理由 -->
          <ul class="trp-reasons">
            <li v-for="r in rec.reasons" :key="r">✓ {{ r }}</li>
          </ul>

          <!-- 风险 -->
          <ul v-if="rec.risks.length" class="trp-risks">
            <li v-for="r in rec.risks" :key="r">⚠ {{ r }}</li>
          </ul>

          <!-- 技能缺口 -->
          <div v-if="rec.skillGaps.length" class="trp-gaps">
            <span class="trp-gaps-title">技能缺口</span>
            <span
              v-for="g in rec.skillGaps"
              :key="g.skillName"
              class="trp-gap"
              :class="'p-' + g.priority"
              :title="gapTitle(g)"
            >
              {{ g.skillName }}<em>{{ g.gapSize }} · {{ g.estimatedLearningHours }}h</em>
            </span>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PropType } from 'vue'
import { useTransitionRecommender } from '../modules/career/transition-recommend'
import type { TransitionRecommendation, SkillGapDetail } from '../modules/career/transition-recommend'
import { useCareerPath } from '../modules/career/path'
import type { CareerContact, CareerConnection } from '../modules/career/career'
import type { Contact as EngineContact, CareerConnection as EngineConnection } from '../modules/career/types'
import type { SkillNode, CareerMilestone } from '../modules/career/skill-map'

const props = defineProps({
  contacts: { type: Array as PropType<CareerContact[]>, default: () => [] },
  connections: { type: Array as PropType<CareerConnection[]>, default: () => [] },
  skills: { type: Array as PropType<SkillNode[]>, default: () => [] },
  milestones: { type: Array as PropType<CareerMilestone[]>, default: () => [] },
})

const pathStore = useCareerPath()
const currentRole = ref('')
const running = ref(false)
const result = ref<ReturnType<ReturnType<typeof useTransitionRecommender>['recommend']> | null>(null)

onMounted(() => {
  void pathStore.load()
})

const dataReady = computed(
  () => props.skills.length > 0 || props.contacts.length > 0,
)

function generate() {
  if (!dataReady.value) return
  running.value = true
  try {
    const engine = useTransitionRecommender()
    result.value = engine.recommend(
      currentRole.value.trim() || '当前职业',
      props.skills,
      props.contacts as unknown as EngineContact[],
      props.connections as unknown as EngineConnection[],
      props.milestones,
      pathStore.positions.value,
    )
  } finally {
    running.value = false
  }
}

const BAR_ROWS: { key: keyof Pick<TransitionRecommendation, 'skillMatch' | 'networkSupport' | 'milestoneAlignment' | 'marketFit'>; label: string }[] = [
  { key: 'skillMatch', label: '技能' },
  { key: 'networkSupport', label: '人脉' },
  { key: 'milestoneAlignment', label: '里程碑' },
  { key: 'marketFit', label: '市场' },
]

function barRows(rec: TransitionRecommendation) {
  return BAR_ROWS.map(r => ({ key: r.key, label: r.label, value: rec[r.key] }))
}

const STRATEGY_META: Record<TransitionRecommendation['strategy'], { label: string; icon: string }> = {
  direct: { label: '直接转型', icon: '✦' },
  stepwise: { label: '渐进转型', icon: '↗' },
  bridge: { label: '桥接转型', icon: '◇' },
  explore: { label: '探索转型', icon: '◎' },
}

function strategyLabel(s: TransitionRecommendation['strategy']): string {
  return STRATEGY_META[s]?.label ?? s
}

function strategyIcon(s: TransitionRecommendation['strategy']): string {
  return STRATEGY_META[s]?.icon ?? '·'
}

function difficultyDot(d: number): string {
  return '●'.repeat(d)
}

const GAP_PRIORITY_LABEL: Record<SkillGapDetail['priority'], string> = {
  critical: '关键',
  high: '优先',
  medium: '中等',
  low: '低',
}

function gapTitle(g: SkillGapDetail): string {
  return `${g.skillName} · ${GAP_PRIORITY_LABEL[g.priority]}缺口 · ${g.estimatedLearningHours} 小时`
}
</script>

<style scoped>
.trp-panel {
  padding: 18px;
  border-radius: 16px;
  background: var(--career-surface, rgba(32, 38, 30, 0.4));
  border: 1px solid var(--career-border, rgba(138, 154, 122, 0.08));
}
.trp-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.trp-title { font-size: 14px; letter-spacing: 2px; color: rgba(138, 154, 122, 0.85); }
.trp-sub { font-size: 11px; opacity: 0.5; }

.trp-console { display: flex; gap: 8px; margin-bottom: 14px; }
.trp-role {
  flex: 1; padding: 10px 14px; border-radius: 10px; box-sizing: border-box;
  border: 1px solid rgba(138, 154, 122, 0.1); background: rgba(8, 10, 9, 0.6);
  color: #e8e0d8; font-size: 13px; font-family: inherit; outline: none;
}
.trp-role::placeholder { color: rgba(232, 228, 216, 0.35); }
.trp-role:focus { border-color: rgba(138, 154, 122, 0.3); }
.trp-run {
  flex-shrink: 0; padding: 0 18px; border-radius: 10px; cursor: pointer;
  border: 1px solid rgba(138, 154, 122, 0.25); background: rgba(138, 154, 122, 0.15);
  color: #8a9a7a; font-size: 13px; font-family: inherit; letter-spacing: 0.5px;
}
.trp-run:hover:not(:disabled) { background: rgba(138, 154, 122, 0.25); }
.trp-run:disabled { opacity: 0.35; cursor: not-allowed; }

.trp-empty { font-size: 12px; opacity: 0.55; text-align: center; padding: 12px; }
.trp-empty-warn { color: #e0b060; }

.trp-summary {
  font-size: 12px; line-height: 1.7; color: rgba(232, 228, 216, 0.75);
  padding: 12px 14px; margin: 0 0 12px; border-radius: 10px;
  background: rgba(138, 154, 122, 0.06); border: 1px solid rgba(138, 154, 122, 0.08);
}

.trp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.trp-card {
  padding: 16px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(138, 154, 122, 0.1);
  display: flex; flex-direction: column; gap: 12px;
}
.trp-card-head { display: flex; align-items: center; gap: 12px; }
.trp-rank {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(138, 154, 122, 0.15); color: #8a9a7a; font-size: 13px; font-weight: 600;
}
.trp-role-box { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.trp-role { font-size: 15px; color: #e8e0d8; letter-spacing: 0.5px; }
.trp-industry { font-size: 11px; opacity: 0.5; }
.trp-match { font-size: 20px; font-weight: 600; color: #8a9a7a; }
.trp-match em { font-style: normal; font-size: 11px; color: rgba(232, 228, 216, 0.5); margin-left: 2px; }

.trp-bars { display: flex; flex-direction: column; gap: 6px; }
.trp-bar { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.trp-bar-label { width: 44px; text-align: right; opacity: 0.6; flex-shrink: 0; }
.trp-bar-track {
  flex: 1; height: 5px; border-radius: 3px; overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.trp-bar-track i {
  display: block; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), #8a9a7a);
}
.trp-bar-val { width: 24px; text-align: right; opacity: 0.7; font-variant-numeric: tabular-nums; }

.trp-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.trp-chip {
  padding: 3px 10px; border-radius: 999px; font-size: 11px;
  background: rgba(138, 154, 122, 0.08); border: 1px solid rgba(138, 154, 122, 0.12);
  color: rgba(232, 228, 216, 0.8);
}

.trp-reasons, .trp-risks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.trp-reasons li { font-size: 12px; color: rgba(232, 228, 216, 0.75); line-height: 1.5; }
.trp-risks li { font-size: 12px; color: #e0b060; line-height: 1.5; }

.trp-gaps { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.trp-gaps-title { font-size: 11px; opacity: 0.5; margin-right: 2px; }
.trp-gap {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px;
  font-size: 11px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
}
.trp-gap em { font-style: normal; opacity: 0.5; font-size: 10px; }
.trp-gap.p-critical { border-color: rgba(224, 96, 96, 0.4); color: #e08080; }
.trp-gap.p-high { border-color: rgba(232, 192, 96, 0.35); color: #e8c060; }
.trp-gap.p-medium { border-color: rgba(232, 192, 96, 0.2); opacity: 0.9; }
</style>