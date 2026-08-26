// ============================================================
// 家 · 3D 房间壳（Three.js WebGL，动态导入）
// ------------------------------------------------------------
// 设计约束（架构决议 M3-一期）：
// 1. 本模块必须「动态 import」由视图层加载，three 不进主包，
//    2D 首屏零包体增量（守住宪法「本地轻量」）。
// 2. 不重写数据层：12+ 房间组件与 switchScene 全部复用；
//    本模块只负责「3D 房间框 + 拖拽环绕相机」，房间内容由 2D 组件合成叠层。
// 3. 按需渲染：仅在 mount / setRoom / rotateBy / resize 时 renderer.render，
//    无空闲 rAF 循环（契合 M2 性能自适应纪律）。
// 4. 颜色/灯光计算抽为纯函数，可在 jsdom（无 WebGL）下单测。
// ============================================================

import * as THREE from 'three'

/** 房间调色板（由 HomeSpace 的 ROOM_SCENES.atmosphereColor 提供） */
export interface RoomPalette {
  /** 氛围光色（CSS 颜色值，如 '#fce4b3'） */
  glow: string
  /** 基础墙/地色；省略则按 glow 推导 */
  base?: string
  /** 暗部色；省略则按 glow 推导 */
  glowEnd?: string
}

export interface HomeRoomScene {
  /** 挂载到给定 canvas（浏览器环境，创建 WebGL 上下文） */
  mount(canvas: HTMLCanvasElement): void
  /** 切换房间调色板（颜色/灯光实时更新，不重建几何） */
  setRoom(palette: RoomPalette): void
  /** 拖拽旋转：dx/dy 为像素位移 */
  rotateBy(deltaX: number, deltaY: number): void
  /** 释放资源（WebGL 上下文、监听、几何） */
  dispose(): void
}

export interface SceneOptions {
  /** DPR 上限（由 useAdaptiveQuality 注入，M2 协同） */
  dprCap?: number
}

// ---- 纯函数：颜色推导（无 WebGL，可单测） ----

/** 解析 #rgb / #rrggbb → [r,g,b]（0–255）。非法输入返回 null。 */
export function hexToRgb(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string') return null
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 把单个通道值限制在 0–255 并取整 */
export function clampChannel(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(255, Math.round(v)))
}

/** 按比例变暗/变亮（amount>0 变暗，<0 变亮），返回 #rrggbb */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const factor = 1 - Math.max(-1, Math.min(1, amount))
  const [r, g, b] = rgb.map((c) => clampChannel(c * factor)) as [number, number, number]
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

/** 由 glow 推导完整调色板（base/glowEnd 省略时按经验比例推导） */
export function derivePalette(p: RoomPalette): { base: string; glow: string; glowEnd: string } {
  return {
    glow: p.glow,
    base: p.base ?? shade(p.glow, 0.5),
    glowEnd: p.glowEnd ?? shade(p.glow, 0.78),
  }
}

// ---- 场景工厂 ----

const ROOM_W = 8
const ROOM_H = 5
const ROOM_D = 8

export function createHomeRoomScene(opts: SceneOptions = {}): HomeRoomScene {
  const dprCap = opts.dprCap ?? 2

  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let canvasEl: HTMLCanvasElement | null = null

  const floorMat: THREE.MeshStandardMaterial[] = []
  const wallMats: THREE.MeshStandardMaterial[] = []
  let ambient: THREE.AmbientLight | null = null
  let keyLight: THREE.PointLight | null = null

  // 球面相机参数
  let theta = Math.PI * 0.25 // 方位角
  let phi = Math.PI * 0.42 // 极角（从顶向下）
  const radius = 9
  const target = new THREE.Vector3(0, -0.5, 0)

  let palette = derivePalette({ glow: '#fce4b3' })

  function buildRoom(): void {
    if (!scene) return
    // 地面
    const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D)
    const fMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.base),
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
    floorMat.push(fMat)
    const floor = new THREE.Mesh(floorGeo, fMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -ROOM_H / 2
    scene.add(floor)

    // 三面粉墙（背墙 + 左墙 + 右墙），DoubleSide 保证从内可见
    const wallDefs: Array<{ pos: [number, number, number]; rotY: number }> = [
      { pos: [0, 0, -ROOM_D / 2], rotY: 0 }, // 背墙
      { pos: [-ROOM_W / 2, 0, 0], rotY: Math.PI / 2 }, // 左墙
      { pos: [ROOM_W / 2, 0, 0], rotY: -Math.PI / 2 }, // 右墙
    ]
    const wallGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_H)
    for (const def of wallDefs) {
      const wMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.base),
        roughness: 0.9,
        metalness: 0.0,
        emissive: new THREE.Color(palette.glow),
        emissiveIntensity: 0.12,
        side: THREE.DoubleSide,
      })
      wallMats.push(wMat)
      const wall = new THREE.Mesh(wallGeo, wMat)
      wall.position.set(...def.pos)
      wall.rotation.y = def.rotY
      scene.add(wall)
    }

    // 灯光：环境光（glow 色淡）+ 中心点光（glow 色）
    ambient = new THREE.AmbientLight(new THREE.Color(palette.glow), 0.55)
    scene.add(ambient)
    keyLight = new THREE.PointLight(new THREE.Color(palette.glow), 1.1, 40, 1.6)
    keyLight.position.set(0, ROOM_H / 2 - 0.5, 0)
    scene.add(keyLight)
  }

  function applyPalette(): void {
    for (const m of floorMat) {
      m.color.set(palette.base)
    }
    for (const m of wallMats) {
      m.color.set(palette.base)
      m.emissive.set(palette.glow)
    }
    if (ambient) ambient.color.set(palette.glow)
    if (keyLight) keyLight.color.set(palette.glow)
  }

  function updateCamera(): void {
    if (!camera) return
    const sinPhi = Math.sin(phi)
    camera.position.set(
      target.x + radius * sinPhi * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * sinPhi * Math.cos(theta),
    )
    camera.lookAt(target)
  }

  function render(): void {
    if (renderer && scene && camera) renderer.render(scene, camera)
  }

  function onResize(): void {
    if (!renderer || !camera || !canvasEl) return
    const w = canvasEl.clientWidth || canvasEl.width
    const h = canvasEl.clientHeight || canvasEl.height
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }

  return {
    mount(canvas: HTMLCanvasElement): void {
      canvasEl = canvas
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
      buildRoom()
      applyPalette()
      updateCamera()
      onResize()
      window.addEventListener('resize', onResize)
    },
    setRoom(p: RoomPalette): void {
      palette = derivePalette(p)
      applyPalette()
      render()
    },
    rotateBy(dx: number, dy: number): void {
      theta -= dx * 0.005
      phi = Math.max(0.35, Math.min(Math.PI - 0.35, phi - dy * 0.005))
      updateCamera()
      render()
    },
    dispose(): void {
      window.removeEventListener('resize', onResize)
      for (const m of floorMat) m.dispose()
      for (const m of wallMats) m.dispose()
      renderer?.dispose()
      scene = null
      camera = null
      renderer = null
      canvasEl = null
      floorMat.length = 0
      wallMats.length = 0
      ambient = null
      keyLight = null
    },
  }
}
