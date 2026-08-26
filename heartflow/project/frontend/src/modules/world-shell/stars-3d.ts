// ============================================================
// 世界壳 · 星辰（沉浸 3D 真星团）
// 蓝图第五部分·家·三「3D全场景」——星辰壳的 3D 形态。
// 与 2D stars.ts 共享 ZONES 锚点语义（进深层级跨壳一致），但用 Three.js
// 渲染真 3D 星团：OrbitControls 拖拽旋转 + 滚轮缩放 + 静谧态自动缓旋，
// 景深雾效 + 星体连线成星座网。点击星体经 Raycaster 命中 → 路由进入。
// 宪法硬约束：外观/3D 强度参数（autoRotate、雾浓度、星场密度）跟随
// config 本地保存，不写死。
// ============================================================

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type {
  WorldShellRenderer,
  ShellContext,
  ShellRoomAnchor,
  ShellSlot,
} from './types'
import { registerShell } from './types'

interface SlotZone {
  slot: ShellSlot
  /** 归一化中心坐标（相对画布比例） */
  x: number
  y: number
  /** 进深 z（世界单位）：越私密越往里（越负） */
  z: number
}

// 复用 courtyard / 2D stars 的院落空间拓扑，保证「推门之后的世界」跨壳位置不跳变
const ZONES: SlotZone[] = [
  { slot: 'screen', x: 0.5, y: 0.32, z: 0 }, // 中央星核（最近）
  { slot: 'front-yard', x: 0.5, y: 0.66, z: -4 }, // 前院星团
  { slot: 'hall', x: 0.5, y: 0.12, z: -8 }, // 正堂星云（最深核心）
  { slot: 'back-yard', x: 0.82, y: -0.02, z: -11 }, // 后院星体群
  { slot: 'side-wing', x: 0.16, y: 0.5, z: -13 }, // 厢房星体群
  { slot: 'corner', x: 0.5, y: 0.92, z: -16 }, // 角门微星（最远）
]

/** 单颗房间星体（3D mesh 载体） */
interface StarMeshData {
  room: ShellRoomAnchor
  mesh: THREE.Mesh
  baseScale: number
  phase: number
  orbit: number
  /** 锚点基准世界坐标 */
  bx: number
  by: number
  bz: number
}

// 世界单位尺度：把归一化坐标映射到约 ±60 的可见范围
const WORLD_W = 120
const WORLD_H = 80

export class Stars3DShell implements WorldShellRenderer {
  readonly kind = 'stars-3d' as const

  private canvas: HTMLCanvasElement | null = null
  /** 自建 canvas 的父容器（destroy 时移除自建 canvas） */
  private canvasHost: HTMLElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private controls: OrbitControls | null = null
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()

  private width = 0
  private height = 0
  private intensity = 1
  private sanctuary = false
  private config: Record<string, unknown> = {}
  private rooms: ShellRoomAnchor[] = []

  private stars: StarMeshData[] = []
  private zoneAnchors: Array<{ slot: ShellSlot; pos: THREE.Vector3 }> = []
  private coreGroup: THREE.Group | null = null
  private lines: THREE.LineSegments | null = null
  private bgPoints: THREE.Points | null = null

  private hoverSlot: ShellSlot | null = null
  private hoverRoomId: string | null = null

  private accentColor = new THREE.Color(0xd4a574)

