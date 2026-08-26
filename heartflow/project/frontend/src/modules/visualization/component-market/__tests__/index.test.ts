// ============================================================
// 组件市场注册表 · 单元测试
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerComponent,
  registerComponents,
  getComponent,
  getComponentsByCategory,
  getAllComponents,
  installComponent,
  uninstallComponent,
  toggleComponent,
  updateComponent,
  removeComponent,
  getInstalledComponents,
  getComponentCount,
  getInstalledCount,
  getCategoryDisplay,
  searchComponents,
  clearRegistry,
  initBuiltinComponents,
} from '../index'
import type { ComponentRegistration } from '../index'

beforeEach(() => {
  clearRegistry()
})

// ---- 注册 ----

describe('registerComponent', () => {
  it('应该注册单个组件并返回完整条目', () => {
    const item = registerComponent({
      id: 'test-chart',
      type: 'bar',
      name: '测试柱状图',
      description: '用于测试的柱状图',
      category: 'chart',
      color: '#ff6b6b',
      enabled: true,
    })
    expect(item.id).toBe('test-chart')
    expect(item.name).toBe('测试柱状图')
    expect(item.category).toBe('chart')
    expect(item.enabled).toBe(true)
    // 默认值
    expect(item.size).toBe('medium')
    expect(item.showLegend).toBe(true)
    expect(item.showGrid).toBe(true)
    expect(item.animated).toBe(true)
  })

  it('注册时不传 color 应使用默认值', () => {
    const item = registerComponent({
      id: 'no-color',
      type: 'line',
      name: '无颜色',
      description: '测试默认颜色',
      category: 'chart',
    })
    expect(item.color).toBe('#d4a574')
  })

  it('注册时不传 enabled 应默认禁用', () => {
    const item = registerComponent({
      id: 'no-enabled',
      type: 'line',
      name: '未启用',
      description: '测试默认启用状态',
      category: 'chart',
    })
    expect(item.enabled).toBe(false)
  })
})

describe('registerComponents', () => {
  it('应该批量注册组件', () => {
    const configs: ComponentRegistration[] = [
      { id: 'a', type: 'line', name: 'A', description: '组件A', category: 'chart' },
      { id: 'b', type: 'bar', name: 'B', description: '组件B', category: 'chart', enabled: true },
    ]
    const items = registerComponents(configs)
    expect(items).toHaveLength(2)
    expect(getComponentCount()).toBe(2)
  })
})

// ---- 查询 ----

describe('getComponent', () => {
  it('应该返回已注册的组件', () => {
    registerComponent({ id: 'my-comp', type: 'line', name: '我的组件', description: 'desc', category: 'chart' })
    const comp = getComponent('my-comp')
    expect(comp).toBeDefined()
    expect(comp!.name).toBe('我的组件')
  })

  it('不存在的组件应返回 undefined', () => {
    expect(getComponent('non-existent')).toBeUndefined()
  })
})

describe('getComponentsByCategory', () => {
  it('应该按分类过滤组件', () => {
    registerComponents([
      { id: 'c1', type: 'line', name: 'C1', description: '图表1', category: 'chart' },
      { id: 'c2', type: 'bar', name: 'C2', description: '图表2', category: 'chart' },
      { id: 'd1', type: 'radar', name: 'D1', description: '示意图1', category: 'diagram' },
      { id: 'w1', type: 'gauge', name: 'W1', description: '小部件1', category: 'widget' },
    ])
    expect(getComponentsByCategory('chart')).toHaveLength(2)
    expect(getComponentsByCategory('diagram')).toHaveLength(1)
    expect(getComponentsByCategory('widget')).toHaveLength(1)
  })
})

describe('getAllComponents', () => {
  it('没有组件时应返回空数组', () => {
    expect(getAllComponents()).toEqual([])
  })

  it('应返回所有已注册组件', () => {
    registerComponents([
      { id: 'a', type: 'line', name: 'A', description: 'desc', category: 'chart' },
      { id: 'b', type: 'bar', name: 'B', description: 'desc', category: 'chart' },
    ])
    expect(getAllComponents()).toHaveLength(2)
  })
})

// ---- 安装/卸载 ----

describe('installComponent', () => {
  it('应该启用组件', () => {
    registerComponent({ id: 'test', type: 'line', name: '测试', description: 'desc', category: 'chart' })
    expect(installComponent('test')).toBe(true)
    expect(getComponent('test')!.enabled).toBe(true)
  })

  it('再次安装已启用的组件应返回 false', () => {
    registerComponent({ id: 'test', type: 'line', name: '测试', description: 'desc', category: 'chart', enabled: true })
    expect(installComponent('test')).toBe(false)
  })

  it('安装不存在的组件应返回 false', () => {
    expect(installComponent('non-existent')).toBe(false)
  })
})

describe('uninstallComponent', () => {
  it('应该禁用组件', () => {
    registerComponent({ id: 'test', type: 'line', name: '测试', description: 'desc', category: 'chart', enabled: true })
    expect(uninstallComponent('test')).toBe(true)
    expect(getComponent('test')!.enabled).toBe(false)
  })

  it('卸载不存在的组件应返回 false', () => {
    expect(uninstallComponent('non-existent')).toBe(false)
  })
})

describe('toggleComponent', () => {
  it('应该切换组件启用状态', () => {
    registerComponent({ id: 'test', type: 'line', name: '测试', description: 'desc', category: 'chart', enabled: false })
    expect(toggleComponent('test')).toBe(true)
    expect(toggleComponent('test')).toBe(false)
  })

  it('切换不存在的组件应返回 undefined', () => {
    expect(toggleComponent('non-existent')).toBeUndefined()
  })
})

