<template>
  <section class="rop" aria-label="恢复优化">
    <div class="rop-head">
      <span class="rop-title">🧘 恢复优化</span>
      <span class="rop-sub">恢复评分 · 过度训练 · 恢复计划 · 周期化训练</span>
    </div>

    <div v-if="records.length === 0" class="rop-empty">
      <span>⚡</span>
      <p>还没有运动记录，记录运动后这里会生成你的恢复评分与周期化训练建议。</p>
    </div>

    <template v-else>
      <!-- 恢复评分 -->
      <div class="rop-score">
        <div class="rop-ring" :style="{ background: ringStyle }">
          <div class="rop-ring-inner">
            <b class="rop-ring-num">{{ recovery.overall ?? 0 }}</b>
            <span class="rop-ring-label">恢复评分</span>
          </div>
        </div>
        <div class="rop-dims">
          <div class="rop-dim">
            <span class="rop-dim-label">肌肉</span>
            <div class="rop-dim-bar"><i class="rop-m" :style="{ width: recovery.muscleRecovery + '%' }"></i></div>
            <span class="rop-dim-val">{{ recovery.muscleRecovery }}</span>
          </div>
          <div class="rop-dim">
            <span class="rop-dim-label">神经</span>
            <div class="rop-dim-bar"><i class="rop-n" :style="{ width: recovery.nervousRecovery + '%' }"></i></div>
            <span class="rop-dim-val">{{ recovery.nervousRecovery }}</span>
          </div>
          <div class="rop-dim">
            <span class="rop-dim-label">心血管</span>
            <div class="rop-dim-bar"><i class="rop-c" :style="{ width: recovery.cardiovascularRecovery + '%' }"></i></div>
            <span class="rop-dim-val">{{ recovery.cardiovascularRecovery }}</span>
          </div>
          <div class="rop-dim">
            <span class="rop-dim-label">心理</span>
            <div class="rop-dim-bar"><i class="rop-p" :style="{ width: recovery.mentalRecovery + '%' }"></i></div>
            <span class="rop-dim-val">{{ recovery.mentalRecovery }}</span>
          </div>
        </div>
        <div class="rop-rest">
          <span>距上次高强度 {{ recovery.hoursSinceIntense }}h</span>
          <span>建议休息 <b>{{ recovery.recommendedRestHours }}</b>h</span>
          <span class="rop-state" :class="'st-' + stateKey">{{ stateLabel }}</span>
        </div>
        <div class="rop-patterns" v-if="patterns.pattern">
          <span class="rop-pattern-tag">{{ patterns.pattern }}</span>
          <span>规律度 {{ patterns.consistency }}%</span>
          <span>偏好 {{ patterns.preferredTime }}</span>
          <span v-if="patterns.preferredDays.length">常练 {{ patterns.preferredDays.join('、') }}</span>
        </div>
      </div>

      <!-- 过度训练信号 -->
      <div class="rop-block" v-if="signals.length > 0">
        <span class="rop-block-label">过度训练信号 <em v-if="signals.length" class="rop-count">{{ signals.length }}</em></span>
        <div class="rop-signals">
          <div v-for="s in signals" :key="s.type" class="rop-signal">
            <div class="rop-sig-head">
              <b class="rop-sig-type">{{ SIG_LABEL[s.type] ?? s.type }}</b>
              <span class="rop-sig-sev">{{ Math.round(s.severity * 100) }}%</span>
            </div>
            <div class="rop-sig-sev-bar"><i :style="{ width: s.severity * 100 + '%' }" :class="sevClass(s.severity)"></i></div>
            <p class="rop-sig-desc">{{ s.description }}</p>
            <span class="rop-sig-sug">💡 {{ s.suggestion }}</span>
          </div>
        </div>
      </div>

      <!-- 恢复建议 -->
      <div class="rop-block" v-if="recommended.length > 0">
        <span class="rop-block-label">今日恢复建议</span>
        <div class="rop-recs">
          <div v-for="a in recommended" :key="a.id" class="rop-rec">
            <span class="rop-rec-icon">{{ typeIcon(a.type) }}</span>
            <div class="rop-rec-main">
              <b class="rop-rec-name">{{ a.name }}</b>
              <span class="rop-rec-benefit">{{ a.expectedBenefit }}</span>
            </div>
            <span class="rop-rec-dur">{{ a.duration }} 分</span>
          </div>
        </div>
      </div>

      <!-- 周期化训练 -->
      <div class="rop-block">
        <div class="rop-block-head">
          <span class="rop-block-label">周期化训练 · {{ phaseLabel }}</span>
          <span class="rop-phase-goal">{{ periodization.phaseGoal }}</span>
        </div>
        <div class="rop-week">
          <div v-for="d in periodization.weeklySchedule" :key="d.dayOfWeek" class="rop-day" :class="'wt-' + d.workoutType">
            <span class="rop-day-name">{{ d.dayOfWeek }}</span>
            <span class="rop-day-focus">{{ d.focus }}</span>
            <span v-if="d.suggestedActivity" class="rop-day-act">{{ d.suggestedActivity.duration }} 分{{ INTENSITY_LABEL[d.suggestedActivity.intensity] }}</span>
          </div>
        </div>
        <div class="rop-mix">
          <span v-for="m in periodization.intensityDistribution" :key="m.intensity" class="rop-mix-item" :class="'im-' + m.intensity">
            {{ INTENSITY_LABEL[m.intensity] }} {{ m.percentage }}%
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMovement, movesToRecords } from '../modules/movement'
import { useRecoveryOptimizer } from '../modules/movement'
import type { PeriodizationPhase } from '../modules/movement'

