// ============================================================
// 风格包加载器
// 动态注入完整 CSS 变量体系
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StylePack } from '../types'
import { storage } from '../engine/storage'
import { downloadStylePack, shareToStylePack, createStylePackFromBaseColor } from '../modules/style'
import type { StylePackShareFormat } from '../modules/style'

// ---- 内置风格包 ----

const STYLE_PACKS: StylePack[] = [
  {
    id: 'default-gravity', name: '心流科技风', version: '1.0.0',
    theme: { mode: 'dark', colors: { accent: '#7c6cf0', bgPrimary: '#0a0a0f', bgSecondary: '#141218', textPrimary: '#e8e8ed', textSecondary: '#8e8e93', border: 'rgba(255,255,255,0.06)' } },
    fonts: { display: "'Inter','Noto Sans SC',system-ui", body: "'Inter','Noto Sans SC',system-ui", mono: "'JetBrains Mono',monospace" },
    animations: { breathingSpeed: 1.0, particleDensity: 1.0 },
  },
  {
    id: 'warm-amber', name: '暖琥珀', version: '1.0.0',
    theme: { mode: 'dark', colors: { accent: '#d4a574', bgPrimary: '#0d0b09', bgSecondary: '#1a1510', textPrimary: '#e8d5c0', textSecondary: '#a09080', border: 'rgba(255,255,255,0.06)' } },
    fonts: { display: "'Inter','Noto Sans SC',system-ui", body: "'Inter','Noto Sans SC',system-ui", mono: "'JetBrains Mono',monospace" },
    animations: { breathingSpeed: 1.3, particleDensity: 0.8 },
  },
  {
    id: 'deep-ocean', name: '深海', version: '1.0.0',
    theme: { mode: 'dark', colors: { accent: '#38bdf8', bgPrimary: '#020617', bgSecondary: '#0c1222', textPrimary: '#bae6fd', textSecondary: '#7aa9c4', border: 'rgba(56,189,248,0.08)' } },
    fonts: { display: "'Inter','Noto Sans SC',system-ui", body: "'Inter','Noto Sans SC',system-ui", mono: "'JetBrains Mono',monospace" },
    animations: { breathingSpeed: 0.8, particleDensity: 1.2 },
  },
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

/** 把颜色向白提亮 amount（0–1），用于从主背景推导卡片底等层叠令牌 */
function lighten(hex: string, amount: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ]
}

/**
 * 从主色推导完整的 CSS 变量体系。
 * 早期仅派生 accent/bg/text-primary/border 等少数令牌，导致切换非默认风格包
 * （深海/引力风）时 --text-high/medium/dim/bright/faint/low 与 --bg-card-rgb
 * 仍停留在暖琥珀 CSS 默认值，出现「蓝主色 + 暖棕卡片/暖白次级文字」的不一致。
 * 现补齐完整文本阶（alpha 与 design-tokens.css 默认值同构，保证暖琥珀默认零回归）
 * 与主题化卡片底，使任意风格包视觉自洽。
 */
function deriveVars(colors: StylePack['theme']['colors']): Record<string, string> {
  const [pr, pg, pb] = hexToRgb(colors.accent)
  const [tr, tg, tb] = hexToRgb(colors.textPrimary)
  const [cr, cg, cb] = lighten(colors.bgPrimary, 0.15)

  return {
    '--accent': colors.accent,
    '--accent-rgb': `${pr}, ${pg}, ${pb}`,
    '--accent-dim': `rgba(${pr},${pg},${pb},0.3)`,
    '--accent-cyan': `rgba(${pr},${pg},${Math.min(pb+80,255)},0.8)`,
    '--accent-blue': `rgba(${pr},${pg},${Math.min(pb+80,255)},0.8)`,
    '--accent-purple': `rgba(${Math.min(pr+20,255)},${Math.max(pg-20,0)},${pb},0.8)`,

    '--bg-primary': colors.bgPrimary,
    '--bg-secondary': colors.bgSecondary,
    '--bg-card': `rgba(255,255,255,0.06)`,
    '--bg-card-hover': `rgba(255,255,255,0.08)`,
    '--bg-surface': colors.bgSecondary,
    '--bg-card-rgb': `${cr}, ${cg}, ${cb}`,

    '--text-primary': colors.textPrimary,
    '--text-secondary': colors.textSecondary,
    '--text-high': `rgba(${tr},${tg},${tb},0.88)`,
    '--text-medium': `rgba(${tr},${tg},${tb},0.53)`,
    '--text-dim': `rgba(${tr},${tg},${tb},0.48)`,
    '--text-bright': `rgba(${tr},${tg},${tb},0.7)`,
    '--text-faint': `rgba(${tr},${tg},${tb},0.34)`,
    '--text-low': `rgba(${tr},${tg},${tb},0.48)`,
    '--text-muted': `rgba(${tr},${tg},${tb},0.44)`,

    '--border-color': colors.border,
    '--border': colors.border,

    '--radius-sm': '6px', '--radius-md': '10px', '--radius-lg': '14px',
    '--shadow': `0 4px 20px rgba(0,0,0,0.3)`,
    '--transition': '0.2s ease',
  }
}

