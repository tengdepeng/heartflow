// Heartflow 全路由真机功能巡检（点击/输入/加载）
// 用法:
//   node e2e.mjs                 # 桌面 1440x900，全 87 路由
//   HF_VIEWPORT=390x844 HF_MOBILE=1 node e2e.mjs   # 手机端 390 视口
//   node e2e.mjs 5 20            # 只跑路由索引 [5..20]
// 依赖: 先起 dev server（默认 http://localhost:1003，可用 HF_ORIGIN 覆盖）
import { appendFileSync } from 'node:fs'
import { ORIGIN, launchBrowser, makePage, parseRoutes, wait, collectErrs } from './lib.mjs'

const ROUTES = parseRoutes().map((p) => ({ path: p, name: p.replace(/[^\w-]/g, ''), title: p }))
const PLACEHOLDER_ID = '1'
const REPORT = process.env.HF_REPORT || 'hf-e2e-report.jsonl'

const vp = (process.env.HF_VIEWPORT || '1440x900').split('x').map(Number)
const VIEWPORT = { width: vp[0] || 1440, height: vp[1] || 900 }
const IS_MOBILE = process.env.HF_MOBILE === '1' || VIEWPORT.width <= 480

const startIdx = Math.max(0, Number(process.argv[2] ?? 0))
const endIdx = Math.min(ROUTES.length - 1, Number(process.argv[3] ?? ROUTES.length - 1))

function resolvePath(p) { return p.includes(':id') ? p.replace(':id', PLACEHOLDER_ID) : p }
function routeUrl(r) { return ORIGIN + '/#' + resolvePath(r.path) }
function expectedHash(r) { return '#' + resolvePath(r.path) }

let page = null
let routeErrs = new Set()

async function gotoRoute(r) {
  await page.goto(routeUrl(r), { waitUntil: 'networkidle', timeout: 30000 })
  await wait(800)
}

async function collectTargets() {
  return page.evaluate(() => {
    const visible = (el) => {
      const cs = getComputedStyle(el)
      return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0'
    }
    const GLOBAL = /nav-bar|sidebar|world-graph|bar-menu|command-palette|app-nav|nav-rail|room-graph/i
    const insideGlobal = (el) => { let a = el.parentElement; while (a) { const c = (a.className || '').toString(); if (GLOBAL.test(c)) return true; a = a.parentElement } return false }
    const inputs = []
    ;['input:not([type=hidden])', 'textarea', 'select', '[contenteditable="true"]'].forEach((sel) => {
      Array.from(document.querySelectorAll(sel)).forEach((el, idx) => {
        if (!visible(el) || insideGlobal(el)) return
        inputs.push({ sel, idx, tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || el.tagName.toLowerCase() })
      })
    })
    const clickables = []
    ;['button:not([disabled])', '[role="button"]', 'a[href]'].forEach((sel) => {
      Array.from(document.querySelectorAll(sel)).forEach((el, idx) => {
        if (!visible(el) || insideGlobal(el)) return
        const href = el.getAttribute('href') || ''
        const isHashRoute = /^#\//.test(href) || (href.startsWith('#') && href.length > 1)
        const isBareHash = href === '#' || href === ''
        const isJs = href.startsWith('javascript:')
        const clickable = !(el.tagName.toLowerCase() === 'a' && (isHashRoute || isBareHash || isJs))
        const text = (el.innerText || el.textContent || '').trim().slice(0, 30)
        const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')
        clickables.push({ sel, idx, tag: el.tagName.toLowerCase(), text, cls, href: href.slice(0, 40), isHashRoute, clickable })
      })
    })
    const appHtmlLen = (document.querySelector('#app') && document.querySelector('#app').innerHTML || '').length
    const appTextLen = (document.querySelector('#app') && document.querySelector('#app').innerText || '').trim().length
    return { inputs, clickables, appHtmlLen, appTextLen, hash: location.hash }
  })
}

