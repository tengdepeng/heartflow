// ============================================================
// Launcher · 3D 空间渲染器（three.js）
// 复用项目既有 three@0.169，不引入新依赖。
// 范式对齐 modules/world-shell：自管 canvas、外部驱动 render、完整 dispose。
// 相机为自实现的轨道相机（球坐标拖拽），避免引入 OrbitControls 示例模块。
// ============================================================

import * as THREE from 'three'
import type { ExternalAppEntry } from './types'
import type { LauncherSpaceConfig } from './spaceTheme'
import { computeCardTransforms, suggestCameraDistance } from './spaceLayout'

const CARD_W = 320
const CARD_H = 384
const CARD_GEO_W = 1.15
const CARD_GEO_H = 1.38
const LAUNCH_FX_MS = 900

export interface LauncherSpaceCallbacks {
  /** 启动动画播完（前冲结束）后回调，调用方真正拉起应用 */
  onLaunch?: (entry: ExternalAppEntry) => void
  onHoverChange?: (id: string | null) => void
}

export interface LauncherSpaceHandle {
  setEntries(entries: ExternalAppEntry[]): void
  setConfig(cfg: LauncherSpaceConfig): void
  resize(width: number, height: number): void
  render(ts: number): void
  dispose(): void
}

interface CardObject {
  entry: ExternalAppEntry
  mesh: THREE.Mesh
  texture: THREE.CanvasTexture
  canvas: HTMLCanvasElement
  /** hover 抬升动画进度 0..1 */
  lift: number
  /** 启动前冲动画起始时间戳，null 表示未触发 */
  launchAt: number | null
  base: { x: number; y: number; z: number; rotY: number }
}

