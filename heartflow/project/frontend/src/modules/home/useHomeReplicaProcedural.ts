// ============================================================
// 家 · 程序化 3D 房间生成器
// 为 11 个蓝图房间生成墙面、地面、天花板、家具等 3D 几何体，
// 无需外部 .glb 文件，纯 Three.js 基元拼装。
// 视觉精致化：家具带细节（靠背/扶手/桌腿/床头板）、房间封闭感（天花板+门窗）。
// ============================================================

import type * as THREE from 'three'
import type { HomeRoom } from './rooms'

// ---- 房间布局常驻 ----

export const ROOM_W = 8   // 宽 (x)
const ROOM_H = 5   // 高 (y)
export const ROOM_D = 8   // 深 (z)
const ROOM_GAP = 2 // 房间间距

/** 房间在 3D 世界中的位置（网格布局） */
const ROOM_LAYOUT: Record<string, [number, number, number]> = {
  entrance:     [0,                0, 0],
  'living-room': [ROOM_W + ROOM_GAP, 0, 0],
  'dining-room': [(ROOM_W + ROOM_GAP) * 2, 0, 0],
  kitchen:      [(ROOM_W + ROOM_GAP) * 3, 0, 0],
  study:        [0,                0, ROOM_D + ROOM_GAP],
  bedroom:      [ROOM_W + ROOM_GAP, 0, ROOM_D + ROOM_GAP],
  bathroom:     [(ROOM_W + ROOM_GAP) * 2, 0, ROOM_D + ROOM_GAP],
  wardrobe:     [(ROOM_W + ROOM_GAP) * 3, 0, ROOM_D + ROOM_GAP],
  courtyard:    [0,                0, (ROOM_D + ROOM_GAP) * 2],
  balcony:      [ROOM_W + ROOM_GAP, 0, (ROOM_D + ROOM_GAP) * 2],
  storage:      [(ROOM_W + ROOM_GAP) * 2, 0, (ROOM_D + ROOM_GAP) * 2],
}

/** 获取房间世界坐标 */
export function getRoomWorldPosition(roomId: string): [number, number, number] {
  return ROOM_LAYOUT[roomId] ?? [0, 0, 0]
}

export function getAllRoomIds(): string[] {
  return Object.keys(ROOM_LAYOUT)
}

// ---- 颜色与材质工具 ----

function hexToColor(THREE_MODULE: typeof THREE, hex: string): THREE.Color {
  return new THREE_MODULE.Color(hex)
}

interface PlacedOpts {
  x?: number
  y?: number
  z?: number
}

/** 便捷建盒（带投影/接收阴影） */
function makeBox(
  T: typeof THREE,
  w: number, h: number, d: number,
  color: THREE.Color,
  opts: PlacedOpts & { roughness?: number; metalness?: number; emissive?: THREE.Color; emissiveIntensity?: number } = {},
): THREE.Mesh {
  const mat = new T.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.82,
    metalness: opts.metalness ?? 0.04,
  })
  if (opts.emissive) {
    mat.emissive = opts.emissive
    mat.emissiveIntensity = opts.emissiveIntensity ?? 0.4
  }
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat)
  mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** 便捷建圆柱 */
function makeCyl(
  T: typeof THREE,
  rTop: number, rBottom: number, h: number,
  color: THREE.Color,
  opts: PlacedOpts & { roughness?: number; metalness?: number; emissive?: THREE.Color; emissiveIntensity?: number; seg?: number } = {},
): THREE.Mesh {
  const mat = new T.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.7,
    metalness: opts.metalness ?? 0.1,
  })
  if (opts.emissive) {
    mat.emissive = opts.emissive
    mat.emissiveIntensity = opts.emissiveIntensity ?? 0.4
  }
  const mesh = new T.Mesh(new T.CylinderGeometry(rTop, rBottom, h, opts.seg ?? 12), mat)
  mesh.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export const FLOOR_Y = -ROOM_H / 2

