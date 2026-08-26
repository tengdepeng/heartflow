import type { HomeReplicaManifest } from './useHomeReplica'

/**
 * 示例家 · 符合蓝图18「家包含 9 个房间」的演示清单。
 *
 * 用一张户型平面图（`plan`，平铺地面俯视）+ 一张墙面示意画（`image`）
 * 展示多格式导入能力，避免空壳。用户可一键加载后再清除、导入自己的
 * 户型图 / 3D 模型（支持 model / image / plan 多种格式）。
 */
export const SAMPLE_MANIFEST: HomeReplicaManifest = {
  version: 1,
  unit: 'm',
  camera: { position: [0, 11, 11], target: [0, 0, 0] },
  rooms: [
    {
      id: 'home-plan',
      name: '家的户型俯视图（蓝图9房间）',
      kind: 'plan',
      model: '/home-replica/home-plan.svg',
      position: [0, 0.01, 0],
      scale: 1,
    },
    {
      id: 'living-art',
      name: '客厅·蓝图示意画',
      kind: 'image',
      model: '/home-replica/home-plan.svg',
      position: [0, 1.8, -5],
      scale: [2.4, 1.8, 1],
    },
  ],
  note: '示例家：依据蓝图18「家包含玄关/衣帽间/厨房/餐厅/卧室/浴室/客厅/书房/庭院」生成。可清除后导入你自己的户型图或 3D 模型。',
}

/**
 * 真实网上户型图示例 · CC0 授权（Wikimedia Commons: Floor plan of Wanstead House）。
 *
 * 演示「用户自定义导入真实户型图」的 `plan` 格式（平铺地面俯视）能力——
 * 即把从网上取得的真实户型图作为单房间地面平面直接载入。
 *
 * 注意：这是具体历史建筑的真实户型，不精确对应蓝图18「家9房间」，仅作导入示例；
 * 用户可清除后用自己家的户型图 / 3D 扫描替换（支持 model / image / plan）。
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
