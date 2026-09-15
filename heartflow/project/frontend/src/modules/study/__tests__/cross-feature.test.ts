// ============================================================
// 跨特征串联 · 双链 × 归档 × 连链封藏（蓝图76 P1/P2 串联回归）
// 固化两条契约：
//  1) 归档只隐藏不断链——archive 后出链/反链必须完好，仅真删（remove）才清链；
//  2) getLinkedItemsForNote 为时光胶囊「连链封藏」提供稳定的连链条目集。
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('跨特征串联 · 双链 × 归档', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    const { useNoteLinks } = await import('../note-links')
    useNoteLinks().links.value = []
  })

  async function fresh() {
    const study = await import('../index')
    const links = await import('../note-links')
    const api = study.useStudy()
    api.load()
    return { api, links }
  }

  it('归档笔记不断链：archive 后反链与出链均完好', async () => {
    const { api, links } = await fresh()
    const target = api.create('目标笔记', '被引用的内容')
    const source = api.create('来源笔记', `参考 [[${target.id}]]`)
    expect(links.getOutgoingLinks(source.id).map(l => l.targetId)).toEqual([target.id])

    api.archive(target.id)

    expect(api.notes.value.find(n => n.id === target.id)?.archived).toBe(true)
    expect(links.getBacklinks(target.id).map(l => l.sourceId)).toEqual([source.id])
    expect(links.getOutgoingLinks(source.id).map(l => l.targetId)).toEqual([target.id])
  })

  it('归档来源笔记同样不清其出链', async () => {
    const { api, links } = await fresh()
    const target = api.create('目标', '内容')
    const source = api.create('来源', `见 [[${target.id}]]`)

    api.archive(source.id)

    expect(links.getOutgoingLinks(source.id)).toHaveLength(1)
    expect(links.getBacklinks(target.id)).toHaveLength(1)
  })

  it('归档→取消归档往返后链接无损', async () => {
    const { api, links } = await fresh()
    const target = api.create('目标', '内容')
    const source = api.create('来源', `见 [[${target.id}]]`)

    api.archive(target.id)
    api.unarchive(target.id)

    expect(api.notes.value.find(n => n.id === target.id)?.archived).toBe(false)
    expect(links.getBacklinks(target.id).map(l => l.sourceId)).toEqual([source.id])
  })

  it('真删才清链：remove 后反链清空（与归档形成对比）', async () => {
    const { api, links } = await fresh()
    const target = api.create('目标', '内容')
    const source = api.create('来源', `见 [[${target.id}]]`)
    expect(links.getBacklinks(target.id)).toHaveLength(1)

    api.remove(target.id)

    expect(links.getBacklinks(target.id)).toHaveLength(0)
    expect(links.getOutgoingLinks(source.id)).toHaveLength(0)
  })
})

describe('跨特征串联 · 连链封藏条目集', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    const { useNoteLinks } = await import('../note-links')
    useNoteLinks().links.value = []
  })

  async function fresh() {
    const study = await import('../index')
    const links = await import('../note-links')
    const api = study.useStudy()
    api.load()
    return { api, links }
  }

  it('返回起点自身 + 出链上下文（self 在前）', async () => {
    const { api, links } = await fresh()
    const ctx = api.create('上下文', '上下文内容')
    const main = api.create('主笔记', `见 [[${ctx.id}]]`)

    const refs = links.getLinkedItemsForNote(main.id, api.notes.value)

    expect(refs.map(r => r.id)).toEqual([main.id, ctx.id])
    expect(refs.map(r => r.relation)).toEqual(['self', 'outgoing'])
  })

  it('默认不并入反向链接，开启 includeBacklinks 后并入', async () => {
    const { api, links } = await fresh()
    const main = api.create('主笔记', '主内容')
    const citing = api.create('引用者', `见 [[${main.id}]]`)

    expect(links.getLinkedItemsForNote(main.id, api.notes.value).map(r => r.id)).toEqual([main.id])

    const withBack = links.getLinkedItemsForNote(main.id, api.notes.value, {
      includeBacklinks: true,
    })
    expect(withBack.map(r => r.id)).toEqual([main.id, citing.id])
    expect(withBack[1].relation).toBe('backlink')
  })

  it('归档的上下文笔记仍进连链集，并带 archived 标记', async () => {
    const { api, links } = await fresh()
    const ctx = api.create('已归档上下文', '内容')
    const main = api.create('主笔记', `见 [[${ctx.id}]]`)
    api.archive(ctx.id)

    const refs = links.getLinkedItemsForNote(main.id, api.notes.value)

    expect(refs.map(r => r.id)).toEqual([main.id, ctx.id])
    expect(refs[0].archived).toBe(false)
    expect(refs[1].archived).toBe(true)
  })

  it('跳过死链：目标不在传入笔记集中时不产出条目', async () => {
    const { api, links } = await fresh()
    const ctx = api.create('上下文', '内容')
    const main = api.create('主笔记', `见 [[${ctx.id}]]`)

    const refs = links.getLinkedItemsForNote(
      main.id,
      api.notes.value.filter(n => n.id !== ctx.id),
    )

    expect(refs.map(r => r.id)).toEqual([main.id])
  })

  it('起点笔记不存在时返回空数组', async () => {
    const { api, links } = await fresh()
    expect(links.getLinkedItemsForNote('note_missing', api.notes.value)).toEqual([])
  })

  it('多条出链去重且不含起点自身的自引用', async () => {
    const { api, links } = await fresh()
    const c1 = api.create('上下文1', '内容1')
    const c2 = api.create('上下文2', '内容2')
    const main = api.create('主笔记', `见 [[${c1.id}]] 与 [[${c2.id}]] 再见 [[${c1.id}]]`)

    const refs = links.getLinkedItemsForNote(main.id, api.notes.value)

    expect(refs).toHaveLength(3)
    expect(new Set(refs.map(r => r.id)).size).toBe(3)
    expect(refs.filter(r => r.relation === 'self')).toHaveLength(1)
  })
})
