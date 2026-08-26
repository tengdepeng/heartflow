// ============================================================
// 世界壳 · 宅院 3D（宋明留白风立体化）
// 蓝图第五部分·家·三「3D全场景」——宅院壳的 3D 形态。
// 与 2D courtyard.ts 共享 ZONES 语义（6 slot 进深拓扑），但用 Three.js
// 立体化宋明宅院：影壁/前院/正堂/后院/厢房/角门按 z 深度排列为 3D 建筑。
// 风格延续 2D 剪影：低饱和墨色 + 描金细线 + 留白分区（非粗色块）。
// OrbitControls 拖拽旋转 + 滚轮缩放 + 静谧态自动缓旋；Raycaster 命中建筑→路由。
// 宪法硬约束：外观/3D 参数（autoRotate、雾浓度、courtyardLayout）跟随
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
  label: string
  /** 归一化 xy（相对画布比例，与 2D 一致） */
  x: number
  y: number
  /** 进深 z（世界单位）：越私密越往里（越负） */
  z: number
  /** 建筑占地宽（世界单位） */
  w: number
  /** 建筑占地深（世界单位） */
  d: number
  /** 描金浓度基准 */
  accent: number
}

// 与 2D courtyard 共享院落空间拓扑，保证「推门之后的世界」跨 2D/3D 位置不跳变
const ZONES: SlotZone[] = [
  { slot: 'screen', label: '影壁', x: 0.5, y: 0.32, z: 0, w: 38, d: 12, accent: 0.95 },
  { slot: 'front-yard', label: '前院', x: 0.5, y: 0.66, z: -4, w: 68, d: 18, accent: 0.55 },
  { slot: 'hall', label: '正堂', x: 0.5, y: 0.12, z: -8, w: 52, d: 16, accent: 0.45 },
  { slot: 'back-yard', label: '后院', x: 0.82, y: 0.5, z: -11, w: 28, d: 32, accent: 0.4 },
  { slot: 'side-wing', label: '厢房', x: 0.16, y: 0.5, z: -13, w: 28, d: 32, accent: 0.35 },
  { slot: 'corner', label: '角门', x: 0.5, y: 0.9, z: -16, w: 56, d: 8, accent: 0.3 },
]

// 世界单位尺度
const WORLD_W = 120
const WORLD_H = 80

interface BuildingMesh {
  slot: ShellSlot
  group: THREE.Group
  /** 命中体（点击进房间用） */
  hitMesh: THREE.Mesh
}

interface AnchorMesh {
  room: ShellRoomAnchor
  mesh: THREE.Mesh
  baseScale: number
  phase: number
  bx: number
  by: number
  bz: number
}

export class Courtyard3DShell implements WorldShellRenderer {
  readonly kind = 'courtyard-3d' as const

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

  private buildings: BuildingMesh[] = []
  private anchors: AnchorMesh[] = []
  private corridors: THREE.LineSegments | null = null

  private hoverSlot: ShellSlot | null = null
  private hoverRoomId: string | null = null

  private accentColor = new THREE.Color(0xd4a574)
  private paperColor = new THREE.Color(0xeee6da)

