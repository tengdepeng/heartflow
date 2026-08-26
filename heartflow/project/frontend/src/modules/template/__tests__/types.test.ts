// ============================================================
// 模板系统 · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { exportTemplate, importTemplate } from '../types'

describe('exportTemplate', () => {
  it('导出为 TemplateShareFormat', () => {
    const result = exportTemplate({
      name: '测试模板',
      description: '一个测试',
      type: 'room',
      data: { room: 'study' },
      tags: ['test'],
    })
    expect(result.formatVersion).toBe(1)
    expect(result.name).toBe('测试模板')
    expect(result.type).toBe('room')
    expect(result.data).toEqual({ room: 'study' })
    expect(result.tags).toEqual(['test'])
  })

  it('包含默认作者', () => {
    const result = exportTemplate({
      name: '模板',
      description: '',
      type: 'advisor',
      data: {},
      tags: [],
    })
    expect(result.author).toBe('心流工坊用户')
  })

  it('生成 id 格式正确', () => {
    const r = exportTemplate({ name: 'a', description: '', type: 'room', data: {}, tags: [] })
    expect(r.id).toMatch(/^template-\d+$/)
  })
})

describe('importTemplate', () => {
  it('导入有效模板', () => {
    const exported = exportTemplate({
      name: '测试模板',
      description: '描述',
      type: 'room',
      data: { room: 'study' },
      tags: ['test'],
    })
    const result = importTemplate(JSON.stringify(exported))
    expect(result).not.toBeNull()
    expect(result!.name).toBe('测试模板')
    expect(result!.type).toBe('room')
  })

  it('formatVersion 不为 1 返回 null', () => {
    const result = importTemplate(JSON.stringify({ formatVersion: 2, name: 'x', type: 'room', data: {} }))
    expect(result).toBeNull()
  })

  it('缺少必要字段返回 null', () => {
    const result = importTemplate(JSON.stringify({ formatVersion: 1, name: 'x' }))
    expect(result).toBeNull()
  })

  it('无效 JSON 返回 null', () => {
    const result = importTemplate('invalid')
    expect(result).toBeNull()
  })
})