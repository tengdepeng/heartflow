<template>
  <section class="ttp-panel">
    <h4 class="ttp-title">🎧 听书</h4>
    <p v-if="!supported" class="ttp-unsupported">当前环境不支持语音朗读（需 Web Speech API）。</p>
    <template v-else>
      <div class="ttp-controls">
        <button class="ttp-btn ttp-btn-primary" @click="onToggle">{{ toggleLabel }}</button>
        <button class="ttp-btn ttp-btn-stop" :disabled="state === 'idle'" @click="stop">⏹ 停止</button>
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
import { useReadingTts } from '../modules/reading/tts'
import { useVoiceLibrary, resolvePresetVoiceURI } from '../modules/reading/voice-library'
import { useMiniPlayer } from '../modules/reading/mini-player'

const props = defineProps<{ text: string; title?: string }>()

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const { state, rate, progress, sentences, supported, speak, pause, resume, stop, setRate, setVoice } = useReadingTts()
const { current: voice } = useVoiceLibrary()
const mini = useMiniPlayer()

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

// 句块推进时把当前句滚动到可视区，形成「跟读」效果
watch(activeIndex, async (i) => {
  if (i < 0) return
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
  } else if (state.value === 'paused') {
    resume()
  } else {
    speak(props.text, voiceOpts())
  }
}

// 音色库切换即时作用于正在朗读的内容（INCR-504）
watch(voice, () => {
  if (state.value !== 'idle') setVoice(voiceOpts())
})

// 悬浮迷你播放器（INCR-502）：注册控制回调并同步播放态
onMounted(() => {
  mini.attach({ toggle: onToggle, stop: () => stop() })
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