  mount(shellCtx: ShellContext): void {
    this.width = shellCtx.width
    this.height = shellCtx.height
    this.intensity = shellCtx.intensity
    this.sanctuary = shellCtx.sanctuary
    this.config = shellCtx.config ?? {}
    this.rooms = shellCtx.rooms ?? []

    // 关键：3D 自建独立 WebGL canvas，插入父容器；不复用 shellCtx.canvas
    // （已被 2D 壳占用，同一 canvas 不能同时持 2D + WebGL context，
    //  否则 WebGLRenderer 构造抛错或渲染空白）。
    const host = shellCtx.canvas ? shellCtx.canvas.parentElement : null
    if (!host) return
    const ownCanvas = document.createElement('canvas')
    ownCanvas.className = 'stars-3d-canvas'
    ownCanvas.style.position = 'absolute'
    ownCanvas.style.inset = '0'
    ownCanvas.style.width = '100%'
    ownCanvas.style.height = '100%'
    ownCanvas.style.pointerEvents = 'none' // 命中由 .shell-hit-layer 接管
    host.appendChild(ownCanvas)
    this.canvas = ownCanvas
    this.canvasHost = host

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
      })
    } catch {
      // WebGL 不可用（极端环境）——静默放弃 3D，呼叫方会回退 2D
      if (this.canvasHost && this.canvas) this.canvasHost.removeChild(this.canvas)
      this.canvas = null
      this.canvasHost = null
      return
    }
    renderer.setPixelRatio(dpr)
    renderer.setSize(this.width, this.height, false)
    renderer.setClearColor(0x000000, 0)
    this.renderer = renderer

    const scene = new THREE.Scene()
    // 景深雾效：越远越沉入暗蓝黑（雾浓度本地可配，默认 0.012）
    const fogDensity = (this.config.fogDensity as number) ?? 0.012
    scene.fog = new THREE.FogExp2(0x060810, fogDensity)
    this.scene = scene

    const camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.1, 1000)
    camera.position.set(0, 0, 90)
    this.camera = camera

    const controls = new OrbitControls(camera, this.canvas)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 40
    controls.maxDistance = 160
    // 限俯仰，避免翻转穿模
    controls.minPolarAngle = Math.PI * 0.18
    controls.maxPolarAngle = Math.PI * 0.82
    controls.rotateSpeed = 0.5 + this.intensity * 0.4
    controls.autoRotate = this.sanctuary
    controls.autoRotateSpeed = 0.4
    this.controls = controls

    // 灯光：环境 + 中心暖光（星核感）
    scene.add(new THREE.AmbientLight(0x8899bb, 0.6))
    const core = new THREE.PointLight(0xffe6b0, 1.2, 200)
    core.position.set(0, 0, 8)
    scene.add(core)

    this.layout()
    this.buildBackgroundStars()
    this.buildCore()
    this.buildConstellationLines()

    // 跟随 --accent：高亮不写死
    if (typeof window !== 'undefined' && this.canvas) {
      const css = getComputedStyle(this.canvas)
      const accent = css.getPropertyValue('--accent').trim()
      if (accent) this.accentColor.set(accent)
    }
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    if (!this.renderer || !this.camera) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  updateContext(partial: Partial<ShellContext>): void {
    if (partial.intensity !== undefined) {
      this.intensity = partial.intensity
      if (this.controls) this.controls.rotateSpeed = 0.5 + this.intensity * 0.4
    }
    if (partial.sanctuary !== undefined) {
      this.sanctuary = partial.sanctuary
      if (this.controls) this.controls.autoRotate = partial.sanctuary
    }
    if (partial.config !== undefined) this.config = partial.config
    if (partial.rooms !== undefined) {
      this.rooms = partial.rooms
      this.rebuildStars()
    }
  }

  destroy(): void {
    this.controls?.dispose()
    this.controls = null
    if (this.scene) {
      this.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = (mesh as THREE.Mesh).material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else if (mat) (mat as THREE.Material).dispose()
      })
    }
    this.renderer?.dispose()
    this.renderer = null
    this.scene = null
    this.camera = null
    this.stars = []
    this.zoneAnchors = []
    this.coreGroup = null
    this.lines = null
    this.bgPoints = null
    // 移除自建 canvas（不依赖 shellCtx.canvas，避免误删 2D 壳的 canvas）
    if (this.canvasHost && this.canvas && this.canvas.parentNode === this.canvasHost) {
      this.canvasHost.removeChild(this.canvas)
    }
    this.canvas = null
    this.canvasHost = null
    this.hoverSlot = null
    this.hoverRoomId = null
  }

  // ---- 坐标映射：归一化锚点 → 世界坐标 ----
  private toWorld(zone: SlotZone): THREE.Vector3 {
    const x = (zone.x - 0.5) * WORLD_W
    const y = (0.5 - zone.y) * WORLD_H
    return new THREE.Vector3(x, y, zone.z)
  }

  /** 根据 ZONES + 房间数据生成星体网格 */
  private layout(): void {
    if (!this.scene) return
    this.zoneAnchors = ZONES.map((z) => ({ slot: z.slot, pos: this.toWorld(z) }))
    this.rebuildStars()
  }

  private rebuildStars(): void {
    if (!this.scene) return
    const scene = this.scene
    // 清旧
    for (const s of this.stars) {
      scene.remove(s.mesh)
      s.mesh.geometry.dispose()
      ;(s.mesh.material as THREE.Material).dispose()
    }
    this.stars = []

    const sphere = new THREE.SphereGeometry(1, 16, 16)
    for (const zone of ZONES) {
      const zoneRooms = this.rooms.filter((r) => r.slot === zone.slot)
      const base = this.toWorld(zone)
      zoneRooms.forEach((room, i) => {
        const spread = zone.slot === 'front-yard' ? 14 : zone.slot === 'hall' ? 12 : 9
        const angle = (i / Math.max(1, zoneRooms.length)) * Math.PI * 2 + Math.random()
        const orbit = zone.slot === 'screen' ? 0 : spread * (0.4 + Math.random() * 0.6)
        const bx = base.x + (zone.slot === 'screen' ? 0 : Math.cos(angle) * orbit)
        const by = base.y + (zone.slot === 'screen' ? 0 : Math.sin(angle) * orbit)
        const bz = base.z + (Math.random() - 0.5) * 4

        const freq = room.frequency
        const recency = room.recency
        const baseScale = 0.8 + freq * 2.4
        const light = 0.55 + recency * 0.4

        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(zone.slot === 'screen' ? 0.1 : 0.08 + Math.random() * 0.08, 0.7, light),
          transparent: true,
          opacity: 0.92,
        })
        const mesh = new THREE.Mesh(sphere, mat)
        mesh.position.set(bx, by, bz)
        mesh.scale.setScalar(baseScale)
        mesh.userData = {
          roomId: room.id,
          roomPath: room.path,
          roomName: room.name,
          slot: room.slot,
          baseScale,
        }
        scene.add(mesh)
        this.stars.push({ room, mesh, baseScale, phase: Math.random() * Math.PI * 2, orbit, bx, by, bz })
      })
    }
  }

  /** 背景微星：点云，密度由 starFieldDensity 控制 */
  private buildBackgroundStars(): void {
    if (!this.scene) return
    const density = (this.config.starFieldDensity as number) ?? 0.6
    const count = Math.round(600 + density * 1400)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * WORLD_W * 2.4
      positions[i * 3 + 1] = (Math.random() - 0.5) * WORLD_H * 2.4
      positions[i * 3 + 2] = -Math.random() * 80 - 10
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0x9fb4e0,
      size: 0.6,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })
    this.bgPoints = new THREE.Points(geo, mat)
    this.scene.add(this.bgPoints)
  }

  /** 中央星核（屏风位）：发光球 + 辉光精灵 */
  private buildCore(): void {
    if (!this.scene) return
    const group = new THREE.Group()
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.95 })
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 24), coreMat)
    group.add(coreMesh)

    // 辉光：更大半透明球模拟光晕
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xd4a574,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    })
    const glow = new THREE.Mesh(new THREE.SphereGeometry(7.5, 24, 24), glowMat)
    group.add(glow)

    // 双层光环
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe0b27a, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.12, 8, 48), ringMat)
    group.add(ring1)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(7, 0.08, 8, 48), ringMat)
    ring2.rotation.x = Math.PI / 2.4
    group.add(ring2)

    this.coreGroup = group
    this.scene.add(group)
  }

  /** 星座连线网：星核 → 各 zone 锚点 */
  private buildConstellationLines(): void {
    const scene = this.scene
    const coreGroup = this.coreGroup
    if (!scene || !coreGroup) return
    const corePos = coreGroup.position.clone()
    const pts: number[] = []
    for (const za of this.zoneAnchors) {
      if (za.slot === 'screen') continue
      pts.push(corePos.x, corePos.y, corePos.z, za.pos.x, za.pos.y, za.pos.z)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const mat = new THREE.LineBasicMaterial({ color: 0x96b4eb, transparent: true, opacity: 0.14 })
    this.lines = new THREE.LineSegments(geo, mat)
    scene.add(this.lines)
  }

  /** 命中检测：给定画布逻辑坐标（CSS 像素），Raycaster 命中星体 → 路由 */
  hitTest(x: number, y: number): {
    slot: ShellSlot
    roomPath?: string
    roomName?: string
    roomId?: string
  } | null {
    if (!this.renderer || !this.camera || !this.canvas) return null
    // 把 CSS 像素坐标转 NDC（CanvasRoom 命中层覆盖整画布，rect 即画布矩形）
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const nx = ((x - rect.left) / rect.width) * 2 - 1
    const ny = -((y - rect.top) / rect.height) * 2 + 1
    this.pointer.set(nx, ny)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes = this.stars.map((s) => s.mesh)
    const hits = this.raycaster.intersectObjects(meshes, false)
    if (hits.length > 0) {
      const ud = hits[0].object.userData as {
        roomId: string
        roomPath?: string
        roomName?: string
        slot: ShellSlot
      }
      return { slot: ud.slot, roomPath: ud.roomPath, roomName: ud.roomName, roomId: ud.roomId }
    }
    return null
  }

  setHover(slot: ShellSlot | null, roomId?: string | null): void {
    this.hoverSlot = slot
    this.hoverRoomId = roomId ?? null
  }

  getScreenRect(): { x: number; y: number; w: number; h: number; jade?: { x: number; y: number } } {
    // 3D 下屏风位仍在中央（星核位置），回退与 2D 一致：画布中心上方
    return {
      x: this.width * 0.5 - 60,
      y: this.height * 0.32 - 60,
      w: 120,
      h: 120,
      jade: { x: this.width * 0.5, y: this.height * 0.32 },
    }
  }

  render(timestamp: number): void {
    if (!this.renderer || !this.scene || !this.camera || !this.controls) return
    const t = timestamp * 0.001

    // 星体呼吸 + 轻微漂浮
    const breath = this.sanctuary
      ? 0.85 + Math.sin(t * 0.4) * 0.06
      : 0.9 + Math.sin(t * 0.9) * 0.1
    for (const s of this.stars) {
      const floatY = Math.sin(t * 0.6 + s.phase) * 0.6
      s.mesh.position.set(s.bx, s.by + floatY, s.bz)
      const hovered = this.hoverSlot === s.room.slot && this.hoverRoomId === s.room.id
      const target = s.baseScale * (hovered ? 1.5 : 1) * breath
      const cur = s.mesh.scale.x
      s.mesh.scale.setScalar(cur + (target - cur) * 0.15)
      const mat = s.mesh.material as THREE.MeshBasicMaterial
      mat.color.lerp(hovered ? this.accentColor : new THREE.Color().setHSL(0.08, 0.7, 0.6), 0.15)
    }

    // 星核脉动
    if (this.coreGroup) {
      const pulse = 1 + Math.sin(t * 0.8) * 0.05
      this.coreGroup.scale.setScalar(pulse)
    }

    // 背景星缓慢自转，增强深空感
    if (this.bgPoints) {
      this.bgPoints.rotation.z = t * 0.01
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

// 自注册
registerShell('stars-3d', () => new Stars3DShell())
