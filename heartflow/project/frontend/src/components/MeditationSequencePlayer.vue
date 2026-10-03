<!--
  MeditationSequencePlayer · 冥想序列播放器（INCR-462 · T2）

  为什么存在：INCR-457 上盘的MeditationSequencePanel 里那个「启动序列」按钮
  并不播放任何东西 —— 它只是调useSequence(id, record) 记了一次使用
  （useCount+1、澄明总时长累加）。本组件把序列步骤变成**真播放器**：
  逐步倒计时 + 步骤推进 + 进度条，走完 N 步才向父级发finished。

  与引导冥想播放器（MeditationStudio.vue:56-81）的关系：
  **复用同一套状态与模板结构**（stepIndex / secondsLeft / stepProgress /
  prevStep / nextStep / exitPlayer / setInterval 定时器），不另起一套。
  差异只有两处，都是数据形状差异而非样式差异：
    1. 步骤来自适配层 toPlayerSteps()（序列步骤），不是 guided.steps；
    2. 组件自身**不落盘** —— 落盘由父级MeditationSequencePanel 在收到
       finished 后调 useSequence 完成（播放与记录解耦：中途退出不记）。

  class 前缀 msql- 全库唯一（与 ms- / msq- 均不冲突）。
-->
<template>
  <section class="msql-player" :aria-label="'冥想序列播放器：' + sequence.name">
    <header class="msql-phead">
      <div>
        <h3 class="msql-ptitle">{{ sequence.name }}</h3>
        <span class="msql-psub">
          第 {{ stepIndex + 1 }} / {{ playerSteps.length }} 步
          <template v-if="step"> · {{ step.durationMinutes }} 分钟</template>
        </span>
      </div>
      <button class="msql-btn-ghost" data-testid="msql-exit" @click="exitPlayer">退出</button>
    </header>

    <div v-if="step" class="msql-step">
      <span class="msql-step-icon">{{ STEP_PHASE_META[step.phase]?.icon || '🧎' }}</span>
      <span class="msql-step-phase">{{ STEP_PHASE_META[step.phase]?.label || step.phase }}</span>
      <p class="msql-step-text">{{ step.instruction }}</p>
      <div class="msql-countdown" data-testid="msql-countdown">{{ formatTime(secondsLeft) }}</div>
      <!--
        进度条走 inline width（与引导冥想播放器同款），不用 CSS 动画 +自定义属性：
        项目已知坑——自定义属性当<time> 计时用时若缺单位会退回 `0s` + `infinite`，
        每帧重启 → 高频闪 + CPU 打满。inline width 无此风险。
      -->
      <div class="msql-progress">
        <div class="msql-progress-fill" :style="{ width: stepProgress + '%' }"></div>
      </div>
      <!--
        序列步骤独有的两个字段（引导脚本没有）：技法类型与背景音。
        渲染它们而不是丢掉：技法类型比 phase 更精确（phase 是降级后的粗粒度阶段），
        背景音是「这一步该配什么声景」的唯一提示，只在播放时才有上下文可讲。
      -->
      <div class="msql-step-meta">
        <span class="msql-step-type">
          {{ MEDITATION_TYPE_META[step.sourceType]?.icon || '🧘' }}
          {{ MEDITATION_TYPE_META[step.sourceType]?.label || step.sourceType }}
        </span>
        <span v-if="step.ambientSound" class="msql-step-ambient">🎧 {{ step.ambientSound }}</span>
      </div>
    </div>

    <footer class="msql-pfoot">
      <button class="msql-btn-ghost" data-testid="msql-prev" :disabled="stepIndex === 0" @click="prevStep">
        ‹ 上一步
      </button>
      <button class="msql-btn-primary" data-testid="msql-next" @click="nextStep">
        {{ isLast ? '完成' : '下一步 ›' }}
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { STEP_PHASE_META } from '../modules/light'
import { MEDITATION_TYPE_META } from '../modules/light/types'
import type { MeditationSequence } from '../modules/light'
import { toPlayerSteps, sequenceTotalMinutes } from '../modules/light/sequence-adapter'

const props = defineProps<{ sequence: MeditationSequence }>()

/** 播完全部步骤后向父级发一次；父级据此落盘（useSequence） */
const emit = defineEmits<{
  /** 走完全部 N 步。minutes = 序列实际总时长（各步之和） */
  (e: 'finished', payload: { sequenceId: string; minutes: number }): void
  /** 中途退出。刻意与 finished 分成两个事件而非共用一个 + minutes:0：
   *  「播完才记」要求未播完时父级拿不到任何可落盘的信号，
   *  分事件后父级不可能在退出路径上误落盘（用minutes===0 判别则仍有可能被写错）。 */
  (e: 'exit'): void
}>()

