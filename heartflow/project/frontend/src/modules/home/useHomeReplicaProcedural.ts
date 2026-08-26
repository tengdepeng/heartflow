// ============================================================
// 家 · 程序化 3D 房间生成器
// 为 11 个蓝图房间生成墙面、地面、家具等 3D 几何体，
// 无需外部 .glb 文件，纯 Three.js 基元拼装。
// ============================================================

import type * as THREE from 'three'
import type { HomeRoom } from './rooms'

// ---- 房间布局常驻 ----

const ROOM_W = 8   // 宽 (x)
const ROOM_H = 5   // 高 (y)
const ROOM_D = 8   // 深 (z)
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

// ---- 颜色工具 ----

function hexToColor(THREE_MODULE: typeof THREE, hex: string): THREE.Color {
  return new THREE_MODULE.Color(hex)
}

// ---- 基础房间结构（墙面 + 地面）----

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
    roughness: 0.85,
    metalness: 0.02,
  })
  const floor = new T.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -ROOM_H / 2
  floor.receiveShadow = true
  group.add(floor)

  // 三面墙（背墙 + 左墙 + 右墙，前面开放）
  const wallDefs: Array<{ pos: [number, number, number]; rotY: number; w: number; h: number }> = [
    { pos: [0, 0, -ROOM_D / 2], rotY: 0, w: ROOM_W, h: ROOM_H },
    { pos: [-ROOM_W / 2, 0, 0], rotY: Math.PI / 2, w: ROOM_D, h: ROOM_H },
    { pos: [ROOM_W / 2, 0, 0], rotY: -Math.PI / 2, w: ROOM_D, h: ROOM_H },
  ]

  for (const def of wallDefs) {
    const wallGeo = new T.PlaneGeometry(def.w, def.h)
    const wallMat = new T.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      metalness: 0.02,
      emissive: glowColor,
      emissiveIntensity: 0.08,
    })
    const wall = new T.Mesh(wallGeo, wallMat)
    wall.position.set(...def.pos)
    wall.rotation.y = def.rotY
    wall.receiveShadow = true
    group.add(wall)
  }

  // 门框（前面中央开口处的暗示）
  const doorGeo = new T.BoxGeometry(1.2, 3, 0.2)
  const doorMat = new T.MeshStandardMaterial({
    color: endColor.clone().multiplyScalar(0.7),
    roughness: 0.6,
    metalness: 0.1,
  })
  const door = new T.Mesh(doorGeo, doorMat)
  door.position.set(0, -ROOM_H / 2 + 1.5, ROOM_D / 2)
  group.add(door)

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
  const accent = c.clone().multiplyScalar(0.8)

  switch (roomId) {
    case 'bedroom':
      addBed(T, group, c, dark)
      break
    case 'study':
      addStudy(T, group, c, dark)
      break
    case 'living':
    case 'living-room':
      addLivingRoom(T, group, c, dark)
      break
    case 'kitchen':
      addKitchen(T, group, c, dark)
      break
    case 'dining':
    case 'dining-room':
      addDining(T, group, c, dark)
      break
    case 'bath':
    case 'bathroom':
      addBathroom(T, group, c, accent)
      break
    case 'entrance':
      addEntrance(T, group, c, dark)
      break
    case 'wardrobe':
      addWardrobe(T, group, c, dark)
      break
    case 'courtyard':
      addCourtyard(T, group, c, dark)
      break
    case 'balcony':
      addBalcony(T, group, c, accent)
      break
    case 'storage':
      addStorage(T, group, c, dark)
      break
  }
}

// ---- 各房间家具实现 ----

