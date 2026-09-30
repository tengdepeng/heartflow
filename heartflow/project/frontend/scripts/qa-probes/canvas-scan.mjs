// Canvas/3D 运行时挂载扫描：找出真正渲染 <canvas> 的房间（供 canvas-deep.mjs 选靶）
// 用法: node canvas-scan.mjs   →  hf-canvas-scan.jsonl
import { appendFileSync } from 'node:fs'
import { ORIGIN, launchBrowser, makePage, parseRoutes, wait, collectErrs } from './lib.mjs'

const ROUTES = parseRoutes()
const REPORT = process.env.HF_REPORT || 'hf-canvas-scan.jsonl'

async function main() {
  const browser = await launchBrowser()
  const page = await makePage(browser, new Set(), { width: 1440, height: 900 })
  const errs = new Set()
  let withCanvas = 0
  for (const p of ROUTES) {
    errs.clear()
    const url = ORIGIN + '/#' + (p.includes(':id') ? p.replace(':id', '1') : p)
    let rec = { path: p, canvasCount: 0, canvases: [], webglLost: false, errs: [] }
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); await wait(900)
      rec = await page.evaluate(() => {
        const cs = Array.from(document.querySelectorAll('canvas'))
        const info = cs.map((c) => {
          let ctx = 'none', lost = false
          try { const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'); if (gl) { ctx = 'webgl'; lost = gl.isContextLost && gl.isContextLost() } else if (c.getContext('2d')) ctx = '2d' } catch (_) {}
          const r = c.getBoundingClientRect()
          return { w: Math.round(r.width), h: Math.round(r.height), ctx, lost }
        })
        return { canvasCount: cs.length, canvases: info, webglLost: info.some((i) => i.lost) }
      })
      rec.path = p; rec.errs = Array.from(errs)
      if (rec.canvasCount > 0) withCanvas++
    } catch (e) { rec.errs = [String((e && e.message) || e)] }
    appendFileSync(REPORT, JSON.stringify(rec) + '\n')
    const tag = rec.canvasCount > 0 ? `CANVAS x${rec.canvasCount}${rec.webglLost ? ' [LOST]' : ''}` : 'no-canvas'
    console.log(`${p.padEnd(26)} ${tag} errs=${rec.errs.length}`)
  }
  await page.close(); await browser.close()
  console.log(`=== 扫描完成：共 ${ROUTES.length} 路由，挂载 <canvas> 的 ${withCanvas} 个 → ${REPORT} ===`)
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
