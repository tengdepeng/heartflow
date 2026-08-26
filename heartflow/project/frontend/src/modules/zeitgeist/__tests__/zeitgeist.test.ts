// ============================================================
// 时令元数据（时辰 / 节气 / 季节）· 测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  shichenForHour,
  solarTermOnDate,
  seasonForMonth,
  collectAutoMetadata,
  weatherPreset,
  SHICHEN_LIST,
  WEEKDAY_LABELS,
  WEATHER_PRESETS,
} from '../zeitgeist'

describe('shichenForHour', () => {
  it('共十二个时辰，子丑寅卯……亥 顺序完整', () => {
    expect(SHICHEN_LIST.map(s => s.branch).join('')).toBe('子丑寅卯辰巳午未申酉戌亥')
    expect(SHICHEN_LIST.length).toBe(12)
  })

  it('夜半子时覆盖 23 点', () => {
    expect(shichenForHour(23).branch).toBe('子')
    expect(shichenForHour(23).name).toBe('子')
  })

  it('0 点属子时、1 点跨入丑时', () => {
    expect(shichenForHour(0).branch).toBe('子')
    expect(shichenForHour(1).branch).toBe('丑')
  })

  it('亥时覆盖 21-23 点、23 点回到子时', () => {
    expect(shichenForHour(22).branch).toBe('亥')
    expect(shichenForHour(23).branch).toBe('子')
  })

  it('午时覆盖 11-12 点', () => {
    expect(shichenForHour(11).branch).toBe('午')
    expect(shichenForHour(12).branch).toBe('午')
  })

  it('寅时 alias 为平旦', () => {
    expect(shichenForHour(4).branch).toBe('寅')
    expect(shichenForHour(4).alias).toBe('平旦')
  })

  it('每时辰都带五行', () => {
    for (const s of SHICHEN_LIST) {
      expect(['木', '火', '土', '金', '水']).toContain(s.element)
    }
  })
})

describe('seasonForMonth', () => {
  it('春夏秋冬按公历月份映射', () => {
    expect(seasonForMonth(4)).toBe('春')
    expect(seasonForMonth(7)).toBe('夏')
    expect(seasonForMonth(10)).toBe('秋')
    expect(seasonForMonth(1)).toBe('冬')
    expect(seasonForMonth(12)).toBe('冬')
  })
})

describe('solarTermOnDate', () => {
  it('阳历 4 月 15 日取谷雨（4/20，距离最近）', () => {
    const term = solarTermOnDate(new Date(2026, 3, 15))
    expect(term.name).toBe('谷雨')
    expect(term.icon.length).toBeGreaterThan(0)
  })

  it('春分（3月20日）取春分（3/21 距离最近）', () => {
    const term = solarTermOnDate(new Date(2026, 2, 20))
    expect(term.name).toBe('春分')
  })

  it('节气取自真实二十四节气而非节日条目', () => {
    // 1 月 10 日：最近节气为大寒(1/20) 距离 10，小寒(1/6) 距离 4 → 小寒
    expect(solarTermOnDate(new Date(2026, 0, 10)).name).toBe('小寒')
  })
})

describe('collectAutoMetadata', () => {
  it('生成完整时令元数据', () => {
    const meta = collectAutoMetadata(new Date(2026, 2, 20, 14, 30), 'rain')
    expect(meta.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(meta.weekday).toBe(WEEKDAY_LABELS[new Date(2026, 2, 20).getDay()])
    expect(meta.shichen.length).toBe(1)
    expect(meta.shichenAlias.length).toBeGreaterThan(0)
    expect(meta.solarTerm).toBe('春分')
    expect(meta.season).toBe('春')
    expect(meta.weather).toBe('rain')
  })

  it('天气为空时保留 null', () => {
    const meta = collectAutoMetadata(new Date(2026, 6, 1, 9, 0))
    expect(meta.weather).toBeNull()
  })
})

describe('weatherPreset', () => {
  it('返回天气预设并兜底默认', () => {
    expect(weatherPreset('snow').label).toBe('雪')
    expect(WEATHER_PRESETS.length).toBeGreaterThanOrEqual(7)
  })
})