// ---- 通用家具件 ----

function makeChair(T: typeof THREE, g: THREE.Group, color: THREE.Color, dark: THREE.Color, x: number, z: number, rotY = 0): void {
  const seatY = FLOOR_Y + 0.45
  const seat = makeBox(T, 0.5, 0.1, 0.5, color, { x, z, y: seatY })
  seat.rotation.y = rotY
  g.add(seat)
  const back = makeBox(T, 0.5, 0.55, 0.08, color, { x, z: z - 0.21, y: seatY + 0.32 })
  back.rotation.y = rotY
  g.add(back)
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const leg = makeCyl(T, 0.04, 0.04, 0.45, dark, { x: x + lx, z: z + lz, y: FLOOR_Y + 0.225 })
    g.add(leg)
  }
}

function makeTable(T: typeof THREE, g: THREE.Group, color: THREE.Color, dark: THREE.Color, x: number, z: number, w = 1.4, d = 0.9, h = 0.75): void {
  const topY = FLOOR_Y + h
  g.add(makeBox(T, w, 0.08, d, color, { x, z, y: topY }))
  const hx = w / 2 - 0.15
  const hz = d / 2 - 0.15
  for (const [lx, lz] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
    g.add(makeCyl(T, 0.06, 0.06, h, dark, { x: x + lx, z: z + lz, y: FLOOR_Y + h / 2 }))
  }
}

function makeSofa(T: typeof THREE, g: THREE.Group, color: THREE.Color, x: number, z: number, w = 3): void {
  const baseY = FLOOR_Y + 0.28
  g.add(makeBox(T, w, 0.5, 1.1, color, { x, z: z - 0.3, y: baseY }))
  g.add(makeBox(T, w, 0.75, 0.22, color, { x, z: z - 0.78, y: baseY + 0.5 }))
  g.add(makeBox(T, 0.26, 0.6, 1.1, color, { x: x - w / 2 + 0.13, z: z - 0.3, y: baseY + 0.18 }))
  g.add(makeBox(T, 0.26, 0.6, 1.1, color, { x: x + w / 2 - 0.13, z: z - 0.3, y: baseY + 0.18 }))
  // 抱枕
  g.add(makeBox(T, 0.5, 0.4, 0.18, color.clone().multiplyScalar(0.85), { x: x - w / 4, z: z - 0.55, y: baseY + 0.55, roughness: 0.95 }))
  g.add(makeBox(T, 0.5, 0.4, 0.18, color.clone().multiplyScalar(0.85), { x: x + w / 4, z: z - 0.55, y: baseY + 0.55, roughness: 0.95 }))
}

function makeBed(T: typeof THREE, g: THREE.Group, color: THREE.Color, dark: THREE.Color, x: number, z: number): void {
  g.add(makeBox(T, 2.4, 0.3, 2.8, dark, { x, z, y: FLOOR_Y + 0.15 }))
  g.add(makeBox(T, 2.2, 0.24, 2.6, color, { x, z, y: FLOOR_Y + 0.42 }))
  g.add(makeBox(T, 2.4, 1.0, 0.2, dark, { x, z: z - 1.35, y: FLOOR_Y + 0.5 }))
  // 枕头
  g.add(makeBox(T, 0.8, 0.16, 0.5, color.clone().multiplyScalar(1.15), { x: x - 0.55, z: z - 1.0, y: FLOOR_Y + 0.62, roughness: 0.95 }))
  g.add(makeBox(T, 0.8, 0.16, 0.5, color.clone().multiplyScalar(1.15), { x: x + 0.55, z: z - 1.0, y: FLOOR_Y + 0.62, roughness: 0.95 }))
  // 被角折边
  g.add(makeBox(T, 2.2, 0.06, 0.7, color.clone().multiplyScalar(0.9), { x, z: z + 0.7, y: FLOOR_Y + 0.56, roughness: 0.95 }))
}

