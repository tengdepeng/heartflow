// ============================================================
// #41 · 摘录 / 读书便签 本地导出 — 数据层纯函数单测
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  buildExcerptsMarkdown,
  buildMemosMarkdown,
  buildReadingExportMarkdown,
  buildReadingExportJson,
  generateReadingExportFilename,
} from '../reading-export'
import type { Excerpt } from '../reading-content'
import type { ReadingMemo } from '../reading-memo'

function excerpt(over: Partial<Excerpt> = {}): Excerpt {
  return {
    id: 'ex1',
    source: '《测试之书》',
    text: '第一行\n第二行',
    note: '一点批注',
    createdAt: '2026-09-27T14:30:00.000Z',
    ...over,
  }
}

function memo(over: Partial<ReadingMemo> = {}): ReadingMemo {
  return {
    id: 'm1',
    bookId: 'b1',
    bookTitle: '《测试之书》',
    text: '随手记一句',
    createdAt: '2026-09-27T10:00:00.000Z',
    updatedAt: '2026-09-27T10:05:00.000Z',
    ...over,
  }
}

describe('buildExcerptsMarkdown', () => {
  it('空摘录渲染提示文案', () => {
    const md = buildExcerptsMarkdown([])
    expect(md).toContain('# 心流工坊 · 阅读摘录')
    expect(md).toContain('_暂无摘录。_')
    expect(md).toContain('共 0 条')
  })

  it('渲染出处 / 引用块 / 批注 / 记录时间', () => {
    const md = buildExcerptsMarkdown([excerpt()])
    expect(md).toContain('### 出处：《测试之书》')
    // 多行文本每行前缀 ">" 引用
    expect(md).toContain('> 第一行')
    expect(md).toContain('> 第二行')
    expect(md).toContain('**批注：** 一点批注')
    // createdAt 为 UTC，渲染转本地时区，仅断言日期部分
    expect(md).toContain('记录于 2026-09-27')
    expect(md).toContain('共 1 条')
  })

  it('无批注时不渲染批注行', () => {
    const md = buildExcerptsMarkdown([excerpt({ note: '' })])
    expect(md).not.toContain('**批注：**')
  })

  it('自定义标题生效', () => {
    const md = buildExcerptsMarkdown([], { title: '我的摘录' })
    expect(md).toContain('# 我的摘录')
  })
})

describe('buildMemosMarkdown', () => {
  it('空便签渲染提示文案', () => {
    const md = buildMemosMarkdown([])
    expect(md).toContain('# 心流工坊 · 读书便签')
    expect(md).toContain('_暂无便签。_')
  })

  it('渲染便签文本 / 关联书目 / 记录时间', () => {
    const md = buildMemosMarkdown([memo({ bookTitle: '测试之书' })])
    expect(md).toContain('- 随手记一句')
    // 存储的 bookTitle 不含书名号，导出统一包裹
    expect(md).toContain('关联《测试之书》')
    // updatedAt 为 UTC，渲染转本地时区，仅断言日期部分
    expect(md).toContain('记录于 2026-09-27')
  })

  it('无关联书目时不渲染关联信息', () => {
    const md = buildMemosMarkdown([memo({ bookTitle: undefined, bookId: null })])
    expect(md).toContain('- 随手记一句')
    expect(md).not.toContain('关联')
  })
})

describe('buildReadingExportMarkdown', () => {
  it('合并文档含两个二级标题与各自计数', () => {
    const md = buildReadingExportMarkdown([excerpt(), excerpt({ id: 'ex2' })], [memo()])
    expect(md).toContain('# 心流工坊 · 阅读摘录与便签')
    expect(md).toContain('## 阅读摘录（2）')
    expect(md).toContain('## 读书便签（1）')
    expect(md).toContain('摘录 2 条 · 便签 1 条')
    // 两份摘录均出现
    expect(md.match(/### 出处：/g)?.length).toBe(2)
  })

  it('两者皆空时给出双提示', () => {
    const md = buildReadingExportMarkdown([], [])
    expect(md).toContain('_暂无摘录。_')
    expect(md).toContain('_暂无便签。_')
  })
})

describe('buildReadingExportJson', () => {
  it('结构含元数据与原始数据', () => {
    const json = buildReadingExportJson([excerpt()], [memo()])
    const parsed = JSON.parse(json) as {
      app: string
      type: string
      version: number
      counts: { excerpts: number; memos: number }
      excerpts: Excerpt[]
      memos: ReadingMemo[]
    }
    expect(parsed.app).toBe('heartflow')
    expect(parsed.type).toBe('reading-export')
    expect(parsed.version).toBe(1)
    expect(parsed.counts).toEqual({ excerpts: 1, memos: 1 })
    expect(parsed.excerpts).toHaveLength(1)
    expect(parsed.memos).toHaveLength(1)
    expect(parsed.excerpts[0].id).toBe('ex1')
    expect(parsed.memos[0].id).toBe('m1')
  })

  it('空数据计数为 0 且数组为空', () => {
    const parsed = JSON.parse(buildReadingExportJson([], []))
    expect(parsed.counts).toEqual({ excerpts: 0, memos: 0 })
    expect(parsed.excerpts).toEqual([])
    expect(parsed.memos).toEqual([])
  })
})

describe('generateReadingExportFilename', () => {
  it('格式为 reading-{kind}-{YYYY-MM-DD}.{ext}', () => {
    const name = generateReadingExportFilename('excerpts', 'md')
    expect(name).toMatch(/^reading-excerpts-\d{4}-\d{2}-\d{2}\.md$/)
    const json = generateReadingExportFilename('combined', 'json')
    expect(json).toMatch(/^reading-combined-\d{4}-\d{2}-\d{2}\.json$/)
  })
})
