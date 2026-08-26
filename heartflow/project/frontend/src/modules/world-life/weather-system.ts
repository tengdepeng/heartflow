// ============================================================
// 世界生命系统 · 天气系统
// 管理天气状态：晴天/多云/雨/雪/雾/风暴，支持手动切换与自动循环。
// 蓝图：世界级生命系统 — 昼夜/天气/传承
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 天气类型 ----

export type WeatherType = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'thunderstorm' | 'snow' | 'fog' | 'wind'

export interface WeatherInfo {
  type: WeatherType
  label: string
  icon: string
  /** 天气强度 0-1 */
  intensity: number
  /** 对氛围光色的影响（叠加在时段色上） */
  colorOverlay: string
  /** 透明度叠加 */
  opacityOverlay: number
  /** 对粒子密度的影响倍数 */
  particleMultiplier: number
  /** 过渡速度 */
  transitionSpeed: 'slow' | 'normal' | 'fast'
}

export const WEATHER_TYPES: Record<WeatherType, Omit<WeatherInfo, 'intensity'>> = {
  'clear': {
    type: 'clear', label: '晴天', icon: '☀️',
    colorOverlay: 'rgba(255,255,200,0.0)', opacityOverlay: 0,
    particleMultiplier: 1.0, transitionSpeed: 'fast',
  },
  'partly-cloudy': {
    type: 'partly-cloudy', label: '多云', icon: '⛅',
    colorOverlay: 'rgba(200,200,210,0.05)', opacityOverlay: 0.05,
    particleMultiplier: 0.9, transitionSpeed: 'normal',
  },
  'cloudy': {
    type: 'cloudy', label: '阴天', icon: '☁️',
    colorOverlay: 'rgba(160,165,180,0.12)', opacityOverlay: 0.1,
    particleMultiplier: 0.7, transitionSpeed: 'slow',
  },
  'rain': {
    type: 'rain', label: '雨', icon: '🌧️',
    colorOverlay: 'rgba(100,120,160,0.18)', opacityOverlay: 0.15,
    particleMultiplier: 1.3, transitionSpeed: 'slow',
  },
  'thunderstorm': {
    type: 'thunderstorm', label: '雷暴', icon: '⛈️',
    colorOverlay: 'rgba(60,70,100,0.25)', opacityOverlay: 0.2,
    particleMultiplier: 1.6, transitionSpeed: 'fast',
  },
  'snow': {
    type: 'snow', label: '雪', icon: '❄️',
    colorOverlay: 'rgba(220,225,240,0.15)', opacityOverlay: 0.12,
    particleMultiplier: 1.4, transitionSpeed: 'slow',
  },
  'fog': {
    type: 'fog', label: '雾', icon: '🌫️',
    colorOverlay: 'rgba(180,185,195,0.2)', opacityOverlay: 0.18,
    particleMultiplier: 0.5, transitionSpeed: 'slow',
  },
  'wind': {
    type: 'wind', label: '风', icon: '💨',
    colorOverlay: 'rgba(180,190,200,0.06)', opacityOverlay: 0.04,
    particleMultiplier: 1.2, transitionSpeed: 'fast',
  },
}

// 自然天气序列（用于自动循环时按顺序过渡）
const WEATHER_SEQUENCE: WeatherType[] = [
  'clear', 'partly-cloudy', 'cloudy', 'rain', 'clear',
  'fog', 'clear', 'wind', 'partly-cloudy', 'snow', 'clear',
]

// ---- 存储键 ----

const WEATHER_KEY = 'hf:world_life:weather'
const WEATHER_AUTO_KEY = 'hf:world_life:weather_auto'

// ---- 模块级状态 ----

const currentWeather = ref<WeatherType>('clear')
const weatherIntensity = ref<number>(0.5)
const autoCycle = ref<boolean>(false)
const autoCycleIndex = ref<number>(0)

let cycleIntervalId: ReturnType<typeof setInterval> | null = null

// ---- 公共 API ----

