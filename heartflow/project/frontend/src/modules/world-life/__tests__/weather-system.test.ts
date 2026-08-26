// ============================================================
// 天气系统 · 测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockKV: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, def: any) => mockKV[key] ?? def),
    setKV: vi.fn((key: string, val: any) => { mockKV[key] = val }),
  },
}))

beforeEach(() => {
  Object.keys(mockKV).forEach(k => delete mockKV[k])
})

import { useWeather, WEATHER_TYPES } from '../weather-system'

describe('weather-system 天气系统', () => {
  it('useWeather 返回 API 对象', () => {
    const api = useWeather()
    expect(api).toBeDefined()
    expect(typeof api.setWeather).toBe('function')
    expect(typeof api.load).toBe('function')
    expect(typeof api.nextWeather).toBe('function')
    expect(typeof api.randomWeather).toBe('function')
  })

  it('load 默认天气为 clear', () => {
    const api = useWeather()
    api.load()
    expect(api.currentWeather.value).toBe('clear')
  })

  it('setWeather 切换天气类型', () => {
    const api = useWeather()
    api.load()
    api.setWeather('rain')
    expect(api.currentWeather.value).toBe('rain')
  })

  it('setWeather 设置强度', () => {
    const api = useWeather()
    api.load()
    api.setWeather('snow', 0.8)
    expect(api.weatherIntensity.value).toBe(0.8)
    expect(api.weather.value.intensity).toBe(0.8)
  })

  it('setIntensity 限制在 0-1 范围内', () => {
    const api = useWeather()
    api.load()
    api.setIntensity(1.5)
    expect(api.weatherIntensity.value).toBe(1)
    api.setIntensity(-0.5)
    expect(api.weatherIntensity.value).toBe(0)
  })

  it('nextWeather 切换到下一个天气', () => {
    const api = useWeather()
    api.load()
    api.setWeather('clear')
    api.nextWeather()
    expect(api.currentWeather.value).toBe('partly-cloudy')
  })

  it('weather 计算属性返回完整信息', () => {
    const api = useWeather()
    api.load()
    api.setWeather('rain', 0.6)
    expect(api.weather.value.type).toBe('rain')
    expect(api.weather.value.label).toBe('雨')
    expect(api.weather.value.intensity).toBe(0.6)
  })

  it('cssOverlay 返回 CSS 变量', () => {
    const api = useWeather()
    api.load()
    api.setWeather('fog', 0.5)
    const overlay = api.cssOverlay.value
    expect(overlay).toHaveProperty('--weather-overlay')
    expect(overlay).toHaveProperty('--weather-particle-multiplier')
  })

  it('allWeatherTypes 包含全部 8 种天气', () => {
    const api = useWeather()
    api.load()
    expect(api.allWeatherTypes.length).toBe(8)
  })

  it('autoCycle 默认 false', () => {
    const api = useWeather()
    api.load()
    expect(api.autoCycle.value).toBe(false)
  })

  it('startAutoCycle / stopAutoCycle', () => {
    const api = useWeather()
    api.load()
    api.startAutoCycle()
    expect(api.autoCycle.value).toBe(true)
    api.stopAutoCycle()
    expect(api.autoCycle.value).toBe(false)
  })

  it('WEATHER_TYPES 包含所有定义', () => {
    const keys = Object.keys(WEATHER_TYPES)
    expect(keys).toContain('clear')
    expect(keys).toContain('rain')
    expect(keys).toContain('snow')
    expect(keys).toContain('fog')
    expect(keys).toContain('thunderstorm')
  })
})