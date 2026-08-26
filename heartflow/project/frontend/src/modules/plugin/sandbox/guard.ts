// ============================================================
// 插件沙箱 · 运行时守卫
// 蓝图定义：
//   沙箱隔离 — 运行时监控与动态防护
//   实时监控资源使用、API 调用频率、异常行为检测
//   支持自动降级、动态调整安全等级、安全告警
// ============================================================

import type {
  SandboxTier,
  SandboxEnvironment,
  Violation,
} from './types'
import { sandboxIsolator } from './isolator'

// ---- 守卫配置 ----

export interface GuardConfig {
  /** 资源检查间隔 (ms) */
  checkInterval: number
  /** 内存使用警戒线 (0-1) */
  memoryWarningThreshold: number
  /** 存储使用警戒线 (0-1) */
  storageWarningThreshold: number
  /** 连续违规次数阈值（触发降级） */
  violationThreshold: number
  /** 违规计数窗口 (ms) */
  violationWindow: number
  /** 自动降级是否启用 */
  autoDowngrade: boolean
  /** 降级后恢复时间 (ms) */
  recoveryTime: number
}

export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  checkInterval: 5000,
  memoryWarningThreshold: 0.8,
  storageWarningThreshold: 0.8,
  violationThreshold: 5,
  violationWindow: 60000,
  autoDowngrade: true,
  recoveryTime: 300000, // 5 分钟
}

// ---- 守卫状态 ----

export interface GuardState {
  /** 是否运行中 */
  running: boolean
  /** 被守卫的沙箱数 */
  guardedCount: number
  /** 上次检查时间 */
  lastCheckAt: string | null
  /** 违规历史 */
  violationHistory: ViolationRecord[]
  /** 降级记录 */
  downgradeHistory: DowngradeRecord[]
}

export interface ViolationRecord {
  violation: Violation
  /** 违规时沙箱等级 */
  tierAtViolation: SandboxTier
}

export interface DowngradeRecord {
  sandboxId: string
  pluginId: string
  from: SandboxTier
  to: SandboxTier
  reason: string
  timestamp: string
  recovered: boolean
  recoveredAt?: string
}

// ---- 运行时守卫 ----

export class RuntimeGuard {
  private config: GuardConfig
  private state: GuardState
  private checkTimer: ReturnType<typeof setInterval> | null = null
  private violationCounts = new Map<string, Array<{ timestamp: number }>>()

  constructor(config: Partial<GuardConfig> = {}) {
    this.config = { ...DEFAULT_GUARD_CONFIG, ...config }
    this.state = {
      running: false,
      guardedCount: 0,
      lastCheckAt: null,
      violationHistory: [],
      downgradeHistory: [],
    }
  }

  // ---- 生命周期 ----

  /** 启动守卫 */
  start(): void {
    if (this.state.running) return
    this.state.running = true

    this.checkTimer = setInterval(() => {
      this.performCheck()
    }, this.config.checkInterval)
  }

  /** 停止守卫 */
  stop(): void {
    this.state.running = false
    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }

  /** 执行一轮检查 */
  private performCheck(): void {
    const sandboxes = sandboxIsolator.getAllSandboxes()
    this.state.guardedCount = sandboxes.length
    this.state.lastCheckAt = new Date().toISOString()

    for (const sandbox of sandboxes) {
      if (!sandbox.active) continue

      // 资源检查
      const violation = sandboxIsolator.checkResourceLimits(sandbox.id)
      if (violation) {
        this.recordViolation(violation, sandbox)
        this.handleViolation(violation, sandbox)
      }

      // 资源警戒线检查
      this.checkResourceWarnings(sandbox)
    }

    // 清理过期违规记录
    this.cleanExpiredViolations()
  }

  // ---- 资源警戒 ----

  private checkResourceWarnings(sandbox: SandboxEnvironment): void {
    const limits = sandbox.config.resourceLimits
    const usage = sandbox.resourceUsage

    const memoryRatio = usage.memoryMB / limits.maxMemoryMB
    if (memoryRatio >= this.config.memoryWarningThreshold) {
      console.warn(
        `[Guard] 沙箱 ${sandbox.id} 内存使用 ${(memoryRatio * 100).toFixed(0)}% (${usage.memoryMB}/${limits.maxMemoryMB}MB)`
      )
    }

    const storageRatio = usage.storageMB / limits.maxStorageMB
    if (storageRatio >= this.config.storageWarningThreshold) {
      console.warn(
        `[Guard] 沙箱 ${sandbox.id} 存储使用 ${(storageRatio * 100).toFixed(0)}% (${usage.storageMB}/${limits.maxStorageMB}MB)`
      )
    }
  }

  // ---- 违规处理 ----

  private recordViolation(violation: Violation, sandbox: SandboxEnvironment): void {
    this.state.violationHistory.push({
      violation,
      tierAtViolation: sandbox.tier,
    })

    // 限制违规历史大小
    if (this.state.violationHistory.length > 500) {
      this.state.violationHistory = this.state.violationHistory.slice(-250)
    }

    // 更新违规计数
    const key = sandbox.id
    if (!this.violationCounts.has(key)) {
      this.violationCounts.set(key, [])
    }
    this.violationCounts.get(key)!.push({ timestamp: Date.now() })
  }

