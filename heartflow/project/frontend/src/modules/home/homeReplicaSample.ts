import type { HomeReplicaManifest } from './useHomeReplica'

/**
 * 示例家 · 完整内置家（11 个房间，与 HOME_ROOMS 一一对应）。
 *
 * 全部 id 均属内置家定义，场景工厂据此走「完整家」路径：
 * 渲染 11 个房间（外壳 + 氛围光），其中 5 个真实 3D 模型（`.glb`）覆盖程序化家具，
 * 其余 6 个走程序化家具兜底——与默认家（BUNDLED_REAL_MANIFEST）视觉一致、不再退化空场景。
 * 用户可一键加载后再清除、导入自己的户型图 / 3D 模型（支持 model / image / plan 多种格式）。
 */
export const SAMPLE_MANIFEST: HomeReplicaManifest = {
  version: 1,
  unit: 'm',
  camera: { position: [10, 16, 30], target: [10, 0, 5] },
  rooms: [
    { id: 'entrance', name: '玄关' },
    { id: 'study', name: '书房', kind: 'model', model: '/home-replica/study.glb' },
    { id: 'courtyard', name: '庭院' },
    { id: 'bedroom', name: '卧室', kind: 'model', model: '/home-replica/bedroom.glb' },
    { id: 'kitchen', name: '厨房', kind: 'model', model: '/home-replica/kitchen.glb' },
    { id: 'living-room', name: '客厅', kind: 'model', model: '/home-replica/living-room.glb' },
    { id: 'bathroom', name: '浴室' },
    { id: 'balcony', name: '阳台', kind: 'model', model: '/home-replica/balcony.glb' },
    { id: 'storage', name: '储藏' },
    { id: 'wardrobe', name: '衣帽间' },
    { id: 'dining-room', name: '餐厅' },
  ],
  note: '示例家：完整 11 房间（玄关/书房/庭院/卧室/厨房/客厅/浴室/阳台/储藏/衣帽间/餐厅），5 个真实 3D 模型覆盖 + 6 个程序化房间兜底。可清除后导入你自己的户型图或 3D 模型（支持 model / image / plan）。',
}

/**
 * 真实网上户型图示例 · CC0 授权（Wikimedia Commons: Floor plan of Wanstead House）。
 *
 * 演示「用户自定义导入真实户型图」的 `plan` 格式（平铺地面俯视）能力——
 * 即把从网上取得的真实户型图作为单房间地面平面直接载入。
 *
 * 注意：该 id（`real-floor-plan`）不在内置家定义中，场景工厂据此走「自定义导入」分支，
 * 仅渲染清单列出的导入资产（不叠加 11 个内置房间），保持导入示例的隔离语义。
 */
export const REAL_FLOOR_PLAN_SAMPLE: HomeReplicaManifest = {
  version: 1,
  unit: 'm',
  camera: { position: [0, 12, 12], target: [0, 0, 0] },
  rooms: [
    {
      id: 'real-floor-plan',
      name: '真实户型图（网上 CC0 · Wanstead House）',
      kind: 'plan',
      model: '/home-replica/wanstead-floor-plan.png',
      position: [0, 0.01, 0],
      scale: 1,
    },
  ],
  note: '示例：从网上取得的 CC0 授权真实户型图，作为 plan 格式平铺地面导入。可清除后用自己家的户型图 / 3D 扫描替换（支持 model / image / plan）。',
}