function makeRug(T: typeof THREE, g: THREE.Group, color: THREE.Color, x: number, z: number, w = 2.5, d = 2): void {
  const rug = new T.Mesh(
    new T.PlaneGeometry(w, d),
    new T.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.7), roughness: 1, metalness: 0 }),
  )
  rug.rotation.x = -Math.PI / 2
  rug.position.set(x, FLOOR_Y + 0.02, z)
  rug.receiveShadow = true
  g.add(rug)
}

function makeShelfUnit(T: typeof THREE, g: THREE.Group, color: THREE.Color, x: number, z: number, w = 2, h = 3.5, depth = 0.6, levels = 3): void {
  const frame = makeBox(T, w, h, depth, color, { x, z, y: FLOOR_Y + h / 2, roughness: 0.6 })
  g.add(frame)
  for (let i = 1; i < levels; i++) {
    const sy = FLOOR_Y + (h / levels) * i
    g.add(makeBox(T, w - 0.1, 0.06, depth - 0.05, color.clone().multiplyScalar(0.8), { x, z, y: sy }))
  }
}

function makeWardrobeBody(T: typeof THREE, g: THREE.Group, color: THREE.Color, x: number, z: number): void {
  const h = ROOM_H - 0.5
  g.add(makeBox(T, 3, h, 0.8, color, { x, z, y: FLOOR_Y + h / 2, roughness: 0.5 }))
  // 双开门缝 + 把手
  g.add(makeBox(T, 0.04, h - 0.4, 0.04, color.clone().multiplyScalar(0.5), { x: x - 0.06, z: z + 0.42, y: FLOOR_Y + h / 2 }))
  g.add(makeBox(T, 0.04, h - 0.4, 0.04, color.clone().multiplyScalar(0.5), { x: x + 0.06, z: z + 0.42, y: FLOOR_Y + h / 2 }))
}

function makePendant(T: typeof THREE, g: THREE.Group, color: THREE.Color, x: number, z: number): void {
  g.add(makeCyl(T, 0.02, 0.02, ROOM_H - 1.2, color.clone().multiplyScalar(0.4), { x, z, y: FLOOR_Y + (ROOM_H - 1.2) / 2, roughness: 0.5 }, ))
  const shade = new T.Mesh(
    new T.ConeGeometry(0.35, 0.4, 16, 1, true),
    new T.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, side: T.DoubleSide }),
  )
  shade.position.set(x, ROOM_H / 2 - 0.6, z)
  shade.castShadow = true
  g.add(shade)
  g.add(makeCyl(T, 0.12, 0.12, 0.16, color, { x, z, y: ROOM_H / 2 - 0.42, emissive: color, emissiveIntensity: 0.7, roughness: 0.2 }))
}

function makeMirror(T: typeof THREE, g: THREE.Group, x: number, y: number, z: number, w = 1, h = 1.2): void {
  g.add(makeBox(T, w, h, 0.05, new T.Color(0xcccccc), { x, y, z, roughness: 0.08, metalness: 0.92 }))
}

function makePlant(T: typeof THREE, g: THREE.Group, x: number, z: number): void {
  g.add(makeCyl(T, 0.22, 0.28, 0.5, new T.Color(0x8a5a3c), { x, z, y: FLOOR_Y + 0.25, roughness: 0.8 }))
  const foliage = new T.MeshStandardMaterial({ color: new T.Color(0x4a8c3f), roughness: 0.9, metalness: 0 })
  const f1 = new T.Mesh(new T.SphereGeometry(0.55, 10, 8), foliage)
  f1.position.set(x, FLOOR_Y + 1.1, z)
  f1.castShadow = true
  g.add(f1)
  const f2 = new T.Mesh(new T.SphereGeometry(0.4, 10, 8), foliage)
  f2.position.set(x + 0.35, FLOOR_Y + 0.85, z + 0.2)
  f2.castShadow = true
  g.add(f2)
}

