// ============================================================
// 写作提示词（用户模板）模块测试
// 隔离 storage（vi.hoisted + Map 后端），验证 CRUD / 复制内置 / 变量解析 / 预览。
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  return { store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, d: unknown) => (hoisted.store.has(k) ? hoisted.store.get(k) : d),
    setKV: (k: string, v: unknown) => {
      hoisted.store.set(k, v)
    },
    removeKV: (k: string) => {
      hoisted.store.delete(k)
    },
  },
}))

import {
  getUserTemplates,
  addUserTemplate,
  updateUserTemplate,
  removeUserTemplate,
  duplicateBuiltin,
  extractVariables,
  previewTemplate,
} from '../prompts'

beforeEach(() => hoisted.store.clear())

describe('extractVariables', () => {
  it('解析 {{变量}} 并去重保序', () => {
    const tpl = '你是{{role}}，为{{theme}}写{{role}}开篇'
    expect(extractVariables(tpl)).toEqual(['role', 'theme'])
  })

  it('容忍变量名内空白', () => {
    expect(extractVariables('{{ name }} 与 {{name}}')).toEqual(['name'])
  })

  it('支持中文变量名', () => {
    expect(extractVariables('给{{主题}}一个{{风格}}')).toEqual(['主题', '风格'])
  })

  it('无变量返回空数组', () => {
    expect(extractVariables('纯文本没有占位符')).toEqual([])
  })
})

describe('用户模板 CRUD', () => {
  it('初始为空', () => {
    expect(getUserTemplates()).toEqual([])
  })

  it('新增返回 builtin:false 且名称被 trim', () => {
    const t = addUserTemplate({ name: '  周报  ', systemTemplate: '写{{x}}', defaultVariables: { x: 'a' } })
    expect(t.builtin).toBe(false)
    expect(t.name).toBe('周报')
    expect(getUserTemplates()).toHaveLength(1)
    expect(getUserTemplates()[0].defaultVariables).toEqual({ x: 'a' })
  })

  it('更新可改名称 / 模板 / 变量', () => {
    const t = addUserTemplate({ name: 'A', systemTemplate: '{{a}}', defaultVariables: { a: '1' } })
    updateUserTemplate(t.id, { name: 'B', systemTemplate: '{{b}}', defaultVariables: { b: '2' } })
    const got = getUserTemplates()[0]
    expect(got.name).toBe('B')
    expect(got.systemTemplate).toBe('{{b}}')
    expect(got.defaultVariables).toEqual({ b: '2' })
  })

  it('删除按 id', () => {
    const a = addUserTemplate({ name: 'A', systemTemplate: 'x' })
    const b = addUserTemplate({ name: 'B', systemTemplate: 'y' })
    removeUserTemplate(a.id)
    const list = getUserTemplates()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(b.id)
  })
})

describe('duplicateBuiltin', () => {
  it('复制内置模板并带走默认变量', () => {
    const t = duplicateBuiltin('advisor-chat')
    expect(t).not.toBeNull()
    const all = getUserTemplates()
    expect(all).toHaveLength(1)
    expect(all[0].name).toContain('幕僚对话')
    // 内置 advisor-chat 带 defaultVariables（additionalRules / maxLength）
    expect(Object.keys(all[0].defaultVariables).length).toBeGreaterThan(0)
  })

  it('未知 id 返回 null', () => {
    expect(duplicateBuiltin('nope')).toBeNull()
  })
})

describe('previewTemplate', () => {
  it('用变量值渲染并清除未匹配的占位符', () => {
    const out = previewTemplate('你是{{role}}，主题{{theme}}', { role: '观察者' })
    expect(out).toContain('你是观察者')
    expect(out).toContain('主题')
    expect(out).not.toContain('{{theme}}')
  })
})
