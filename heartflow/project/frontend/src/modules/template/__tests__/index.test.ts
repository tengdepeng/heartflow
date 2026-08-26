// ============================================================
// 模板系统 · Store 测试
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTemplateStore } from '../index'

// 模拟 storage/kv 模块
const kvStore: Record<string, any> = {}
vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, defaultVal: any) => {
    const val = kvStore[key]
    return val !== undefined ? val : defaultVal
  },
  setKV: (key: string, val: any) => { kvStore[key] = val },
}))

describe('useTemplateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 清空 kv 存储
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('初始化时加载内置模板', () => {
    const store = useTemplateStore()
    // 6 个房间 + 4 个幕僚
    expect(store.totalCount).toBe(10)
    expect(store.roomCount).toBe(6)
    expect(store.advisorCount).toBe(4)
  })

  it('计算属性 roomTemplates 只返回房间模板', () => {
    const store = useTemplateStore()
    expect(store.roomTemplates.length).toBe(6)
    expect(store.roomTemplates.every(t => t.type === 'room')).toBe(true)
  })

  it('计算属性 advisorTemplates 只返回幕僚模板', () => {
    const store = useTemplateStore()
    expect(store.advisorTemplates.length).toBe(4)
    expect(store.advisorTemplates.every(t => t.type === 'advisor')).toBe(true)
  })

  it('createTemplate 添加新模板并持久化', () => {
    const store = useTemplateStore()
    const tmpl = store.createTemplate({
      name: '我的模板',
      description: '测试模板',
      type: 'room',
      tags: ['test'],
      data: { room: 'study' },
    })
    expect(tmpl.name).toBe('我的模板')
    expect(tmpl.author).toBe('心流工坊用户')
    expect(store.totalCount).toBe(11)
    // 持久化验证
    expect(kvStore['hf:templates']).toBeDefined()
    expect(kvStore['hf:templates'].length).toBe(1)
  })

  it('removeTemplate 删除用户自定义模板', () => {
    const store = useTemplateStore()
    const tmpl = store.createTemplate({ name: '待删', description: '', type: 'room', tags: [], data: {} })
    expect(store.removeTemplate(tmpl.id)).toBe(true)
    expect(store.totalCount).toBe(10)
  })

  it('removeTemplate 不允许删除内置模板', () => {
    const store = useTemplateStore()
    expect(store.removeTemplate('room-minimal-study')).toBe(false)
    expect(store.totalCount).toBe(10)
  })

  it('updateTemplate 更新用户模板', () => {
    const store = useTemplateStore()
    const tmpl = store.createTemplate({ name: '旧名', description: '旧描述', type: 'room', tags: [], data: {} })
    expect(store.updateTemplate(tmpl.id, { name: '新名', description: '新描述' })).toBe(true)
    const updated = store.templates.find(t => t.id === tmpl.id)
    expect(updated?.name).toBe('新名')
    expect(updated?.description).toBe('新描述')
  })

  it('updateTemplate 不允许更新内置模板', () => {
    const store = useTemplateStore()
    expect(store.updateTemplate('room-minimal-study', { name: '新名' })).toBe(false)
  })

  it('applyTemplate / unapplyTemplate', () => {
    const store = useTemplateStore()
    expect(store.applyTemplate('room-minimal-study')).toBe(true)
    expect(store.appliedRoomId).toBe('room-minimal-study')
    expect(store.unapplyTemplate('room-minimal-study')).toBe(true)
    expect(store.appliedRoomId).toBeNull()
  })

  it('applyTemplate 幕僚类型', () => {
    const store = useTemplateStore()
    expect(store.applyTemplate('advisor-wise-elder')).toBe(true)
    expect(store.appliedAdvisorId).toBe('advisor-wise-elder')
  })

  it('importShareFormat 导入模板', () => {
    const store = useTemplateStore()
    const result = store.importShareFormat({
      formatVersion: 1,
      id: 'imported-test-1',
      name: '导入模板',
      description: '从外部导入',
      author: '外部用户',
      type: 'room',
      data: { layout: 'single' },
      tags: ['导入'],
      createdAt: new Date().toISOString(),
    })
    expect(result).not.toBeNull()
    expect(result!.name).toBe('导入模板')
    expect(store.totalCount).toBe(11)
  })

  it('importShareFormat 重复 id 不导入', () => {
    const store = useTemplateStore()
    const result = store.importShareFormat({
      formatVersion: 1,
      id: 'room-minimal-study',
      name: '重复',
      description: '',
      author: '',
      type: 'room',
      data: {},
      tags: [],
      createdAt: new Date().toISOString(),
    })
    expect(result).toBeNull()
  })

  it('setSearch 过滤模板', () => {
    const store = useTemplateStore()
    store.setSearch('冥想')
    expect(store.roomTemplates.length).toBe(1)
    expect(store.roomTemplates[0].name).toBe('冥想庭院')
    store.setSearch('')
    expect(store.roomTemplates.length).toBe(6)
  })

  it('exportTemplate 返回 true 对存在的模板', () => {
    const store = useTemplateStore()
    expect(store.exportTemplate('room-minimal-study')).toBe(true)
  })

  it('exportTemplate 返回 false 对不存在的模板', () => {
    const store = useTemplateStore()
    expect(store.exportTemplate('nonexistent')).toBe(false)
  })
})