export function useWeather() {
  /** 加载持久化状态 */
  function load(): void {
    try {
      currentWeather.value = storage.getKV<WeatherType>(WEATHER_KEY, 'clear')
      weatherIntensity.value = storage.getKV<number>(`${WEATHER_KEY}_intensity`, 0.5)
      autoCycle.value = storage.getKV<boolean>(WEATHER_AUTO_KEY, false)
    } catch {
      currentWeather.value = 'clear'
      weatherIntensity.value = 0.5
      autoCycle.value = false
    }
    if (autoCycle.value) startAutoCycle()
  }

  /** 当前天气完整信息 */
  const weather = computed<WeatherInfo>(() => ({
    ...WEATHER_TYPES[currentWeather.value],
    intensity: weatherIntensity.value,
  }))

  /** 设置天气 */
  function setWeather(type: WeatherType, intensity?: number): void {
    currentWeather.value = type
    if (intensity !== undefined) {
      weatherIntensity.value = Math.max(0, Math.min(1, intensity))
    }
    storage.setKV(WEATHER_KEY, type)
    storage.setKV(`${WEATHER_KEY}_intensity`, weatherIntensity.value)
  }

  /** 设置天气强度 */
  function setIntensity(value: number): void {
    weatherIntensity.value = Math.max(0, Math.min(1, value))
    storage.setKV(`${WEATHER_KEY}_intensity`, weatherIntensity.value)
  }

  /** 切换到下一个天气（按自然序列） */
  function nextWeather(): void {
    const idx = WEATHER_SEQUENCE.indexOf(currentWeather.value)
    const next = WEATHER_SEQUENCE[(idx + 1) % WEATHER_SEQUENCE.length]
    setWeather(next)
  }

  /** 随机天气 */
  function randomWeather(): void {
    const types = Object.keys(WEATHER_TYPES) as WeatherType[]
    const weights = [0.3, 0.2, 0.15, 0.1, 0.05, 0.05, 0.1, 0.05] // clear 概率最高
    const r = Math.random()
    let cumulative = 0
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i]
      if (r <= cumulative) {
        setWeather(types[i], Math.random() * 0.5 + 0.3)
        return
      }
    }
    setWeather('clear')
  }

  /** 启动自动循环（每 30 分钟切换一次天气） */
  function startAutoCycle(): void {
    autoCycle.value = true
    storage.setKV(WEATHER_AUTO_KEY, true)
    if (cycleIntervalId) return
    cycleIntervalId = setInterval(() => {
      autoCycleIndex.value = (autoCycleIndex.value + 1) % WEATHER_SEQUENCE.length
      setWeather(WEATHER_SEQUENCE[autoCycleIndex.value])
    }, 30 * 60 * 1000)
  }

  /** 停止自动循环 */
  function stopAutoCycle(): void {
    autoCycle.value = false
    storage.setKV(WEATHER_AUTO_KEY, false)
    if (cycleIntervalId) {
      clearInterval(cycleIntervalId)
      cycleIntervalId = null
    }
  }

  /** 获取 CSS 叠加变量（用于全局氛围） */
  const cssOverlay = computed<Record<string, string>>(() => {
    const w = weather.value
    const alpha = w.opacityOverlay * w.intensity
    return {
      '--weather-overlay': w.colorOverlay.replace(/[\d.]+\)$/, `${alpha})`),
      '--weather-particle-multiplier': String(w.particleMultiplier * w.intensity),
    }
  })

  /** 所有天气类型列表 */
  const allWeatherTypes = Object.entries(WEATHER_TYPES).map(([type, info]) => ({
    type: type as WeatherType,
    label: info.label,
    icon: info.icon,
  }))

  return {
    currentWeather,
    weatherIntensity,
    autoCycle,
    weather,
    cssOverlay,
    allWeatherTypes,
    load,
    setWeather,
    setIntensity,
    nextWeather,
    randomWeather,
    startAutoCycle,
    stopAutoCycle,
  }
}