/**
 * 「明亮清新」浅底翻转令牌（dark-on-light）。
 * 这些令牌同时也被 deriveVars 内联为深色值；内联优先级高于 design-tokens.css
 * [data-bg="light"] CSS 覆盖，因此浅底切换必须靠 JS 显式翻转，且切回非浅底时
 * 必须重置回当前风格包派生值，否则落到 design-tokens.css 暖琥珀默认会让
 * 深海/引力风等包的文字被回退成暖白、浅底残留深色文字而不可读。
 */
const LIGHT_FLIP: Record<string, string> = {
  '--text-primary': '#1f1b16',
  '--text-secondary': 'rgba(31,27,22,0.6)',
  '--text-muted': 'rgba(31,27,22,0.6)',
  '--text-high': 'rgba(31,27,22,0.92)',
  '--text-medium': 'rgba(31,27,22,0.75)',
  '--text-dim': 'rgba(31,27,22,0.7)',
  '--text-bright': 'rgba(31,27,22,0.82)',
  '--text-faint': 'rgba(31,27,22,0.55)',
  '--text-low': 'rgba(31,27,22,0.7)',
  '--bg-secondary': 'rgba(0,0,0,0.03)',
  '--bg-card': 'rgba(255,255,255,0.65)',
  '--bg-card-hover': 'rgba(255,255,255,0.9)',
  '--bg-surface': 'rgba(255,255,255,0.5)',
  '--border-color': 'rgba(31,27,22,0.12)',
  '--border': 'rgba(31,27,22,0.12)',
}

