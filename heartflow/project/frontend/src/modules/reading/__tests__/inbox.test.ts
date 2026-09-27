import { describe, expect, it, beforeEach } from 'vitest'
import {
  useReadingInbox,
  computeContentHash,
  addInboxItem,
  getInboxContent,
  removeInboxItem,
  markInboxRead,
  promoteToBook,
} from '../inbox'
import { useReadingHall } from '../hall'
import { storage } from '../../../engine/storage'

const LIST_KEY = 'hf:reading:inbox'

describe('computeContentHash（内容指纹）', () => {
  it('相同文本得到相同指纹', () => {
    expect(computeContentHash('春江水暖鸭先知')).toBe(computeContentHash('春江水暖鸭先知'))
  })
  it('不同文本指纹不同', () => {
    expect(computeContentHash('甲')).not.toBe(computeContentHash('乙'))
  })
  it('空串也有稳定指纹', () => {
    expect(computeContentHash('')).toMatch(/^h[0-9a-z]+$/)
  })
})

describe('inbox · 待读箱数据层', () => {
  beforeEach(() => {
    storage.setKV(LIST_KEY, '[]')
    const { inbox } = useReadingInbox()
    inbox.value = []
  })

  it('收入待读项并落全文本快照', () => {
    const item = addInboxItem({ title: '随笔', content: '第一段\n第二段' })
    expect(item).not.toBeNull()
    expect(item!.title).toBe('随笔')
    expect(getInboxContent(item!.id)).toBe('第一段\n第二段')
    const { inbox } = useReadingInbox()
    expect(inbox.value).toHaveLength(1)
  })

  it('标题为空时取正文首行作默认标题', () => {
    const item = addInboxItem({ content: '自动标题的一行\n其余内容' })
    expect(item!.title).toBe('自动标题的一行')
  })

  it('同内容去重：复用已有项且回退为待读', () => {
    const a = addInboxItem({ title: 'A', content: '重复内容' })!
    markInboxRead(a.id)
    const b = addInboxItem({ title: 'B', content: '重复内容' })!
    expect(b.id).toBe(a.id)
    expect(b.status).toBe('pending')
    const { inbox } = useReadingInbox()
    expect(inbox.value).toHaveLength(1)
  })

  it('空内容不入箱', () => {
    expect(addInboxItem({ content: '   ' })).toBeNull()
  })

  it('移除待读项同时清掉正文快照', () => {
    const item = addInboxItem({ content: '要删掉的内容' })!
    expect(getInboxContent(item.id)).toBe('要删掉的内容')
    removeInboxItem(item.id)
    expect(getInboxContent(item.id)).toBe('')
    const { inbox } = useReadingInbox()
    expect(inbox.value).toHaveLength(0)
  })

  it('标记已读写入 readAt 与状态', () => {
    const item = addInboxItem({ content: '读过的' })!
    expect(markInboxRead(item.id)).toBe(true)
    const { inbox } = useReadingInbox()
    const found = inbox.value.find(i => i.id === item.id)!
    expect(found.status).toBe('read')
    expect(found.readAt).toBeTruthy()
  })

  it('转正书架：写入书目并从待读箱移除', () => {
    const hall = useReadingHall()
    hall.books.value = []
    const item = addInboxItem({ title: '转正书', content: '正文甲\n正文乙' })!
    const bookId = promoteToBook(item.id)
    expect(bookId).not.toBeNull()
    expect(hall.books.value).toHaveLength(1)
    expect(hall.books.value[0].title).toBe('转正书')
    const { inbox } = useReadingInbox()
    expect(inbox.value).toHaveLength(0)
  })
})
