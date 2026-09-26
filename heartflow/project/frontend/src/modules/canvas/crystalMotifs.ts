// ============================================================
// 结晶可自定义形象库
// 内置「图标（花草/星月等）」与「像素小角色」两套 SVG 图形，
// 由结晶色着色，保持半透明玻璃质感。供 CanvasRoom 画布与
// CrystalDetail 详情弹窗共用。
//
// 所有图形基于 48×48 viewBox，居中于 (24,24)，半径约 16。
// 图形字符串中的占位符在运行时替换为真实颜色：
//   __C__  主色（结晶色）
//   __CA__ 主色半透明（约 0.5 alpha）
//   __CD__ 主色加深（约 -0.25 亮度）
//   __CH__ 高光（白）
// ============================================================

/** hex(#rgb / #rrggbb) → rgba() */
function withAlpha(hex: string, a: number): string {
  let h = (hex || '#ffffff').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.substring(0, 2) || 'ff', 16)
  const g = parseInt(h.substring(2, 4) || 'ff', 16)
  const b = parseInt(h.substring(4, 6) || 'ff', 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** 简单亮度调整（amt: -1~1，负=加深） */
function shade(hex: string, amt: number): string {
  let h = (hex || '#ffffff').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const num = parseInt(h.substring(0, 6) || 'ffffff', 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  const f = amt < 0 ? 0 : 255
  const p = Math.abs(amt)
  r = Math.round((f - r) * p + r)
  g = Math.round((f - g) * p + g)
  b = Math.round((f - b) * p + b)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export interface GlyphDef {
  key: string
  label: string
  /** 内层 SVG 标记（含 __C__ / __CA__ / __CD__ / __CH__ 占位符） */
  raw: string
}

// ---- 图标（花草 / 星月 / 心露） ----
export const MOTIFS: GlyphDef[] = [
  {
    key: 'sprout',
    label: '嫩芽',
    raw: `
      <path d="M24 41 V27" stroke="__C__" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M24 28 C18 28 13 23 13 16 C20 16 24 21 24 28 Z" fill="__CA__" stroke="__C__" stroke-width="0.8"/>
      <path d="M24 24 C30 24 35 19 35 12 C28 12 24 17 24 24 Z" fill="__CA__" stroke="__C__" stroke-width="0.8"/>
      <circle cx="24" cy="41" r="1.8" fill="__CH__"/>`,
  },
  {
    key: 'leaf',
    label: '叶',
    raw: `
      <path d="M14 34 C14 20 26 12 38 14 C36 28 26 38 14 34 Z" fill="__CA__" stroke="__C__" stroke-width="1"/>
      <path d="M17 32 C22 26 28 21 34 17" stroke="__CH__" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.7"/>
      <path d="M14 34 V41" stroke="__C__" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    key: 'flower',
    label: '花',
    raw: `
      <g fill="__CA__" stroke="__C__" stroke-width="0.7">
        <ellipse cx="24" cy="14" rx="5" ry="8"/>
        <ellipse cx="24" cy="34" rx="5" ry="8"/>
        <ellipse cx="14" cy="24" rx="8" ry="5"/>
        <ellipse cx="34" cy="24" rx="8" ry="5"/>
        <ellipse cx="17" cy="17" rx="6" ry="6" transform="rotate(45 17 17)"/>
        <ellipse cx="31" cy="17" rx="6" ry="6" transform="rotate(-45 31 17)"/>
        <ellipse cx="17" cy="31" rx="6" ry="6" transform="rotate(-45 17 31)"/>
        <ellipse cx="31" cy="31" rx="6" ry="6" transform="rotate(45 31 31)"/>
      </g>
      <circle cx="24" cy="24" r="4.5" fill="__CH__"/>
      <circle cx="24" cy="24" r="4.5" fill="__C__" opacity="0.35"/>`,
  },
  {
    key: 'tree',
    label: '树',
    raw: `
      <rect x="22" y="28" width="4" height="14" rx="1.5" fill="__CD__"/>
      <circle cx="24" cy="20" r="12" fill="__CA__" stroke="__C__" stroke-width="1"/>
      <circle cx="24" cy="20" r="12" fill="__CH__" opacity="0.12"/>
      <path d="M24 12 V28" stroke="__CH__" stroke-width="1" opacity="0.5"/>`,
  },
  {
    key: 'star',
    label: '星',
    raw: `
      <path d="M24 8 C26 18 30 22 40 24 C30 26 26 30 24 40 C22 30 18 26 8 24 C18 22 22 18 24 8 Z"
            fill="__CA__" stroke="__C__" stroke-width="1"/>
      <circle cx="24" cy="24" r="3" fill="__CH__"/>`,
  },
  {
    key: 'moon',
    label: '月',
    raw: `
      <path d="M30 10 A16 16 0 1 0 30 38 A12 12 0 1 1 30 10 Z"
            fill="__CA__" stroke="__C__" stroke-width="1"/>
      <circle cx="33" cy="17" r="1.6" fill="__CH__" opacity="0.8"/>
      <circle cx="36" cy="26" r="1.1" fill="__CH__" opacity="0.6"/>`,
  },
  {
    key: 'droplet',
    label: '露珠',
    raw: `
      <path d="M24 8 C33 20 36 26 36 30 A12 12 0 1 1 12 30 C12 26 15 20 24 8 Z"
            fill="__CA__" stroke="__C__" stroke-width="1"/>
      <path d="M19 27 A5 5 0 0 1 22 21" stroke="__CH__" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>`,
  },
  {
    key: 'heart',
    label: '心',
    raw: `
      <path d="M24 38 C10 28 10 16 18 14 C22 13 24 17 24 19 C24 17 26 13 30 14 C38 16 38 28 24 38 Z"
            fill="__CA__" stroke="__C__" stroke-width="1"/>
      <path d="M17 19 C15 21 15 24 17 26" stroke="__CH__" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.7"/>`,
  },
]

// ---- 像素小角色（8×8 网格，每格 6px） ----
interface PixelDef {
  key: string
  label: string
  rows: string[]
  /** 调色板：字符 → 颜色键 */
  palette: Record<string, 'B' | 'D' | 'W' | 'E'>
}

export const PIXELS: PixelDef[] = [
  {
    key: 'cat',
    label: '像素猫',
    rows: [
      '..BBBB..',
      '.BBBBBB.',
      'BBBBBBBB',
      'BEWBBWEB',
      'BBBBBBBB',
      'BBBBBBBB',
      '.BBBBBB.',
      '.B....B.',
    ],
    palette: { B: 'B', D: 'D', W: 'W', E: 'E' },
  },
  {
    key: 'ghost',
    label: '像素幽灵',
    rows: [
      '..BBBB..',
      '.BBBBBB.',
      'BBBBBBBB',
      'BWBWBBBB',
      'BBBBBBBB',
      'BBBBBBBB',
      'BBBBBBBB',
      'B.BB.BB.',
    ],
    palette: { B: 'B', D: 'D', W: 'W', E: 'E' },
  },
  {
    key: 'sprout',
    label: '像素苗',
    rows: [
      '...BB...',
      '..BBBB..',
      '.BBBBBB.',
      '..BBBB..',
      '...BB...',
      '...BB...',
      '...BB...',
      '..BBBB..',
    ],
    palette: { B: 'B', D: 'D', W: 'W', E: 'E' },
  },
]

// ---- 公共：替换占位符 ----
function fill(raw: string, color: string): string {
  const c = color || '#aab4ff'
  return raw
    .replace(/__C__/g, c)
    .replace(/__CA__/g, withAlpha(c, 0.5))
    .replace(/__CD__/g, shade(c, -0.25))
    .replace(/__CH__/g, '#ffffff')
}

/** 图标 SVG 内层标记 */
export function motifSvg(key: string, color: string, strong: boolean): string {
  const def = MOTIFS.find((m) => m.key === key) ?? MOTIFS[0]
  const opacity = strong ? 1 : 0.72
  return `<g opacity="${opacity}">${fill(def.raw, color)}</g>`
}

/** 像素角色 SVG 内层标记 */
export function pixelSvg(key: string, color: string, strong: boolean): string {
  const def = PIXELS.find((p) => p.key === key) ?? PIXELS[0]
  const c = color || '#aab4ff'
  const pal: Record<string, string> = {
    B: c,
    D: shade(c, -0.3),
    W: '#ffffff',
    E: shade(c, -0.55),
  }
  const cell = 6
  const rects: string[] = []
  def.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.' || !pal[ch]) continue
      rects.push(
        `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${pal[ch]}"/>`,
      )
    }
  })
  const opacity = strong ? 1 : 0.78
  return `<g opacity="${opacity}">${rects.join('')}</g>`
}

// ---- 稳定派生（无单独定制时按 id 取默认，保证多样但稳定） ----
function hashIndex(id: string, mod: number): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % mod
}

export function defaultMotifFor(id: string): string {
  return MOTIFS[hashIndex(id, MOTIFS.length)].key
}

export function defaultPixelFor(id: string): string {
  return PIXELS[hashIndex(id, PIXELS.length)].key
}