export const useStyleStore = defineStore('style', () => {
  const packs = ref<StylePack[]>([...STYLE_PACKS])
  const activeId = ref<string>(STYLE_PACKS[0].id)
  const activePack = computed(() => packs.value.find(p => p.id === activeId.value) ?? STYLE_PACKS[0])
  const installedPacks = computed(() => packs.value.map(p => ({ id: p.id, name: p.name })))

  function applyPack(pack: StylePack) {
    const root = document.documentElement
    const vars = deriveVars(pack.theme.colors)
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v)
    }
    // 也存储 body 背景色
    document.body.style.background = pack.theme.colors.bgPrimary
  }

  /**
   * 将「环境编辑器」持久化的环境参数应用到全局主题。
   * 蓝图要求用户在环境编辑器中的设置（主色/背景/字体/过渡/密度）即时生效。
   * 这些字段由 EnvironmentEditor 写入 config（accentColor/background/density/fontFamily/transition），
   * 此前从未被消费，导致"保存设置"改了不生效。此处补齐集成。
   */
  function applyEnvironmentConfig(cfg: any) {
    if (!cfg || typeof cfg !== 'object') return
    const root = document.documentElement

    if (typeof cfg.accentColor === 'string' && cfg.accentColor) {
      const [r, g, b] = hexToRgb(cfg.accentColor)
      root.style.setProperty('--accent', cfg.accentColor)
      root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
    }

    if (typeof cfg.background === 'string' && cfg.background) {
      const bgMap: Record<string, string> = {
        default: '#0a0a0f',
        dark: '#050507',
        light: '#f5f3ee',
        nature: '#0a0f0a',
        ocean: '#020617',
      }
      const bg = bgMap[cfg.background]
      if (bg) {
        root.style.setProperty('--bg-primary', bg)
        document.body.style.background = bg
      }
      // 「明亮清新」浅底：dark-on-light 翻转。这些令牌同时也被 deriveVars 内联为
      // 深色值（内联优先级高于 [data-bg="light"] CSS 覆盖），故必须用 JS 显式翻转，
      // 否则 deriveVars 改成内联后浅底会残留深色文字而不可读。
      // 切换背景必须可逆：非 light 时把翻转令牌重置回当前风格包派生值（而非 removeProperty
      // 落到 design-tokens.css 暖琥珀默认，导致深海/引力风等包文字被回退成暖白）。
      if (cfg.background === 'light') {
        for (const [k, v] of Object.entries(LIGHT_FLIP)) {
          root.style.setProperty(k, v)
        }
        root.setAttribute('data-bg', 'light')
      } else {
        const derived = deriveVars(activePack.value.theme.colors)
        for (const k of Object.keys(LIGHT_FLIP)) {
          root.style.setProperty(k, derived[k])
        }
        root.removeAttribute('data-bg')
      }
    }

    if (typeof cfg.fontFamily === 'string' && cfg.fontFamily) {
      const fontMap: Record<string, string> = {
        serif: "'Noto Serif SC', serif",
        'sans-serif': "'Inter', 'Noto Sans SC', system-ui",
        monospace: "'JetBrains Mono', monospace",
      }
      const font = fontMap[cfg.fontFamily] || cfg.fontFamily
      root.style.setProperty('--font-body', font)
      document.body.style.fontFamily = font
    }

    if (typeof cfg.transition === 'string' && cfg.transition) {
      const t = cfg.transition === 'none' ? '0s' : cfg.transition === 'slide' ? '0.3s ease' : '0.2s ease'
      root.style.setProperty('--transition', t)
    }

    if (typeof cfg.density === 'string' && cfg.density) {
      // 显示密度：整窗均匀缩放（WebView2/Chromium 支持 zoom），紧凑=更小更密、宽松=更大更疏。
      // 比给每个组件加 spacing 变量更安全——零逐组件重构，且间距与字号同比例变化，正是"密度"语义。
      const zoomMap: Record<string, string> = { compact: '0.94', normal: '1', spacious: '1.06' }
      if (zoomMap[cfg.density]) root.style.zoom = zoomMap[cfg.density]
    }
  }

  function init() {
    const saved = storage.getActiveStylePack()
    if (saved && packs.value.some(p => p.id === saved)) activeId.value = saved
    applyPack(activePack.value)
    applyEnvironmentConfig(storage.getConfig())
  }

  function activate(id: string) {
    const pack = packs.value.find(p => p.id === id)
    if (!pack) return false
    activeId.value = id
    applyPack(pack)
    applyEnvironmentConfig(storage.getConfig())
    storage.setActiveStylePack(id)
    return true
  }

  /** 导出风格包 */
  function exportPack(packId: string) {
    const pack = packs.value.find(p => p.id === packId)
    if (!pack) return
    downloadStylePack(pack)
  }

  /** 从基础色创建风格包 */
  function createFromBaseColor(name: string, color: string, mode: 'dark' | 'light') {
    const partial = createStylePackFromBaseColor(name, color, mode)
    const pack: StylePack = {
      ...partial,
      fonts: { display: "'Inter','Noto Sans SC',system-ui", body: "'Inter','Noto Sans SC',system-ui", mono: "'JetBrains Mono',monospace" },
      animations: { breathingSpeed: 1.0, particleDensity: 1.0 },
    }
    // 替换已存在的同名包或添加新包
    const idx = packs.value.findIndex(p => p.id === partial.id)
    if (idx >= 0) {
      packs.value[idx] = pack
    } else {
      packs.value.push(pack)
    }
    activate(pack.id)
  }

  /** 导入并激活风格包 */
  function importPack(share: StylePackShareFormat) {
    const pack = shareToStylePack(share)
    const idx = packs.value.findIndex(p => p.id === pack.id)
    if (idx >= 0) {
      packs.value[idx] = pack
    } else {
      packs.value.push(pack)
    }
    activate(pack.id)
  }

  return { packs, activeId, activePack, installedPacks, init, activate, applyEnvironmentConfig, exportPack, createFromBaseColor, importPack }
})