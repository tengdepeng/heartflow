// ============================================================
// 守护室 · 白噪音引擎（Web Audio API，本地合成，不联网）
// ------------------------------------------------------------
// 借鉴「第10类·安全护眼音乐白噪音」：白噪/粉红/棕噪/雨声/海浪/森林
// 全部由 AudioContext 本地合成，零网络依赖，守宪法第1条本地私有。
// 注意：AudioContext 需用户手势启动，加载时仅恢复上次场景选中态，
//       实际播放由用户点击触发。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export interface NoiseScene {
  id: string
  label: string
  icon: string
  desc: string
  color: string
}

export const NOISE_SCENES: NoiseScene[] = [
  { id: 'white', label: '白噪音', icon: '❄', desc: '均匀覆盖环境杂音', color: '#a5b4fc' },
  { id: 'pink', label: '粉红噪音', icon: '🌸', desc: '柔和低沉，助眠首选', color: '#f9a8d4' },
  { id: 'brown', label: '棕噪音', icon: '🟤', desc: '更沉更稳，专注利器', color: '#d6b28a' },
  { id: 'rain', label: '雨声', icon: '🌧', desc: '淅沥雨滴，安神静心', color: '#7dd3fc' },
  { id: 'ocean', label: '海浪', icon: '🌊', desc: '潮起潮落，循环往复', color: '#6b9fc4' },
  { id: 'forest', label: '森林', icon: '🌲', desc: '林间风声，自然白噪', color: '#6ee7b7' },
]

const NOISE_KEY = 'hf:white_noise'
const VOLUME_KEY = 'hf:white_noise_volume'

// ---- 模块级单例 ref ----
const playing = ref(false)
const currentSceneId = ref<string | null>(null)
const volume = ref(0.5)
const sleepMinutes = ref(0)

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let activeSource: AudioBufferSourceNode | null = null
let activeNodes: AudioNode[] = []
let timerHandle: ReturnType<typeof setTimeout> | null = null

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = volume.value
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function createNoiseBuffer(type: NoiseScene['id']): AudioBuffer {
  const c = ctx!
  const length = c.sampleRate * 4
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'white' || type === 'rain') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  } else if (type === 'pink' || type === 'forest') {
    // Paul Kellet 精炼粉红噪音
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else {
    // brown / ocean：积分白噪音
    let last = 0
    const step = type === 'brown' ? 0.02 : 0.008
    const amp = type === 'brown' ? 3.5 : 4
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1
      last = (last + step * w) / (1 + step)
      data[i] = last * amp
    }
  }
  return buffer
}

function buildScene(type: NoiseScene['id']): AudioBufferSourceNode {
  const c = ctx!
  const src = c.createBufferSource()
  src.buffer = createNoiseBuffer(type)
  src.loop = true
  activeNodes = [src]

  if (type === 'rain') {
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1200
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 300
    src.connect(lp)
    lp.connect(hp)
    hp.connect(masterGain!)
    activeNodes.push(lp, hp)
  } else if (type === 'ocean') {
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 800
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = c.createGain()
    lfoGain.gain.value = 300
    lfo.connect(lfoGain)
    lfoGain.connect(lp.frequency)
    lfo.start()
    src.connect(lp)
    lp.connect(masterGain!)
    activeNodes.push(lp, lfo, lfoGain)
  } else if (type === 'forest') {
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 800
    bp.Q.value = 0.6
    src.connect(bp)
    bp.connect(masterGain!)
    activeNodes.push(bp)
  } else if (type === 'pink' || type === 'brown') {
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = type === 'pink' ? 6000 : 3000
    src.connect(lp)
    lp.connect(masterGain!)
    activeNodes.push(lp)
  } else {
    src.connect(masterGain!)
  }
  return src
}

function clearTimer() {
  if (timerHandle) {
    clearTimeout(timerHandle)
    timerHandle = null
  }
  sleepMinutes.value = 0
}

function saveState() {
  storage.setKV(NOISE_KEY, currentSceneId.value ? { id: currentSceneId.value } : null)
}

function stopAll() {
  if (activeSource) {
    try { activeSource.stop() } catch { /* 已停止 */ }
    try { activeSource.disconnect() } catch { /* noop */ }
    activeSource = null
  }
  for (const n of activeNodes) {
    try { n.disconnect() } catch { /* noop */ }
  }
  activeNodes = []
  clearTimer()
  playing.value = false
  currentSceneId.value = null
}

function toggleScene(id: string) {
  const c = ensureContext()
  if (!c) return
  if (playing.value && currentSceneId.value === id) {
    stopAll()
    saveState()
    return
  }
  stopAll()
  activeSource = buildScene(id)
  activeSource.start()
  playing.value = true
  currentSceneId.value = id
  saveState()
}

function setVolume(v: number) {
  volume.value = v
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
  }
  storage.setKV(VOLUME_KEY, v)
}

function setSleepTimer(minutes: number) {
  clearTimer()
  if (minutes <= 0 || !playing.value) return
  sleepMinutes.value = minutes
  timerHandle = setTimeout(() => {
    stopAll()
    saveState()
  }, minutes * 60 * 1000)
}

function load() {
  try {
    volume.value = storage.getKV<number>(VOLUME_KEY, 0.5)
    const saved = storage.getKV<{ id: string } | null>(NOISE_KEY, null)
    if (saved && NOISE_SCENES.some(s => s.id === saved.id)) {
      currentSceneId.value = saved.id
    }
  } catch {
    /* 默认 */
  }
}

export function useWhiteNoise() {
  return {
    playing,
    currentSceneId,
    volume,
    sleepMinutes,
    load,
    toggleScene,
    stopAll,
    setVolume,
    setSleepTimer,
  }
}
