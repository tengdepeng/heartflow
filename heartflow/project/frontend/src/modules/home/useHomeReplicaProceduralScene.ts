// ============================================================
// 家 · 程序化 3D 场景工厂
// 使用程序化房间生成器构建完整家空间，支持场景切换与相机飞行动画。
// 动态导入 Three.js，不进主包。
// ============================================================

import type { HomeReplicaManifest, HomeReplicaRoomAsset } from './useHomeReplica'
import type * as THREE from 'three'
import { HOME_ROOMS } from './rooms'
import {
  buildRoomShell,
  addRoomFurniture,
  getRoomWorldPosition,
  getAllRoomIds,
  buildCorridor,
  ROOM_CONNECTIONS,
  ROOM_W,
  ROOM_D,
  ROOM_H,
  ROOM_GAP,
  FLOOR_Y,
} from './useHomeReplicaProcedural'

export interface ProceduralScene {
  /** 释放资源 */
  dispose(): void
  /** 聚焦到指定房间（带动画） */
  focusRoom(roomId: string): void
  /** 获取当前聚焦的房间 ID */
  getCurrentRoomId(): string | null
  /** 进入第一人称漫游（锁定指针 + 房间内自由移动） */
  enterWalkMode(): void
  /** 退出漫游回到聚焦模式 */
  exitWalkMode(): void
  /** 设置漫游时当前房间变化回调 */
  setOnRoomChange(cb: (roomId: string) => void): void
  /** 是否处于漫游模式 */
  isWalkMode(): boolean
}

type THREE_NS = typeof import('three')

/** 收集网格的几何/材质/贴图到释放列表 */
function collectDisposable(o: THREE.Object3D, disposables: Array<{ dispose(): void }>): void {
  const mesh = o as THREE.Mesh
  if (mesh.isMesh && mesh.geometry) disposables.push(mesh.geometry)
  const mat = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material
  if (mesh.isMesh && mat) {
    if (Array.isArray(mat)) mat.forEach(m => disposables.push(m))
    else disposables.push(mat)
    const mt = mat as unknown as Record<string, THREE.Texture | undefined>
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) {
      const tex = mt[key]
      if (tex) disposables.push(tex)
    }
  }
}

/**
 * 消费单个房间的 manifest 资产：
 * - kind 'model'：动态加载 .glb/.gltf 3D 模型，自动适配房间尺寸并贴地；失败回退程序化家具
 * - kind 'plan' ：户型平面图平铺地面（俯视）
 * - kind 'image'：墙面画挂在背墙
 */
