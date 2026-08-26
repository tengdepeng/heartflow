import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

/** 房间资产类型（用户自定义导入时可多选格式） */
export type HomeReplicaAssetKind = 'model' | 'image' | 'plan'

/**
 * 单个房间的资产（支持多种格式）：
 * - `model`：3D 模型 .glb / .gltf / .obj（三维复刻）
 * - `image`：图片 .jpg / .png / .webp（墙面画、海报、照片）
 * - `plan` ：户型平面图 .svg / .jpg / .png（平铺地面，俯视）
 */
export interface HomeReplicaRoomAsset {
  /** 房间 id（与 HOME_ROOMS 对齐更佳，但不强制） */
  id: string
  /** 展示名 */
  name: string
  /**
   * 资产路径（本地 public/ 路径或绝对路径，仅本机引用，绝不外传）。
   * 具体格式由 `kind` 决定。
   */
  model: string
  /** 资产类型；缺省按 `'model'` 处理（向后兼容旧清单） */
  kind?: HomeReplicaAssetKind
  /** 场景坐标 [x, y, z]（米，1:1 真实比例） */
  position?: [number, number, number]
  /** 欧拉旋转 [x, y, z]（弧度） */
  rotation?: [number, number, number]
  /** 缩放（统一值或 [x, y, z]） */
  scale?: number | [number, number, number]
  /** 可选缩略图（base64 或本地路径） */
  thumbnail?: string
}

/** 家 1:1 3D 复刻 · 资产清单（manifest） */
export interface HomeReplicaManifest {
  /** 清单版本，固定为 1 */
  version: 1
  /** 场景单位：米（1:1 真实比例） */
  unit: 'm'
  /** 默认相机位姿（可选） */
  camera?: {
    position: [number, number, number]
    target: [number, number, number]
  }
  /** 房间资产清单（每个房间一个资产，可混合 model / image / plan） */
  rooms: HomeReplicaRoomAsset[]
  /** 用户可读备注 */
  note?: string
}

const REPLICA_ASSETS_KEY = 'hf:home_replica_assets'

const ASSET_KINDS: HomeReplicaAssetKind[] = ['model', 'image', 'plan']

function isRoomAsset(v: unknown): v is HomeReplicaRoomAsset {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.model !== 'string') return false
  if (r.kind !== undefined && !ASSET_KINDS.includes(r.kind as HomeReplicaAssetKind)) return false
  return true
}

function isManifest(v: unknown): v is HomeReplicaManifest {
  if (!v || typeof v !== 'object') return false
  const m = v as Record<string, unknown>
  return (
    m.version === 1 &&
    m.unit === 'm' &&
    Array.isArray(m.rooms) &&
    m.rooms.length > 0 &&
    m.rooms.every(isRoomAsset)
  )
}

/**
 * 读取用户清单；若用户尚未设置（KV 为空 / 非法 / 损坏），兜底返回随包发布的
 * 真实家清单，使 M3 复刻在打开时即自动出现（资产驱动、本地私有，守蓝图第1条）。
 * 用户的自定义清单始终优先于兜底默认。
 */
function readManifest(): HomeReplicaManifest | null {
  const raw = storage.getKV(REPLICA_ASSETS_KEY, null)
  if (isManifest(raw)) return structuredClone(raw as HomeReplicaManifest)
  // 返回随包真实家清单的深拷贝：BUNDLED_REAL_MANIFEST 是模块级共享常量，
  // 若直接返回引用，任一消费方（视图/测试）对 manifest.value.rooms 的改动都会污染全局常量，
  // 在跨测试/跨组件共享模块实例时拖累后续所有兜底读取（hasManifest 误判为 false）。
  // 深拷贝切断别名，既守住契约又消除测试隔离串味（守卫整体转绿）。
  return structuredClone(BUNDLED_REAL_MANIFEST)
}

/**
 * 随包发布的「真实家」复刻清单（M3 · 加载接入默认源）。
 *
 * 与静态资源 `public/home-replica/manifest.json` 内容保持一致：服务器从该路径
 * 提供同一份 JSON，本常量作为前端默认兜底——当用户尚未在本地 KV
 * `hf:home_replica_assets` 写入自定义清单时，自动复刻本机已随包发布的房间 .glb，
 * 使首页真实家空间在打开时即出现（资产驱动、本地私有，守蓝图第1条）。
 *
 * 注意：当前 .glb 为占位几何（程序化简版房间），属「资产驱动」管道已打通；
 * 拿到真实家 3D 扫描 / 模型后，直接替换 `public/home-replica/` 下同名 .glb 即可，
 * 无需改本清单（渲染时按 `model` 路径实时拉取）。房间增删 / 路径变更需同步两处。
 */
const BUNDLED_REAL_MANIFEST: HomeReplicaManifest = {
  version: 1,
  unit: 'm',
  camera: { position: [10, 16, 30], target: [10, 0, 5] },
  rooms: [
    {
      id: 'living-room',
      name: '客厅',
      kind: 'model',
      model: '/home-replica/living-room.glb',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    },
    {
      id: 'bedroom',
      name: '卧室',
      kind: 'model',
      model: '/home-replica/bedroom.glb',
      position: [10, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    },
    {
      id: 'kitchen',
      name: '厨房',
      kind: 'model',
      model: '/home-replica/kitchen.glb',
      position: [20, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    },
    {
      id: 'study',
      name: '书房',
      kind: 'model',
      model: '/home-replica/study.glb',
      position: [0, 0, 10],
      rotation: [0, 0, 0],
      scale: 1,
    },
    {
      id: 'balcony',
      name: '阳台',
      kind: 'model',
      model: '/home-replica/balcony.glb',
      position: [10, 0, 10],
      rotation: [0, 0, 0],
      scale: 1,
    },
  ],
  note: '随包发布的真实家复刻（占位几何，.glb 在 public/home-replica/ 下按同名替换即升级为真实扫描）。',
}

/**
 * 家 1:1 3D 复刻 · 资产清单接口
 *
 * 从本地 KV `hf:home_replica_assets` 读取「资产清单」（manifest），本模块只负责
 * 契约与读写，不含 3D 逻辑。视图层据此 lazy 加载 Three.js，按 `kind` 路由加载器：
 * - `model` → GLTFLoader（3D 模型）
 * - `image` → TextureLoader（墙面画 / 海报）
 * - `plan`  → TextureLoader（户型平面图，平铺地面）
 * 所有资产仅本机引用，符合「本地私有」硬约束（蓝图第1条）。
 */
export function useHomeReplica() {
  const manifest = ref<HomeReplicaManifest | null>(readManifest())

  /** 重新从 KV 读取并校验；无用户清单时兜底随包真实家清单 */
  function load(): HomeReplicaManifest | null {
    manifest.value = readManifest()
    return manifest.value
  }

  /** 写入清单；非法返回 false 且不写入 */
  function save(m: HomeReplicaManifest): boolean {
    if (!isManifest(m)) return false
    storage.setKV(REPLICA_ASSETS_KEY, m)
    manifest.value = m
    return true
  }

  /** 清除清单（置 null） */
  function reset(): void {
    storage.setKV(REPLICA_ASSETS_KEY, null)
    manifest.value = null
  }

  const hasManifest = computed(
    () => !!manifest.value && manifest.value.rooms.length > 0,
  )
  const roomCount = computed(() => manifest.value?.rooms.length ?? 0)
  const rooms = computed(() => manifest.value?.rooms ?? [])

  return { manifest, hasManifest, roomCount, rooms, load, save, reset }
}
