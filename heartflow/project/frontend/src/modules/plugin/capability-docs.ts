// ============================================================
// 插件能力 API 文档 · 开发指南结构化数据源
// 蓝图 L1916/L10612（插件可开关 / 经能力扩展对话分身）
//
// 设计要点：
//   1. 全部文档数据从真实常量派生（types / sandbox / capability-registry /
//      runtime-wiring），单一真相源，杜绝与代码脱节的硬编码文档。
//   2. 供开发指南区块渲染权限模型、沙箱模型、能力 API 引用、门控流程
//      与 manifest 规范，并实时呈现「当前可用能力」。
// ============================================================

import { PERMISSION_LABELS } from './types'
import type { PluginPermission, PluginManifest } from './types'
import { TIER_TO_SANDBOX, pluginPermissionsToSandbox } from './sandbox/runtime-wiring'
import {
  SANDBOX_TIER_LABELS,
  SANDBOX_TIER_DESCRIPTIONS,
  TIER_PERMISSIONS,
  TIER_RESOURCE_LIMITS,
} from './sandbox/types'
import type { SandboxTier, SandboxPermission, ResourceLimits } from './sandbox/types'
import { listAvailableCapabilities } from './capability-registry'
import type {
  AvailableCapability,
} from './capability-registry'

// ---- 文档数据结构 ----

/** 权限文档行 */
export interface PermissionDocRow {
  permission: PluginPermission
  label: string
  /** 授权该权限所需的最低沙箱等级 */
  requiredTier: SandboxTier
  /** 派生出的沙箱权限集合 */
  sandboxPermissions: SandboxPermission[]
}

/** 沙箱等级文档行 */
export interface SandboxTierDocRow {
  tier: SandboxTier
  label: string
  description: string
  permissions: SandboxPermission[]
  limits: ResourceLimits
}

/** 分级映射行（插件分级 → 沙箱等级） */
export interface TierMappingRow {
  pluginTier: string
  label: string
  sandboxTier: SandboxTier
  description: string
}

/** 能力 API 引用 */
export interface CapabilityApiDoc {
  name: string
  signature: string
  description: string
  returns?: string
}

/** 门控步骤 */
export interface RuntimeGateDoc {
  order: number
  /** 失败原因标识（CapabilityFailure / GuardedCallResult.reason） */
  failReason: string
  name: string
  description: string
}

/** Manifest 字段说明 */
export interface ManifestFieldDoc {
  field: string
  type: string
  required: boolean
  description: string
}

/** 完整文档聚合（一次性快照，供 UI computed 缓存并按需刷新） */
export interface CapabilityApiDocs {
  permissionModel: PermissionDocRow[]
  sandboxModel: SandboxTierDocRow[]
  tierMapping: TierMappingRow[]
  capabilityApis: CapabilityApiDoc[]
  runtimeGates: RuntimeGateDoc[]
  manifestSpec: ManifestFieldDoc[]
  /** 当前真正可用的能力（插件已启用 + 权限已授予） */
  liveCapabilities: AvailableCapability[]
}

// ---- 等级判定辅助 ----

/** 求出覆盖给定沙箱权限所需的最低等级（TIER_PERMISSIONS 为逐级累加） */
function requiredTier(perms: SandboxPermission[]): SandboxTier {
  const l2Only = TIER_PERMISSIONS.L2.filter(p => !TIER_PERMISSIONS.L1.includes(p))
  const l1Only = TIER_PERMISSIONS.L1.filter(p => !TIER_PERMISSIONS.L0.includes(p))
  if (perms.some(p => l2Only.includes(p))) return 'L2'
  if (perms.some(p => l1Only.includes(p))) return 'L1'
  return 'L0'
}

// ---- 权限模型 ----

const PERMISSION_ORDER: PluginPermission[] = [
  'read:current',
  'read:history',
  'read_sessions',
  'read_notes',
  'write:data',
  'export:data',
  'network',
  'filesystem',
]

function buildPermissionModel(): PermissionDocRow[] {
  return PERMISSION_ORDER.map(perm => {
    const sandboxPermissions = pluginPermissionsToSandbox([perm])
    return {
      permission: perm,
      label: PERMISSION_LABELS[perm] ?? perm,
      requiredTier: requiredTier(sandboxPermissions),
      sandboxPermissions,
    }
  })
}

// ---- 沙箱模型 ----

function buildSandboxModel(): SandboxTierDocRow[] {
  return (['L0', 'L1', 'L2'] as SandboxTier[]).map(tier => ({
    tier,
    label: SANDBOX_TIER_LABELS[tier],
    description: SANDBOX_TIER_DESCRIPTIONS[tier],
    permissions: TIER_PERMISSIONS[tier],
    limits: TIER_RESOURCE_LIMITS[tier],
  }))
}

// ---- 分级映射 ----

const TIER_LABELS: Record<string, string> = { official: '官方', community: '社区', experimental: '实验' }

function buildTierMapping(): TierMappingRow[] {
  return (Object.keys(TIER_TO_SANDBOX) as PluginManifest['meta']['tier'][]).map(pt => {
    const tier = TIER_TO_SANDBOX[pt]
    return {
      pluginTier: pt,
      label: TIER_LABELS[pt] ?? pt,
      sandboxTier: tier,
      description: `插件分级「${TIER_LABELS[pt] ?? pt}」→ ${SANDBOX_TIER_LABELS[tier]}`,
    }
  })
}