async function addRoomMedia(
  THREE: THREE_NS,
  group: THREE.Group,
  asset: HomeReplicaRoomAsset | undefined,
  worldPos: [number, number, number],
  roomId: string,
  atmosphereColor: string,
  disposables: Array<{ dispose(): void }>,
): Promise<void> {
  if (!asset || !asset.model) return
  const kind = asset.kind ?? 'model'
  const [wx, wy, wz] = worldPos
  const floorY = wy + FLOOR_Y

  if (kind === 'model') {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const gltf = await new GLTFLoader().loadAsync(asset.model)
      const model = gltf.scene
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.castShadow = true
          m.receiveShadow = true
        }
      })

      // 自动适配房间尺寸（覆盖 cm 级大模型），用户显式 scale 优先
      const box = new THREE.Box3().setFromObject(model)
      const size = new THREE.Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const target = ROOM_W * 0.85
      const autoScale = maxDim > 0 && maxDim > target ? target / maxDim : 1
      const s = typeof asset.scale === 'number'
        ? asset.scale
        : Array.isArray(asset.scale)
          ? 1
          : autoScale
      model.scale.setScalar(s)

      // 贴地对齐：底部落到地板，水平居中于房间；position 覆盖默认
      const box2 = new THREE.Box3().setFromObject(model)
      const center2 = new THREE.Vector3()
      box2.getCenter(center2)
      const px = asset.position ? asset.position[0] : wx - center2.x
      const py = asset.position ? asset.position[1] : floorY - box2.min.y
      const pz = asset.position ? asset.position[2] : wz - center2.z
      model.position.set(px, py, pz)
      if (asset.rotation) model.rotation.set(asset.rotation[0], asset.rotation[1], asset.rotation[2])

      model.traverse((o) => collectDisposable(o, disposables))
      group.add(model)
    } catch (e) {
      console.warn('[home-replica] 3D 模型加载失败，回退程序化家具：', asset.model, e)
      addRoomFurniture(THREE, group, roomId, atmosphereColor)
    }
    return
  }

  if (kind === 'plan') {
    try {
      const tex = await new THREE.TextureLoader().loadAsync(asset.model)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      const planMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 })
      const planGeo = new THREE.PlaneGeometry(ROOM_W * 0.96, ROOM_D * 0.96)
      const planMesh = new THREE.Mesh(planGeo, planMat)
      planMesh.rotation.x = -Math.PI / 2
      const px = asset.position ? asset.position[0] : wx
      const py = asset.position ? (asset.position[1] ?? 0) : floorY + 0.03
      const pz = asset.position ? asset.position[2] : wz
      planMesh.position.set(px, py, pz)
      group.add(planMesh)
      disposables.push(planGeo, planMat, tex)
    } catch (e) {
      console.warn('[home-replica] 户型图加载失败：', asset.model, e)
    }
    return
  }

  if (kind === 'image') {
    try {
      const tex = await new THREE.TextureLoader().loadAsync(asset.model)
      tex.colorSpace = THREE.SRGBColorSpace
      const bx = asset.position ? asset.position[0] : wx
      const by = asset.position ? asset.position[1] : floorY + 1.7
      const bz = asset.position ? asset.position[2] : wz - ROOM_D / 2 + 0.1
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.6 })
      const frameGeo = new THREE.PlaneGeometry(2.6, 1.8)
      const frameMesh = new THREE.Mesh(frameGeo, frameMat)
      frameMesh.position.set(bx, by, bz)
      const imgMat = new THREE.MeshBasicMaterial({ map: tex })
      const imgGeo = new THREE.PlaneGeometry(2.4, 1.6)
      const imgMesh = new THREE.Mesh(imgGeo, imgMat)
      imgMesh.position.set(bx, by, bz + 0.02)
      group.add(frameMesh, imgMesh)
      disposables.push(frameGeo, frameMat, imgGeo, imgMat, tex)
    } catch (e) {
      console.warn('[home-replica] 墙面画加载失败：', asset.model, e)
    }
    return
  }
}

export interface ProceduralSceneOptions {
  dprCap?: number
  /** 初始聚焦的房间 ID */
  initialRoomId?: string
  /** 相机飞行动画完成回调 */
  onTransitionEnd?: () => void
}

/**
 * 创建程序化家 3D 场景。
 * 返回 null 表示当前环境不支持 WebGL。
 */
