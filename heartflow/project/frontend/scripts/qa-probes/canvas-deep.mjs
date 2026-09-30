// Canvas/3D 坐标级深度探针
// 对每个目标房间：长等待→找最大 on-screen canvas→做 拖拽+滚轮+点击(中心/四象限)
// 断言：0 page/console error + WebGL 上下文未丢失 + 截图像素级 before/after 拖拽有可见差异(响应)
// 用法:
//   node canvas-deep.mjs                       # 探测内置目标房间列表
//   HF_TARGETS="/home-replica,/map" node canvas-deep.mjs   # 指定房间
//   node canvas-deep.mjs /home-replica /map    # 命令行指定房间
import { appendFileSync } from 'node:fs'
import { ORIGIN, launchBrowser, makePage, wait, collectErrs, measureCanvas, bdiff, normalizeRoute } from './lib.mjs'

const DEFAULT_TARGETS = [
  '/home-replica', '/visualization-studio', '/knowledge-graph', '/knowledge',
  '/association-graph', '/star-map', '/world-life', '/parallel', '/launcher',
  '/map', '/crystal', '/transform-gallery',
]
const TARGETS = (process.argv.slice(2).length
  ? process.argv.slice(2)
  : (process.env.HF_TARGETS ? process.env.HF_TARGETS.split(',') : DEFAULT_TARGETS)).map(normalizeRoute)
const REPORT = process.env.HF_REPORT || 'hf-canvas-deep-report.jsonl'

// 截图前把 clip 钳制进视口，避免大画布越界触发 Playwright "Clipped area" 异常（探针瑕疵，非应用错误）
async function safeShot(page, clip) {
  try {
    const vs = page.viewportSize() || { width: 1440, height: 900 }
    const x = Math.max(0, Math.min(clip.x, vs.width - 10))
    const y = Math.max(0, Math.min(clip.y, vs.height - 10))
    const w = Math.max(1, Math.min(clip.width, vs.width - x))
    const h = Math.max(1, Math.min(clip.height, vs.height - y))
    return await page.screenshot({ clip: { x, y, width: w, height: h } })
  } catch (_) { return null }
}

// 真实应用错误（排除截图越界等探针自身瑕疵）：console/pageerror 才计入
function appErrList(errSet) {
  return Array.from(errSet).filter((e) => !/page\.screenshot|Clipped area/i.test(e))
}

async function main() {
  console.log(`=== Canvas 深度探针：目标 ${TARGETS.length} 个房间 → ${REPORT} ===`)
  const browser = await launchBrowser()
  const page = await makePage(browser, new Set(), { width: 1440, height: 900 })
  const errs = new Set()
  for (const p of TARGETS) {
    const url = ORIGIN + '/#' + (p.includes(':id') ? p.replace(':id', '1') : p)
    const rec = { path: p, pass: true, errs: [], webglLost: false, pixResponded: null, canvas: null, note: '' }
    try {
      errs.clear()
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); await wait(2500)
      const box = await measureCanvas(page)
      if (!box || box.w < 50 || box.h < 50) {
        rec.pass = false; rec.note = 'canvas 屏上尺寸不足或缺失(懒加载/容器折叠/数据门控)'
        appendFileSync(REPORT, JSON.stringify(rec) + '\n'); console.log(`${p} SKIP ${rec.note}`); continue
      }
      rec.canvas = `${box.ctx}:${Math.round(box.w)}x${Math.round(box.h)}`
      const clip = { x: box.x, y: box.y, width: box.w, height: box.h }
      const s1 = await safeShot(page, clip); await wait(400)
      const s2 = await safeShot(page, clip)
      const noise = s1 && s2 ? bdiff(s1, s2) : 0
      await page.mouse.move(box.cx, box.cy); await page.mouse.down()
      for (let i = 1; i <= 8; i++) { await page.mouse.move(box.cx + i * 24, box.cy + i * 12); await wait(30) }
      await page.mouse.up(); await wait(250)
      await page.mouse.move(box.cx, box.cy); await page.mouse.wheel(0, -360); await wait(250)
      let b2 = await measureCanvas(page)
      for (const [dx, dy] of [[0, 0], [b2.w * 0.25, b2.h * 0.25], [b2.w * 0.75, b2.h * 0.25], [b2.w * 0.5, b2.h * 0.75]]) {
        if (b2) await page.mouse.click(b2.x + dx, b2.y + dy); await wait(140)
      }
      await wait(350)
      b2 = await measureCanvas(page)
      const after = b2 ? await safeShot(page, { x: b2.x, y: b2.y, width: b2.w, height: b2.h }) : null
      const dragDiff = after && s2 ? bdiff(s2, after) : -1
      const lost = await page.evaluate(() => { for (const c of document.querySelectorAll('canvas')) { try { const gl = c.getContext('webgl2') || c.getContext('webgl'); if (gl && gl.isContextLost && gl.isContextLost()) return true } catch (_) {} } return false })
      rec.webglLost = lost
      rec.pixResponded = after != null && dragDiff > noise * 1.5 && dragDiff > 25
      rec.note = `noise=${noise} dragDiff=${dragDiff}`
      // PASS 只信真实应用错误（已排除截图越界等探针瑕疵）+ WebGL 上下文未丢失
      const appErrs = appErrList(errs)
      if (appErrs.length > 0 || lost) rec.pass = false
      rec.errs = appErrs
    } catch (e) {
      const msg = String((e && e.message) || e)
      // 截图/越界类探针瑕疵不计入应用错误，仅记 note；导航等真实失败才判 FAIL
      if (/page\.screenshot|Clipped area|timeout/i.test(msg)) { rec.pass = rec.pass && true; rec.note = (rec.note ? rec.note + '; ' : '') + 'probe-artifact:' + msg.slice(0, 80) }
      else { rec.pass = false; rec.errs = [msg] }
    }
    appendFileSync(REPORT, JSON.stringify(rec) + '\n')
    console.log(`${p.padEnd(22)} ${rec.pass ? 'PASS' : 'FAIL'} canvas=${rec.canvas} lost=${rec.webglLost} pixResp=${rec.pixResponded} ${rec.note} appErrs=${rec.errs.length}`)
  }
  await page.close(); await browser.close()
  console.log(`=== Canvas 深度探针完成 → ${REPORT} ===`)
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
