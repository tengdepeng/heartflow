<!--
  MeditationSequencePanel · 冥想序列（INCR-457 上盘 / INCR-462 接入真播放器）
  数据源：light-practice 引擎的 useLightPractice().sequences
  （首次进入时为引擎内置预设 MEDITATION_SEQUENCES，含步骤与引导指令）

  INCR-462 语义变更（重要）：「启动序列」不再是「点一下就记一次练习」，
  而是**发起真实播放** —— 挂载 MeditationSequencePlayer 走完 N 步倒计时，
  播完才经 useSequence 落盘。中途退出（exit）不落盘。
  落盘仍需一条 MeditationRecord：经 pavilion.recordMeditation 生成
  （它会填id/date/timestamp 并写入冥想记录清单），再交给引擎 useSequence，
  与 light-bridge 中 completeRitual 的「先 pavilion 后 practice」顺序一致。
  刻意**不复用** completePractice —— 那是引导冥想路径、记的是 GuidedMeditation，
  语义不同，复用会把序列练习混进 pavilion 的引导冥想统计。
-->
<template>
  <section class="msq-panel" aria-label="冥想序列">
    <header class="msq-head">
      <div class="msq-head-row">
        <span class="msq-title">🧭 冥想序列</span>
        <span class="msq-count">{{ sequences.length }} 条</span>
      </div>
      <span class="msq-sub">由引擎预设的多步课程，含每步引导指令</span>
      <span class="msq-hint">逐步播放，走完全部步骤才记一次练习：使用次数 +1，练习时长计入澄明追踪</span>
    </header>

    <EmptyState
      v-if="!sequences.length"
      icon="🧭"
      title="还没有冥想序列"
      hint="序列是一串带引导指令的冥想步骤，可从预设开始"
      :glow="false"
      cta-label=""
    />

    <template v-else>
      <MeditationSequencePlayer
        v-if="playingSeq"
        :key="playingSeq.id"
        :sequence="playingSeq"
        @finished="onFinished"
        @exit="stopPlaying"
      />

      <ul v-else class="msq-list">
        <li v-for="seq in sequences" :key="seq.id" class="msq-item">
          <div
            class="msq-item-head"
            role="button"
            tabindex="0"
            :aria-expanded="expandedId === seq.id"
            :aria-label="'展开或收起冥想序列 ' + seq.name"
            @click="toggle(seq.id)"
            @keydown.enter.prevent="toggle(seq.id)"
            @keydown.space.prevent="toggle(seq.id)"
          >
            <div class="msq-item-title-row">
              <span class="msq-name">{{ seq.name }}</span>
              <span class="msq-dur">{{ seq.totalDuration }} 分钟</span>
            </div>
            <p class="msq-desc">{{ seq.description }}</p>
            <div class="msq-meta">
              <span class="msq-chip">
                {{ MEDITATION_DIFFICULTY_META[seq.difficulty]?.icon }}
                {{ MEDITATION_DIFFICULTY_META[seq.difficulty]?.label || seq.difficulty }}
              </span>
              <span class="msq-chip">{{ seq.steps.length }} 步</span>
              <span class="msq-chip">已用 {{ seq.useCount }} 次</span>
            </div>
          </div>

          <ol v-if="expandedId === seq.id" class="msq-steps">
            <li v-for="(step, i) in seq.steps" :key="i" class="msq-step">
              <span class="msq-step-index">{{ i + 1 }}</span>
              <div class="msq-step-body">
                <div class="msq-step-meta">
                  <span class="msq-step-type">
                    {{ MEDITATION_TYPE_META[step.type]?.icon || '🧘' }}
                    {{ MEDITATION_TYPE_META[step.type]?.label || step.type }}
                  </span>
                  <span class="msq-step-dur">{{ step.duration }} 分钟</span>
                  <span v-if="step.ambientSound" class="msq-step-ambient">🎧 {{ step.ambientSound }}</span>
                </div>
                <p class="msq-step-text">{{ step.instruction }}</p>
              </div>
            </li>
            <li v-if="!seq.steps.length" class="msq-step msq-step--empty">尚未添加步骤</li>
          </ol>

          <footer class="msq-actions">
            <button
              class="msq-start"
              :data-testid="`msq-start-${seq.id}`"
              :disabled="!seq.steps.length"
              @click="play(seq)"
            >
              {{ seq.steps.length ? '播放序列' : '暂无可播放步骤' }}
            </button>
            <span v-if="finishedId === seq.id" class="msq-done">已记录一次练习</span>
          </footer>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EmptyState from './EmptyState.vue'
import MeditationSequencePlayer from './MeditationSequencePlayer.vue'
import { useLightPractice, useLightPavilion, MEDITATION_DIFFICULTY_META } from '../modules/light'
import { MEDITATION_TYPE_META } from '../modules/light/types'
import { sequenceTotalMinutes } from '../modules/light/sequence-adapter'
import type { MeditationSequence } from '../modules/light'