interface LaunchFx {
  ring: THREE.Mesh
  burst: THREE.Points
  velocities: Float32Array
  t0: number
  origin: THREE.Vector3
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return `rgba(212, 165, 116, ${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** 把一张卡片画到 canvas（底板 + 图标 + 名称），返回该 canvas 供 CanvasTexture 使用 */
function paintCard(
  canvas: HTMLCanvasElement,
  entry: ExternalAppEntry,
  accent: string,
  img: HTMLImageElement | null,
  showLabel: boolean,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, CARD_W, CARD_H)

  roundRect(ctx, 10, 10, CARD_W - 20, CARD_H - 20, 36)
  ctx.fillStyle = 'rgba(18, 15, 11, 0.78)'
  ctx.fill()
  ctx.strokeStyle = hexToRgba(accent, 0.42)
  ctx.lineWidth = 3
  ctx.stroke()

  const cx = CARD_W / 2
  const cy = CARD_H * 0.42
  if (img && img.width > 0) {
    const size = 148
    ctx.save()
    roundRect(ctx, cx - size / 2, cy - size / 2, size, size, 28)
    ctx.clip()
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size)
    ctx.restore()
  } else {
    ctx.font = '108px system-ui, "Segoe UI Symbol", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f0e6d6'
    ctx.fillText(entry.icon || '□', cx, cy)
  }

  if (showLabel) {
    ctx.font = '500 30px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(240, 230, 214, 0.9)'
    const name = entry.name.length > 7 ? `${entry.name.slice(0, 6)}…` : entry.name
    ctx.fillText(name, cx, CARD_H * 0.79)
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function createLauncherSpace(
  canvas: HTMLCanvasElement,
  callbacks: LauncherSpaceCallbacks = {},
): LauncherSpaceHandle | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  } catch {
    // 无 WebGL（如测试环境 / 老显卡）：调用方据此降级到 2D 网格
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200)

  // ——— 轨道相机（球坐标）———
  const cam = { theta: 0, phi: Math.PI / 2 - 0.06, dist: 7 }
  let dragging = false
  let lastX = 0
  let lastY = 0
  let movedWhileDragging = false

  // ——— 数据 ———
  let entries: ExternalAppEntry[] = []
  let cfg: LauncherSpaceConfig = {
    layout: 'arc',
    backgroundKind: 'none',
    backgroundSource: null,
    fxIntensity: 0.6,
    autoRotate: true,
    accent: '#d4a574',
    labelMode: 'hover',
  }
  let cards: CardObject[] = []
  let hoverId: string | null = null
  const fxList: LaunchFx[] = []
  const imageCache = new Map<string, HTMLImageElement | null>()

  // ——— 背景层 ———
  const bgMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }),
  )
  bgMesh.position.set(0, 0, -14)
  bgMesh.visible = false
  scene.add(bgMesh)
  let bgTexture: THREE.Texture | null = null
  let bgVideo: HTMLVideoElement | null = null

  // ——— 星尘 ———
  let stars: THREE.Points | null = null

  function disposeStars(): void {
    if (!stars) return
    scene.remove(stars)
    stars.geometry.dispose()
    ;(stars.material as THREE.Material).dispose()
    stars = null
  }

  function buildStars(): void {
    disposeStars()
    const count = Math.round(120 + 380 * cfg.fxIntensity)
    if (count <= 0) return
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 12
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.45
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.PointsMaterial({
      color: new THREE.Color(cfg.accent),
      size: 0.055,
      transparent: true,
      opacity: 0.25 + 0.4 * cfg.fxIntensity,
      sizeAttenuation: true,
      depthWrite: false,
    })
    stars = new THREE.Points(g, m)
    scene.add(stars)
  }

  // ——— 背景素材 ———
  function disposeBackground(): void {
    if (bgTexture) {
      bgTexture.dispose()
      bgTexture = null
    }
    if (bgVideo) {
      bgVideo.pause()
      bgVideo.src = ''
      bgVideo = null
    }
    bgMesh.visible = false
    bgMesh.material.map = null
    bgMesh.material.needsUpdate = true
  }

  function fitBackground(): void {
    if (!bgTexture) return
    const img = bgTexture.image as { width?: number; height?: number } | undefined
    const iw = img?.width ?? 1
    const ih = img?.height ?? 1
    const dist = camera.position.distanceTo(bgMesh.position)
    const vH = 2 * Math.tan(((camera.fov / 2) * Math.PI) / 180) * dist
    const vW = vH * camera.aspect
    const aspect = iw / ih
    let w = vW
    let h = vW / aspect
    if (h < vH) {
      h = vH
      w = vH * aspect
    }
    bgMesh.scale.set(w * 1.04, h * 1.04, 1)
  }

  function applyBackground(): void {
    disposeBackground()
    const src = cfg.backgroundSource
    if (cfg.backgroundKind === 'none' || !src) return

    if (cfg.backgroundKind === 'image') {
      const tex = new THREE.TextureLoader().load(src, () => {
        fitBackground()
      })
      tex.colorSpace = THREE.SRGBColorSpace
      bgTexture = tex
      bgMesh.material.map = tex
      bgMesh.material.opacity = 0.55
      bgMesh.material.needsUpdate = true
      bgMesh.visible = true
      return
    }

    // 视频纹理：静音循环，自动播放（浏览器策略要求 muted）
    const video = document.createElement('video')
    video.src = src
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    void video.play().catch(() => undefined)
    const tex = new THREE.VideoTexture(video)
    tex.colorSpace = THREE.SRGBColorSpace
    bgVideo = video
    bgTexture = tex
    bgMesh.material.map = tex
    bgMesh.material.opacity = 0.55
    bgMesh.material.needsUpdate = true
    bgMesh.visible = true
    video.addEventListener('loadedmetadata', fitBackground)
  }

  // ——— 卡片 ———
  function disposeCards(): void {
    for (const c of cards) {
      scene.remove(c.mesh)
      c.mesh.geometry.dispose()
      ;(c.mesh.material as THREE.Material).dispose()
      c.texture.dispose()
    }
    cards = []
  }

  function buildCards(): void {
    disposeCards()
    const transforms = computeCardTransforms(cfg.layout, entries.length)
    const geo = new THREE.PlaneGeometry(CARD_GEO_W, CARD_GEO_H)
    entries.forEach((entry, i) => {
      const canvasEl = document.createElement('canvas')
      canvasEl.width = CARD_W
      canvasEl.height = CARD_H
      paintCard(
        canvasEl,
        entry,
        cfg.accent,
        entry.iconImage ? imageCache.get(entry.iconImage) ?? null : null,
        cfg.labelMode === 'always',
      )
      const texture = new THREE.CanvasTexture(canvasEl)
      texture.colorSpace = THREE.SRGBColorSpace
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo.clone(), material)
      const base = transforms[i]
      mesh.position.set(base.x, base.y, base.z)
      mesh.rotation.y = base.rotY
      mesh.userData.entryId = entry.id
      scene.add(mesh)
      cards.push({
        entry,
        mesh,
        texture,
        canvas: canvasEl,
        lift: 0,
        launchAt: null,
        base,
      })
    })
    geo.dispose()
    cam.dist = suggestCameraDistance(cfg.layout, entries.length)
  }

  /** 异步补齐图片型图标：加载完成后重绘对应卡片纹理 */
  async function resolveIconImages(): Promise<void> {
    const pending = entries.filter((e) => e.iconImage && !imageCache.has(e.iconImage))
    if (pending.length === 0) return
    await Promise.all(
      pending.map(async (e) => {
        const src = e.iconImage as string
        const img = await loadImage(src)
        imageCache.set(src, img)
      }),
    )
    for (const c of cards) {
      const src = c.entry.iconImage
      if (!src) continue
      paintCard(
        c.canvas,
        c.entry,
        cfg.accent,
        imageCache.get(src) ?? null,
        cfg.labelMode === 'always' || hoverId === c.entry.id,
      )
      c.texture.needsUpdate = true
    }
  }

  function relayout(): void {
    const transforms = computeCardTransforms(cfg.layout, cards.length)
    cards.forEach((c, i) => {
      c.base = transforms[i]
    })
    cam.dist = suggestCameraDistance(cfg.layout, cards.length)
  }

  function repaintAll(): void {
    for (const c of cards) {
      const src = c.entry.iconImage
      paintCard(
        c.canvas,
        c.entry,
        cfg.accent,
        src ? imageCache.get(src) ?? null : null,
        cfg.labelMode === 'always' || hoverId === c.entry.id,
      )
      c.texture.needsUpdate = true
    }
  }

  // ——— 拾取 ———
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  function pick(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(
      cards.map((c) => c.mesh),
      false,
    )
    return (hits[0]?.object.userData.entryId as string | undefined) ?? null
  }

  function setHover(id: string | null): void {
    if (hoverId === id) return
    // hover 态切换名称标签（labelMode=hover 时）
    if (cfg.labelMode === 'hover') {
      const prev = cards.find((c) => c.entry.id === hoverId)
      const next = cards.find((c) => c.entry.id === id)
      for (const c of [prev, next]) {
        if (!c) continue
        paintCard(
          c.canvas,
          c.entry,
          cfg.accent,
          c.entry.iconImage ? imageCache.get(c.entry.iconImage) ?? null : null,
          c === next,
        )
        c.texture.needsUpdate = true
      }
    }
    hoverId = id
    canvas.style.cursor = id ? 'pointer' : 'grab'
    callbacks.onHoverChange?.(id)
  }

  // ——— 启动动画 ———
  function spawnLaunchFx(card: CardObject): void {
    const origin = card.mesh.position.clone()
    const ringGeo = new THREE.RingGeometry(0.62, 0.7, 56)
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(cfg.accent),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.copy(origin)
    ring.rotation.y = card.base.rotY
    scene.add(ring)

    const count = Math.round(60 + 90 * cfg.fxIntensity)
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x
      pos[i * 3 + 1] = origin.y
      pos[i * 3 + 2] = origin.z
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const sp = 0.9 + Math.random() * 1.5
      vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp
      vel[i * 3 + 1] = Math.cos(ph) * sp * 0.7
      vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const m = new THREE.PointsMaterial({
      color: new THREE.Color(cfg.accent),
      size: 0.075,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
    const burst = new THREE.Points(g, m)
    scene.add(burst)

    fxList.push({ ring, burst, velocities: vel, t0: performance.now(), origin })
  }

  function triggerLaunch(id: string): void {
    const card = cards.find((c) => c.entry.id === id)
    if (!card || card.launchAt !== null) return
    card.launchAt = performance.now()
    if (cfg.fxIntensity > 0) spawnLaunchFx(card)
    // 前冲过半即回调拉起，避免用户等待动画结束才看到应用启动
    window.setTimeout(() => callbacks.onLaunch?.(card.entry), 260)
  }

  // ——— 指针事件 ———
  function onPointerDown(e: PointerEvent): void {
    dragging = true
    movedWhileDragging = false
    lastX = e.clientX
    lastY = e.clientY
    canvas.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: PointerEvent): void {
    if (dragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      if (Math.abs(dx) + Math.abs(dy) > 3) movedWhileDragging = true
      cam.theta -= dx * 0.005
      cam.phi = Math.min(Math.PI / 2 + 0.35, Math.max(Math.PI / 2 - 0.55, cam.phi - dy * 0.004))
      lastX = e.clientX
      lastY = e.clientY
      return
    }
    setHover(pick(e.clientX, e.clientY))
  }
  function onPointerUp(e: PointerEvent): void {
    const wasDragging = dragging
    dragging = false
    canvas.releasePointerCapture?.(e.pointerId)
    if (wasDragging && !movedWhileDragging) {
      const id = pick(e.clientX, e.clientY)
      if (id) triggerLaunch(id)
    }
  }
  function onPointerLeave(): void {
    dragging = false
    setHover(null)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)

  // ——— 渲染 ———
  let disposed = false

  function render(ts: number): void {
    if (disposed) return
    const t = ts / 1000

    if (cfg.autoRotate && !dragging) {
      cam.theta += 0.00045
    }

    // 相机球坐标 → 笛卡尔
    const sinP = Math.sin(cam.phi)
    camera.position.set(
      cam.dist * sinP * Math.sin(cam.theta),
      cam.dist * Math.cos(cam.phi) + 0.35,
      cam.dist * sinP * Math.cos(cam.theta),
    )
    camera.lookAt(0, 0.1, cfg.layout === 'ring' ? 0 : -0.6)

    // 卡片：hover 抬升 + 呼吸 + 启动前冲
    for (const c of cards) {
      const isHover = hoverId === c.entry.id
      const target = isHover ? 1 : 0
      c.lift += (target - c.lift) * 0.12
      const breathe = Math.sin(t * 0.9 + c.base.x * 1.7) * 0.02 * cfg.fxIntensity

      let forward = 0
      let scale = 1
      if (c.launchAt !== null) {
        const p = Math.min(1, (performance.now() - c.launchAt) / LAUNCH_FX_MS)
        // 前 45% 冲向镜头，后段回位淡出
        forward = p < 0.45 ? (p / 0.45) * 1.15 : Math.max(0, 1.15 * (1 - (p - 0.45) / 0.55))
        scale = 1 + forward * 0.55
        if (p >= 1) c.launchAt = null
      }

      const liftY = c.lift * 0.12 + breathe + (isHover ? 0 : 0)
      c.mesh.position.set(
        c.base.x + Math.sin(c.base.rotY) * forward,
        c.base.y + liftY,
        c.base.z + Math.cos(c.base.rotY) * forward,
      )
      c.mesh.rotation.y = c.base.rotY
      c.mesh.scale.setScalar(scale)
      ;(c.mesh.material as THREE.MeshBasicMaterial).opacity = c.lift > 0.02 || isHover ? 1 : 0.92
    }

    // 星尘缓慢自转，制造空间纵深
    if (stars) stars.rotation.y = t * 0.012

    // 启动特效：光环扩散 + 粒子迸发
    for (let i = fxList.length - 1; i >= 0; i--) {
      const fx = fxList[i]
      const p = (performance.now() - fx.t0) / LAUNCH_FX_MS
      if (p >= 1) {
        scene.remove(fx.ring)
        fx.ring.geometry.dispose()
        ;(fx.ring.material as THREE.Material).dispose()
        scene.remove(fx.burst)
        fx.burst.geometry.dispose()
        ;(fx.burst.material as THREE.Material).dispose()
        fxList.splice(i, 1)
        continue
      }
      const eased = 1 - Math.pow(1 - p, 3)
      fx.ring.scale.setScalar(1 + eased * 3.4)
      ;(fx.ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p)
      const arr = fx.burst.geometry.getAttribute('position') as THREE.BufferAttribute
      const dt = 1 / 60
      for (let k = 0; k < arr.count; k++) {
        arr.array[k * 3] = (arr.array as Float32Array)[k * 3] + fx.velocities[k * 3] * dt
        arr.array[k * 3 + 1] =
          (arr.array as Float32Array)[k * 3 + 1] + fx.velocities[k * 3 + 1] * dt
        arr.array[k * 3 + 2] =
          (arr.array as Float32Array)[k * 3 + 2] + fx.velocities[k * 3 + 2] * dt
      }
      arr.needsUpdate = true
      ;(fx.burst.material as THREE.PointsMaterial).opacity = 0.95 * (1 - p)
    }

    renderer.render(scene, camera)
  }

  function resize(width: number, height: number): void {
    if (disposed || width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    fitBackground()
  }

  buildStars()
  buildCards()

  return {
    setEntries(next: ExternalAppEntry[]) {
      entries = next
      buildCards()
      void resolveIconImages()
    },
    setConfig(next: LauncherSpaceConfig) {
      const prev = cfg
      cfg = next
      if (prev.layout !== next.layout) relayout()
      if (prev.accent !== next.accent || prev.labelMode !== next.labelMode) repaintAll()
      // 星尘同时受强度（密度/亮度）与主色影响，任一变化都要重建
      if (prev.fxIntensity !== next.fxIntensity || prev.accent !== next.accent) buildStars()
      if (
        prev.backgroundKind !== next.backgroundKind ||
        prev.backgroundSource !== next.backgroundSource
      ) {
        applyBackground()
        fitBackground()
      }
    },
    resize,
    render,
    dispose() {
      if (disposed) return
      disposed = true
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      for (const fx of fxList) {
        scene.remove(fx.ring)
        fx.ring.geometry.dispose()
        ;(fx.ring.material as THREE.Material).dispose()
        scene.remove(fx.burst)
        fx.burst.geometry.dispose()
        ;(fx.burst.material as THREE.Material).dispose()
      }
      fxList.length = 0
      disposeCards()
      disposeStars()
      disposeBackground()
      bgMesh.geometry.dispose()
      ;(bgMesh.material as THREE.Material).dispose()
      renderer.dispose()
    },
  }
}

/** 供组件判断：当前环境能否跑 3D（无 WebGL 时降级到 2D 网格） */
export function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