function addBed(T: typeof THREE, g: THREE.Group, c: THREE.Color, dark: THREE.Color): void {
  // 床架
  const bedFrame = new T.Mesh(
    new T.BoxGeometry(2.4, 0.3, 2.8),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.05 }),
  )
  bedFrame.position.set(0, -ROOM_H / 2 + 0.35, -1.5)
  g.add(bedFrame)

  // 床垫
  const mattress = new T.Mesh(
    new T.BoxGeometry(2.2, 0.25, 2.6),
    new T.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 }),
  )
  mattress.position.set(0, -ROOM_H / 2 + 0.65, -1.5)
  g.add(mattress)

  // 床头柜
  const nightstand = new T.Mesh(
    new T.BoxGeometry(0.6, 0.5, 0.6),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.05 }),
  )
  nightstand.position.set(-1.8, -ROOM_H / 2 + 0.5, -1.5)
  g.add(nightstand)

  // 台灯
  const lamp = new T.Mesh(
    new T.CylinderGeometry(0.1, 0.15, 0.5, 8),
    new T.MeshStandardMaterial({ color: c, roughness: 0.3, emissive: c, emissiveIntensity: 0.4 }),
  )
  lamp.position.set(-1.8, -ROOM_H / 2 + 0.95, -1.5)
  g.add(lamp)
}

function addStudy(T: typeof THREE, g: THREE.Group, c: THREE.Color, dark: THREE.Color): void {
  // 书桌
  const desk = new T.Mesh(
    new T.BoxGeometry(2.5, 0.15, 1.2),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.4, metalness: 0.05 }),
  )
  desk.position.set(0, -ROOM_H / 2 + 1.1, -1)
  g.add(desk)

  // 桌腿
  for (const [lx, lz] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) {
    const leg = new T.Mesh(
      new T.CylinderGeometry(0.06, 0.06, 1, 8),
      new T.MeshStandardMaterial({ color: dark, roughness: 0.4, metalness: 0.05 }),
    )
    leg.position.set(lx, -ROOM_H / 2 + 0.5, lz)
    g.add(leg)
  }

  // 书架
  const shelf = new T.Mesh(
    new T.BoxGeometry(2, 3.5, 0.6),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.05 }),
  )
  shelf.position.set(-2.5, -ROOM_H / 2 + 1.75, -2)
  g.add(shelf)

  // 椅子
  const chairSeat = new T.Mesh(
    new T.BoxGeometry(0.6, 0.1, 0.6),
    new T.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 }),
  )
  chairSeat.position.set(0, -ROOM_H / 2 + 0.55, 0.2)
  g.add(chairSeat)
}

function addLivingRoom(T: typeof THREE, g: THREE.Group, c: THREE.Color, dark: THREE.Color): void {
  // 沙发
  const sofa = new T.Mesh(
    new T.BoxGeometry(3, 0.8, 1.2),
    new T.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }),
  )
  sofa.position.set(0, -ROOM_H / 2 + 0.6, -1.5)
  g.add(sofa)

  // 茶几
  const coffeeTable = new T.Mesh(
    new T.BoxGeometry(1.5, 0.1, 0.9),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.4, metalness: 0.1 }),
  )
  coffeeTable.position.set(0, -ROOM_H / 2 + 0.45, -0.2)
  g.add(coffeeTable)

  // 地毯
  const rug = new T.Mesh(
    new T.PlaneGeometry(2.5, 2),
    new T.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.7), roughness: 1, metalness: 0 }),
  )
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0, -ROOM_H / 2 + 0.01, -0.5)
  g.add(rug)
}

function addKitchen(T: typeof THREE, g: THREE.Group, _c: THREE.Color, dark: THREE.Color): void {
  // 灶台/操作台
  const counter = new T.Mesh(
    new T.BoxGeometry(3.5, 0.9, 0.8),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.3, metalness: 0.15 }),
  )
  counter.position.set(0, -ROOM_H / 2 + 0.6, -2.5)
  g.add(counter)

  // 灶具
  const stove = new T.Mesh(
    new T.BoxGeometry(1.2, 0.05, 0.6),
    new T.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.5 }),
  )
  stove.position.set(0, -ROOM_H / 2 + 1.08, -2.5)
  g.add(stove)

  // 餐桌
  const table = new T.Mesh(
    new T.BoxGeometry(1.8, 0.1, 1.2),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.4, metalness: 0.05 }),
  )
  table.position.set(0, -ROOM_H / 2 + 0.9, 0.5)
  g.add(table)
}