// ---- 步骤（经适配层换算：分钟→秒、type→phase）----
const playerSteps = computed(() => toPlayerSteps(props.sequence))

// ---- 播放器状态（与 MeditationStudio 同名同义，便于对照维护）----
const stepIndex = ref(0)
const secondsLeft = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const step = computed(() => playerSteps.value[stepIndex.value])
const isLast = computed(() => stepIndex.value >= playerSteps.value.length - 1)
const stepProgress = computed(() => {
  if (!step.value) return 0
  return Math.round(((step.value.durationSeconds - secondsLeft.value) / step.value.durationSeconds) * 100)
})

function startTimer() {
  stopTimer()
  // 空步骤序列不进播放器（父级按钮已禁用），这里再挡一道避免 0/0
  if (!playerSteps.value.length) return
  secondsLeft.value = playerSteps.value[0].durationSeconds
  timer = setInterval(() => {
    if (secondsLeft.value > 0) {
      secondsLeft.value--
      return
    }
    nextStep()
  }, 1000)
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function resetStepTimer(i: number) {
  const s = playerSteps.value[i]
  secondsLeft.value = s ? s.durationSeconds : 0
}

function nextStep() {
  if (!playerSteps.value.length) return
  if (isLast.value) { finish(); return }
  stepIndex.value++
  resetStepTimer(stepIndex.value)
}

function prevStep() {
  if (stepIndex.value > 0) {
    stepIndex.value--
    resetStepTimer(stepIndex.value)
  }
}

/** 中途退出：只发 exit、不发 finished ⇒ 父级不落盘（这是「播完才记」的关键） */
function exitPlayer() {
  stopTimer()
  emit('exit')
}

function finish() {
  stopTimer()
  emit('finished', { sequenceId: props.sequence.id, minutes: sequenceTotalMinutes(props.sequence) })
}

function formatTime(s: number) {
  const m = Math.floor(s / 60); const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// 进入即起播（父级用 v-if 挂载，卸载走 onUnmounted 停表）
startTimer()
onUnmounted(stopTimer)
</script>

<style scoped>
/* 结构与配色对齐 MeditationStudio 的 .ms-player 一族，仅换前缀以免与全局冲突 */
.msql-player { display: flex; flex-direction: column; gap: 14px; }
.msql-phead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.msql-ptitle { margin: 0; font-size: 15px; color: var(--text-bright); }
.msql-psub { font-size: 11px; color: var(--text-dim); }
.msql-btn-ghost { padding: 5px 13px; border-radius: 999px; border: 1px solid rgba(var(--accent-rgb), 0.22); background: transparent; color: var(--text-secondary); font-family: inherit; font-size: 12px; cursor: pointer; }
.msql-btn-ghost:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.12); }
.msql-btn-ghost:disabled { opacity: .4; cursor: not-allowed; }
.msql-btn-primary { padding: 6px 16px; border-radius: 999px; border: 1px solid transparent; background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.85), rgba(var(--accent-rgb), 0.6)); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.msql-btn-primary:hover { filter: brightness(1.1); }

.msql-step { text-align: center; padding: 22px 14px; background: rgba(var(--bg-card-rgb), 0.4); border: 1px solid rgba(var(--accent-rgb), 0.1); border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 9px; }
.msql-step-icon { font-size: 30px; }
.msql-step-phase { font-size: 11px; color: var(--accent); letter-spacing: 2px; }
.msql-step-text { margin: 0; font-size: 15px; color: var(--text-bright); max-width: 440px; line-height: 1.7; }
.msql-countdown { font-size: 28px; font-weight: 300; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.msql-progress { width: 100%; max-width: 340px; height: 6px; border-radius: 999px; background: rgba(var(--accent-rgb), 0.14); overflow: hidden; }
.msql-progress-fill { height: 100%; background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.9), rgba(var(--accent-rgb), 0.55)); border-radius: 999px; transition: width .4s linear; }
.msql-step-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
.msql-step-type { font-size: 11px; color: var(--text-secondary); }
.msql-step-ambient { font-size: 11px; color: var(--text-dim); }
.msql-pfoot { display: flex; justify-content: space-between; }
</style>