// ---- 基础房间结构（地面 + 墙 + 天花板）----

export interface ProceduralRoomResult {
  group: THREE.Group
  /** 房间中心世界坐标 */
  worldPos: [number, number, number]
}

export function buildRoomShell(
  T: typeof THREE,
  room: HomeRoom,
  worldPos: [number, number, number],
): ProceduralRoomResult {
  const group = new T.Group()
  group.position.set(...worldPos)

  const baseColor = hexToColor(T, room.atmosphereColor)
  const endColor = hexToColor(T, room.atmosphereEndColor)
  const glowColor = baseColor.clone().multiplyScalar(0.6)

  // 地面
  const floorGeo = new T.PlaneGeometry(ROOM_W, ROOM_D)
  const floorMat = new T.MeshStandardMaterial({
    color: endColor,
    roughness: 0.9,
    metalness: 0.02,
  })
  const floor = new T.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FLOOR_Y
  floor.receiveShadow = true
  group.add(floor)

  const wallMat = () => new T.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.85,
    metalness: 0.02,
    emissive: glowColor,
    emissiveIntensity: 0.06,
  })

  // 背墙（中间留门洞 + 上方门楣）
  const doorW = 1.6
  const doorH = 3
  const sideW = (ROOM_W - doorW) / 2
  const leftWall = new T.Mesh(new T.PlaneGeometry(sideW, ROOM_H), wallMat())
  leftWall.position.set(-(doorW / 2 + sideW / 2), 0, -ROOM_D / 2)
  leftWall.rotation.y = 0
  leftWall.receiveShadow = true
  group.add(leftWall)

  const rightWall = new T.Mesh(new T.PlaneGeometry(sideW, ROOM_H), wallMat())
  rightWall.position.set(doorW / 2 + sideW / 2, 0, -ROOM_D / 2)
  rightWall.receiveShadow = true
  group.add(rightWall)

  const lintel = new T.Mesh(new T.PlaneGeometry(doorW, ROOM_H - doorH), wallMat())
  lintel.position.set(0, (doorH + ROOM_H) / 2 - ROOM_H / 2, -ROOM_D / 2)
  lintel.receiveShadow = true
  group.add(lintel)

  // 左墙 / 右墙
  for (const def of [
    { pos: [-ROOM_W / 2, 0, 0] as [number, number, number], rotY: Math.PI / 2, w: ROOM_D, h: ROOM_H },
    { pos: [ROOM_W / 2, 0, 0] as [number, number, number], rotY: -Math.PI / 2, w: ROOM_D, h: ROOM_H },
  ]) {
    const wall = new T.Mesh(new T.PlaneGeometry(def.w, def.h), wallMat())
    wall.position.set(...def.pos)
    wall.rotation.y = def.rotY
    wall.receiveShadow = true
    group.add(wall)
  }

  // 天花板
  const ceil = new T.Mesh(
    new T.PlaneGeometry(ROOM_W, ROOM_D),
    new T.MeshStandardMaterial({ color: baseColor.clone().multiplyScalar(0.55), roughness: 0.95, metalness: 0 }),
  )
  ceil.rotation.x = Math.PI / 2
  ceil.position.y = ROOM_H / 2
  ceil.receiveShadow = true
  group.add(ceil)

  // 前侧双开暗示门框（房间入口，朝向相机）
  const doorMat = new T.MeshStandardMaterial({
    color: endColor.clone().multiplyScalar(0.7),
    roughness: 0.55,
    metalness: 0.12,
  })
  const leafL = new T.Mesh(new T.BoxGeometry(0.78, doorH, 0.12), doorMat)
  leafL.position.set(-0.4, FLOOR_Y + doorH / 2, ROOM_D / 2)
  leafL.castShadow = true
  group.add(leafL)
  const leafR = new T.Mesh(new T.BoxGeometry(0.78, doorH, 0.12), doorMat)
  leafR.position.set(0.4, FLOOR_Y + doorH / 2, ROOM_D / 2)
  leafR.castShadow = true
  group.add(leafR)
  // 门槛
  const threshold = new T.Mesh(
    new T.BoxGeometry(doorW, 0.08, 0.3),
    new T.MeshStandardMaterial({ color: endColor.clone().multiplyScalar(0.5), roughness: 0.6 }),
  )
  threshold.position.set(0, FLOOR_Y + 0.04, ROOM_D / 2)
  group.add(threshold)

  return { group, worldPos }
}

