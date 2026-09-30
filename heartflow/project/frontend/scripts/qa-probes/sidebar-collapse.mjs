// 侧栏折叠布局真机探针
// 验证：点 ≡ (.bar-menu) 能稳定切换侧栏显隐（collapsed 类交替出现，且不卡死在单一态），
//       且在完全展开态下房间链接可点、hash 跳转生效；全程 0 应用错误。
// 用法: node sidebar-collapse.mjs [route]   route 默认 /timeline
import { ORIGIN, launchBrowser, makePage, wait, collectErrs, normalizeRoute } from './lib.mjs'

const ROUTE = normalizeRoute(process.argv[2] || '/timeline')
const out = []
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s) }

// 收起信号：直接用 .nav-bar 的 `collapsed` 类（App.vue :class="[{collapsed:sidebarCollapsed}]"），
// 它直接绑定 sidebarCollapsed 状态，不受内联 transform/opacity/pe 时序影响，比解析 transform 稳健。
async function readCollapsed(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.nav-bar')
    if (!el) return { exists: false, collapsed: true, transform: 'none', opacity: '0', pe: 'none', inViewport: false }
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    return {
      exists: true,
      collapsed: el.className.split(/\s+/).includes('collapsed'),
      transform: cs.transform, opacity: cs.opacity, pe: cs.pointerEvents,
      inViewport: cx >= 0 && cx <= vw && cy >= 0 && cy <= vh,
    }
  })
}

async function measureNavBar(page) {
  const r = await readCollapsed(page)
  log(`[${r.exists ? 'M' : 'NO'}] collapsed=${r.collapsed} transform=${r.transform} opacity=${r.opacity} pe=${r.pe} inViewport=${r.inViewport}`)
  return r
}

async function clickToggle(page) {
  await page.click('.bar-menu', { timeout: 8000 })
  await wait(700)
}

// 循环点 ≡ 直到侧栏完全展开（无 collapsed 类，最多 3 次，兼容两态/三态 rail 模式）
async function ensureShown(page) {
  for (let i = 0; i < 3; i++) {
    const r = await readCollapsed(page)
    if (!r.collapsed) return true
    await clickToggle(page)
  }
  return !(await readCollapsed(page)).collapsed
}

async function main() {
  const browser = await launchBrowser()
  const errs = new Set()
  const page = await makePage(browser, errs, { width: 1280, height: 900 })
  try {
    log(`navigate ${ROUTE} ...`)
    // 确定性：清掉持久化的侧栏状态，回到默认态，避免历史运行污染断言（不依赖默认是收起还是展开）
    await page.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('ui:sidebar')) localStorage.removeItem(k) } catch (_) {} })
    await page.goto(ORIGIN + '/#' + ROUTE, { waitUntil: 'networkidle' })
    await page.waitForSelector('.nav-bar', { timeout: 10000 })
    await page.waitForSelector('.bar-menu', { timeout: 10000 })
    await wait(800)

    const S0 = await measureNavBar(page); await clickToggle(page)
    const S1 = await measureNavBar(page); await clickToggle(page)
    const S2 = await measureNavBar(page); await clickToggle(page)
    const S3 = await measureNavBar(page)

    const states = [S0.collapsed, S1.collapsed, S2.collapsed, S3.collapsed]
    const hasBoth = states.includes(true) && states.includes(false)
    const flips = [0, 1, 2].filter((i) => states[i] !== states[i + 1]).length
    // 不假设初始态：只要求「折叠/展开两种态都出现过」且「相邻切换 ≥ 2 次」（证明切换机制未卡死）
    const toggleOk = hasBoth && flips >= 2
    log(`TOGGLE(states=${states.join(',')} hasBoth=${hasBoth} flips=${flips})=${toggleOk}`)

    // 导航可达：确保完全展开后点一个 href 不同的房间链接，验证 hash 跳转
    const shown = await ensureShown(page)
    const before = await page.evaluate(() => location.hash)
    const pick = await page.evaluate(() => {
      const cur = location.hash.replace(/^#/, '')
      const links = [...document.querySelectorAll('.nav-tree a[href^="#/"]')]
      const other = links.find((a) => (a.getAttribute('href') || '').replace(/^#/, '') !== cur)
      return other ? { href: other.getAttribute('href') } : null
    })
    let navOk = false, navMsg = 'no differing .nav-tree a'
    if (pick) {
      await page.click(`.nav-tree a[href="${pick.href}"]`, { timeout: 8000 })
      await wait(800)
      const after = await page.evaluate(() => location.hash)
      navOk = after !== before && after.length > 1
      navMsg = `hash ${before} -> ${after} (changed=${after !== before})`
    }
    log(`NAV(shown=${shown})=${navOk}; ${navMsg}`)
    await collectErrs(page, errs)

    const pass = toggleOk && navOk && errs.size === 0
    log(`ERRORS(count=${errs.size}): ${[...errs].slice(0, 8).join(' | ') || 'none'}`)
    log(`RESULT: ${pass ? 'PASS' : 'FAIL'}  [toggleOk=${toggleOk} navOk=${navOk} shown=${shown} errors=${errs.size}]`)
    process.exitCode = pass ? 0 : 1
  } catch (e) {
    log('PROBE-EXCEPTION: ' + (e && e.stack ? e.stack : String(e)))
    log('RESULT: FAIL')
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
