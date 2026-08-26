// ============================================================
// 逐日心锚 · 手札日记模板
// ------------------------------------------------------------
// 借鉴 Moo日记 / 墨记日记 / Day One 的「日记模板」能力：
// 预设结构化书写框架，降低空白恐惧，让记录更易开始。
// 模板只提供「脚手架」，内容完全由用户书写，本地私有。
// ============================================================

export type JournalTemplateId = 'three-things' | 'gratitude' | 'reflection' | 'inspiration' | 'free'

export interface JournalTemplate {
  id: JournalTemplateId
  name: string
  icon: string
  /** 模板说明 */
  hint: string
  /** 插入编辑区的脚手架文本（换行分隔） */
  scaffold: string
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'three-things',
    name: '今日三件事',
    icon: '📌',
    hint: '写下今天最重要的三件事',
    scaffold: '① \n② \n③ ',
  },
  {
    id: 'gratitude',
    name: '今日感恩',
    icon: '🙏',
    hint: '记录今天值得感恩的三件事',
    scaffold: '· 感恩一：\n· 感恩二：\n· 感恩三：',
  },
  {
    id: 'reflection',
    name: '今日反思',
    icon: '🪞',
    hint: '回望今日的收获与不足',
    scaffold: '今日收获：\n\n今日不足：\n\n明日改进：',
  },
  {
    id: 'inspiration',
    name: '今日灵感',
    icon: '💡',
    hint: '捕捉今天的灵感火花',
    scaffold: '灵感：\n\n触发它的情境：\n\n可以如何延续：',
  },
  {
    id: 'free',
    name: '自由书写',
    icon: '✍️',
    hint: '无拘无束，写下此刻所想',
    scaffold: '',
  },
]

export function journalTemplateById(id: string | undefined): JournalTemplate | undefined {
  if (!id) return undefined
  return JOURNAL_TEMPLATES.find(t => t.id === id)
}

export function journalTemplateName(id: string | undefined): string {
  return journalTemplateById(id)?.name ?? ''
}
