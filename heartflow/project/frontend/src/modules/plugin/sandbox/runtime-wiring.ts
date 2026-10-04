// ============================================================
// 插件沙箱 · 运行时接线层
// 蓝图定义：
//   沙箱隔离 — 将沙箱引擎接入插件运行时生命周期
//   1. 插件分级(plugin tier) → 沙箱等级(sandbox tier)：official→L2 / community→L1 / experimental→L0
//   2. 启用/禁用/安装/卸载插件时同步沙箱环境
//   3. 能力调用经守卫记录 API 调用与审计，权限不足时拒之门外
//   4. 守卫随运行时启动（启动即接管全部沙箱资源检查）
//   单一数据源：深度依赖 modules/plugin/sandbox 的 isolator + guard 单例
// ============================================================

import type {
  SandboxTier,
  SandboxPermission,
  SandboxEnvironment,
  ResourceUsage,
} from './types'
import { SANDBOX_TIER_DESCRIPTIONS } from './types'
import { sandboxIsolator } from './isolator'
import { runtimeGuard } from './guard'
import type { PluginRuntime, PluginManifest, PluginPermission } from '../types'

// ---- 映射：插件分级 → 推荐沙箱等级 ----

/** 插件分级 → 推荐沙箱等级 */
export const TIER_TO_SANDBOX: Record<string, SandboxTier> = {
  official: 'L2',
  community: 'L1',
  experimental: 'L0',
}

/** 推荐沙箱等级（未定义分级默认社区 L1） */
export function recommendSandboxTier(pluginTier: string): SandboxTier {
  return TIER_TO_SANDBOX[pluginTier] ?? 'L1'
}

// ---- 映射：插件权限 → 沙箱权限 ----

/** 插件权限 → 沙箱权限（依据蓝图三级权限语义推导） */
const PLUGIN_PERMISSION_TO_SANDBOX: Record<PluginPermission, SandboxPermission[]> = {
  'read:current': ['context:read', 'session:read'],
  'read:history': ['data:read'],
  'write:data': ['data:read', 'data:write'],
  'export:data': ['storage:read', 'data:read'],
  'network': ['network:access'],
  'filesystem': ['file:read', 'file:write'],
  'read_sessions': ['session:read', 'data:read'],
  'read_notes': ['data:read'],
}

/** 将插件权限集合展开为沙箱权限集合（用于沙箱 grantedPermissions） */
export function pluginPermissionsToSandbox(permissions: PluginPermission[] = []): SandboxPermission[] {
  const out = new Set<SandboxPermission>()
  for (const p of permissions) {
    for (const sp of PLUGIN_PERMISSION_TO_SANDBOX[p] ?? []) out.add(sp)
  }
  return [...out]
}

// ---- 运行时快照类型 ----

/** 沙箱运行时快照（供 UI 可视化单一来源） */
export interface SandboxRuntimeSnapshot {
  /** 守卫是否运行 */
  guardRunning: boolean
  /** 被守卫沙箱数 */
  guardedCount: number
  /** 沙箱总数 */
  totalSandboxes: number
  /** 活跃沙箱数 */
  activeSandboxes: number
  /** 等级分布 */
  tierDistribution: Record<SandboxTier, number>
  /** 守卫累计违规数 */
  violationCount: number
  /** 守卫累计降级数 */
  downgradeCount: number
  /** 每插件沙箱行（含运行时合并信息） */
  rows: SandboxRuntimeRow[]
}

/** 每插件沙箱行 */
export interface SandboxRuntimeRow {
  /** 插件 ID */
  pluginId: string
  /** 插件名 */
  name: string
  /** 图标 */
  icon: string
  /** 插件分级 */
  pluginTier: string
  /** 推荐沙箱等级 */
  recommendedTier: SandboxTier
  /** 当前沙箱等级（未创建为 null） */
  sandboxTier: SandboxTier | null
  /** 沙箱是否活跃 */
  active: boolean
  /** 会被授予的沙箱权限数 */
  grantedPermissions: number
  /** API 调用计数（各接口合计） */
  apiCallCount: number
  /** 资源使用 */
  resourceUsage: ResourceUsage | null
  /** 沙箱等级描述 */
  tierDescription: string
}

/** 守卫式能力调用的返回 */
export interface GuardedCallResult {
  ok: boolean
  reason?: 'sandbox-not-created' | 'sandbox-inactive' | 'allowed' | 'error'
  error?: string
}

// ---- 运行时接线（纯逻辑，可注入插件读取源） ----

export class PluginSandboxRuntime {
  private getPlugins: () => PluginRuntime[]

  constructor(getPlugins: () => PluginRuntime[]) {
    this.getPlugins = getPlugins
  }

  /** 按插件 id 复位或创建沙箱，返回沙箱环境 */
  private ensureSandbox(runtime: PluginRuntime): SandboxEnvironment {
    const tier = recommendSandboxTier(runtime.manifest.meta.tier)
    let env = sandboxIsolator.getSandboxByPlugin(runtime.id)

    if (env) {
      // 已存在：同步等级与授予权限（维持活跃状态由调用方控制）
      if (env.tier !== tier) sandboxIsolator.changeTier(env.id, tier)
      this.syncGrantedPermissions(env, runtime)
    } else {
      env = sandboxIsolator.createSandbox(runtime.id, tier)
      this.syncGrantedPermissions(env, runtime)
    }

    return env
  }

