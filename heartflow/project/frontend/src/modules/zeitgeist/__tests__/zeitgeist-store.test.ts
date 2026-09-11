// ============================================================
// useZeitgeist 时令元数据存储层测试（INCR-91）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Storage Mock（与组件测试一致的 Map 模式）----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import { useZeitgeist } from '../zeitgeist'

describe('useZeitgeist 存储层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('默认偏好：自动采集开启、默认天气为空', () => {
    const zg = useZeitgeist()
    expect(zg.pref.value.autoCollect).toBe(true)
    expect(zg.pref.value.defaultWeather).toBeNull()
    expect(zg.enabled.value).toBe(true)
  })

  it('updatePref 持久化偏好', () => {
    const zg = useZeitgeist()
    zg.updatePref({ autoCollect: false, defaultWeather: 'rain' })
    expect(zg.pref.value.autoCollect).toBe(false)
    expect(zg.pref.value.defaultWeather).toBe('rain')
    expect(zg.enabled.value).toBe(false)
    expect(mockKV.get('hf:zeitgeist_pref')).toMatchObject({ autoCollect: false })
    // 重新创建实例读取已落盘偏好
    const zg2 = useZeitgeist()
    expect(zg2.pref.value.autoCollect).toBe(false)
  })

  it('collectNow 采集当前时令并落盘最近元数据', () => {
    const zg = useZeitgeist()
    const meta = zg.collectNow(new Date(2026, 2, 20, 14, 30), 'sunny')
    expect(meta.date).toBe('2026-03-20')
    expect(meta.shichen).toBe('未')
    expect(meta.solarTerm).toBe('春分')
    expect(meta.weather).toBe('sunny')
    expect(mockKV.get('hf:zeitgeist_last')?.date).toBe('2026-03-20')
    expect(zg.lastMeta()?.date).toBe('2026-03-20')
  })

  it('collectNow 未指定天气时使用默认天气', () => {
    const zg = useZeitgeist()
    zg.updatePref({ defaultWeather: 'snow' })
    const meta = zg.collectNow(new Date(2026, 0, 10, 9, 0))
    expect(meta.weather).toBe('snow')
  })

  it('lastMeta 无记录时返回 null', () => {
    const zg = useZeitgeist()
    expect(zg.lastMeta()).toBeNull()
  })
})