const movement = useMovement()
const optimizer = useRecoveryOptimizer()

onMounted(() => movement.load())

const records = computed(() => movesToRecords(movement.items.value))
const recovery = computed(() => optimizer.computeRecoveryScore(records.value))
const signals = computed(() => optimizer.detectOvertraining(records.value))
const recommended = computed(() => optimizer.getActiveRecoveryRecommendations(records.value, recovery.value, 3))
const periodization = computed(() => optimizer.generatePeriodizationPlan(records.value))
const patterns = computed(() => optimizer.identifyMovementPatterns(records.value))

const SIG_LABEL: Record<string, string> = {
  performance_drop: '表现下滑',
  fatigue_accumulation: '疲劳累积',
  mood_decline: '情绪低落',
  sleep_disturbance: '睡眠受扰',
  injury_risk: '受伤风险',
}
const PHASE_LABEL: Record<PeriodizationPhase, string> = {
  preparation: '准备期', build: '建设期', peak: '巅峰期', taper: '减量期', recovery: '恢复期',
}
const INTENSITY_LABEL: Record<string, string> = {
  light: '轻', moderate: '中', vigorous: '强', extreme: '极限',
}
const TYPE_ICONS: Record<string, string> = {
  walking: '🚶', stretching: '🧘', yoga: '🧘', tai_chi: '☯️', swimming: '🏊', cycling: '🚴',
  running: '🏃', strength: '🏋️', meditation: '🪷',
}

const ringStyle = computed(() => `conic-gradient(var(--accent) ${(recovery.value.overall ?? 0) * 3.6}deg, rgba(240,192,64,0.14) 0deg)`)
const stateKey = computed(() => {
  const o = recovery.value.overall ?? 0
  return o >= 80 ? 'good' : o >= 60 ? 'ok' : o < 40 ? 'bad' : 'mid'
})
const stateLabel = computed(() => {
  const o = recovery.value.overall ?? 0
  return o >= 80 ? '状态优异' : o >= 60 ? '恢复良好' : o < 40 ? '需要深度休息' : '适度恢复中'
})
const phaseLabel = computed(() => PHASE_LABEL[periodization.value.currentPhase])

function sevClass(sev: number) { return sev >= 0.6 ? 'sev-high' : sev >= 0.4 ? 'sev-mid' : 'sev-low' }
function typeIcon(t: string) { return TYPE_ICONS[t] ?? '💪' }
</script>

