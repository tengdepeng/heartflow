// ============================================================
// 阅览殿 · 古籍竖排阅读引擎
// 借鉴识典古籍 / 搜古籍：
//   - 古籍竖排排版（自右向左纵向排列 / 栏线·界行）
//   - 注疏分层显示（按「注者 / 朝代」分层组织）
//   - 句读 / 标点切换（原始句读 / 现代标点 / 无标点）
//   - 影印对照（原文纯文本 / 注疏增强文本双视图）
// 竖排切分与标点均为纯函数，便于单测与复用。
// ============================================================

// ============================================================
// 类型定义
// ============================================================

/** 句读 / 标点模式 */
export type PunctuationMode = 'original' | 'modern' | 'none'

export const PUNCTUATION_MODES: PunctuationMode[] = ['original', 'modern', 'none']

export const PUNCTUATION_MODE_META: Record<PunctuationMode, { label: string; hint: string }> = {
  original: { label: '原始句读', hint: '保留古籍原有句读与断句' },
  modern: { label: '现代标点', hint: '使用现代标点符号重新标点' },
  none: { label: '无标点', hint: '去除一切标点，回归纯文字' },
}

/** 一条注疏 */
export interface ClassicalAnnotation {
  id: string
  /** 注者（如：郭璞、朱熹） */
  annotator: string
  /** 朝代（如：晋、宋） */
  dynasty: string
  /** 注释正文 */
  content: string
}

/** 一栏竖排文本 */
export interface VerticalColumn {
  /** 栏序号，0 为最右栏，依次向左 */
  index: number
  /** 该栏内各行（每行一字），自上而下 */
  lines: string[]
}

/** 竖排切分结果 */
export interface VerticalLayout {
  /** 自右向左排列的栏数组 */
  columns: VerticalColumn[]
  /** 每栏容纳的行数 */
  linesPerColumn: number
  /** 栏数 */
  columnCount: number
  /** 当前标点模式 */
  punctuationMode: PunctuationMode
}

/** 影印对照视图 */
export type ClassicalView = 'plain' | 'annotated'

/** 按朝代分层组织的注疏组 */
export interface AnnotationGroup {
  dynasty: string
  items: ClassicalAnnotation[]
}

/** 一部待竖排古籍 */
export interface ClassicalBook {
  id: string
  /** 书名（如：《山海经》卷三） */
  title: string
  /** 作者 */
  author: string
  /** 朝代 */
  dynasty: string
  /** 原文（含原始句读） */
  originalText: string
  /** 现代标点文本（可空，缺省回退原文） */
  modernText?: string
  /** 划分段的章节标题列表（对应原文分段） */
  sections?: string[]
  /** 注疏分层集合 */
  annotations: ClassicalAnnotation[]
}

// ============================================================
// 标点处理
// ============================================================

/**
 * 按指定标点模式取文本：
 *  - modern ：优先取 modernText，空则回退 original
 *  - original：取 originalText
 *  - none   ：去除文本中的全部标点与空白后返回
 */
export function textForMode(
  book: Pick<ClassicalBook, 'originalText' | 'modernText'>,
  mode: PunctuationMode,
): string {
  if (mode === 'modern') {
    const modern = book.modernText?.trim()
    if (modern) return modern
    return book.originalText.trim()
  }
  if (mode === 'original') return book.originalText.trim()
  return stripPunctuationAndSpace(book.originalText)
}