async function globalChrome(r, rec) {
  rec.chrome = []
  try {
    const loc = page.locator('.bar-menu, [class*="bar-menu"]').first()
    if (await loc.count() > 0) {
      await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
      const box = await loc.boundingBox({ timeout: 2000 }).catch(() => null)
      const vs = page.viewportSize()
      if (box && box.x + box.width / 2 > 2 && box.y + box.height / 2 > 2 && box.x + box.width / 2 < vs.width - 2 && box.y + box.height / 2 < vs.height - 2) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(400)
        rec.chrome.push({ name: 'hamburger(.bar-menu)', ok: true }); await collectErrs(page, routeErrs); await gotoRoute(r)
      } else rec.chrome.push({ name: 'hamburger(.bar-menu)', ok: false, err: 'offscreen' })
    } else rec.chrome.push({ name: 'hamburger(.bar-menu)', ok: false, err: 'selector-not-found' })
  } catch (e) { rec.chrome.push({ name: 'hamburger(.bar-menu)', ok: false, err: String((e && e.message) || e) }); await gotoRoute(r).catch(() => {}) }
  try {
    await page.keyboard.press('Control+k'); await page.waitForSelector('.cp-input', { timeout: 5000 })
    await page.fill('.cp-input', '时间'); await wait(400); await page.keyboard.press('Enter'); await wait(800)
    rec.chrome.push({ name: 'command-palette', ok: true }); await collectErrs(page, routeErrs)
    await page.keyboard.press('Escape').catch(() => {}); await wait(300); await gotoRoute(r)
  } catch (e) { rec.chrome.push({ name: 'command-palette', ok: false, err: String((e && e.message) || e) }); await gotoRoute(r).catch(() => {}) }
  try {
    await page.keyboard.press('Control+k'); await page.waitForSelector('.cp-input', { timeout: 5000 })
    await page.fill('.cp-input', '星盘'); await wait(400); await page.keyboard.press('Enter')
    await page.waitForSelector('.astrolabe-overlay', { timeout: 5000 }); await wait(800)
    rec.chrome.push({ name: 'star-map(astrolabe)', ok: true }); await collectErrs(page, routeErrs)
    await page.keyboard.press('Escape').catch(() => {}); await wait(300); await gotoRoute(r)
  } catch (e) { rec.chrome.push({ name: 'star-map(astrolabe)', ok: false, err: String((e && e.message) || e) }); await gotoRoute(r).catch(() => {}) }
}