<style scoped>
.rop {
  padding: 16px; border-radius: 14px;
  background: var(--card-bg); border: 1px solid rgba(240, 192, 64, 0.16);
  display: flex; flex-direction: column; gap: 16px;
}
.rop-head { display: flex; flex-direction: column; gap: 2px; }
.rop-title { font-size: 14px; font-weight: 600; color: #e8b64c; letter-spacing: 1px; }
.rop-sub { font-size: 11px; color: rgba(232, 182, 76, 0.5); }
.rop-empty { text-align: center; padding: 36px 16px; color: rgba(232, 182, 76, 0.35); }
.rop-empty span { font-size: 30px; display: block; margin-bottom: 8px; }
.rop-empty p { font-size: 12px; }

/* 评分 */
.rop-score { display: flex; align-items: center; gap: 18px; padding: 14px; border-radius: 12px; background: rgba(232, 182, 76, 0.05); border: 1px solid rgba(232, 182, 76, 0.09); }
.rop-ring { width: 92px; height: 92px; border-radius: 50%; flex: 0 0 92px; display: flex; align-items: center; justify-content: center; }
.rop-ring-inner { width: 70px; height: 70px; border-radius: 50%; background: var(--card-bg); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rop-ring-num { font-size: 24px; color: #e8b64c; font-weight: 700; }
.rop-ring-label { font-size: 8px; color: rgba(232, 182, 76, 0.5); }
.rop-dims { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.rop-dim { display: grid; grid-template-columns: 32px 1fr 24px; align-items: center; gap: 8px; }
.rop-dim-label { font-size: 10px; color: rgba(240, 210, 150, 0.7); }
.rop-dim-bar { height: 6px; border-radius: 3px; background: rgba(232, 182, 76, 0.12); overflow: hidden; }
.rop-dim-bar i { display: block; height: 100%; transition: width 0.4s; }
.rop-dim-bar .rop-m { background: #c46a5a; }
.rop-dim-bar .rop-n { background: #6b9fc4; }
.rop-dim-bar .rop-c { background: #e8b64c; }
.rop-dim-bar .rop-p { background: #8a9a7a; }
.rop-dim-val { font-size: 10px; color: rgba(232, 182, 76, 0.6); text-align: right; }
.rop-rest { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 10px; color: rgba(232, 182, 76, 0.5); }
.rop-rest b { color: #e8b64c; }
.rop-state { padding: 2px 8px; border-radius: 6px; }
.rop-state.st-good { background: rgba(138,154,122,0.15); color: #8a9a7a; }
.rop-state.st-ok { background: rgba(107,159,196,0.15); color: #6b9fc4; }
.rop-state.st-mid { background: rgba(232,182,76,0.15); color: #e8b64c; }
.rop-state.st-bad { background: rgba(196,106,90,0.18); color: #c46a5a; }
.rop-patterns { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font-size: 10px; color: rgba(232,182,76,0.55); }
.rop-pattern-tag { padding: 2px 8px; border-radius: 6px; background: rgba(107,159,196,0.15); color: #6b9fc4; }

/* 区块 */
.rop-block { display: flex; flex-direction: column; gap: 10px; }
.rop-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.rop-block-label { font-size: 12px; font-weight: 600; color: rgba(232, 182, 76, 0.7); letter-spacing: 1px; }
.rop-count { font-style: normal; font-size: 10px; padding: 1px 6px; border-radius: 6px; background: rgba(196,106,90,0.2); color: #c46a5a; margin-left: 4px; }
.rop-phase-goal { font-size: 11px; color: rgba(232, 182, 76, 0.6); text-align: right; }

/* 信号 */
.rop-signals { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rop-signal { padding: 10px 12px; border-radius: 10px; background: rgba(196,106,90,0.05); border: 1px solid rgba(196,106,90,0.14); display: flex; flex-direction: column; gap: 6px; }
.rop-sig-head { display: flex; justify-content: space-between; align-items: center; }
.rop-sig-type { font-size: 12px; color: #c46a5a; }
.rop-sig-sev { font-size: 11px; font-weight: 600; color: rgba(196,106,90,0.7); }
.rop-sig-sev-bar { height: 5px; border-radius: 3px; background: rgba(196,106,90,0.12); overflow: hidden; }
.rop-sig-sev-bar i { display: block; height: 100%; }
.rop-sig-sev-bar .sev-high { background: #c46a5a; }
.rop-sig-sev-bar .sev-mid { background: #e8b64c; }
.rop-sig-sev-bar .sev-low { background: #8a9a7a; }
.rop-sig-desc { font-size: 11px; color: rgba(232, 182, 76, 0.65); margin: 0; line-height: 1.45; }
.rop-sig-sug { font-size: 10px; color: rgba(138, 154, 122, 0.85); }

/* 恢复建议 */
.rop-recs { display: flex; flex-direction: column; gap: 8px; }
.rop-rec { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(107,159,196,0.05); border: 1px solid rgba(107,159,196,0.12); }
.rop-rec-icon { font-size: 18px; }
.rop-rec-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rop-rec-name { font-size: 12px; color: rgba(240,210,150,0.85); }
.rop-rec-benefit { font-size: 10px; color: rgba(107,159,196,0.7); }
.rop-rec-dur { font-size: 11px; color: rgba(107,159,196,0.9); font-weight: 600; }

/* 周期化 */
.rop-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.rop-day { display: flex; flex-direction: column; gap: 3px; padding: 7px 5px; border-radius: 8px; background: rgba(232,182,76,0.05); border: 1px solid rgba(232,182,76,0.08); text-align: center; }
.rop-day-name { font-size: 9px; color: rgba(232,182,76,0.7); }
.rop-day-focus { font-size: 9px; color: rgba(240,210,150,0.7); }
.rop-day-act { font-size: 8px; color: rgba(138,154,122,0.9); }
.rop-day.wt-primary { border-color: rgba(196,106,90,0.3); }
.rop-day.wt-secondary { border-color: rgba(107,159,196,0.3); }
.rop-day.wt-active_recovery { border-color: rgba(138,154,122,0.3); }
.rop-mix { display: flex; flex-wrap: wrap; gap: 6px; }
.rop-mix-item { font-size: 10px; padding: 3px 9px; border-radius: 7px; background: rgba(232,182,76,0.08); border: 1px solid rgba(232,182,76,0.12); color: rgba(232,182,76,0.7); }
.rop-mix-item.im-light { border-color: rgba(138,154,122,0.35); color: #8a9a7a; }
.rop-mix-item.im-vigorous { border-color: rgba(196,106,90,0.35); color: #c46a5a; }
.rop-mix-item.im-extreme { border-color: rgba(196,106,90,0.5); color: #c46a5a; }
</style>