  private handleViolation(violation: Violation, sandbox: SandboxEnvironment): void {
    if (!this.config.autoDowngrade) return

    const recentViolations = this.getRecentViolationCount(sandbox.id)
    if (recentViolations >= this.config.violationThreshold) {
      this.autoDowngrade(sandbox, violation)
    }
  }

  private getRecentViolationCount(sandboxId: string): number {
    const records = this.violationCounts.get(sandboxId) || []
    const cutoff = Date.now() - this.config.violationWindow
    return records.filter(r => r.timestamp >= cutoff).length
  }

  private autoDowngrade(sandbox: SandboxEnvironment, violation: Violation): void {
    const downgradeMap: Record<SandboxTier, SandboxTier | null> = {
      'L2': 'L1',
      'L1': 'L0',
      'L0': null, // L0 无法降级，只能停用
    }

    const targetTier = downgradeMap[sandbox.tier]
    if (!targetTier) {
      // L0 违规，直接停用
      sandbox.active = false
      this.recordDowngrade(sandbox, sandbox.tier, sandbox.tier, 'L0 违规次数过多，自动停用')
      return
    }

    sandboxIsolator.changeTier(sandbox.id, targetTier)
    this.recordDowngrade(sandbox, sandbox.tier, targetTier, violation.message)

    // 设置恢复定时器
    if (this.config.recoveryTime > 0) {
      setTimeout(() => {
        this.checkRecovery(sandbox.id)
      }, this.config.recoveryTime)
    }
  }

  private recordDowngrade(
    sandbox: SandboxEnvironment,
    from: SandboxTier,
    to: SandboxTier,
    reason: string,
  ): void {
    this.state.downgradeHistory.push({
      sandboxId: sandbox.id,
      pluginId: sandbox.pluginId,
      from,
      to,
      reason,
      timestamp: new Date().toISOString(),
      recovered: false,
    })
  }

  private checkRecovery(sandboxId: string): void {
    const sandbox = sandboxIsolator.getSandbox(sandboxId)
    if (!sandbox) return

    const recentViolations = this.getRecentViolationCount(sandboxId)
    if (recentViolations === 0 && sandbox.tier !== 'L2') {
      // 无新违规，恢复一级
      const upgradeMap: Record<SandboxTier, SandboxTier> = {
        'L0': 'L1',
        'L1': 'L2',
        'L2': 'L2',
      }
      sandboxIsolator.changeTier(sandboxId, upgradeMap[sandbox.tier])

      // 更新降级记录
      const lastDowngrade = [...this.state.downgradeHistory]
        .reverse()
        .find(d => d.sandboxId === sandboxId)
      if (lastDowngrade) {
        lastDowngrade.recovered = true
        lastDowngrade.recoveredAt = new Date().toISOString()
      }
    }
  }

  // ---- 异常检测 ----

  /** 检测异常 API 调用模式 */
  detectAnomalies(sandboxId: string): string[] {
    const sandbox = sandboxIsolator.getSandbox(sandboxId)
    if (!sandbox) return []

    const warnings: string[] = []

    // 检查 API 调用频率是否异常飙升
    const totalCalls = Array.from(sandbox.apiCallCount.values()).reduce((s, c) => s + c, 0)
    if (totalCalls > sandbox.config.resourceLimits.maxAPICallsPerMinute * 0.9) {
      warnings.push('API 调用频率接近上限')
    }

    // 检查是否有频繁的权限拒绝
    const recentDenials = sandbox.auditLog
      .slice(-20)
      .filter(e => e.result === 'denied')
    if (recentDenials.length >= 5) {
      warnings.push('频繁权限拒绝，可能存在越权尝试')
    }

    return warnings
  }

  // ---- 清理 ----

  private cleanExpiredViolations(): void {
    const cutoff = Date.now() - this.config.violationWindow
    for (const [key, records] of this.violationCounts) {
      const filtered = records.filter(r => r.timestamp >= cutoff)
      if (filtered.length === 0) {
        this.violationCounts.delete(key)
      } else {
        this.violationCounts.set(key, filtered)
      }
    }
  }

  // ---- 状态查询 ----

  /** 获取守卫状态 */
  getState(): GuardState {
    return { ...this.state }
  }

  /** 获取沙箱守卫状态 */
  getSandboxGuardStatus(sandboxId: string): {
    active: boolean
    violationCount: number
    downgradeCount: number
    anomalies: string[]
  } {
    const sandbox = sandboxIsolator.getSandbox(sandboxId)
    const downgrades = this.state.downgradeHistory.filter(d => d.sandboxId === sandboxId)
    const anomalies = this.detectAnomalies(sandboxId)

    return {
      active: sandbox?.active || false,
      violationCount: this.getRecentViolationCount(sandboxId),
      downgradeCount: downgrades.length,
      anomalies,
    }
  }

  /** 更新配置 */
  updateConfig(partial: Partial<GuardConfig>): void {
    this.config = { ...this.config, ...partial }
  }

  /** 重置 */
  reset(): void {
    this.stop()
    this.state = {
      running: false,
      guardedCount: 0,
      lastCheckAt: null,
      violationHistory: [],
      downgradeHistory: [],
    }
    this.violationCounts.clear()
  }
}

/** 全局单例 */
export const runtimeGuard = new RuntimeGuard()