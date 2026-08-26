// ============================================================
// 家 · 1:1 3D 复刻（资产驱动，Three.js + GLTFLoader，动态导入）
// ------------------------------------------------------------
// 设计约束（对齐并行 M3 一期纪律 + 本地私有）：
// 1. three 与 GLTFLoader 必须「动态 import」，不进主包；2D 首屏零包体增量。
// 2. 仅浏览器 + 有 WebGL 时真正渲染；测试/jsdom 无 WebGL → 返回 null 降级，
//    不会触发 three 加载、不会抛错。
// 3. 所有资产路径来自本地 manifest（hf:home_replica_assets），仅本机引用。
// 4. 单个模型加载失败不阻断其余房间；真实资产到位后由用户验证。
// ============================================================

import type { HomeReplicaManifest, HomeReplicaRoomAsset } from './useHomeReplica'

export interface HomeReplicaScene {
  dispose(): void
}

export interface ReplicaSceneOptions {
  /** DPR 上限（由 useAdaptiveQuality 注入，M2 协同） */
  dprCap?: number
}

function getWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | WebGL2RenderingContext | null {
  try {
    return (
      canvas.getContext('webgl2') ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null)
    )
  } catch {
    return null
  }
}

/**
 * 按 manifest 懒加载 Three.js + GLTFLoader 复刻真实家空间。
 * 返回 null 表示当前环境不支持 WebGL（调用方应降级为清单视图）。
 */
export async function createHomeReplicaScene(
  canvas: HTMLCanvasElement,
  manifest: HomeReplicaManifest,
  opts: ReplicaSceneOptions = {},
): Promise<HomeReplicaScene | null> {
  if (!getWebGL(canvas)) return null

  const THREE = await import('three')

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dprCap ?? 2))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000)
  if (manifest.camera) {
    camera.position.set(...manifest.camera.position)
    camera.lookAt(new THREE.Vector3(...manifest.camera.target))
  } else {
    camera.position.set(6, 4, 9)
    camera.lookAt(0, 1, 0)
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 1.0)
  key.position.set(5, 10, 7)
  scene.add(key)

  const disposables: Array<{ dispose(): void }> = []
  let disposed = false

  // 3D 模型：动态加载 GLTFLoader（仅在确有 model 资产时，避免纯图片清单也拉 GLTF 分块）
  async function loadModel(room: HomeReplicaRoomAsset): Promise<void> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(room.model)
    const root = gltf.scene
    if (room.position) root.position.set(...room.position)
    if (room.rotation) root.rotation.set(...room.rotation)
    if (room.scale !== undefined) {
      if (typeof room.scale === 'number') root.scale.setScalar(room.scale)
      else root.scale.set(...room.scale)
    }
    scene.add(root)
    root.traverse((o) => {
      const mesh = o as import('three').Mesh
      if (mesh.isMesh && mesh.geometry) disposables.push(mesh.geometry)
    })
  }

  // 图片 / 户型平面图：TextureLoader 生成平面贴图
  async function loadTexturePlane(
    room: HomeReplicaRoomAsset,
    kind: 'image' | 'plan',
  ): Promise<void> {
    const tex = await new THREE.TextureLoader().loadAsync(room.model)
    tex.colorSpace = THREE.SRGBColorSpace
    const isPlan = kind === 'plan'
    let w = isPlan ? 10 : 2
    let h = isPlan ? 10 : 1.5
    if (typeof room.scale === 'number') {
      w *= room.scale
      h *= room.scale
    } else if (Array.isArray(room.scale)) {
      w *= room.scale[0]
      h *= room.scale[1] ?? room.scale[0]
    }
    const geo = new THREE.PlaneGeometry(w, h)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: !isPlan,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    if (isPlan) mesh.rotation.x = -Math.PI / 2 // 平铺地面俯视
    if (room.position) mesh.position.set(...room.position)
    if (room.rotation) mesh.rotation.set(...room.rotation)
    scene.add(mesh)
    disposables.push(geo, tex, mat)
  }

  async function loadRoom(room: HomeReplicaRoomAsset): Promise<void> {
    const kind = room.kind ?? 'model'
    if (kind === 'model') await loadModel(room)
    else await loadTexturePlane(room, kind)
  }

  // 逐房间独立容错：单房间资产缺失/损坏只跳过该房间并告警，其余照常渲染
  await Promise.all(
    manifest.rooms.map((room) =>
      loadRoom(room).catch((e) => {
        console.warn(`[home-replica] 房间「${room.name}」资产加载失败，已跳过：${room.model}`, e)
      }),
    ),
  )

  function resize(): void {
    const w = canvas.clientWidth || canvas.width
    const h = canvas.clientHeight || canvas.height
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  resize()
  window.addEventListener('resize', resize)

  return {
    dispose(): void {
      if (disposed) return
      disposed = true
      window.removeEventListener('resize', resize)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
