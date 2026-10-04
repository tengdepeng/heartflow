// ============================================================
// 全局 UI · 字体库（Font Library，INCR-501）
// ------------------------------------------------------------
// 借鉴 96 APK「组件岛」字体包 / 主题字体选择：正文与标题可分别
// 选用不同字族，选中即写入 CSS 变量全局生效并持久化。
// 纯本地、零网络（仅系统/随包字体栈，不加载远程字体）。
// 状态存 hf:font_library。
// 落点：殿堂设置「字体」分组（FontLibraryPanel.vue）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:font_library'

export interface FontPreset {
  id: string
  label: string
  labelEn: string
  desc: string
  tags: string[]
  /** 中文 / 正文优先字体栈 */
  stackZh: string
  /** 拉丁字体栈 */
  stackEn: string
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'sans',
    label: '黑体',
    labelEn: 'Sans',
    desc: '清爽无衬线，长时间阅读不累',
    tags: ['现代', '清晰'],
    stackZh: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Heiti SC', system-ui, sans-serif",
    stackEn: "'Poppins', 'Arial', system-ui, sans-serif",
  },
  {
    id: 'serif',
    label: '宋体',
    labelEn: 'Serif',
    desc: '典雅衬线，正文与标题皆宜',
    tags: ['典雅', '书卷'],
    stackZh: "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', serif",
    stackEn: "'Lora', 'Georgia', serif",
  },
  {
    id: 'kai',
    label: '楷体',
    labelEn: 'Kai',
    desc: '手写笔意，适合摘录与题记',
    tags: ['手写', '温润'],
    stackZh: "'Kaiti SC', 'STKaiti', 'KaiTi', 'Noto Serif SC', serif",
    stackEn: "'Georgia', 'Lora', serif",
  },
  {
    id: 'fangsong',
    label: '仿宋',
    labelEn: 'Fangsong',
    desc: '工整端方，公文典籍气质',
    tags: ['端方', '典籍'],
    stackZh: "'FangSong', 'STFangsong', 'Noto Serif SC', serif",
    stackEn: "'Georgia', serif",
  },
  {
    id: 'rounded',
    label: '圆体',
    labelEn: 'Rounded',
    desc: '圆润亲和，轻松惬意',
    tags: ['圆润', '亲和'],
    stackZh: "'Yuanti SC', 'Hiragino Sans GB', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    stackEn: "'Quicksand', 'Poppins', sans-serif",
  },
  {
    id: 'mono',
    label: '等宽',
    labelEn: 'Mono',
    desc: '等宽对齐，代码与清单清晰',
    tags: ['等宽', '对齐'],
    stackZh: "'Sarasa Mono SC', 'Noto Sans Mono CJK SC', ui-monospace, 'Consolas', monospace",
    stackEn: "ui-monospace, 'Cascadia Code', 'Consolas', monospace",
  },
  {
    id: 'system',
    label: '系统',
    labelEn: 'System',
    desc: '跟随系统默认字族，最省心',
    tags: ['默认', '省心'],
    stackZh: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    stackEn: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },
]

export interface FontLibraryState {
  /** 正文字族 id */
  bodyId: string
  /** 标题字族 id */
  headingId: string
}

/** 默认与设计 Token 基线一致：正文黑体 / 标题宋体 */
export const DEFAULT_FONT_LIBRARY: FontLibraryState = { bodyId: 'sans', headingId: 'serif' }

/** 纯函数：按 id 取字族（未知 id 回落首个预设） */
export function fontPreset(id: string): FontPreset {
  return FONT_PRESETS.find((p) => p.id === id) ?? FONT_PRESETS[0]
}

/** 纯函数：把字族选择映射为设计 Token 的 4 个字体变量 */
export function fontCssVars(s: FontLibraryState): Record<string, string> {
  const body = fontPreset(s.bodyId)
  const heading = fontPreset(s.headingId)
  return {
    '--font-body-zh': body.stackZh,
    '--font-body-en': body.stackEn,
    '--font-heading-zh': heading.stackZh,
    '--font-heading-en': heading.stackEn,
  }
}

const state = ref<FontLibraryState>({ ...DEFAULT_FONT_LIBRARY })

/** 把当前选择写入 <html> 内联 CSS 变量（环境无 document 时静默跳过） */
export function applyFonts(s: FontLibraryState = state.value): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const vars = fontCssVars(s)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
}

function load(): void {
  try {
    const saved = storage.getKV<FontLibraryState | null>(STORAGE_KEY, null)
    const valid = (id: unknown): id is string =>
      typeof id === 'string' && FONT_PRESETS.some((p) => p.id === id)
    state.value = {
      bodyId: saved && valid(saved.bodyId) ? saved.bodyId : DEFAULT_FONT_LIBRARY.bodyId,
      headingId: saved && valid(saved.headingId) ? saved.headingId : DEFAULT_FONT_LIBRARY.headingId,
    }
  } catch {
    state.value = { ...DEFAULT_FONT_LIBRARY }
  }
  applyFonts(state.value)
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadFontLibrary(): void {
  load()
}

export function useFontLibrary() {
  const presets = computed(() => FONT_PRESETS)
  const bodyId = computed(() => state.value.bodyId)
  const headingId = computed(() => state.value.headingId)
  const body = computed(() => fontPreset(state.value.bodyId))
  const heading = computed(() => fontPreset(state.value.headingId))

  function setBody(id: string): string {
    state.value = { ...state.value, bodyId: fontPreset(id).id }
    persist()
    applyFonts(state.value)
    return state.value.bodyId
  }

  function setHeading(id: string): string {
    state.value = { ...state.value, headingId: fontPreset(id).id }
    persist()
    applyFonts(state.value)
    return state.value.headingId
  }

  function reset(): void {
    state.value = { ...DEFAULT_FONT_LIBRARY }
    persist()
    applyFonts(state.value)
  }

  return { presets, bodyId, headingId, body, heading, setBody, setHeading, reset }
}
