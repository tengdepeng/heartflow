<template>
  <section class="ttp-panel">
    <h4 class="ttp-title">🎧 听书</h4>
    <p v-if="!supported" class="ttp-unsupported">当前环境不支持语音朗读（需 Web Speech API）。</p>
    <template v-else>
      <div class="ttp-controls">
        <button class="ttp-btn ttp-btn-primary" @click="onToggle">{{ toggleLabel }}</button>
        <button class="ttp-btn ttp-btn-stop" :disabled="state === 'idle'" @click="onStop">⏹ 停止</button>
        <div class="ttp-rate">
          <span class="ttp-rate-label">倍速</span>
          <div class="ttp-rate-btns">
            <button
              v-for="r in RATES"
              :key="r"
              :class="['ttp-rate-btn', { active: rate === r }]"
              @click="setRate(r)"
            >{{ r }}x</button>
          </div>
        </div>
        <button
          class="ttp-btn ttp-follow-btn"
          :class="{ active: follow }"
          :title="follow ? '朗读时阅读器自动跟读定位（点此关闭）' : '开启后朗读时阅读器自动跟随（读↔听续接）'"
          @click="emit('update:follow', !follow)"
        >跟读</button>
      </div>
      <div v-if="progress.total > 0" class="ttp-progress">
        <span class="ttp-progress-text">{{ progressText }}</span>
        <div class="ttp-progress-bar">
          <div class="ttp-progress-fill" :style="{ width: progressPct }"></div>
        </div>
      </div>

      <!-- 逐句滚动跟读高亮（INCR-515，借鉴 96 APK 组件岛 lyrics_scrolling 滚动+缩放联动） -->
      <div v-if="sentences.length" ref="scrollBox" class="ttp-sentences" aria-label="逐句跟读">
        <p
          v-for="(s, i) in sentences"
          :key="i"
          class="ttp-sentence"
          :class="{ 'is-active': i === activeIndex, 'is-read': activeIndex >= 0 && i < activeIndex }"
        >{{ s }}</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  useReadingTts,
  chunkParagraphs,
  splitParagraphs,
  resolveStartChunk,
  paragraphIndexForChunk,
  chunkOffsetForChunk,
} from '../modules/reading/tts'
import { useVoiceLibrary, resolvePresetVoiceURI } from '../modules/reading/voice-library'
import { useMiniPlayer } from '../modules/reading/mini-player'

const props = withDefaults(
  defineProps<{
    text: string
    title?: string
    /** 起读段落（读→听续接：从阅读器所在段落开始朗读） */
    startParagraph?: number
    /** 段内句块偏移（读→听续接的句块级精度：该段第几句起读，0 基） */
    startChunkOffset?: number
    /** 句内进度 0~1（读→听续接的词级精度：该句读到第几成起读） */
    startChunkRatio?: number
    /** 跟读：朗读推进时让阅读器跟随定位 */
    follow?: boolean
  }>(),
  { title: '', startParagraph: 0, startChunkOffset: 0, startChunkRatio: 0, follow: false },
)

const emit = defineEmits<{
  (e: 'progress', paragraphIndex: number, chunkOffset: number, chunkRatio: number): void
  (e: 'update:follow', value: boolean): void
}>()

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const { state, rate, progress, sentences, paraOfChunk, chunkRatio, supported, speak, pause, resume, stop, setRate, setVoice } =
  useReadingTts()
const { current: voice } = useVoiceLibrary()
const mini = useMiniPlayer()

/** 读→听：把当前阅读段落 + 段内句块偏移换算成起读句块下标 */
function startChunkIndex(): number {
  const { paraOfChunk: paras } = chunkParagraphs(splitParagraphs(props.text))
  return resolveStartChunk(paras, props.startParagraph ?? 0, props.startChunkOffset ?? 0)
}

/** 当前音色参数（INCR-504）：音高 + 语速系数 + 匹配到的系统音色 */
function voiceOpts() {
  const v = voice.value
  return { pitch: v.pitch, rateScale: v.rateScale, voiceURI: resolvePresetVoiceURI(v) }
}

const scrollBox = ref<HTMLElement | null>(null)

// 当前正在朗读/暂停停留的句块下标（待机时为 -1，不显示高亮）
const activeIndex = computed(() => {
  if (state.value === 'idle' || progress.value.total === 0) return -1
  return Math.min(progress.value.index, progress.value.total - 1)
})

