// ============================================================
// 阅览殿 · 沉浸阅读器（Immersive Reader）
// ------------------------------------------------------------
// 借鉴微信读书 10.x / 鸿蒙 1.0 沉浸阅读：
//   - 翻页 / 上下滚动 双模式（仿真翻页 + 点击翻页）
//   - 主题 / 字号 / 背景四色盘（纸白 · 米黄 · 护眼绿 · 暗夜）
//   - 常驻时间电量（时间由组件时钟提供，电量走 navigator.getBattery）
//   - 进度 + 剩余时间（按分页与阅读速度估算）
// 分页、进度、剩余时间均为纯函数，便于单测与复用；
// 偏好纯本地存 hf:reading:reader_prefs，零网络。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

export const READER_PREFS_KEY = 'hf:reading:reader_prefs'

// ---- 模式 ----

/** 翻页（一屏一页，可点击翻页）/ 滚动（连续滚动） */
export type ReaderMode = 'paged' | 'scroll'

// ---- 主题（背景四色盘） ----

export interface ReaderTheme {
  id: string
  label: string
  /** 页面底色 */
  bg: string
  /** 正文色 */
  text: string
  /** 次要文字色（页码 / 进度 / 元信息） */
  muted: string
  /** 强调色（进度条 / 当前页 / 选中） */
  accent: string
}

/** 四色盘：纸白 · 米黄 · 护眼绿 · 暗夜 */
export const READER_THEMES: ReaderTheme[] = [
  { id: 'paper', label: '纸白', bg: '#f7f5ef', text: '#2f2a24', muted: '#8a8375', accent: '#c46a5a' },
  { id: 'sepia', label: '米黄', bg: '#f2e7d3', text: '#4a3d2c', muted: '#9a8a6d', accent: '#b07d3a' },
  { id: 'green', label: '护眼绿', bg: '#dfe8dc', text: '#2b3a2b', muted: '#6d7d68', accent: '#5a7d55' },
  { id: 'night', label: '暗夜', bg: '#1b1e23', text: '#c7cdd7', muted: '#79818f', accent: '#c9a24a' },
]

export const DEFAULT_READER_THEME_ID = 'paper'

export function themeById(id: string): ReaderTheme {
  return READER_THEMES.find(t => t.id === id) ?? READER_THEMES[0]
}

// ---- 偏好 ----

export interface ReaderPrefs {
  /** 阅读模式 */
  mode: ReaderMode
  /** 正文字号（px） */
  fontSize: number
  /** 行高倍数 */
  lineHeight: number
  /** 背景主题 id */
  themeId: string
  /** 阅读速度（字/分），用于剩余时间估算 */
  charsPerMinute: number
}

export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 26
export const LINE_HEIGHT_MIN = 1.4
export const LINE_HEIGHT_MAX = 2.4
export const DEFAULT_CHARS_PER_MINUTE = 400

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  mode: 'scroll',
  fontSize: 17,
  lineHeight: 1.8,
  themeId: DEFAULT_READER_THEME_ID,
  charsPerMinute: DEFAULT_CHARS_PER_MINUTE,
}

export function clampFontSize(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_READER_PREFS.fontSize
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(v)))
}

export function clampLineHeight(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_READER_PREFS.lineHeight
  return Math.max(LINE_HEIGHT_MIN, Math.min(LINE_HEIGHT_MAX, Math.round(v * 10) / 10))
}

// ---- 分页 ----

export interface ReaderPage {
  index: number
  /** 该页包含的段落下标区间 [paraStart, paraEnd) */
  paraStart: number
  paraEnd: number
  /** 该页字符数（不含空白） */
  charCount: number
}

/** 每屏字数下限 / 上限（防止字号极端导致分页失真） */
export const CHARS_PER_PAGE_MIN = 120
export const CHARS_PER_PAGE_MAX = 1200

/** 每屏基准字数（字号 17px 时） */
export const BASE_CHARS_PER_PAGE = 420

export function clampCharsPerPage(v: number): number {
  if (!Number.isFinite(v)) return BASE_CHARS_PER_PAGE
  return Math.max(CHARS_PER_PAGE_MIN, Math.min(CHARS_PER_PAGE_MAX, Math.round(v)))
}

/**
 * 由字号推导每屏字数：屏幕面积固定时，可容字数 ≈ 基准 × (基准字号 / 实际字号)²。
 * 字号越大 → 每屏字数越少（页数越多）。
 */