function addDining(T: typeof THREE, g: THREE.Group, c: THREE.Color, dark: THREE.Color): void {
  // 餐桌
  const table = new T.Mesh(
    new T.BoxGeometry(2.4, 0.12, 1.4),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.35, metalness: 0.05 }),
  )
  table.position.set(0, -ROOM_H / 2 + 0.9, 0)
  g.add(table)

  // 四把椅子
  const chairPositions: [number, number, number][] = [
    [0, -ROOM_H / 2 + 0.5, -1.2],
    [0, -ROOM_H / 2 + 0.5, 1.2],
    [-1.5, -ROOM_H / 2 + 0.5, 0],
    [1.5, -ROOM_H / 2 + 0.5, 0],
  ]
  for (const pos of chairPositions) {
    const chair = new T.Mesh(
      new T.BoxGeometry(0.5, 0.5, 0.5),
      new T.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 }),
    )
    chair.position.set(...pos)
    g.add(chair)
  }

  // 吊灯
  const pendant = new T.Mesh(
    new T.SphereGeometry(0.3, 8, 8),
    new T.MeshStandardMaterial({ color: c, roughness: 0.2, emissive: c, emissiveIntensity: 0.5 }),
  )
  pendant.position.set(0, ROOM_H / 2 - 0.6, 0)
  g.add(pendant)
}

function addBathroom(T: typeof THREE, g: THREE.Group, _c: THREE.Color, accent: THREE.Color): void {
  // 浴缸
  const tub = new T.Mesh(
    new T.BoxGeometry(2, 0.7, 1.2),
    new T.MeshStandardMaterial({ color: accent, roughness: 0.2, metalness: 0.2 }),
  )
  tub.position.set(0, -ROOM_H / 2 + 0.5, -1.5)
  g.add(tub)

  // 洗手台
  const sink = new T.Mesh(
    new T.BoxGeometry(1.2, 0.15, 0.7),
    new T.MeshStandardMaterial({ color: accent, roughness: 0.2, metalness: 0.2 }),
  )
  sink.position.set(2, -ROOM_H / 2 + 1, -2)
  g.add(sink)

  // 镜子
  const mirror = new T.Mesh(
    new T.PlaneGeometry(1, 1.2),
    new T.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.1, metalness: 0.9 }),
  )
  mirror.position.set(2, -ROOM_H / 2 + 1.8, -2.35)
  g.add(mirror)
}

function addEntrance(T: typeof THREE, g: THREE.Group, c: THREE.Color, dark: THREE.Color): void {
  // 鞋柜
  const shoeRack = new T.Mesh(
    new T.BoxGeometry(2, 1.2, 0.5),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.05 }),
  )
  shoeRack.position.set(2, -ROOM_H / 2 + 0.7, -2.5)
  g.add(shoeRack)

  // 挂衣钩暗示
  const hook = new T.Mesh(
    new T.CylinderGeometry(0.05, 0.05, 0.3, 8),
    new T.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 }),
  )
  hook.position.set(2.5, ROOM_H / 2 - 0.5, -2.5)
  g.add(hook)

  // 地毯
  const rug = new T.Mesh(
    new T.PlaneGeometry(1.5, 2),
    new T.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0 }),
  )
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0, -ROOM_H / 2 + 0.01, 1)
  g.add(rug)
}

