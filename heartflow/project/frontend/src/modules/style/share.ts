// ============================================================
// 风格包分享系统
// ============================================================

import type { StylePack } from '../../types'

/** 风格包分享格式（序列化交换格式） */
export interface StylePackShareFormat {
  formatVersion: 1
  id: string
  name: string
  version: string
  author: string
  description: string
  createdAt: string
  theme: StylePack['theme']
  fonts: StylePack['fonts']
  animations: StylePack['animations']
}

/** 导出当前风格包为分享格式 */
export function exportStylePack(pack: StylePack): StylePackShareFormat {
  return {
    formatVersion: 1,
    id: pack.id,
    name: pack.name,
    version: pack.version || '1.0.0',
    author: '心流工坊用户',
    description: `从心流工坊导出的风格包：${pack.name}`,
    createdAt: new Date().toISOString(),
    theme: pack.theme,
    fonts: pack.fonts,
    animations: pack.animations,
  }
}

/** 下载风格包为JSON文件 */
export function downloadStylePack(pack: StylePack) {
  const data = exportStylePack(pack)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stylepack-${pack.id}.hf-style.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 从JSON文件导入风格包 */
export function importStylePack(json: string): StylePackShareFormat | null {
  try {
    const data = JSON.parse(json) as StylePackShareFormat
    if (data.formatVersion !== 1) return null
    if (!data.id || !data.name || !data.theme) return null
    return data
  } catch {
    return null
  }
}

/** 将分享格式转换为内部 StylePack */
export function shareToStylePack(share: StylePackShareFormat): StylePack {
  return {
    id: share.id,
    name: share.name,
    version: share.version,
    theme: share.theme,
    fonts: share.fonts,
    animations: share.animations,
  }
}

/** 从基础色创建新风格包 */
export function createStylePackFromBaseColor(
  name: string,
  baseColor: string,
  mode: 'dark' | 'light',
): Pick<StylePack, 'id' | 'name' | 'version' | 'theme'> {
  return {
    id: `custom-${baseColor.replace('#', '')}`,
    name,
    version: '1.0.0',
    theme: {
      mode,
      colors: {
        accent: baseColor,
        bgPrimary: mode === 'dark' ? '#0a0a0f' : '#f5f5f7',
        bgSecondary: mode === 'dark' ? '#141218' : '#ffffff',
        textPrimary: mode === 'dark' ? '#e8e8ed' : '#1d1d1f',
        textSecondary: mode === 'dark' ? '#8e8e93' : '#636366',
        border: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      },
    },
  }
}