/** 把当前朗读位置（段落 + 段内句块偏移 + 句内进度）回报给上层（INCR-526 听→读续接） */
function emitProgress() {
  const i = activeIndex.value
  if (i < 0) return
  emit('progress', paragraphIndexForChunk(paraOfChunk.value, i), chunkOffsetForChunk(paraOfChunk.value, i), chunkRatio.value)
}

// 句块推进时把当前句滚动到可视区，形成「跟读」效果；并回报所在段落 + 段内偏移 + 句内进度
watch(activeIndex, async (i) => {
  if (i < 0) return
  emitProgress()
  await nextTick()
  const el = scrollBox.value?.querySelector('.ttp-sentence.is-active') as HTMLElement | null
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
})

const toggleLabel = computed(() => {
  if (state.value === 'playing') return '⏸ 暂停'
  if (state.value === 'paused') return '▶ 续播'
  return '▶ 朗读'
})

const progressPct = computed(() => {
  if (progress.value.total === 0) return '0%'
  const done = Math.min(progress.value.index, progress.value.total)
  return `${Math.round((done / progress.value.total) * 100)}%`
})

const progressText = computed(() => {
  if (progress.value.total === 0) return ''
  if (state.value === 'idle' && progress.value.index >= progress.value.total) return '已读完'
  return `第 ${Math.min(progress.value.index + 1, progress.value.total)} / ${progress.value.total} 句`
})

function onToggle() {
  if (state.value === 'playing') {
    pause()
    // 暂停时把句内进度一并落库，便于下次从该句同一位置续读（词级续接）
    emitProgress()
  } else if (state.value === 'paused') {
    resume()
  } else {
    // 从当前阅读段落 + 段内偏移 + 句内进度起读（读→听续接）
    speak(props.text, voiceOpts(), startChunkIndex(), props.startChunkRatio ?? 0)
  }
}

/** 停止前先回报当前位置（停止后 activeIndex 归 -1，位置会丢失） */
function onStop() {
  const i = activeIndex.value
  if (i >= 0) {
    emit('progress', paragraphIndexForChunk(paraOfChunk.value, i), chunkOffsetForChunk(paraOfChunk.value, i), chunkRatio.value)
  }
  stop()
}

// 音色库切换即时作用于正在朗读的内容（INCR-504）
watch(voice, () => {
  if (state.value !== 'idle') setVoice(voiceOpts())
})

// 悬浮迷你播放器（INCR-502）：注册控制回调并同步播放态
onMounted(() => {
  mini.attach({ toggle: onToggle, stop: () => onStop() })
})

watch(state, (s, prev) => {
  if (s !== 'idle' && prev === 'idle') mini.open(props.title || '听书')
  else if (s === 'idle') mini.dismiss()
  mini.sync({ playing: s === 'playing', index: progress.value.index, total: progress.value.total })
})

watch(progress, (p) => {
  mini.sync({ playing: state.value === 'playing', index: p.index, total: p.total })
})

// 文本变化时停止朗读，避免读到旧内容
watch(
  () => props.text,
  () => {
    if (state.value !== 'idle') stop()
  },
)

onBeforeUnmount(() => {
  if (state.value !== 'idle') stop()
  mini.detach()
})
</script>

<style scoped>
.ttp-panel {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.ttp-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 1px;
}

.ttp-unsupported {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
  line-height: 1.5;
}

.ttp-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.ttp-btn {
  padding: 7px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ttp-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
}

.ttp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ttp-btn-primary {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

.ttp-follow-btn.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

.ttp-rate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.ttp-rate-label {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.ttp-rate-btns {
  display: flex;
  gap: 4px;
}

.ttp-rate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.55);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}

.ttp-rate-btn:hover {
  color: var(--accent);
}

.ttp-rate-btn.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

.ttp-progress {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ttp-progress-text {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.5);
  white-space: nowrap;
}

.ttp-progress-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
}

.ttp-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.3s;
}

.ttp-sentences {
  margin-top: 12px;
  max-height: 168px;
  overflow-y: auto;
  padding: 6px 4px 6px 10px;
  border-left: 2px solid rgba(var(--accent-rgb), 0.18);
  scroll-behavior: smooth;
}

.ttp-sentence {
  margin: 0 0 6px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--text-primary-rgb), 0.42);
  transition: color 0.25s, background 0.25s, transform 0.25s;
}

.ttp-sentence.is-read {
  color: rgba(var(--text-primary-rgb), 0.3);
}

.ttp-sentence.is-active {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  font-weight: 500;
  transform: scale(1.015);
  transform-origin: left center;
}

@media (max-width: 480px) {
  .ttp-rate {
    margin-left: 0;
    width: 100%;
  }
}
</style>
