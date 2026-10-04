import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ShelfGridPanel from '../ShelfGridPanel.vue'
import type { Book } from '../../modules/reading/types'

vi.mock('../../modules/reading/book-content', () => ({
  hasBookContent: (id: string) => id === 'with-content',
}))

function mkBook(id: string, title: string, extra: Partial<Book> = {}): Book {
  return {
    id,
    title,
    author: extra.author ?? '佚名',
    totalPages: extra.totalPages ?? 100,
    currentPage: extra.currentPage ?? 0,
    status: extra.status ?? 'want_to_read',
    tags: extra.tags ?? [],
    quotes: extra.quotes ?? [],
    totalReadingTime: extra.totalReadingTime ?? 0,
    ...extra,
  }
}

describe('ShelfGridPanel 封面网格', () => {
  it('每本可见书渲染一张卡并显示进度百分比', () => {
    const w = mount(ShelfGridPanel, {
      props: {
        books: [
          mkBook('a', '三体', { totalPages: 200, currentPage: 50 }),
          mkBook('b', '活着', { status: 'finished' }),
        ],
      },
    })
    expect(w.findAll('.sgp-card')).toHaveLength(2)
    const vals = w.findAll('.sgp-ring-val').map((n) => n.text())
    expect(vals).toContain('25%')
    expect(vals).toContain('100%')
    expect(w.text()).toContain('三体')
  })

  it('有置顶时渲染置顶分区，置顶书进入置顶区', () => {
    const w = mount(ShelfGridPanel, {
      props: {
        books: [mkBook('a', '三体'), mkBook('b', '活着')],
        pinnedIds: ['b'],
      },
    })
    expect(w.find('.sgp-sec-name').text()).toContain('置顶')
    const pinnedCards = w.findAll('.sgp-card.is-pinned')
    expect(pinnedCards).toHaveLength(1)
    expect(pinnedCards[0].text()).toContain('活着')
  })

  it('点击置顶/私密按钮向上 emit 书 id', async () => {
    const w = mount(ShelfGridPanel, {
      props: { books: [mkBook('a', '三体')] },
    })
    await w.find('.sgp-pin').trigger('click')
    await w.find('.sgp-priv').trigger('click')
    expect(w.emitted('toggle-pin')?.[0]).toEqual(['a'])
    expect(w.emitted('toggle-private')?.[0]).toEqual(['a'])
  })

  it('点击封面向上 emit open-reading', async () => {
    const w = mount(ShelfGridPanel, {
      props: { books: [mkBook('a', '三体')] },
    })
    await w.find('.sgp-cover').trigger('click')
    expect(w.emitted('open-reading')?.[0]).toEqual(['a'])
  })

  it('私密藏书默认隐藏并提示隐藏数量', () => {
    const w = mount(ShelfGridPanel, {
      props: {
        books: [mkBook('a', '三体'), mkBook('b', '秘藏')],
        privateIds: ['b'],
        showPrivate: false,
      },
    })
    expect(w.findAll('.sgp-card')).toHaveLength(1)
    expect(w.find('.sgp-hidden-note').text()).toContain('1 本私密藏书')
  })

  it('showPrivate=true 时私密藏书可见且无隐藏提示', () => {
    const w = mount(ShelfGridPanel, {
      props: {
        books: [mkBook('a', '三体'), mkBook('b', '秘藏')],
        privateIds: ['b'],
        showPrivate: true,
      },
    })
    expect(w.findAll('.sgp-card')).toHaveLength(2)
    expect(w.find('.sgp-hidden-note').exists()).toBe(false)
  })

  it('仅对存在正文的书显示「阅读」按钮', () => {
    const w = mount(ShelfGridPanel, {
      props: { books: [mkBook('with-content', '有正文'), mkBook('meta-only', '仅元数据')] },
    })
    const reads = w.findAll('.sgp-read')
    expect(reads).toHaveLength(1)
    expect(reads[0].text()).toContain('阅读')
  })
})
