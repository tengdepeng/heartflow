import { describe, it, expect, beforeEach } from 'vitest'
import {
  useLauncherSpace,
  __resetSpaceForTest,
  DEFAULT_SPACE_CONFIG,
  SPACE_PRESETS,
} from '../spaceTheme'

describe('Launcher · 空间风格配置（本地持久化）', () => {
  const { config, setLayout, setBackground, setFxIntensity, setAccent, setLabelMode, applyPreset, resetSpace } =
    useLauncherSpace()

  beforeEach(() => {
    __resetSpaceForTest()
  })

  it('默认配置为弧墙 + 无背景 + 悬停显示名称', () => {
    expect(config.value).toEqual(DEFAULT_SPACE_CONFIG)
    expect(config.value.layout).toBe('arc')
    expect(config.value.backgroundKind).toBe('none')
    expect(config.value.labelMode).toBe('hover')
  })

  it('切换空间形态会持久化', () => {
    setLayout('ring')
    expect(config.value.layout).toBe('ring')
    setLayout('grid')
    expect(config.value.layout).toBe('grid')
  })

  it('背景设为 none 时清空 source（不留脏数据）', () => {
    setBackground('image', 'data:image/png;base64,AAAA')
    expect(config.value.backgroundKind).toBe('image')
    expect(config.value.backgroundSource).toBe('data:image/png;base64,AAAA')
    setBackground('none', null)
    expect(config.value.backgroundSource).toBeNull()
  })

  it('特效强度被夹在 0..1，非法值回落 0', () => {
    setFxIntensity(0.42)
    expect(config.value.fxIntensity).toBeCloseTo(0.42, 6)
    setFxIntensity(5)
    expect(config.value.fxIntensity).toBe(1)
    setFxIntensity(-3)
    expect(config.value.fxIntensity).toBe(0)
    setFxIntensity(Number.NaN)
    expect(config.value.fxIntensity).toBe(0)
  })

  it('非法主色被忽略，保持原值', () => {
    setAccent('#5dcaa5')
    expect(config.value.accent).toBe('#5dcaa5')
    setAccent('not-a-color')
    expect(config.value.accent).toBe('#5dcaa5')
  })

  it('标签显示时机可切换', () => {
    expect(config.value.labelMode).toBe('hover')
    setLabelMode('always')
    expect(config.value.labelMode).toBe('always')
  })

  it('应用预设会整体替换配置；未知预设 id 无副作用', () => {
    setLayout('grid')
    applyPreset('starfield')
    const preset = SPACE_PRESETS.find((p) => p.id === 'starfield')!
    expect(config.value).toEqual(preset.config)
    applyPreset('__nope__')
    expect(config.value).toEqual(preset.config)
  })

  it('恢复默认回到出厂配置', () => {
    setLayout('grid')
    setFxIntensity(0.9)
    resetSpace()
    expect(config.value).toEqual(DEFAULT_SPACE_CONFIG)
  })

  it('所有预设自带合法配置（形态 / 主色 / 强度均合规）', () => {
    for (const p of SPACE_PRESETS) {
      expect(['arc', 'ring', 'grid']).toContain(p.config.layout)
      expect(p.config.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(p.config.fxIntensity).toBeGreaterThanOrEqual(0)
      expect(p.config.fxIntensity).toBeLessThanOrEqual(1)
    }
  })
})
