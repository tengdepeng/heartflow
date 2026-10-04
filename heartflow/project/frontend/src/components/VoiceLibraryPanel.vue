<script setup lang="ts">
// ============================================================
// 阅览殿 · 朗读音色库面板（INCR-504）
// 13 款音色卡（时光序 female_voice1~8 + me/melodious/mysterious/quiet/dexterous），
// 选中即落盘并即时作用于听书朗读；支持逐款试听与系统音色检测。
// 纯本地、零网络（Web Speech API）。
// ============================================================
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  useVoiceLibrary,
  resolvePresetVoiceURI,
} from '../modules/reading/voice-library'
import { useReadingTts } from '../modules/reading/tts'

const { presets, currentId, current, pitch, rateScale, setPreset, reset } = useVoiceLibrary()
const { state: previewState, supported, speak, stop } = useReadingTts()

const SAMPLE = '心流所至，皆是归途。愿你听见书中的光。'
const voiceCount = ref(0)

function refreshVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    voiceCount.value = 0
    return
  }
  const synth = window.speechSynthesis as SpeechSynthesis | undefined
  voiceCount.value = synth && typeof synth.getVoices === 'function' ? synth.getVoices().length : 0
}

function select(id: string): void {
  setPreset(id)
  if (previewState.value !== 'idle') stop()
}

function preview(): void {
  const v = current.value
  speak(SAMPLE, {
    pitch: v.pitch,
    rateScale: v.rateScale,
    voiceURI: resolvePresetVoiceURI(v),
  })
}

function onReset(): void {
  if (previewState.value !== 'idle') stop()
  reset()
}

onMounted(() => {
  refreshVoices()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // 部分浏览器音色表异步就绪，加载后再刷一次
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
  }
})

onBeforeUnmount(() => {
  if (previewState.value !== 'idle') stop()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices)
  }
})

const currentPitch = computed(() => pitch.value.toFixed(2))
const currentRate = computed(() => rateScale.value.toFixed(2))
</script>

<template>
  <section class="vlp-panel">
    <header class="vlp-head">
      <span class="vlp-kicker">听书 · 音色</span>
      <h4 class="vlp-title">朗读音色库</h4>
      <p class="vlp-sub">13 款本地音色，选中即生效于听书朗读</p>
    </header>

    <p v-if="!supported" class="vlp-unsupported">当前环境不支持语音朗读，音色选择仍会保存。</p>

    <div class="vlp-grid">
      <button
        v-for="p in presets"
        :key="p.id"
        class="vlp-card"
        :class="{ 'is-active': p.id === currentId }"
        type="button"
        :title="p.desc"
        @click="select(p.id)"
      >
        <span class="vlp-name">{{ p.label }}</span>
        <span class="vlp-en">{{ p.labelEn }}</span>
        <span class="vlp-desc">{{ p.desc }}</span>
        <span class="vlp-tags"><em v-for="t in p.tags" :key="t">{{ t }}</em></span>
      </button>
    </div>

    <div class="vlp-foot">
      <button class="vlp-preview" type="button" :disabled="!supported" @click="preview">
        ▶ 试听「{{ current.label }}」
      </button>
      <button
        class="vlp-stop"
        type="button"
        :disabled="previewState === 'idle'"
        @click="stop"
      >⏹ 停止</button>
      <span class="vlp-sys">系统音色 {{ voiceCount }} 个</span>
      <button class="vlp-refresh" type="button" @click="refreshVoices">刷新</button>
      <button class="vlp-reset" type="button" @click="onReset">恢复默认</button>
    </div>

    <p class="vlp-current">
      当前：{{ current.label }} · 音高 {{ currentPitch }} · 语速系数 {{ currentRate }}
    </p>
  </section>
</template>

<style scoped>
.vlp-panel {
  margin-top: 18px;
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.45);
}

.vlp-head { margin-bottom: 10px; }
.vlp-kicker { font-size: 11px; letter-spacing: 0.14em; color: rgba(var(--accent-rgb), 0.6); }
.vlp-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--accent); letter-spacing: 1px; }
.vlp-sub { margin: 4px 0 0; font-size: 12px; color: rgba(var(--text-primary-rgb), 0.42); }

.vlp-unsupported {
  margin: 6px 0 10px;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.vlp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.vlp-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.12);
  color: rgba(var(--text-primary-rgb), 0.7);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.vlp-card:hover { border-color: rgba(var(--accent-rgb), 0.32); transform: translateY(-1px); }
.vlp-card.is-active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.25);
}

.vlp-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.vlp-en { font-size: 10px; letter-spacing: 0.06em; color: rgba(var(--accent-rgb), 0.55); }
.vlp-desc { font-size: 11px; line-height: 1.4; color: rgba(var(--text-primary-rgb), 0.42); }
.vlp-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.vlp-tags em {
  font-style: normal;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.7);
}

.vlp-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.vlp-preview,
.vlp-stop,
.vlp-refresh,
.vlp-reset {
  padding: 6px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.vlp-preview { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.3); color: var(--accent); }
.vlp-preview:hover:not(:disabled),
.vlp-stop:hover:not(:disabled),
.vlp-refresh:hover,
.vlp-reset:hover { border-color: rgba(var(--accent-rgb), 0.34); }
.vlp-preview:disabled,
.vlp-stop:disabled { opacity: 0.35; cursor: not-allowed; }

.vlp-sys { margin-left: auto; font-size: 11px; color: rgba(var(--text-primary-rgb), 0.4); }

.vlp-current {
  margin: 10px 0 0;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.7);
}
</style>
