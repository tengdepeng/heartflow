// ============================================================
// 阅览殿 · 划线/摘录 回流思绪书房
// 把阅读中产生的划线、摘录，转化为全局 Note（思绪书房），
// 使其自动进入双链网络与间隔重复（Ebbinghaus 年轮）。
//
// 落点复用 study 模块既有 API（quickCapture），不新增存储域、
// 不引入云同步，符合「本地私有」硬约束。
// ============================================================

import type { Note } from '../study/types'
import { useStudy } from '../study'

/**
 * 将一段阅读划线/摘录流入思绪书房。
 * @param text 划线或摘录正文
 * @param sourceTitle 来源书名（用于溯源标签与标题）
 * @returns 生成的 Note，或空内容时返回 null
 */
export function flowHighlightToStudy(text: string, sourceTitle?: string): Note | null {
  const trimmed = (text || '').trim()
  if (!trimmed) return null

  const tags = ['划线']
  if (sourceTitle && sourceTitle.trim()) tags.push(`书:${sourceTitle.trim()}`)

  const study = useStudy()
  return study.quickCapture(trimmed, {
    roomId: 'reading',
    tags,
    title: sourceTitle && sourceTitle.trim() ? `《${sourceTitle.trim()}》划线` : '阅读划线',
  })
}
