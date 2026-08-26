import { describe, expect, it } from 'vitest'
import { aiAssist } from '../ai-assist'

describe('study 就地写作助手（本地规则式）', () => {
  it('续写：在原文末尾追加承接句', () => {
    const r = aiAssist('continue', '今天想通了一件事。')
    expect(r.append).toBe(true)
    expect(r.text.startsWith('今天想通了一件事。')).toBe(true)
    expect(r.text.length).toBeGreaterThan('今天想通了一件事。'.length)
  })

  it('续写：空文本返回原文', () => {
    const r = aiAssist('continue', '   ')
    expect(r.text).toBe('')
  })

  it('扩写：在原文末尾追加细节', () => {
    const r = aiAssist('expand', '写作需要安静。')
    expect(r.append).toBe(true)
    expect(r.text.startsWith('写作需要安静。')).toBe(true)
  })

  it('总结：多句文本压缩为摘要', () => {
    const r = aiAssist('summarize', '今天读了半本书。书里讲的是专注的方法。我记下了一个练习。')
    expect(r.append).toBe(false)
    expect(r.text.length).toBeLessThan('今天读了半本书。书里讲的是专注的方法。我记下了一个练习。'.length)
    expect(r.text).toContain('今天读了半本书')
  })

  it('总结：单句文本原样返回', () => {
    const r = aiAssist('summarize', '只有一句话。')
    expect(r.text).toBe('只有一句话。')
  })

  it('改语气：正式语气追加记录标注', () => {
    const r = aiAssist('rewrite', '今天很累。', 'formal')
    expect(r.text).toContain('此为记录')
  })

  it('改语气：简洁语气合并分句', () => {
    const r = aiAssist('rewrite', '今天很累。明天继续。', 'concise')
    expect(r.text).toContain('；')
  })

  it('改语气：口语语气加开场', () => {
    const r = aiAssist('rewrite', '今天很累。', 'casual')
    expect(r.text).toContain('嘿')
  })
})