// ---- 房间家具生成器 ----

export function addRoomFurniture(
  T: typeof THREE,
  group: THREE.Group,
  roomId: string,
  color: string,
): void {
  const c = hexToColor(T, color)
  const dark = c.clone().multiplyScalar(0.6)
  const accent = c.clone().multiplyScalar(0.85)
  const light = c.clone().lerp(new T.Color(0xffffff), 0.4)

  switch (roomId) {
    case 'bedroom':
      makeBed(T, group, c, dark, 0, -1.2)
      makeChair(T, group, c, dark, -1.8, -1.2)
      group.add(makeBox(T, 0.6, 0.5, 0.6, dark, { x: -1.8, z: -1.2, y: FLOOR_Y + 0.45, roughness: 0.5 }))
      group.add(makeCyl(T, 0.1, 0.15, 0.5, light, { x: -1.8, z: -1.2, y: FLOOR_Y + 0.95, emissive: c, emissiveIntensity: 0.4, roughness: 0.3 }))
      break
    case 'study':
      makeTable(T, group, dark, dark, 0, -1, 2.5, 1.2, 1.1)
      for (const [lx, lz] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) {
        group.add(makeCyl(T, 0.06, 0.06, 1, dark, { x: lx, z: lz, y: FLOOR_Y + 0.5 }))
      }
      makeShelfUnit(T, group, dark, -2.6, -2, 2, 3.5, 0.6, 4)
      makeChair(T, group, c, dark, 0, 0.3)
      makePlant(T, group, 2.6, -2)
      break
    case 'living':
    case 'living-room':
      makeSofa(T, group, c, 0, -1.4, 3)
      makeTable(T, group, dark, dark, 0, -0.2, 1.5, 0.9, 0.45)
      makeRug(T, group, c, 0, -0.5, 2.5, 2)
      makePlant(T, group, 2.8, -2.5)
      break
    case 'kitchen':
      group.add(makeBox(T, 3.5, 0.9, 0.8, dark, { x: 0, z: -2.5, y: FLOOR_Y + 0.6, roughness: 0.35, metalness: 0.15 }))
      group.add(makeBox(T, 1.2, 0.06, 0.6, new T.Color(0x333333), { x: 0, z: -2.5, y: FLOOR_Y + 1.08, roughness: 0.2, metalness: 0.5 }))
      group.add(makeCyl(T, 0.05, 0.05, 0.3, new T.Color(0x999999), { x: 0, z: -2.5, y: FLOOR_Y + 1.25, metalness: 0.8, roughness: 0.2 }))
      makeTable(T, group, dark, dark, 0, 0.6, 1.8, 1.2, 0.9)
      makeChair(T, group, c, dark, -1.3, 0.6)
      makeChair(T, group, c, dark, 1.3, 0.6)
      break
    case 'dining':
    case 'dining-room':
      makeTable(T, group, dark, dark, 0, 0, 2.4, 1.4, 0.9)
      makeChair(T, group, c, dark, 0, -1.2)
      makeChair(T, group, c, dark, 0, 1.2)
      makeChair(T, group, c, dark, -1.5, 0)
      makeChair(T, group, c, dark, 1.5, 0)
      makePendant(T, group, c, 0, 0)
      break
    case 'bath':
    case 'bathroom':
      group.add(makeBox(T, 2, 0.7, 1.2, accent, { x: 0, z: -1.5, y: FLOOR_Y + 0.5, roughness: 0.2, metalness: 0.2 }))
      group.add(makeBox(T, 1.7, 0.5, 0.9, accent.clone().multiplyScalar(0.85), { x: 0, z: -1.5, y: FLOOR_Y + 0.95, roughness: 0.2, metalness: 0.2 }))
      group.add(makeBox(T, 1.2, 0.15, 0.7, accent, { x: 2, z: -2, y: FLOOR_Y + 1, roughness: 0.2, metalness: 0.2 }))
      makeMirror(T, group, 2, FLOOR_Y + 1.8, -2.35, 1, 1.2)
      break
    case 'entrance':
      group.add(makeBox(T, 2, 1.2, 0.5, dark, { x: 2, z: -2.5, y: FLOOR_Y + 0.7, roughness: 0.5 }))
      group.add(makeCyl(T, 0.05, 0.05, 0.3, new T.Color(0x888888), { x: 2.5, y: ROOM_H / 2 - 0.5, z: -2.5, metalness: 0.7, roughness: 0.3 }))
      makeRug(T, group, c, 0, 1, 1.5, 2)
      break
    case 'wardrobe':
      makeWardrobeBody(T, group, dark, 0, -2.5)
      makeMirror(T, group, 2.5, 0, -2.5, 0.8, 2.5)
      break
    case 'courtyard':
      // 庭院开放，无天花板视觉效果（天花板已统一加，但庭院用低矮围栏感）
      group.add(makeBox(T, 1.5, 0.04, 4, dark, { x: 0, z: 1, y: FLOOR_Y + 0.03, roughness: 0.7 }))
      group.add(makeCyl(T, 0.15, 0.2, 2, new T.Color(0x8b6914), { x: 2, z: 2, y: FLOOR_Y + 1, roughness: 0.8 }))
      group.add(makeCyl(T, 0.02, 0.02, 0.3, new T.Color(0x555555), { x: 2, z: 2, y: FLOOR_Y + 2.15, roughness: 0.4 }))
      const foliage = new T.Mesh(
        new T.SphereGeometry(1, 10, 8),
        new T.MeshStandardMaterial({ color: new T.Color(0x4a8c3f), roughness: 0.9, metalness: 0 }),
      )
      foliage.position.set(2, FLOOR_Y + 2.7, 2)
      foliage.castShadow = true
      group.add(foliage)
      group.add(makeBox(T, 2, 0.2, 0.6, dark, { x: -2, z: 0, y: FLOOR_Y + 0.7, roughness: 0.5 }))
      break
    case 'balcony':
      for (let x = -ROOM_W / 2 + 0.5; x <= ROOM_W / 2 - 0.5; x += 0.8) {
        group.add(makeCyl(T, 0.04, 0.04, 1.5, new T.Color(0x999999), { x, z: ROOM_D / 2 - 0.1, y: FLOOR_Y + 0.75, metalness: 0.6, roughness: 0.3 }))
      }
      makeChair(T, group, accent, accent, 2, 1)
      group.add(makeCyl(T, 0.3, 0.3, 0.06, accent, { x: 2, z: 1.5, y: FLOOR_Y + 0.9, roughness: 0.3, metalness: 0.1 }))
      break
    case 'storage':
      for (let i = 0; i < 3; i++) {
        group.add(makeBox(T, 2.5, 0.1, 0.8, dark, { x: 0, z: -2, y: FLOOR_Y + 0.5 + i * 1.2, roughness: 0.5 }))
      }
      for (let i = 0; i < 4; i++) {
        group.add(makeBox(T, 0.6, 0.5, 0.5, c, { x: -1.5 + (i % 2) * 1.5, z: 0.5 + Math.floor(i / 2) * 0.8, y: FLOOR_Y + 0.3, roughness: 0.7 }))
      }
      break
  }
}