  mount(shellCtx: ShellContext): void {
    this.width = shellCtx.width
    this.height = shellCtx.height
    this.intensity = shellCtx.intensity
    this.sanctuary = shellCtx.sanctuary
    this.config = shellCtx.config ?? {}
    this.rooms = shellCtx.rooms ?? []

    // 关键：3D 自建独立 WebGL canvas，Teleport 到 body 直接子元素 + fixed 全屏 + z:3。
    // 不再插在 shellCtx.canvas.parentElement（canvas-room 容器有 transform: scale 创造
    // stacking context + DOM 在 main-content 之前仍被 main z:1+DOM 后序压制），
    // 用户在真机下完全看不到 3D 立体宅院——"自圆其说"根因。
    // 命中由 .shell-hit-layer（已在 body z:5）接管，3D canvas pointer-events:none。
    const ownCanvas = document.createElement('canvas')
    ownCanvas.className = 'courtyard-3d-canvas'
    ownCanvas.style.position = 'fixed'
    ownCanvas.style.inset = '0'
    ownCanvas.style.width = '100vw'
    ownCanvas.style.height = '100vh'
    ownCanvas.style.pointerEvents = 'none' // 命中由 .shell-hit-layer 接管
    ownCanvas.style.zIndex = '3' // 高于 main-content(1)，低于 nav(40)/玉珠(20)
    document.body.appendChild(ownCanvas)
    this.canvas = ownCanvas
    this.canvasHost = document.body

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
      })
    } catch {
      // WebGL 不可用——静默放弃 3D，呼叫方回退 2D
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
    // 景深雾：越远越沉入暗宣纸底（雾浓度本地可配）
    const fogDensity = (this.config.fogDensity as number) ?? 0.008
    scene.fog = new THREE.FogExp2(0x1a1612, fogDensity)
    this.scene = scene

    const camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.1, 1000)
    // 第一人称：站在影壁前（z=5），视线略高（y=4）看向正堂深处（-z）
    // 营造"推门入院、往里走"的沉浸感，而非上帝俯瞰
    camera.position.set(0, 4, 6)
    camera.lookAt(0, 3, -10)
    this.camera = camera

    const controls = new OrbitControls(camera, this.canvas)
    // 第一人称漫游：仅允许小幅环视（不绕中心转），禁止平移
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    // 距离 = 相机到目标点(0,3,-10)的距离，限制推进/后退范围
    controls.minDistance = 8 // 退到影壁前
    controls.maxDistance = 60 // 推进到角门深处
    controls.minPolarAngle = Math.PI * 0.36 // 限俯视角度（-30°~+45°）
    controls.maxPolarAngle = Math.PI * 0.62
    // 将 OrbitControls 的 target 设为中庭，使拖拽=环视而非绕飞
    controls.target.set(0, 3, -10)
    controls.rotateSpeed = 0.25 + this.intensity * 0.2
    controls.zoomSpeed = 0.6
    controls.autoRotate = false // 第一人称不做自动旋转（眩晕）
    this.controls = controls

    // 灯光：环境 + 暖色主光（宋明黄昏感）
    scene.add(new THREE.AmbientLight(0xb8a888, 0.55))
    const main = new THREE.DirectionalLight(0xffd9a0, 0.75)
    main.position.set(20, 40, 30)
    scene.add(main)
    const fill = new THREE.DirectionalLight(0x6a7a9a, 0.25)
    fill.position.set(-30, 20, -20)
    scene.add(fill)

    this.buildGround()
    this.layoutBuildings()
    this.buildCorridors()
    this.buildLanterns()

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
      if (this.controls) this.controls.rotateSpeed = 0.4 + this.intensity * 0.3
    }
    if (partial.sanctuary !== undefined) {
      this.sanctuary = partial.sanctuary
      if (this.controls) this.controls.autoRotate = partial.sanctuary
    }
    if (partial.config !== undefined) this.config = partial.config
    if (partial.rooms !== undefined) {
      this.rooms = partial.rooms
      this.rebuildAnchors()
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
    this.buildings = []
    this.anchors = []
    this.corridors = null
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
    const z = (0.5 - zone.y) * WORLD_H
    return new THREE.Vector3(x, 0, z)
  }

  /** 地面：宣纸底平面 + 淡墨网格地坪（建立院落空间参照） */
  private buildGround(): void {
    if (!this.scene) return
    // 宣纸底
    const geo = new THREE.PlaneGeometry(WORLD_W * 2.4, WORLD_H * 2.4)
    const mat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -0.1
    this.scene.add(mesh)

    // 淡墨网格地坪：暗示院落铺装肌理（细线，留白）
    const grid = new THREE.GridHelper(WORLD_W * 2.2, 24, this.accentColor, this.accentColor)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.06
    grid.position.y = 0
    // GridHelper 默认在 XZ 平面，无需旋转
    this.scene.add(grid)
  }

  /** 根据 ZONES 生成 6 座建筑（影壁/前院/正堂/后院/厢房/角门） */
  private layoutBuildings(): void {
    if (!this.scene) return
    // 清旧
    for (const b of this.buildings) {
      this.scene.remove(b.group)
      b.group.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else if (mat) (mat as THREE.Material).dispose()
      })
    }
    this.buildings = []

    const layout = (this.config.courtyardLayout as string) ?? 'three-entries'
    for (const zone of ZONES) {
      const pos = this.toWorld(zone)
      const group = this.buildZoneBuilding(zone, pos, layout)
      group.userData = { width: zone.w, depth: zone.d }
      // 命中体：透明 box，覆盖建筑占地，用于 Raycaster
      const hitGeo = new THREE.BoxGeometry(zone.w, 14, zone.d)
      const hitMat = new THREE.MeshBasicMaterial({ visible: false })
      const hitMesh = new THREE.Mesh(hitGeo, hitMat)
      hitMesh.position.copy(pos)
      hitMesh.position.y = 7
      hitMesh.userData = { slot: zone.slot }
      group.add(hitMesh)
      this.scene.add(group)
      this.buildings.push({ slot: zone.slot, group, hitMesh })
    }

    this.rebuildAnchors()
  }

  /** 单座建筑：按 slot 风格生成（影壁/正堂/厢房…） */
  private buildZoneBuilding(zone: SlotZone, pos: THREE.Vector3, layout: string): THREE.Group {
    const group = new THREE.Group()
    group.position.copy(pos)

    const isScreen = zone.slot === 'screen'
    const isHall = zone.slot === 'hall'
    const isCorner = zone.slot === 'corner'

    // 影壁宽度受 courtyardLayout 影响（与 2D 一致：three-entries=1.0 / one-entry=0.7 / circular=0.85）
    const widthMul = isScreen
      ? (layout === 'one-entry' ? 0.7 : layout === 'circular' ? 0.85 : 1)
      : 1
    const w = zone.w * widthMul
    const d = zone.d
    // 台基抬高：所有建筑立于 0.6 高台基之上，形成院落层级
    const h = isScreen ? 16 : isHall ? 20 : isCorner ? 7 : 13

    // 台基：淡墨色填充（留白主体），抬高 0.6 建立体块感
    const baseGeo = new THREE.BoxGeometry(w, 0.6, d)
    const baseMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.1 + zone.accent * 0.05,
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0
    group.add(base)

    // 描金边框（线框，细线）：随进深衰减（近亮远沉），强化留白纵深
    const depthFade = Math.max(0.25, 1 + zone.z * 0.045)
    const edges = new THREE.EdgesGeometry(baseGeo)
    const lineMat = new THREE.LineBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: Math.min(1, zone.accent * depthFade),
    })
    const lineSeg = new THREE.LineSegments(edges, lineMat)
    group.add(lineSeg)

    if (isScreen) {
      // 影壁：屏门 + 中央玉珠圆位 + 描金框
      this.buildScreenWall(group, w, h, d)
    } else if (isHall) {
      // 正堂：屋顶 + 柱廊
      this.buildHall(group, w, h, d)
    } else if (isCorner) {
      // 角门：矮标记，仅描金边框 + 小标牌
      this.buildCornerGate(group, w, h, d)
    } else {
      // 前院/后院/厢房：屋顶建筑
      this.buildStandardBuilding(group, w, h, d, zone.accent)
    }

    return group
  }

  /** 影壁：屏门 + 中央玉珠圆位 */
  private buildScreenWall(group: THREE.Group, w: number, h: number, d: number): void {
    // 屏门主体：半透明竖板
    const wallGeo = new THREE.BoxGeometry(w * 0.92, h, d * 0.18)
    const wallMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.12,
    })
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.y = h / 2 + 0.2
    group.add(wall)

    // 描金边框
    const edges = new THREE.EdgesGeometry(wallGeo)
    const lineMat = new THREE.LineBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.85,
    })
    const lineSeg = new THREE.LineSegments(edges, lineMat)
    lineSeg.position.copy(wall.position)
    group.add(lineSeg)

    // 中央玉珠圆位（屏侧玉珠，与 2D drawScreenFrame 同构）
    const jadeR = Math.min(w, h) * 0.16
    const jadeGeo = new THREE.TorusGeometry(jadeR, 0.35, 8, 32)
    const jadeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xbed2e6),
      transparent: true,
      opacity: 0.7,
    })
    const jade = new THREE.Mesh(jadeGeo, jadeMat)
    jade.position.set(w * 0.42, h / 2 + 0.2, d * 0.12)
    group.add(jade)
  }

  /** 正堂：屋顶 + 柱廊 */
  private buildHall(group: THREE.Group, w: number, h: number, d: number): void {
    // 屋身
    const bodyGeo = new THREE.BoxGeometry(w * 0.86, h * 0.7, d * 0.78)
    const bodyMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.1,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = h * 0.35 + 0.2
    group.add(body)

    // 描金边框
    const edges = new THREE.EdgesGeometry(bodyGeo)
    const lineMat = new THREE.LineBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.5,
    })
    const lineSeg = new THREE.LineSegments(edges, lineMat)
    lineSeg.position.copy(body.position)
    group.add(lineSeg)

    // 屋顶：斜面（宋明歇山顶简化）
    const roofGeo = new THREE.ConeGeometry(w * 0.62, h * 0.45, 4)
    const roofMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.14,
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.rotation.y = Math.PI / 4
    roof.position.y = h * 0.85 + 0.2
    group.add(roof)

    // 屋顶描金
    const roofEdges = new THREE.EdgesGeometry(roofGeo)
    const roofLine = new THREE.LineSegments(
      roofEdges,
      new THREE.LineBasicMaterial({ color: this.accentColor, transparent: true, opacity: 0.6 }),
    )
    roofLine.rotation.y = Math.PI / 4
    roofLine.position.copy(roof.position)
    group.add(roofLine)
  }

  /** 角门：矮标记 */
  private buildCornerGate(group: THREE.Group, w: number, h: number, d: number): void {
    const gateGeo = new THREE.BoxGeometry(w * 0.6, h, d * 0.4)
    const gateMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.06,
    })
    const gate = new THREE.Mesh(gateGeo, gateMat)
    gate.position.y = h / 2 + 0.2
    group.add(gate)

    const edges = new THREE.EdgesGeometry(gateGeo)
    const lineMat = new THREE.LineBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.35,
    })
    const lineSeg = new THREE.LineSegments(edges, lineMat)
    lineSeg.position.copy(gate.position)
    group.add(lineSeg)
  }

  /** 标准建筑（前院/后院/厢房） */
  private buildStandardBuilding(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    accent: number,
  ): void {
    const bodyGeo = new THREE.BoxGeometry(w * 0.82, h * 0.65, d * 0.7)
    const bodyMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.08,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = h * 0.32 + 0.2
    group.add(body)

    const edges = new THREE.EdgesGeometry(bodyGeo)
    const lineMat = new THREE.LineBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: accent * 0.7,
    })
    const lineSeg = new THREE.LineSegments(edges, lineMat)
    lineSeg.position.copy(body.position)
    group.add(lineSeg)

    // 简化屋顶（斜面）
    const roofGeo = new THREE.ConeGeometry(w * 0.55, h * 0.32, 4)
    const roofMat = new THREE.MeshBasicMaterial({
      color: this.paperColor,
      transparent: true,
      opacity: 0.12,
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.rotation.y = Math.PI / 4
    roof.position.y = h * 0.78 + 0.2
    group.add(roof)
  }

  /** 院落游廊连线（细墨线，暗示动线，与 2D drawCorridors 同构） */
  private buildCorridors(): void {
    if (!this.scene) return
    const screen = this.buildings.find((b) => b.slot === 'screen')
    if (!screen) return
    const screenPos = screen.group.position.clone()
    const pts: number[] = []
    for (const b of this.buildings) {
      if (b.slot === 'screen') continue
      const p = b.group.position
      pts.push(screenPos.x, screenPos.y, screenPos.z, p.x, p.y, p.z)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const mat = new THREE.LineBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.18,
    })
    this.corridors = new THREE.LineSegments(geo, mat)
    this.scene.add(this.corridors)
  }

  /** 灯笼：每栋建筑两侧各一盏暖色 PointLight，营造宋明院落傍晚的暖意 */
  private buildLanterns(): void {
    if (!this.scene) return
    const lanternColor = 0xd4865a // 暖橙（灯笼/檐下灯）
    for (const b of this.buildings) {
      const p = b.group.position
      const w = b.group.userData.width ?? 30
      // 两侧挂灯
      for (const side of [-1, 1]) {
        const light = new THREE.PointLight(lanternColor, 0.5, 50, 2)
        light.position.set(p.x + side * (w * 0.42), p.y + 6, p.z)
        this.scene.add(light)
        // 灯体小球（可见的灯笼）
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 8, 8),
          new THREE.MeshBasicMaterial({ color: lanternColor, transparent: true, opacity: 0.85 }),
        )
        bulb.position.copy(light.position)
        this.scene.add(bulb)
      }
    }
  }

  /** 重建房间锚点（小玉珠 mesh，跟随 frequency 决定大小） */
  private rebuildAnchors(): void {
    if (!this.scene) return
    const scene = this.scene
    // 清旧
    for (const a of this.anchors) {
      scene.remove(a.mesh)
      a.mesh.geometry.dispose()
      ;(a.mesh.material as THREE.Material).dispose()
      const halo = (a.mesh.userData as { halo?: THREE.Sprite }).halo
      if (halo) {
        scene.remove(halo)
        if (halo.material.map) halo.material.map.dispose()
        halo.material.dispose()
      }
    }
    this.anchors = []

    const sphere = new THREE.SphereGeometry(1, 16, 16)
    for (const zone of ZONES) {
      const zoneRooms = this.rooms.filter((r) => r.slot === zone.slot)
      const base = this.toWorld(zone)
      // 锚点排在建筑前方，悬浮于台基之上（镜我为视觉中心）
      const anchorZ = base.z + zone.d * 0.42
      zoneRooms.forEach((room, i) => {
        const stepX = zoneRooms.length > 1 ? zone.w * 0.6 / (zoneRooms.length - 1) : 0
        const ax = base.x - (zoneRooms.length > 1 ? zone.w * 0.3 : 0) + stepX * i
        const ay = 4.5
        const az = anchorZ
        const scale = 0.9 + room.frequency * 1.8
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xbe9a6a),
          transparent: true,
          opacity: 0.85,
        })
        const mesh = new THREE.Mesh(sphere, mat)
        mesh.position.set(ax, ay, az)
        mesh.scale.setScalar(scale)
        mesh.userData = {
          roomId: room.id,
          roomPath: room.path,
          roomName: room.name,
          slot: room.slot,
          baseScale: scale,
        }
        scene.add(mesh)

        // 光晕：淡金 sprite，让玉珠（镜我）成为视觉中心
        const haloCanvas = document.createElement('canvas')
        haloCanvas.width = haloCanvas.height = 64
        const hctx = haloCanvas.getContext('2d')!
        const grad = hctx.createRadialGradient(32, 32, 0, 32, 32, 32)
        grad.addColorStop(0, 'rgba(212,165,116,0.35)')
        grad.addColorStop(1, 'rgba(212,165,116,0)')
        hctx.fillStyle = grad
        hctx.fillRect(0, 0, 64, 64)
        const haloTex = new THREE.CanvasTexture(haloCanvas)
        const haloMat = new THREE.SpriteMaterial({
          map: haloTex,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        })
        const halo = new THREE.Sprite(haloMat)
        halo.scale.setScalar(scale * 3.2)
        halo.position.copy(mesh.position)
        scene.add(halo)
        mesh.userData.halo = halo

        this.anchors.push({
          room,
          mesh,
          baseScale: scale,
          phase: Math.random() * Math.PI * 2,
          bx: ax,
          by: ay,
          bz: az,
        })
      })
    }
  }

  /** 命中检测：给定画布逻辑坐标（CSS 像素），Raycaster 命中建筑/锚点 → 路由 */
  hitTest(x: number, y: number): {
    slot: ShellSlot
    roomPath?: string
    roomName?: string
    roomId?: string
  } | null {
    if (!this.renderer || !this.camera || !this.canvas) return null
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const nx = ((x - rect.left) / rect.width) * 2 - 1
    const ny = -((y - rect.top) / rect.height) * 2 + 1
    this.pointer.set(nx, ny)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    // 优先命中锚点（房间玉珠）
    const anchorMeshes = this.anchors.map((a) => a.mesh)
    const anchorHits = this.raycaster.intersectObjects(anchorMeshes, false)
    if (anchorHits.length > 0) {
      const ud = anchorHits[0].object.userData as {
        roomId: string
        roomPath?: string
        roomName?: string
        slot: ShellSlot
      }
      return { slot: ud.slot, roomPath: ud.roomPath, roomName: ud.roomName, roomId: ud.roomId }
    }
    // 兜底：命中建筑（zone 空白）→ 进该 slot 下第一个房间
    const buildingMeshes = this.buildings.map((b) => b.hitMesh)
    const bHits = this.raycaster.intersectObjects(buildingMeshes, false)
    if (bHits.length > 0) {
      const ud = bHits[0].object.userData as { slot: ShellSlot }
      return { slot: ud.slot }
    }
    return null
  }

  setHover(slot: ShellSlot | null, roomId?: string | null): void {
    this.hoverSlot = slot
    this.hoverRoomId = roomId ?? null
  }

  getScreenRect(): { x: number; y: number; w: number; h: number; jade?: { x: number; y: number } } {
    // 3D 下屏风位仍在中央（影壁位置），与 2D 一致
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

    // 介质呼吸：锚点玉珠上下漂浮 + 描金边框 opacity 微动
    const breath = this.sanctuary
      ? 0.85 + Math.sin(t * 0.4) * 0.06
      : 0.9 + Math.sin(t * 0.9) * 0.1
    for (const a of this.anchors) {
      const floatY = Math.sin(t * 0.6 + a.phase) * 0.4
      a.mesh.position.set(a.bx, a.by + floatY, a.bz)
      const hovered = this.hoverSlot === a.room.slot && this.hoverRoomId === a.room.id
      const target = a.baseScale * (hovered ? 1.5 : 1) * breath
      const cur = a.mesh.scale.x
      a.mesh.scale.setScalar(cur + (target - cur) * 0.15)
      const mat = a.mesh.material as THREE.MeshBasicMaterial
      mat.color.lerp(hovered ? this.accentColor : new THREE.Color(0xbe9a6a), 0.15)
      // 光晕跟随
      const halo = (a.mesh.userData as { halo?: THREE.Sprite }).halo
      if (halo) {
        halo.position.copy(a.mesh.position)
        halo.scale.setScalar(a.mesh.scale.x * 3.2 * (1 + Math.sin(t * 1.2 + a.phase) * 0.05))
      }
    }

    // 建筑描金呼吸：悬停加亮
    for (const b of this.buildings) {
      const hovered = this.hoverSlot === b.slot
      b.group.traverse((o) => {
        const line = o as THREE.LineSegments
        if (line.isLineSegments) {
          const mat = line.material as THREE.LineBasicMaterial
          const base = ZONES.find((z) => z.slot === b.slot)?.accent ?? 0.5
          const target = hovered ? 1 : base * breath
          mat.opacity = mat.opacity + (target - mat.opacity) * 0.15
        }
      })
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

// 自注册
registerShell('courtyard-3d', () => new Courtyard3DShell())