export async function createProceduralHomeScene(
  canvas: HTMLCanvasElement,
  manifest: HomeReplicaManifest | null,
  opts: ProceduralSceneOptions = {},
): Promise<ProceduralScene | null> {
  // WebGL 检测
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
  try {
    gl = canvas.getContext('webgl2') || (canvas.getContext('webgl') as WebGLRenderingContext | null)
  } catch { gl = null }
  if (!gl) return null

  const THREE = await import('three')

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dprCap ?? 2))
  renderer.shadowMap.enabled = true

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500)

  // 灯光
  scene.add(new THREE.AmbientLight(0xffffff, 0.32))
  const sun = new THREE.DirectionalLight(0xffffff, 0.9)
  sun.position.set(20, 30, 20)
  sun.castShadow = true
  scene.add(sun)

  // 地面大平面
  const groundGeo = new THREE.PlaneGeometry(200, 200)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1510,
    roughness: 0.95,
    metalness: 0,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -5
  scene.add(ground)

  const disposables: Array<{ dispose(): void }> = [groundGeo, groundMat]
  let disposed = false
  let currentRoomId: string | null = null

  // 构建所有房间
  const roomIds = manifest?.rooms?.length
    ? manifest.rooms.map(r => r.id)
    : getAllRoomIds()

  const roomGroups = new Map<string, THREE.Group>()

  for (const roomId of roomIds) {
    const homeRoom = HOME_ROOMS.find(r => r.id === roomId)
    const asset = manifest?.rooms.find(r => r.id === roomId)
    const worldPos = getRoomWorldPosition(roomId)

    // 属于内置家定义的房间：建外壳 + 家具 + 氛围光；导入的自定义资产（id 不在 HOME_ROOMS）仅渲染资产本体
    let group: THREE.Group
    if (homeRoom) {
      const shell = buildRoomShell(THREE, homeRoom, worldPos)
      group = shell.group
      // 房间资产消费：model 用真实 3D 模型取代程序化家具；image/plan 保留家具并叠加图层
      if (asset?.kind !== 'model') {
        addRoomFurniture(THREE, group, roomId, homeRoom.atmosphereColor)
      }

      // 房间氛围点光源：用房间主色着色，仅照亮本房间，增强家的温暖感与辨识度
      const ambColor = new THREE.Color(homeRoom.atmosphereColor)
      const roomLight = new THREE.PointLight(ambColor, 0.85, 18, 2)
      roomLight.position.set(worldPos[0], worldPos[1] + 2.4, worldPos[2])
      scene.add(roomLight)

      group.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh && mesh.geometry) disposables.push(mesh.geometry)
        if (mesh.isMesh && mesh.material) {
          const mat = mesh.material as THREE.Material
          if (Array.isArray(mat)) mat.forEach(m => disposables.push(m))
          else disposables.push(mat)
        }
      })
    } else {
      group = new THREE.Group()
    }
    group.name = `room:${roomId}`

    scene.add(group)
    roomGroups.set(roomId, group)

    // 异步加载 manifest 媒体（model / image / plan），不阻塞场景返回
    await addRoomMedia(THREE, group, asset, worldPos, roomId, homeRoom?.atmosphereColor ?? '#8a7d6b', disposables)
  }

  // ---- 连廊与漫游可行走盒 ----
  const roomBoxes: THREE.Box3[] = []
  const walkBoxes: THREE.Box3[] = []

  const seen = new Set<string>()
  for (const a of getAllRoomIds()) {
    for (const b of ROOM_CONNECTIONS[a] ?? []) {
      const key = [a, b].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)

      const pa = getRoomWorldPosition(a)
      const pb = getRoomWorldPosition(b)
      const corridor = buildCorridor(THREE, a, b)
      scene.add(corridor)
      corridor.traverse(o => collectDisposable(o, disposables))

      const mid: [number, number, number] = [
        (pa[0] + pb[0]) / 2,
        (pa[1] + pb[1]) / 2,
        (pa[2] + pb[2]) / 2,
      ]
      const horizontal = Math.abs(pb[0] - pa[0]) > Math.abs(pb[2] - pa[2])
      const halfLen = ROOM_GAP / 2 + 0.6
      const halfWid = 1.0
      if (horizontal) {
        walkBoxes.push(new THREE.Box3(
          new THREE.Vector3(mid[0] - halfLen, FLOOR_Y, mid[2] - halfWid),
          new THREE.Vector3(mid[0] + halfLen, FLOOR_Y + ROOM_H, mid[2] + halfWid),
        ))
      } else {
        walkBoxes.push(new THREE.Box3(
          new THREE.Vector3(mid[0] - halfWid, FLOOR_Y, mid[2] - halfLen),
          new THREE.Vector3(mid[0] + halfWid, FLOOR_Y + ROOM_H, mid[2] + halfLen),
        ))
      }
    }
  }

  // 房间内部可行走盒（供碰撞 + 房间检测）
  for (const id of getAllRoomIds()) {
    const p = getRoomWorldPosition(id)
    const box = new THREE.Box3(
      new THREE.Vector3(p[0] - ROOM_W / 2 + 0.3, FLOOR_Y, p[2] - ROOM_D / 2 + 0.3),
      new THREE.Vector3(p[0] + ROOM_W / 2 - 0.3, FLOOR_Y + ROOM_H, p[2] + ROOM_D / 2 - 0.3),
    )
    roomBoxes.push(box)
    walkBoxes.push(box)
  }

  // 相机动画状态
  let animTarget: THREE.Vector3 | null = null
  let animStart: THREE.Vector3 | null = null
  let animLookTarget: THREE.Vector3 | null = null
  let animStartLook: THREE.Vector3 | null = null
  let animProgress = 0
  const animDuration = 800 // ms

  const roomIdsList = roomIds

  /** 获取房间的相机目标位置 */
  function getRoomCameraTarget(roomId: string): { pos: THREE.Vector3; lookAt: THREE.Vector3 } {
    const worldPos = getRoomWorldPosition(roomId)
    // 相机在房间前方偏上
    const pos = new THREE.Vector3(
      worldPos[0],
      worldPos[1] + 3,
      worldPos[2] + 7,
    )
    const lookAt = new THREE.Vector3(
      worldPos[0],
      worldPos[1] + 0.5,
      worldPos[2],
    )
    return { pos, lookAt }
  }

  function focusRoom(roomId: string): void {
    if (!roomGroups.has(roomId)) return
    if (roomId === currentRoomId) return

    currentRoomId = roomId
    const { pos, lookAt } = getRoomCameraTarget(roomId)

    animStart = camera.position.clone()
    animStartLook = new THREE.Vector3()
    camera.getWorldDirection(animStartLook)
    // 用当前 lookAt 近似
    const curLookAt = camera.position.clone().add(
      animStartLook.clone().multiplyScalar(5),
    )

    animTarget = pos.clone()
    animLookTarget = lookAt.clone()
    animStartLook = curLookAt
    animProgress = 0
  }

  function resize(): void {
    const w = canvas.clientWidth || canvas.width
    const h = canvas.clientHeight || canvas.height
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  // 初始相机位置
  const initialRoom = opts.initialRoomId ?? roomIdsList[0]
  const { pos: initPos, lookAt: initLookAt } = getRoomCameraTarget(initialRoom)
  camera.position.copy(initPos)
  camera.lookAt(initLookAt)
  currentRoomId = initialRoom
  resize()

  // ---- 第一人称漫游 ----
  let walkMode = false
  let plControls: any = null
  let plReady = false
  const walkKeys = { f: false, b: false, l: false, r: false }
  let onRoomChangeCb: ((id: string) => void) | null = null
  const WALK_HEIGHT = FLOOR_Y + 1.6
  const WALK_SPEED = 3.2

  function insideWalkBoxes(p: THREE.Vector3): boolean {
    for (const b of walkBoxes) if (b.containsPoint(p)) return true
    return false
  }

  function ensureWalkControls(): void {
    if (plReady) return
    plReady = true
    import('three/examples/jsm/controls/PointerLockControls.js').then((mod: any) => {
      const { PointerLockControls } = mod
      plControls = new PointerLockControls(camera, canvas)
      plControls.addEventListener('lock', () => { walkMode = true })
      plControls.addEventListener('unlock', () => { walkMode = false })
    }).catch((e: unknown) => {
      console.warn('[home-replica] PointerLockControls 加载失败：', e)
    })
  }

  function onWalkKey(e: KeyboardEvent, down: boolean): void {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': walkKeys.f = down; break
      case 'KeyS': case 'ArrowDown': walkKeys.b = down; break
      case 'KeyA': case 'ArrowLeft': walkKeys.l = down; break
      case 'KeyD': case 'ArrowRight': walkKeys.r = down; break
    }
  }

  const onWalkKeyDown = (e: KeyboardEvent) => onWalkKey(e, true)
  const onWalkKeyUp = (e: KeyboardEvent) => onWalkKey(e, false)
  window.addEventListener('keydown', onWalkKeyDown)
  window.addEventListener('keyup', onWalkKeyUp)

  function updateWalk(dt: number): void {
    const dtSec = Math.min(dt, 50) / 1000
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    if (dir.lengthSq() < 1e-6) return
    dir.normalize()
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
    const move = new THREE.Vector3()
    if (walkKeys.f) move.add(dir)
    if (walkKeys.b) move.sub(dir)
    if (walkKeys.r) move.add(right)
    if (walkKeys.l) move.sub(right)
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(WALK_SPEED * dtSec)
      const nx = camera.position.clone(); nx.x += move.x
      if (insideWalkBoxes(nx)) camera.position.x = nx.x
      const nz = camera.position.clone(); nz.z += move.z
      if (insideWalkBoxes(nz)) camera.position.z = nz.z
    }
    const ids = getAllRoomIds()
    for (let i = 0; i < roomBoxes.length; i++) {
      if (roomBoxes[i].containsPoint(camera.position)) {
        const id = ids[i]
        if (id !== currentRoomId) {
          currentRoomId = id
          onRoomChangeCb?.(id)
        }
        break
      }
    }
  }

  function enterWalkMode(): void {
    ensureWalkControls()
    const id = currentRoomId ?? getAllRoomIds()[0]
    const p = getRoomWorldPosition(id)
    camera.position.set(p[0], WALK_HEIGHT, p[2])
    camera.lookAt(p[0], WALK_HEIGHT, p[2] - 1)
    walkMode = true
    try { plControls?.lock() } catch { /* headless / 非用户手势下忽略 */ }
  }

  function exitWalkMode(): void {
    walkMode = false
    plControls?.unlock()
    const id = currentRoomId ?? getAllRoomIds()[0]
    focusRoom(id)
  }

  function setOnRoomChange(cb: (id: string) => void): void {
    onRoomChangeCb = cb
  }

  function isWalkMode(): boolean {
    return walkMode
  }

  // 渲染循环
  let lastTime = performance.now()
  let animFrameId = 0

  function animate(): void {
    animFrameId = requestAnimationFrame(animate)
    const now = performance.now()
    const dt = now - lastTime
    lastTime = now

    // 相机动画
    if (animTarget && animStart && animLookTarget && animStartLook) {
      animProgress += dt / animDuration
      if (animProgress >= 1) {
        camera.position.copy(animTarget)
        camera.lookAt(animLookTarget)
        animTarget = null
        animStart = null
        animLookTarget = null
        animStartLook = null
        opts.onTransitionEnd?.()
      } else {
        // easeInOutCubic
        const t = animProgress < 0.5
          ? 4 * animProgress * animProgress * animProgress
          : 1 - Math.pow(-2 * animProgress + 2, 3) / 2
        camera.position.lerpVectors(animStart, animTarget, t)
        const lookCur = new THREE.Vector3().lerpVectors(animStartLook, animLookTarget, t)
        camera.lookAt(lookCur)
      }
    }

    if (walkMode) updateWalk(dt)

    renderer.render(scene, camera)
  }

  animate()
  window.addEventListener('resize', resize)

  return {
    dispose(): void {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onWalkKeyDown)
      window.removeEventListener('keyup', onWalkKeyUp)
      disposables.forEach(d => d.dispose())
      renderer.dispose()
    },
    focusRoom,
    getCurrentRoomId: () => currentRoomId,
    enterWalkMode,
    exitWalkMode,
    setOnRoomChange,
    isWalkMode,
  }
}