<!--
  MeditationSequencePanel · 冥想序列（INCR-457）
  数据源：light-practice 引擎的 useLightPractice().sequences
  （首次进入时为引擎内置预设 MEDITATION_SEQUENCES，含步骤与引导指令）
  启动语义：引擎 useSequence(id, record) 是「记录一次序列练习」而非播放器
  ——它累加 useCount、写回 hf:light:practice、把 record.duration 计入澄明追踪。
  故本面板启动时先经 pavilion.recordMeditation 落一条真实冥想记录，再交给引擎。
-->
<template>
  <section class="msq-panel" aria-label="冥想序列">
    <header class="msq-head">
      <div class="msq-head-row">
        <span class="msq-title">🧭 冥想序列</span>
        <span class="msq-count">{{ sequences.length }} 条</span>
      </div>
      <span class="msq-sub">由引擎预设的多步课程，含每步引导指令</span>
      <span class="msq-hint">启动即记录一次练习：使用次数 +1，练习时长计入澄明追踪</span>
    </header>

    <EmptyState
      v-if="!sequences.length"
      icon="🧭"
      title="还没有冥想序列"
      hint="序列是一串带引导指令的冥想步骤，可从预设开始"
      :glow="false"
      cta-label=""
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
          <button class="msq-start" :data-testid="`msq-start-${seq.id}`" @click="start(seq)">
            启动序列
          </button>
          <span v-if="startedId === seq.id" class="msq-done">已记录一次练习</span>
        </footer>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EmptyState from './EmptyState.vue'
import { useLightPractice, useLightPavilion, MEDITATION_DIFFICULTY_META } from '../modules/light'
import { MEDITATION_TYPE_META } from '../modules/light/types'
import type { MeditationSequence } from '../modules/light'

const practice = useLightPractice()
const pavilion = useLightPavilion()

const sequences = practice.sequences

/** 当前展开的序列 id（同一时刻只展开一条） */
const expandedId = ref<string | null>(null)
/** 最近启动过的序列 id */
const startedId = ref<string | null>(null)

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

/**
 * 启动一条序列。
 * 引擎 useSequence 签名为 (sequenceId, record: MeditationRecord) —— 它不是播放器，
 * 而是「记录一次序列练习」：useCount+1、持久化、把 record.duration 计入澄明追踪。
 * 因此先向 pavilion 落一条真实冥想记录（时长取序列总时长，类型取首步类型），
 * 再把该记录交给引擎，与 light-bridge 中 completeRitual 的「先 pavilion 后 practice」顺序一致。
 */
function start(seq: MeditationSequence) {
  const type = seq.steps[0]?.type ?? 'guided'
  const duration = seq.totalDuration || seq.steps.reduce((sum, s) => sum + s.duration, 0)
  const record = pavilion.recordMeditation(type, duration, '纷扰', '宁静', `冥想序列：${seq.name}`)
  if (practice.useSequence(seq.id, record)) {
    startedId.value = seq.id
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
.msq-start:hover { background: rgba(var(--accent-rgb), 0.2); border-color: rgba(var(--accent-rgb), 0.35); }
.msq-start:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.msq-done { font-size: 11px; color: var(--accent); }
</style>
