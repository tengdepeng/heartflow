// ============================================================
// 模板系统 · 类型定义
// ============================================================

import { assertShareLocalOnly } from '../share/share-local'

/** 房间模板 */
export interface RoomTemplate {
  id: string
  name: string
  description: string
  author: string
  version: string
  type: 'room' | 'advisor'
  /** 模板数据（JSON格式的房间配置或幕僚性格配置） */
  data: Record<string, any>
  createdAt: string
  tags: string[]
  preview?: string
}

/** 模板分享格式 */
export interface TemplateShareFormat {
  formatVersion: 1
  id: string
  name: string
  description: string
  author: string
  type: 'room' | 'advisor'
  data: Record<string, any>
  tags: string[]
  createdAt: string
}

/** 导出模板为分享格式 */
export function exportTemplate(
  template: Pick<RoomTemplate, 'name' | 'description' | 'type' | 'data' | 'tags'>
): TemplateShareFormat {
  return {
    formatVersion: 1,
    id: `template-${Date.now()}`,
    name: template.name,
    description: template.description,
    author: '心流工坊用户',
    type: template.type,
    data: template.data,
    tags: template.tags,
    createdAt: new Date().toISOString(),
  }
}

/** 下载模板为JSON文件 */
export function downloadTemplate(template: TemplateShareFormat) {
  // 第43条本地边界：模板分享仅限本地 .hf-template 文件，拦截任何云端目标
  assertShareLocalOnly('local')
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `template-${template.name}.hf-template.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 导入模板 */
export function importTemplate(json: string): TemplateShareFormat | null {
  try {
    const data = JSON.parse(json) as TemplateShareFormat
    if (data.formatVersion !== 1) return null
    if (!data.name || !data.type || !data.data) return null
    return data
  } catch {
    return null
  }
}