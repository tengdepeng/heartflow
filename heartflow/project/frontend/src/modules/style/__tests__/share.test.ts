// ============================================================
// 风格包分享系统 · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import type { StylePack } from '../../../types'
import { exportStylePack, importStylePack, shareToStylePack, createStylePackFromBaseColor } from '../share'

const mockPack: StylePack = {
  id: 'test-pack',
  name: '测试风格',
  version: '1.0.0',
  theme: {
    mode: 'dark',
    colors: {
      accent: '#7c5cfc',
      bgPrimary: '#0a0a0f',
      bgSecondary: '#141218',
      textPrimary: '#e8e8ed',
      textSecondary: '#8e8e93',
      border: 'rgba(255,255,255,0.06)',
    },
  },
  fonts: {
    display: 'sans-serif',
    body: 'sans-serif',
    mono: 'monospace',
  },
  animations: {
    breathingSpeed: 8000,
    particleDensity: 0.5,
  },
}

describe('exportStylePack', () => {
  it('导出为 StylePackShareFormat', () => {
    const result = exportStylePack(mockPack)
    expect(result.formatVersion).toBe(1)
    expect(result.id).toBe('test-pack')
    expect(result.name).toBe('测试风格')
    expect(result.theme.mode).toBe('dark')
  })

  it('包含版本号', () => {
    const result = exportStylePack(mockPack)
    expect(result.version).toBe('1.0.0')
  })

  it('包含默认作者', () => {
    const result = exportStylePack(mockPack)
    expect(result.author).toBe('心流工坊用户')
  })

  it('包含导出时间', () => {
    const result = exportStylePack(mockPack)
    expect(result.createdAt).toBeTruthy()
  })
})

describe('importStylePack', () => {
  it('导入有效 JSON', () => {
    const json = JSON.stringify(exportStylePack(mockPack))
    const result = importStylePack(json)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('测试风格')
  })

  it('formatVersion 不为 1 返回 null', () => {
    const data = { ...exportStylePack(mockPack), formatVersion: 2 }
    const result = importStylePack(JSON.stringify(data))
    expect(result).toBeNull()
  })

  it('缺少必要字段返回 null', () => {
    const result = importStylePack(JSON.stringify({ formatVersion: 1 }))
    expect(result).toBeNull()
  })

  it('无效 JSON 返回 null', () => {
    const result = importStylePack('not json')
    expect(result).toBeNull()
  })
})

describe('shareToStylePack', () => {
  it('将分享格式转为内部 StylePack', () => {
    const share = exportStylePack(mockPack)
    const result = shareToStylePack(share)
    expect(result.id).toBe('test-pack')
    expect(result.name).toBe('测试风格')
    expect(result.theme).toEqual(mockPack.theme)
    expect(result.fonts).toEqual(mockPack.fonts)
    expect(result.animations).toEqual(mockPack.animations)
  })
})

describe('createStylePackFromBaseColor', () => {
  it('深色模式', () => {
    const result = createStylePackFromBaseColor('暗紫', '#7c5cfc', 'dark')
    expect(result.name).toBe('暗紫')
    expect(result.id).toBe('custom-7c5cfc')
    expect(result.theme.mode).toBe('dark')
    expect(result.theme.colors.accent).toBe('#7c5cfc')
  })

  it('浅色模式', () => {
    const result = createStylePackFromBaseColor('亮白', '#ffffff', 'light')
    expect(result.theme.mode).toBe('light')
    expect(result.theme.colors.bgPrimary).toBe('#f5f5f7')
  })

  it('名称包含 # 时被替换', () => {
    const result = createStylePackFromBaseColor('红', '#ff0000', 'dark')
    expect(result.id).toBe('custom-ff0000')
  })
})