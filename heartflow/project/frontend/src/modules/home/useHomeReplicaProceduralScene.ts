// ============================================================
// 家 · 程序化 3D 场景工厂
// 使用程序化房间生成器构建完整家空间，支持场景切换与相机飞行动画。
// 动态导入 Three.js，不进主包。
// ============================================================

import type { HomeReplicaManifest } from './useHomeReplica'
import type * as THREE from 'three'
import { HOME_ROOMS } from './rooms'
import {
  buildRoomShell,
  addRoomFurniture,
  getRoomWorldPosition,
  getAllRoomIds,
} from './useHomeReplicaProcedural'

export interface ProceduralScene {
  /** 释放资源 */
  dispose(): void
  /** 聚焦到指定房间（带动画） */
  focusRoom(roomId: string): void
  /** 获取当前聚焦的房间 ID */
  getCurrentRoomId(): string | null
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
    if (!homeRoom) continue

    const worldPos = getRoomWorldPosition(roomId)
    const { group } = buildRoomShell(THREE, homeRoom, worldPos)
    addRoomFurniture(THREE, group, roomId, homeRoom.atmosphereColor)

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

    scene.add(group)
    roomGroups.set(roomId, group)
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
      disposables.forEach(d => d.dispose())
      renderer.dispose()
    },
    focusRoom,
    getCurrentRoomId: () => currentRoomId,
  }
}