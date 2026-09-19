// ============================================================
// 插件市场源注册表测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  pluginMarketplaceRegistry,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '../plugin-registry'
import type { PluginManifest } from '../types'

describe('pluginMarketplaceRegistry 市场源注册表', () => {
  it('注册表非空且目录按下载量降序', () => {
    const catalog = pluginMarketplaceRegistry.getCatalog()
    expect(catalog.length).toBeGreaterThan(0)
    const downloads = catalog.map(m => {
      return pluginMarketplaceRegistry.find(m.meta.id)?.downloads ?? 0
    })
    expect(downloads).toEqual([...downloads].sort((a, b) => b - a))
  })

  it('所有市场条目均为合法社区插件 manifest', () => {
    const all = pluginMarketplaceRegistry.getAll()
    for (const e of all) {
      const m = e.manifest
      expect(m.meta.tier).toBe('community')
      expect(m.meta.category).toBeTruthy()
      expect(m.meta.id.startsWith('community-')).toBe(true)
      expect(typeof m.entry).toBe('string')
      expect(m.permissions.length).toBeGreaterThan(0)
    }
  })

  it('getCategories 仅含非空分类且按预排顺序', () => {
    const cats = pluginMarketplaceRegistry.getCategories()
    const ids = cats.map(c => c.id)
    expect(ids.length).toBeGreaterThan(0)
    const expectedOrder = CATEGORY_ORDER.filter(id => ids.includes(id))
    expect(ids).toEqual(expectedOrder)
    // 计数与真实目录一致
    for (const c of cats) {
      const realCount = pluginMarketplaceRegistry
        .getAll()
        .filter(e => e.manifest.meta.category === c.id).length
      expect(c.count).toBe(realCount)
      expect(CATEGORY_LABELS[c.id]).toBe(c.label)
    }
  })

  it('byCategory(null) 返回全目录，byCategory(id) 仅返回该分类', () => {
    const all = pluginMarketplaceRegistry.byCategory(null)
    expect(all.length).toBe(pluginMarketplaceRegistry.count())
    const notePlugins = pluginMarketplaceRegistry.byCategory('note')
    expect(notePlugins.length).toBeGreaterThan(0)
    for (const m of notePlugins) {
      expect(m.meta.category).toBe('note')
    }
  })

  it('search 按名称/描述/作者/标签命中', () => {
    // 名称命中
    const byName = pluginMarketplaceRegistry.search('番茄钟')
    expect(byName.some(m => m.meta.id === 'community-pomodoro-stats')).toBe(true)
    // 描述命中
    const byDesc = pluginMarketplaceRegistry.search('白噪音')
    expect(byDesc.some(m => m.meta.id === 'community-white-noise')).toBe(true)
    // 标签命中
    const byTag = pluginMarketplaceRegistry.search('复习')
    expect(byTag.some(m => m.meta.id === 'community-knowledge-cards')).toBe(true)
    // 作者命中（作者为中文，测试大小写不敏感的能力用英文作者场景走 id）
    const byId = pluginMarketplaceRegistry.search('daily-review')
    expect(byId.some(m => m.meta.id === 'community-daily-review')).toBe(true)
  })

  it('search 空串返回全目录，无命中返回空', () => {
    expect(pluginMarketplaceRegistry.search('').length).toBe(pluginMarketplaceRegistry.count())
    expect(pluginMarketplaceRegistry.search('   ').length).toBe(pluginMarketplaceRegistry.count())
    expect(pluginMarketplaceRegistry.search('不存在的插件xyz')).toEqual([])
  })

  it('find / isMarketPlugin 定位市场条目', () => {
    const found = pluginMarketplaceRegistry.find('community-theme-switcher')
    expect(found?.meta.name).toBe('主题切换器')
    expect(pluginMarketplaceRegistry.find('no-such-plugin')).toBeUndefined()
    expect(pluginMarketplaceRegistry.isMarketPlugin('community-theme-switcher')).toBe(true)
    expect(pluginMarketplaceRegistry.isMarketPlugin('core-timer')).toBe(false)
  })

  it('目录条目可直接交由 installPlugin 安装（结构合法）', () => {
    for (const m of pluginMarketplaceRegistry.getCatalog()) {
      const manifest: PluginManifest = m
      expect(manifest.meta.id).toBeTruthy()
      expect(manifest.entry).toBeTruthy()
    }
  })
})