function addWardrobe(T: typeof THREE, g: THREE.Group, _c: THREE.Color, dark: THREE.Color): void {
  // 衣柜
  const wardrobe = new T.Mesh(
    new T.BoxGeometry(3, ROOM_H - 0.5, 0.8),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.4, metalness: 0.05 }),
  )
  wardrobe.position.set(0, 0, -2.5)
  g.add(wardrobe)

  // 穿衣镜
  const fullMirror = new T.Mesh(
    new T.PlaneGeometry(0.8, 2.5),
    new T.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.05, metalness: 0.95 }),
  )
  fullMirror.position.set(2.5, 0, -2.5)
  g.add(fullMirror)
}

function addCourtyard(T: typeof THREE, g: THREE.Group, _c: THREE.Color, dark: THREE.Color): void {
  // 去掉天花板效果——庭院是开放的
  // 石板路
  const path = new T.Mesh(
    new T.PlaneGeometry(1.5, 4),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.7, metalness: 0.05 }),
  )
  path.rotation.x = -Math.PI / 2
  path.position.set(0, -ROOM_H / 2 + 0.02, 1)
  g.add(path)

  // 树（简化）
  const trunk = new T.Mesh(
    new T.CylinderGeometry(0.15, 0.2, 2, 8),
    new T.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8, metalness: 0 }),
  )
  trunk.position.set(2, -ROOM_H / 2 + 1, 2)
  g.add(trunk)

  const leaves = new T.Mesh(
    new T.SphereGeometry(1, 8, 6),
    new T.MeshStandardMaterial({ color: 0x4a8c3f, roughness: 0.9, metalness: 0 }),
  )
  leaves.position.set(2, -ROOM_H / 2 + 2.5, 2)
  g.add(leaves)

  // 长椅
  const bench = new T.Mesh(
    new T.BoxGeometry(2, 0.2, 0.6),
    new T.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.05 }),
  )
  bench.position.set(-2, -ROOM_H / 2 + 0.7, 0)
  g.add(bench)
}

function addBalcony(T: typeof THREE, g: THREE.Group, _c: THREE.Color, accent: THREE.Color): void {
  // 栏杆
  for (let x = -ROOM_W / 2 + 0.5; x <= ROOM_W / 2 - 0.5; x += 0.8) {
    const rail = new T.Mesh(
      new T.CylinderGeometry(0.04, 0.04, 1.5, 8),
      new T.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.6 }),
    )
    rail.position.set(x, -ROOM_H / 2 + 0.7, ROOM_D / 2 - 0.1)
    g.add(rail)
  }

  // 休闲椅
  const chair = new T.Mesh(
    new T.BoxGeometry(0.8, 0.6, 0.8),
    new T.MeshStandardMaterial({ color: accent, roughness: 0.8, metalness: 0 }),
  )
  chair.position.set(2, -ROOM_H / 2 + 0.5, 1)
  g.add(chair)

  // 小圆桌
  const table = new T.Mesh(
    new T.CylinderGeometry(0.3, 0.3, 0.05, 12),
    new T.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 0.1 }),
  )
  table.position.set(2, -ROOM_H / 2 + 0.9, 1.5)
  g.add(table)
}

function addStorage(T: typeof THREE, g: THREE.Group, c: THREE.Color, dark: THREE.Color): void {
  // 货架
  for (let i = 0; i < 3; i++) {
    const shelf = new T.Mesh(
      new T.BoxGeometry(2.5, 0.1, 0.8),
      new T.MeshStandardMaterial({ color: dark, roughness: 0.5, metalness: 0.05 }),
    )
    shelf.position.set(0, -ROOM_H / 2 + 0.5 + i * 1.2, -2)
    g.add(shelf)
  }

  // 箱子
  for (let i = 0; i < 4; i++) {
    const box = new T.Mesh(
      new T.BoxGeometry(0.6, 0.5, 0.5),
      new T.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0 }),
    )
    box.position.set(-1.5 + (i % 2) * 1.5, -ROOM_H / 2 + 0.3, 0.5 + Math.floor(i / 2) * 0.8)
    g.add(box)
  }
}