// ---- 能力 API 引用（与真实导出签名对齐） ----

function buildCapabilityApis(): CapabilityApiDoc[] {
  return [
    {
      name: 'registerPluginCapability',
      signature: 'registerPluginCapability(pluginId, capabilityId, impl)',
      description: '注册一个插件能力的实现，供 invokePluginCapability 门控调用。由插件模块初始化时调用，可覆盖。',
    },
    {
      name: 'invokePluginCapability',
      signature: 'invokePluginCapability<T>(pluginId, capabilityId, args?) => CapabilityInvocationResult<T>',
      description: '调用插件能力。完整门控后执行实现，返回 { ok, value|error, reason? }。',
      returns: 'CapabilityInvocationResult<T>',
    },
    {
      name: 'listAvailableCapabilities',
      signature: 'listAvailableCapabilities() => AvailableCapability[]',
      description: '列出当前真正可用的能力（插件已启用 + 权限已授予）。',
      returns: 'AvailableCapability[]',
    },
    {
      name: 'findCapabilityByKeyword',
      signature: 'findCapabilityByKeyword(text) => AvailableCapability | null',
      description: '从自然语言文本按关键词命中一个可用能力（最长关键词优先）。供对话分身路由。',
      returns: 'AvailableCapability | null',
    },
    {
      name: 'runGuarded',
      signature: 'runGuarded(pluginId, apiName, fn?) => GuardedCallResult',
      description: '守卫式能力调用：检查沙箱已创建且已激活，命中即在沙箱内记录 API 调用，再执行可选的函数体。',
      returns: 'GuardedCallResult',
    },
    {
      name: 'startGuard',
      signature: 'startGuard()',
      description: '启动运行时守卫（幂等）。启动后接管全部沙箱的资源检查与违规处理。',
    },
    {
      name: 'enable / disable',
      signature: 'enable(pluginId) => boolean · disable(pluginId) => boolean',
      description: '启用/禁用插件时同步激活/停用对应沙箱环境（保留审计记录）。',
      returns: 'boolean',
    },
    {
      name: 'install / uninstall',
      signature: 'install(manifest) => boolean · uninstall(pluginId) => boolean',
      description: '安装/卸载插件时同步创建/销毁沙箱环境。',
      returns: 'boolean',
    },
  ]
}

// ---- 门控流程 ----

function buildRuntimeGates(): RuntimeGateDoc[] {
  return [
    { order: 1, failReason: 'capability-not-found', name: '插件存在', description: '目标插件已注册，且 manifest 可读取。' },
    { order: 2, failReason: 'capability-not-found', name: '能力已声明', description: '插件 manifest.capabilities 中包含目标能力 id。' },
    { order: 3, failReason: 'plugin-disabled', name: '插件已启用', description: '插件启停开关为开启状态。' },
    { order: 4, failReason: 'permission-denied', name: '权限已授予', description: '用户已授予该能力所需的权限（可逐项开关节流）。' },
    { order: 5, failReason: 'impl-missing', name: '实现已注册', description: '能力的实现已通过 registerPluginCapability 注册。' },
    { order: 6, failReason: 'sandbox-not-created', name: '沙箱已创建', description: '守卫式调用前置：插件沙箱环境已随启用/安装创建。' },
    { order: 7, failReason: 'sandbox-inactive', name: '沙箱已激活', description: '守卫式调用前置：沙箱处于活跃状态，方可记录 API 调用。' },
  ]
}

// ---- Manifest 规范 ----

function buildManifestSpec(): ManifestFieldDoc[] {
  return [
    { field: 'meta', type: 'PluginMeta', required: true, description: '插件元数据：id / name / version / description / tier / author / category / icon，全部必填。' },
    { field: 'permissions', type: 'PluginPermission[]', required: true, description: '所需权限清单；UI 可对逐项开关生成 granted 子集。' },
    { field: 'sandbox', type: '{ isolateFS, isolateNetwork, isolateDOM }', required: true, description: '沙箱隔离声明：文件系统 / 网络 / DOM 是否隔离。' },
    { field: 'entry', type: 'string', required: true, description: '入口文件（相对路径或模块名）。' },
    { field: 'capabilities', type: 'PluginCapability[]', required: false, description: '对外提供的能力清单（id / label / description / keywords / permission），供房间经能力注册表调用。' },
    { field: 'contributes.rooms', type: 'PluginRoomContribution[]', required: false, description: '贡献点：运行时注册进房间图与路由的可序列化房间声明。' },
    { field: 'hooks', type: 'string[]', required: false, description: '注册的钩子列表。' },
  ]
}

// ---- 聚合 ----

/**
 * 聚合完整能力 API 文档（含实时可用能力）。
 * 每次调用重新计算 liveCapabilities，UI 侧用 computed 缓存并在状态变更后刷新。
 */
export function getCapabilityApiDocs(): CapabilityApiDocs {
  return {
    permissionModel: buildPermissionModel(),
    sandboxModel: buildSandboxModel(),
    tierMapping: buildTierMapping(),
    capabilityApis: buildCapabilityApis(),
    runtimeGates: buildRuntimeGates(),
    manifestSpec: buildManifestSpec(),
    liveCapabilities: listLiveCapabilities(),
  }
}

// ---- 实时能力（当时插件启停/授权状态的可视化） ----
function listLiveCapabilities(): AvailableCapability[] {
  return listAvailableCapabilities()
}