async function inspectRoute(r, i, total, didChromeRef) {
  const rec = { route: r.path, name: r.name, title: r.title, status: 'ok', redirected: false, blank: false, inputs: [], clicks: [], errs: [], chrome: null, fatal: null }
  routeErrs = new Set()
  try {
    if (!page) page = await makePage(browser, routeErrs, VIEWPORT, { isMobile: IS_MOBILE, hasTouch: IS_MOBILE })
    const expHash = expectedHash(r)
    await page.goto(routeUrl(r), { waitUntil: 'networkidle', timeout: 30000 }); await wait(1000); await collectErrs(page, routeErrs)
    const curHash = await page.evaluate(() => location.hash)
    rec.redirected = (r.path !== '/' && curHash === '#/')
    const info = await collectTargets()
    rec.blank = (info.appHtmlLen <= 500 || info.appTextLen <= 0)
    for (const inp of info.inputs.slice(0, 80)) {
      try {
        const loc = page.locator(inp.sel).nth(inp.idx)
        await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
        if (inp.tag === 'select') {
          const fv = await loc.evaluate((el) => { const o = Array.from(el.options).find((x) => !x.disabled && x.value !== ''); return o ? o.value : null })
          if (fv != null) await loc.selectOption(fv, { timeout: 3000 })
        } else if (inp.type === 'number' || inp.type === 'range') await loc.fill('1', { timeout: 3000 })
        else await loc.fill('测试', { timeout: 3000 })
        rec.inputs.push({ sel: inp.sel, idx: inp.idx, tag: inp.tag, type: inp.type, ok: true })
      } catch (e) { rec.inputs.push({ sel: inp.sel, idx: inp.idx, tag: inp.tag, type: inp.type, ok: false, err: String((e && e.message) || e) }) }
      await collectErrs(page, routeErrs)
    }
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await wait(600); await collectErrs(page, routeErrs)
    const clicked = new Set(); let guard = 0
    while (guard < 150) {
      guard++
      const list = (await collectTargets()).clickables.filter((c) => c.clickable)
      let target = null
      for (const c of list) { if (!clicked.has(c.sel + '#' + c.idx)) { target = c; break } }
      if (!target) break
      clicked.add(target.sel + '#' + target.idx)
      try {
        const loc = page.locator(target.sel).nth(target.idx)
        if (await loc.count() === 0) rec.clicks.push({ sel: target.sel, idx: target.idx, tag: target.tag, text: target.text, cls: target.cls, ok: false, skipped: true, err: 'not-found' })
        else {
          await loc.evaluate((el) => { try { el.scrollIntoView({ block: 'center', inline: 'center' }) } catch (_) {} }).catch(() => {}); await wait(60)
          const box = await loc.boundingBox({ timeout: 2000 }).catch(() => null)
          const vs = page.viewportSize()
          if (!box) rec.clicks.push({ sel: target.sel, idx: target.idx, tag: target.tag, text: target.text, cls: target.cls, ok: false, skipped: true, err: 'no-bounding-box' })
          else {
            const cx = box.x + box.width / 2, cy = box.y + box.height / 2
            if (cx < 2 || cy < 2 || cx > vs.width - 2 || cy > vs.height - 2) rec.clicks.push({ sel: target.sel, idx: target.idx, tag: target.tag, text: target.text, cls: target.cls, ok: false, skipped: true, err: 'offscreen', cx: Math.round(cx), cy: Math.round(cy) })
            else {
              await page.mouse.click(cx, cy); await wait(250)
              const after = await page.evaluate(() => ({ overlay: !!document.querySelector('.overlay,.drawer,.modal,.astrolabe-overlay,[class*="overlay"],[class*="drawer"],[class*="modal"],[class*="Dialog"]'), hash: location.hash }))
              rec.clicks.push({ sel: target.sel, idx: target.idx, tag: target.tag, text: target.text, cls: target.cls, ok: true, navChanged: after.hash !== expHash, overlayOpened: after.overlay })
              await collectErrs(page, routeErrs)
              if (after.hash !== expHash) { await page.goto(routeUrl(r), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await wait(400) }
              else if (after.overlayOpened) { await page.keyboard.press('Escape').catch(() => {}); await wait(300); const still = await page.evaluate(() => !!document.querySelector('.overlay,.drawer,.modal,.astrolabe-overlay,[class*="overlay"],[class*="drawer"],[class*="modal"],[class*="Dialog"]')).catch(() => false); if (still) { await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await wait(400) } }
            }
          }
        }
      } catch (e) { rec.clicks.push({ sel: target.sel, idx: target.idx, tag: target.tag, text: target.text, cls: target.cls, ok: false, err: String((e && e.message) || e) }); try { await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await wait(400) } catch (_) {} }
      await collectErrs(page, routeErrs)
    }
    const doChrome = (r.path === '/') || (!didChromeRef.v)
    if (doChrome) { await globalChrome(r, rec); didChromeRef.v = true }
  } catch (e) {
    rec.fatal = String((e && e.message) || e)
    try { if (page) await page.close() } catch (_) {}; page = null
  }
  rec.errs = Array.from(routeErrs)
  rec.status = rec.blank ? 'blank' : (rec.errs.length > 0 ? 'error' : 'ok')
  appendFileSync(REPORT, JSON.stringify(rec) + '\n')
  const realClkFail = rec.clicks.filter((x) => !x.ok && !x.skipped).length
  const clkSkip = rec.clicks.filter((x) => x.skipped).length
  const flag = rec.fatal ? 'FATAL' : rec.status.toUpperCase()
  console.log(`[${i + 1}/${total}] ${r.path.padEnd(26)} -> ${flag}  errs=${rec.errs.length} blank=${rec.blank} in=${rec.inputs.length}(${rec.inputs.filter(x => !x.ok).length}f) clk=${rec.clicks.length}(fail=${realClkFail} skip=${clkSkip})`)
  return rec
}

let browser
async function main() {
  browser = await launchBrowser()
  const total = endIdx - startIdx + 1
  const didChromeRef = { v: false }
  console.log(`=== Heartflow e2e 巡检 批次 [${startIdx}..${endIdx}] viewport=${VIEWPORT.width}x${VIEWPORT.height} mobile=${IS_MOBILE} 共 ${total} 路由 → ${REPORT} ===`)
  for (let i = startIdx; i <= endIdx; i++) await inspectRoute(ROUTES[i], i, ROUTES.length, didChromeRef)
  if (page) { try { await page.close() } catch (_) {} }
  await browser.close()
  console.log(`=== 批次完成 [${startIdx}..${endIdx}] ===`)
}
main().catch((e) => { console.error('FATAL BATCH ERROR:', e); process.exit(1) })