export function charsPerPageFor(fontSize: number): number {
  const size = clampFontSize(fontSize)
  return clampCharsPerPage(BASE_CHARS_PER_PAGE * Math.pow(DEFAULT_READER_PREFS.fontSize / size, 2))
}

/** 去除空白后的字符数 */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length
}

/**
 * 按每屏字数把段落切分为页。
 * 以段落为最小单位（长段落独占一页，不跨页拆字），保证翻页后段落完整。
 */
export function paginateParagraphs(paragraphs: string[], charsPerPage: number): ReaderPage[] {
  const cap = clampCharsPerPage(charsPerPage)
  const pages: ReaderPage[] = []
  if (!paragraphs.length) return pages

  let start = 0
  let count = 0
  for (let i = 0; i < paragraphs.length; i++) {
    const len = countChars(paragraphs[i])
    if (count > 0 && count + len > cap) {
      pages.push({ index: pages.length, paraStart: start, paraEnd: i, charCount: count })
      start = i
      count = 0
    }
    count += len
  }
  pages.push({ index: pages.length, paraStart: start, paraEnd: paragraphs.length, charCount: count })
  return pages
}

/** 段落下标 → 所在页下标（越界回落到末页） */
export function pageForParagraph(pages: ReaderPage[], paraIndex: number): number {
  if (!pages.length) return 0
  const target = Math.max(0, Math.floor(paraIndex))
  for (const p of pages) {
    if (target < p.paraEnd) return p.index
  }
  return pages.length - 1
}

/** 阅读进度 0~1（按页：读完第 n 页 = n / total） */
export function pageProgress(pageIndex: number, totalPages: number): number {
  if (totalPages <= 0) return 0
  const done = Math.max(0, Math.min(totalPages, pageIndex + 1))
  return done / totalPages
}

/** 剩余阅读时间（分钟，向上取整；剩余 0 字返回 0） */
export function estimateRemainingMinutes(remainingChars: number, charsPerMinute: number): number {
  const speed = charsPerMinute > 0 ? charsPerMinute : DEFAULT_CHARS_PER_MINUTE
  if (remainingChars <= 0) return 0
  return Math.ceil(remainingChars / speed)
}

/** 剩余时间文案 */
export function formatRemaining(minutes: number): string {
  if (minutes <= 0) return '即将读完'
  if (minutes < 60) return `剩余约 ${minutes} 分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `剩余约 ${h} 小时 ${m} 分` : `剩余约 ${h} 小时`
}

// ---- 存储层 ----

const state = ref<ReaderPrefs>({ ...DEFAULT_READER_PREFS })

function normalize(raw: Partial<ReaderPrefs> | null | undefined): ReaderPrefs {
  const d = DEFAULT_READER_PREFS
  if (!raw) return { ...d }
  return {
    mode: raw.mode === 'paged' || raw.mode === 'scroll' ? raw.mode : d.mode,
    fontSize: clampFontSize(typeof raw.fontSize === 'number' ? raw.fontSize : d.fontSize),
    lineHeight: clampLineHeight(typeof raw.lineHeight === 'number' ? raw.lineHeight : d.lineHeight),
    themeId: READER_THEMES.some(t => t.id === raw.themeId) ? (raw.themeId as string) : d.themeId,
    charsPerMinute:
      typeof raw.charsPerMinute === 'number' && raw.charsPerMinute > 0
        ? raw.charsPerMinute
        : d.charsPerMinute,
  }
}

function load(): void {
  try {
    state.value = normalize(storage.getKV<Partial<ReaderPrefs> | null>(READER_PREFS_KEY, null))
  } catch {
    state.value = { ...DEFAULT_READER_PREFS }
  }
}

function persist(): void {
  storage.setKV(READER_PREFS_KEY, state.value)
}

load()

export function reloadReaderPrefs(): void {
  load()
}

/** 沉浸阅读器：偏好读写 + 派生主题 */
export function useImmersiveReader() {
  const prefs = computed(() => state.value)
  const theme = computed(() => themeById(state.value.themeId))

  function setPref<K extends keyof ReaderPrefs>(key: K, value: ReaderPrefs[K]): void {
    state.value = { ...state.value, [key]: value }
    persist()
  }

  function reset(): void {
    state.value = { ...DEFAULT_READER_PREFS }
    persist()
  }

  return { prefs, theme, setPref, reset }
}
