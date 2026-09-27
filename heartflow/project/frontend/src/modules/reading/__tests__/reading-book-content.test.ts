import { describe, expect, it } from 'vitest'
import {
  saveBookContent,
  getBookContent,
  removeBookContent,
  hasBookContent,
  BOOK_CONTENT_PREFIX,
} from '../book-content'
import { useReadingHall } from '../hall'
import { storage } from '../../../engine/storage'

describe('book-content · 按书正文存储', () => {
  it('保存后可读取，key 带书名前缀', () => {
    saveBookContent('b1', 'hello world')
    expect(getBookContent('b1')).toBe('hello world')
    expect(storage.getKV(`${BOOK_CONTENT_PREFIX}b1`, '')).toBe('hello world')
  })

  it('空 id 不写不读', () => {
    saveBookContent('', 'x')
    expect(getBookContent('')).toBe('')
  })

  it('remove 后读取为空且 has=false', () => {
    saveBookContent('b2', 'abc')
    expect(hasBookContent('b2')).toBe(true)
    removeBookContent('b2')
    expect(getBookContent('b2')).toBe('')
    expect(hasBookContent('b2')).toBe(false)
  })
})

describe('hall.addBookFromText · 建书 + 按书正文', () => {
  it('建书并存入按书正文，同名书去重复用', () => {
    const hall = useReadingHall()
    hall.books.value = []
    const b1 = hall.addBookFromText('我的笔记', '', 5, '第一段\n第二段')
    expect(b1.title).toBe('我的笔记')
    expect(getBookContent(b1.id)).toBe('第一段\n第二段')

    const b2 = hall.addBookFromText('我的笔记', '', 5, '更新内容')
    expect(b2.id).toBe(b1.id) // 去重：复用同名书
    expect(getBookContent(b2.id)).toBe('更新内容')
  })

  it('setBookProgress 记录续读位置', () => {
    const hall = useReadingHall()
    hall.books.value = []
    const b = hall.addBookFromText('续读测试', '', 10, 'a\nb\nc')
    expect(hall.setBookProgress(b.id, 2)).toBe(true)
    const stored = hall.books.value.find(x => x.id === b.id)
    expect(stored?.lastPosition).toBe(2)
  })
})