/** 去除所有标点符号与空白（保留汉字、字母、数字） */
export function stripPunctuationAndSpace(text: string): string {
  return text.replace(/[\s\u3000，。！？；：、「」『』“”‘’（）《》〈〉——…·〔〕［］【】!?.,;:()"'<>]/g, '')
}

// ============================================================
// 竖排切分
// ============================================================

/**
 * 将文本按「每栏 linesPerColumn 行」切分为若干栏（自右向左）。
 * 栏内按「段落」边界优先断留白行：段落间的换行会在当前栏底部留出空行
 * 作为「段落空位」，使《》等分章视觉更贴近线装书。
 * @param text 待排版文本（每行一段，或含 \n）
 * @param linesPerColumn 每栏容纳的行数（>0）
 * @returns 自右向左的栏数组；数组 0 号即最右栏
 */
export function splitVertical(
  text: string,
  linesPerColumn: number,
): VerticalLayout['columns'] {
  const lineCapacity = Math.max(1, Math.floor(linesPerColumn))
  // 逐段字符化：段落内部不再断行
  const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean)
  const columns: VerticalColumn[] = []
  let currentLines: string[] = []

  const flush = () => {
    if (currentLines.length > 0) {
      columns.push({ index: columns.length, lines: currentLines })
    }
  }

  const pushChunk = (chars: string[]) => {
    // 可容纳的完整栏数（当前栏剩余空间 + 后续整栏）
    const remain = lineCapacity - currentLines.length
    if (remain <= 0) {
      flush()
      currentLines = []
    }
    let sliceFrom = 0
    let capacity = lineCapacity - currentLines.length
    while (capacity > 0 && sliceFrom < chars.length) {
      const take = Math.min(capacity, chars.length - sliceFrom)
      currentLines.push(...chars.slice(sliceFrom, sliceFrom + take))
      sliceFrom += take
      // 栏满后开新栏
      if (currentLines.length === lineCapacity && sliceFrom < chars.length) {
        flush()
        currentLines = []
      }
      capacity = lineCapacity - currentLines.length
    }
    if (sliceFrom < chars.length) {
      pushChunk(chars.slice(sliceFrom))
    }
  }

  paragraphs.forEach((para, paraIndex) => {
    const chars = [...para]
    if (chars.length === 0) return
    if (currentLines.length > 0) {
      // 段落间留一个空行作为分段空隙（若栏内仍有空间）
      if (currentLines.length < lineCapacity) {
        currentLines.push('') // 空行占位用于分隔
      }
    }
    pushChunk(chars)
    // 栏内也可能跨段，但空行已占位
    void paraIndex
  })

  flush()
  return columns.map((col, i) => ({ index: i, lines: col.lines }))
}

/**
 * 便捷封装：按模式取得文本并切分为竖排栏
 */
export function buildVerticalLayout(
  book: Pick<ClassicalBook, 'originalText' | 'modernText'>,
  linesPerColumn: number,
  mode: PunctuationMode = 'original',
): Omit<VerticalLayout, 'columnCount'> & { columnCount: number } {
  const text = textForMode(book, mode)
  const columns = splitVertical(text, linesPerColumn)
  return {
    columns,
    linesPerColumn: Math.max(1, Math.floor(linesPerColumn)),
    columnCount: columns.length,
    punctuationMode: mode,
  }
}

/**
 * 分段续排：将多段文本以空行分隔后整体切分为竖排栏，
 * 并附带各段独立的竖排栏（用于「影印对照-按段定位」）。
 */
export function splitChunksVertical(
  sections: string[],
  linesPerColumn: number,
): { columns: VerticalLayout['columns']; bySection: VerticalLayout['columns'][] } {
  const joined = sections.join('\n\n')
  const columns = splitVertical(joined, linesPerColumn)
  const bySection = sections.map(section => splitVertical(section, linesPerColumn))
  return { columns, bySection }
}

// ============================================================
// 注疏分层
// ============================================================

/** 常见朝代先后顺序（早期 → 晚期），用于注疏分层排序 */
const DYNASTY_ORDER = [
  '周', '春秋', '战国', '秦', '汉', '三国', '魏', '晋', '南北朝',
  '隋', '唐', '五代', '宋', '辽', '金', '元', '明', '清', '民国', '近代', '当代',
]

/**
 * 将注疏按朝代分层组织，同朝代内保持原有顺序。
 * 未知朝代排在最后。
 */
export function organizeAnnotations(layers: ClassicalAnnotation[]): AnnotationGroup[] {
  const order = new Map(DYNASTY_ORDER.map((d, i) => [d, i]))
  const groups = new Map<string, ClassicalAnnotation[]>()
  const known: string[] = []
  const unknown: string[] = []

  for (const a of layers) {
    const d = a.dynasty.trim()
    if (!groups.has(d)) {
      groups.set(d, [])
      known.push(d)
    }
    groups.get(d)!.push(a)
    if (!order.has(d) && !unknown.includes(d)) unknown.push(d)
  }

  const sortedKnown = known.slice().sort((x, y) => {
    const xi = order.has(x) ? order.get(x)! : Number.MAX_SAFE_INTEGER
    const yi = order.has(y) ? order.get(y)! : Number.MAX_SAFE_INTEGER
    return xi - yi
  })

  const dynasties = [...sortedKnown, ...unknown.filter(d => !sortedKnown.includes(d))]
  return dynasties.map(d => ({ dynasty: d, items: groups.get(d)! }))
}

// ============================================================
// 栏线 / 版式信息
// ============================================================

/** 版式元数据：供渲染栏线、界行与行距使用 */
export interface VerticalMetrics {
  /** 每栏容行数 */
  linesPerColumn: number
  /** 栏线宽度（px，UI 层可缩放） */
  columnLineWidth: number
  /** 是否绘制栏线 */
  showColumnLines: boolean
  /** 是否绘制界行（水平辅助线） */
  showHorizontalRules: boolean
  /** 行距（相对字号倍数） */
  lineSpacing: number
  /** 页边距参考（px） */
  margin: number
}

export function defaultVerticalMetrics(linesPerColumn = 24): VerticalMetrics {
  return {
    linesPerColumn: Math.max(1, Math.floor(linesPerColumn)),
    columnLineWidth: 1,
    showColumnLines: true,
    showHorizontalRules: true,
    lineSpacing: 1.4,
    margin: 24,
  }
}

// ============================================================
// 存储层（数据层：古籍 + 注疏 的载入 / 保存）
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY_BOOKS = 'hf:reading:classical_books'

const books = ref<ClassicalBook[]>(loadBooks())

function loadBooks(): ClassicalBook[] {
  try {
    return storage.getKV<ClassicalBook[]>(STORAGE_KEY_BOOKS, [])
  } catch {
    return []
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY_BOOKS, books.value)
}

let seq = 0
function uid(prefix: string): string {
  seq += 1
  return `${prefix}_${Date.now()}_${seq}`
}

/** 古籍竖排引擎：文本切分 + 注疏管理的组合 API */
export function useClassicalVertical() {
  /** 载入全部古籍 */
  function load(): void {
    books.value = loadBooks()
  }

  /** 新增 / 替换一部古籍 */
  function upsertBook(book: Omit<ClassicalBook, 'id'> | ClassicalBook): ClassicalBook {
    const hasId = 'id' in book && typeof book.id === 'string' && book.id.length > 0
    const target = hasId ? (book as ClassicalBook) : { ...(book as Omit<ClassicalBook, 'id'>), id: uid('book') }
    const idx = books.value.findIndex(b => b.id === target.id)
    if (idx >= 0) books.value[idx] = target
    else books.value.push(target)
    persist()
    return target
  }

  /** 删除一部古籍 */
  function removeBook(id: string): boolean {
    const idx = books.value.findIndex(b => b.id === id)
    if (idx < 0) return false
    books.value.splice(idx, 1)
    persist()
    return true
  }

  /** 为某部古籍新增一条注疏 */
  function addAnnotation(bookId: string, annotation: Omit<ClassicalAnnotation, 'id'>): ClassicalAnnotation | null {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return null
    const item: ClassicalAnnotation = { ...annotation, id: uid('ann') }
    book.annotations.push(item)
    persist()
    return item
  }

  /** 移除某部古籍中的一条注疏 */
  function removeAnnotation(bookId: string, annotationId: string): boolean {
    const book = books.value.find(b => b.id === bookId)
    if (!book) return false
    const idx = book.annotations.findIndex(a => a.id === annotationId)
    if (idx < 0) return false
    book.annotations.splice(idx, 1)
    persist()
    return true
  }

  return {
    books: books,
    load,
    upsertBook,
    removeBook,
    addAnnotation,
    removeAnnotation,
  }
}