describe('getInstalledComponents', () => {
  it('应该只返回已启用的组件', () => {
    registerComponents([
      { id: 'a', type: 'line', name: 'A', description: 'desc', category: 'chart', enabled: true },
      { id: 'b', type: 'bar', name: 'B', description: 'desc', category: 'chart', enabled: false },
      { id: 'c', type: 'ring', name: 'C', description: 'desc', category: 'chart', enabled: true },
    ])
    const installed = getInstalledComponents()
    expect(installed).toHaveLength(2)
    expect(installed.map(c => c.id)).toEqual(['a', 'c'])
  })
})

// ---- 计数 ----

describe('getComponentCount / getInstalledCount', () => {
  it('应该返回正确的计数', () => {
    expect(getComponentCount()).toBe(0)
    expect(getInstalledCount()).toBe(0)

    registerComponents([
      { id: 'a', type: 'line', name: 'A', description: 'desc', category: 'chart', enabled: true },
      { id: 'b', type: 'bar', name: 'B', description: 'desc', category: 'chart', enabled: false },
    ])
    expect(getComponentCount()).toBe(2)
    expect(getInstalledCount()).toBe(1)
  })
})

// ---- 更新 ----

describe('updateComponent', () => {
  it('应该更新组件字段', () => {
    registerComponent({ id: 'test', type: 'line', name: '旧名', description: '旧描述', category: 'chart' })
    const updated = updateComponent('test', { name: '新名', description: '新描述', showLegend: false })
    expect(updated).toBeDefined()
    expect(updated!.name).toBe('新名')
    expect(updated!.description).toBe('新描述')
    expect(updated!.showLegend).toBe(false)
    // 未更新的字段保持不变
    expect(updated!.size).toBe('medium')
  })

  it('更新不存在的组件应返回 undefined', () => {
    expect(updateComponent('non-existent', { name: '新名' })).toBeUndefined()
  })
})

// ---- 删除 ----

describe('removeComponent', () => {
  it('应该删除已注册的组件', () => {
    registerComponent({ id: 'test', type: 'line', name: '测试', description: 'desc', category: 'chart' })
    expect(removeComponent('test')).toBe(true)
    expect(getComponent('test')).toBeUndefined()
  })

  it('删除不存在的组件应返回 false', () => {
    expect(removeComponent('non-existent')).toBe(false)
  })
})

// ---- 搜索 ----

describe('searchComponents', () => {
  it('空查询应返回所有组件', () => {
    registerComponents([
      { id: 'a', type: 'line', name: 'A', description: 'desc', category: 'chart' },
      { id: 'b', type: 'bar', name: 'B', description: 'desc', category: 'chart' },
    ])
    expect(searchComponents('')).toHaveLength(2)
  })

  it('应该按名称匹配', () => {
    registerComponent({ id: 'test', type: 'line', name: '折线图', description: '趋势展示', category: 'chart' })
    expect(searchComponents('折线')).toHaveLength(1)
    expect(searchComponents('柱状')).toHaveLength(0)
  })

  it('应该按描述匹配', () => {
    registerComponent({ id: 'test', type: 'bar', name: '柱状图', description: '比较不同类别的数值', category: 'chart' })
    expect(searchComponents('比较')).toHaveLength(1)
  })

  it('应该按 ID 匹配', () => {
    registerComponent({ id: 'my-special-chart', type: 'line', name: '图表', description: 'desc', category: 'chart' })
    expect(searchComponents('special')).toHaveLength(1)
  })

  it('应该按分类匹配', () => {
    registerComponent({ id: 'test', type: 'gauge', name: '仪表盘', description: 'desc', category: 'widget' })
    expect(searchComponents('widget')).toHaveLength(1)
  })

  it('搜索不区分大小写', () => {
    registerComponent({ id: 'Line-Chart', type: 'line', name: 'Line Chart', description: 'Show trends', category: 'chart' })
    expect(searchComponents('line')).toHaveLength(1)
    expect(searchComponents('LINE')).toHaveLength(1)
  })
})

// ---- 分类显示 ----

describe('getCategoryDisplay', () => {
  it('应该返回分类显示信息', () => {
    const display = getCategoryDisplay()
    expect(display.chart).toEqual({ icon: '📊', label: '图表' })
    expect(display.diagram).toEqual({ icon: '🔷', label: '示意图' })
    expect(display.widget).toEqual({ icon: '🧩', label: '小部件' })
  })
})

// ---- 初始化内置组件 ----

describe('initBuiltinComponents', () => {
  it('应该初始化 13 个内置组件', () => {
    const items = initBuiltinComponents()
    expect(items).toHaveLength(13)
    // 验证折线图和柱状图默认启用
    expect(getComponent('line-chart')!.enabled).toBe(true)
    expect(getComponent('bar-chart')!.enabled).toBe(true)
    expect(getComponent('stats-card')!.enabled).toBe(true)
    // 环状图默认禁用
    expect(getComponent('ring-chart')!.enabled).toBe(false)
  })

  it('重复初始化不应重复注册', () => {
    initBuiltinComponents()
    initBuiltinComponents()
    expect(getComponentCount()).toBe(13)
  })
})

// ---- 清空 ----

describe('clearRegistry', () => {
  it('应该清空所有注册', () => {
    registerComponent({ id: 'a', type: 'line', name: 'A', description: 'desc', category: 'chart' })
    clearRegistry()
    expect(getComponentCount()).toBe(0)
  })
})