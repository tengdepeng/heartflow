// Heartflow QA 探针 · 共享库
// 统一解析 playwright-core / chromium 可执行 / 路由表 / 错误收集器，供各探针复用。
// 环境变量（均可选）：
//   HF_ORIGIN         dev server 地址，默认 http://localhost:1003
//   HF_EXEC           chromium 可执行路径（不设则自动探测 ms-playwright 下的 chromium-12xx）
//   HF_PW_CORE       playwright-core 路径（不设则先试项目 node_modules，再试个人工作台）
//   HF_ROUTES_FILE   路由表文件，默认 ../../src/router/index.ts
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND = resolve(__dirname, '../..')

export const ORIGIN = process.env.HF_ORIGIN || 'http://localhost:1003'

// ---- playwright-core 解析 ----
export async function resolvePlaywright() {
  const wsCore = 'C:/Users/tengxiaosu/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js'
  const candidates = [
    process.env.HF_PW_CORE,
    'playwright-core',
    wsCore,
  ].filter(Boolean).map((c) => (c.startsWith('C:/') || c.startsWith('/') ? pathToFileURL(c).href : c))
  for (const c of candidates) {
    try {
      const mod = await import(c)
      const pb = (mod && mod.default && mod.default.chromium) ? mod.default : (mod && mod.chromium ? mod : null)
      if (pb && pb.chromium) return pb
    } catch (_) {}
  }
  throw new Error('playwright-core 不可解析：请安装 playwright-core 或设 HF_PW_CORE / HF_EXEC')
}

// ---- chromium 可执行解析 ----
export function resolveChromiumExec() {
  if (process.env.HF_EXEC && existsSync(process.env.HF_EXEC)) return process.env.HF_EXEC
  // ms-playwright 下的 chromium-*（headless_shell 或 chrome-win64 均可）
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    'C:/Users/tengxiaosu/AppData/Local/ms-playwright',
    process.env.LOCALAPPDATA + '/ms-playwright',
  ].filter(Boolean)
  for (const root of roots) {
    if (!existsSync(root)) continue
    const tries = [
      'chrome-win64/chrome.exe',
      'chrome-headless-shell-win64/chrome-headless-shell.exe',
    ]
    let dirs = []
    try { dirs = readdirSync(root) } catch (_) { continue }
    // chromium-1228 / chromium-1234 ...
    for (const dir of dirs.filter((d) => /^chromium-/.test(d))) {
      for (const t of tries) {
        const p = resolve(root, dir, t)
        if (existsSync(p)) return p
      }
    }
  }
  // 兜底：已知路径
  const fallback = 'C:/Users/tengxiaosu/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
  if (existsSync(fallback)) return fallback
  throw new Error('chromium 可执行未找到：请安装 `npx playwright install chromium` 或设 HF_EXEC')
}

// ---- 启动浏览器 ----
export async function launchBrowser(extraArgs = []) {
  const { chromium } = await resolvePlaywright()
  return chromium.launch({
    executablePath: resolveChromiumExec(),
    args: [
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist', '--no-sandbox', '--no-proxy-server', ...extraArgs,
    ],
  })
}

// ---- 路由表（从 router/index.ts 抽取 path） ----
export function parseRoutes(file = resolve(FRONTEND, 'src/router/index.ts')) {
  const src = readFileSync(file, 'utf8')
  return [...src.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1])
}

// ---- 错误收集器（附加到 page） ----
export function attachErrCollector(page, errSet) {
  page.on('console', (m) => { if (m.type() === 'error') errSet.add(m.text()) })
  page.on('pageerror', (e) => errSet.add(e.message))
  return page
}

// ---- 新建带错误收集 + 关闭动画的 page ----
export async function makePage(browser, errSet, viewport = { width: 1440, height: 900 }, opts = {}) {
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport, isMobile: !!opts.isMobile, hasTouch: !!opts.hasTouch })
  attachErrCollector(page, errSet)
  await page.addInitScript(() => {
    window.__errs = []
    const push = (type, msg) => { try { window.__errs.push({ type, message: String(msg) }) } catch (_) {} }
    window.addEventListener('error', (ev) => push('error', (ev && ev.message) || (ev && ev.error && ev.error.message) || 'error'))
    window.addEventListener('unhandledrejection', (ev) => push('unhandledrejection', (ev && ev.reason && (ev.reason.message || ev.reason)) || 'unhandledrejection'))
    const s = document.createElement('style')
    s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;transition-duration:0s!important;animation-duration:0s!important}'
    try { document.documentElement.appendChild(s) } catch (_) {}
  })
  return page
}

// ---- 收集 in-page 错误 ----
export async function collectErrs(page, errSet) {
  try {
    const we = await page.evaluate(() => (window.__errs || []))
    for (const e of we) errSet.add('[' + (e.type || 'inpage') + '] ' + (e.message || ''))
  } catch (_) {}
}

// ---- 最大可见 canvas ----
export async function measureCanvas(page) {
  return page.evaluate(() => {
    const cs = Array.from(document.querySelectorAll('canvas'))
    let best = null, ba = 0
    for (const c of cs) {
      const r = c.getBoundingClientRect()
      const a = r.width * r.height
      let ctx = 'none'
      try { if (c.getContext('webgl2') || c.getContext('webgl')) ctx = 'webgl'; else if (c.getContext('2d')) ctx = '2d' } catch (_) {}
      if (a > ba) { ba = a; best = { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, ctx } }
    }
    return best
  })
}

// ---- 两张截图像素差异（抽样） ----
export function bdiff(a, b) {
  if (!a || !b) return 1e9
  if (a.length !== b.length) return Math.max(a.length, b.length)
  let d = 0
  for (let i = 0; i < a.length; i += 257) if (a[i] !== b[i]) d++
  return d
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- 路由参数归一化（规避 Git Bash / MSYS 把以 / 开头的参数误转成绝对 Windows 路径）----
// 例如 `/timeline` 在 MSYS 下会变成 `C:/.../PortableGit/versions/x.x.x/timeline`，
// 这里取末段并补前导 /，恢复成正确的 hash 路由。
export function normalizeRoute(p) {
  if (!p) return p
  if (/[a-zA-Z]:[\\/]/.test(p) || p.includes('\\')) {
    const seg = p.split(/[\\/]/).filter(Boolean).pop() || ''
    return '/' + seg.replace(/^#/, '')
  }
  return p.startsWith('/') ? p : '/' + p.replace(/^#/, '')
}