const practice = useLightPractice()
const pavilion = useLightPavilion()

const sequences = practice.sequences

/** 当前展开的序列 id（同一时刻只展开一条） */
const expandedId = ref<string | null>(null)
/** 正在播放的序列（非 null 即播放态，列表让位给播放器） */
const playingSeq = ref<MeditationSequence | null>(null)
/** 最近播完并落盘的序列 id */
const finishedId = ref<string | null>(null)

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

/** 发起播放。此处**不落盘** —— 落盘在 onFinished（播完才记）。 */
function play(seq: MeditationSequence) {
  if (!seq.steps.length) return
  playingSeq.value = seq
}

/** 中途退出：只关播放器，不落盘（useSequence 一次都不该被调用） */
function stopPlaying() {
  playingSeq.value = null
}

/**
 * 播完全部步骤：落盘一次练习。
 * 引擎 useSequence 签名为 (sequenceId, record: MeditationRecord)，
 * 故先经 pavilion.recordMeditation 生成一条合法记录（填 id/date/timestamp 并入冥想记录清单），
 * 再交给 useSequence —— 由它做 useCount+1、序列写回、澄明总时长累加。
 * 时长用 sequenceTotalMinutes（各步之和）而非 seq.totalDuration：
 * 后者是可被外部写坏的冗余字段，逐步求和是唯一可从 steps 复原的算法。
 */
function onFinished(payload: { sequenceId: string; minutes: number }) {
  const seq = sequences.value.find(s => s.id === payload.sequenceId)
  playingSeq.value = null
  if (!seq) return
  const type = seq.steps[0]?.type ?? 'guided'
  const record = pavilion.recordMeditation(
    type,
    payload.minutes || sequenceTotalMinutes(seq),
    '纷扰',
    '宁静',
    `冥想序列：${seq.name}`,
  )
  if (practice.useSequence(seq.id, record)) {
    finishedId.value = seq.id
  }
}
</script>

<style scoped>
/* 暗色暖金玻璃范式（对齐 LightVeinPanel / LightRecordsPanel 的暖琥珀基调） */
.msq-panel {
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(var(--bg-card-rgb), 0.62), rgba(var(--bg-card-rgb), 0.32));
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.msq-head { margin-bottom: 12px; }
.msq-head-row { display: flex; align-items: center; gap: 8px; }
.msq-title { font-size: 14px; font-weight: 500; color: var(--text-high); }
.msq-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  padding: 1px 8px;
  border-radius: 8px;
}
.msq-sub { display: block; margin-top: 4px; font-size: 11px; color: var(--text-dim); }
.msq-hint { display: block; margin-top: 2px; font-size: 10px; color: var(--text-faint); }

.msq-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.msq-item {
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
  transition: border-color 0.25s;
}
.msq-item:hover { border-color: rgba(var(--accent-rgb), 0.18); }

.msq-item-head { padding: 10px 12px; cursor: pointer; }
.msq-item-head:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 10px; }
.msq-item-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.msq-name { font-size: 13px; font-weight: 500; color: var(--text-bright); }
.msq-dur {
  flex: none;
  font-size: 10px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  padding: 1px 8px;
  border-radius: 999px;
}
.msq-desc { margin: 4px 0 0; font-size: 11px; line-height: 1.5; color: var(--text-dim); }
.msq-meta { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 7px; }
.msq-chip {
  font-size: 10px;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  padding: 1px 7px;
  border-radius: 6px;
}

.msq-steps {
  list-style: none;
  margin: 0;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.07);
  background: rgba(var(--bg-card-rgb), 0.28);
}
.msq-step { display: flex; align-items: flex-start; gap: 8px; }
.msq-step-index {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.22);
  color: var(--accent);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.msq-step-body { min-width: 0; flex: 1; }
.msq-step-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.msq-step-type { font-size: 11px; color: var(--text-secondary); }
.msq-step-dur { font-size: 10px; color: var(--text-faint); }
.msq-step-ambient { font-size: 10px; color: var(--text-faint); }
.msq-step-text { margin: 3px 0 0; font-size: 12px; line-height: 1.6; color: var(--text-bright); }
.msq-step--empty { font-size: 11px; color: var(--text-faint); font-style: italic; }

.msq-actions { display: flex; align-items: center; gap: 8px; padding: 0 12px 11px; }
.msq-start {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.msq-start:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.2); border-color: rgba(var(--accent-rgb), 0.35); }
.msq-start:disabled { opacity: .4; cursor: not-allowed; }
.msq-start:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.msq-done { font-size: 11px; color: var(--accent); }
</style>