  /** 将插件已授予权限展开为沙箱授予权限 */
  private syncGrantedPermissions(env: SandboxEnvironment, runtime: PluginRuntime): void {
    const granted = pluginPermissionsToSandbox(
      (runtime.granted ?? runtime.manifest.permissions) as PluginPermission[],
    )
    for (const sp of granted) {
      sandboxIsolator.grantPermission(env.id, sp)
    }
  }

  /** 启用：确保沙箱存在且激活 */
  enable(pluginId: string): boolean {
    const rt = this.getPlugins().find(p => p.id === pluginId)
    if (!rt) return false
    const env = this.ensureSandbox(rt)
    env.active = true
    return true
  }

  /** 禁用：停用沙箱（不销毁，便于保留审计） */
  disable(pluginId: string): boolean {
    const env = sandboxIsolator.getSandboxByPlugin(pluginId)
    if (!env) return false
    env.active = false
    return true
  }

  /** 安装：同步创建沙箱 */
  install(manifest: PluginManifest): boolean {
    const runtime: PluginRuntime = {
      id: manifest.meta.id,
      name: manifest.meta.name,
      version: manifest.meta.version,
      manifest,
      enabled: true,
      loaded: false,
      installedAt: new Date().toISOString(),
      hooks: new Map(),
      sandbox: { ...manifest.sandbox },
      granted: [...manifest.permissions],
    }
    const env = this.ensureSandbox(runtime)
    env.active = true
    return true
  }

  /** 卸载：销毁沙箱环境 */
  uninstall(pluginId: string): boolean {
    const env = sandboxIsolator.getSandboxByPlugin(pluginId)
    if (!env) return false
    return sandboxIsolator.destroySandbox(env.id)
  }

  /** 启动守卫（幂等） */
  startGuard(): boolean {
    if (!runtimeGuard.getState().running) runtimeGuard.start()
    return runtimeGuard.getState().running
  }

  /** 停止守卫 */
  stopGuard(): void {
    runtimeGuard.stop()
  }

  /** 是否运行中 */
  get guardRunning(): boolean {
    return runtimeGuard.getState().running
  }

  /**
   * 守卫式能力调用：进入沙箱前做存在性/活跃度检查，记录 API 调用与审计。
   * @param pluginId 插件 id
   * @param apiName  被调用的 API 名
   * @param fn       实际执行体（无副作用；沙箱内核在前置检查后调用）
   */
  runGuarded(pluginId: string, apiName: string, fn?: () => void): GuardedCallResult {
    const env = sandboxIsolator.getSandboxByPlugin(pluginId)
    if (!env) return { ok: false, reason: 'sandbox-not-created', error: '沙箱尚未创建，请先启用插件' }
    if (!env.active) return { ok: false, reason: 'sandbox-inactive', error: '插件沙箱未激活，请先启用插件' }

    // 沙箱内 API 调用计数
    sandboxIsolator.recordAPICall(env.id, apiName)

    if (fn) {
      try {
        fn()
      } catch (err) {
        return {
          ok: false,
          reason: 'error',
          error: err instanceof Error ? err.message : String(err),
        }
      }
    }

    return { ok: true, reason: 'allowed' }
  }

  /** 聚合运行时快照（供 UI 可视化） */
  getSnapshot(): SandboxRuntimeSnapshot {
    const guardState = runtimeGuard.getState()
    const plugins = this.getPlugins()
    const sandboxes = sandboxIsolator.getAllSandboxes()

    const tierDistribution: Record<SandboxTier, number> = { L0: 0, L1: 0, L2: 0 }
    for (const s of sandboxes) {
      tierDistribution[s.tier]++
    }

    const rows: SandboxRuntimeRow[] = plugins.map(rt => {
      const tier = recommendSandboxTier(rt.manifest.meta.tier)
      const env = sandboxIsolator.getSandboxByPlugin(rt.id)
      const apiCallCount = env
        ? Array.from(env.apiCallCount.values()).reduce((a, b) => a + b, 0)
        : 0

      return {
        pluginId: rt.id,
        name: rt.name,
        icon: rt.manifest.meta.icon,
        pluginTier: rt.manifest.meta.tier,
        recommendedTier: tier,
        sandboxTier: env?.tier ?? null,
        active: env?.active ?? false,
        grantedPermissions: this.syncGrantedCount(rt),
        apiCallCount,
        resourceUsage: env ? { ...env.resourceUsage } : null,
        tierDescription: SANDBOX_TIER_DESCRIPTIONS[tier],
      }
    })

    return {
      guardRunning: guardState.running,
      guardedCount: guardState.guardedCount,
      totalSandboxes: sandboxes.length,
      activeSandboxes: sandboxes.filter(s => s.active).length,
      tierDistribution,
      violationCount: guardState.violationHistory.length,
      downgradeCount: guardState.downgradeHistory.length,
      rows,
    }
  }

  private syncGrantedCount(rt: PluginRuntime): number {
    return pluginPermissionsToSandbox((rt.granted ?? rt.manifest.permissions) as PluginPermission[]).length
  }
}
