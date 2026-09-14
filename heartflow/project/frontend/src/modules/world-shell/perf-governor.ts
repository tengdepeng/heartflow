// ============================================================
// 世界壳 · 自适应画质调控器（性能护栏）
// ------------------------------------------------------------
// 纯逻辑、零 DOM/WebGL 依赖，便于单测。
// 设计原则：
//  - 健康时恒返回 null —— 不做任何降质，画面与调参前完全一致。
//  - 仅当「持续低帧」时逐级降级（先降 DPR，DPR 触底再降阴影精度），
//    为弱机保流畅；恢复后带迟滞回弹（回升更保守，避免抖动）。
//  - 目的：作为后续辉光/IBL/贴图等画质升级的安全网——
//    升级加重 GPU 负载时，弱机自动让出余量，强机纹丝不动。
// ============================================================

export interface PerfTierSpec {
  /** DPR 倍率档（相对 baseline），index 0 = 满血。建议 [1, 0.75, 0.5] */
  dpr: number[]
  /** 阴影贴图边长档，index 0 = 满血；无阴影的壳传 [] */
  shadow: number[]
  /** 低于此平滑帧率（fps）触发降级评估 */
  lowFps: number
  /** 高于此平滑帧率（fps）触发回升评估 */
  highFps: number
  /** 评估窗口（ms）：每累计这么多帧时间评估一次，避免单帧抖动误判 */
  evalWindowMs: number
}

/** 调控器产出的画质快照：仅当某项需变化时返回非空字段 */
export interface PerfSnapshot {
  /** 目标 devicePixelRatio（baseline × 当前档倍率） */
  dpr: number
  /** 目标阴影贴图边长；无阴影壳恒为 null */
  shadowMapSize: number | null
}

export class PerfGovernor {
  private dprTier = 0
  private shadowTier = 0
  private lowStreak = 0
  private highStreak = 0
  private emaFps = 60
  private evalAcc = 0
  private lastTs = 0

  constructor(
    private readonly baselineDpr: number,
    private readonly spec: PerfTierSpec,
  ) {}

  /** 每帧调用，传入 rAF 时间戳；返回需应用的画质快照（无变化则返回 null） */
  sample(timestamp: number): PerfSnapshot | null {
    const prev = this.lastTs
    // 先更新时间戳，确保任何返回路径都不会遗漏——
    // 否则评估帧提前 return 会跳过更新，致下一帧 dt 翻倍、EMA 被周期性假低帧拉低而误降级。
    this.lastTs = timestamp
    if (prev > 0) {
      const dt = timestamp - prev
      if (dt > 0 && dt < 1000) {
        const fps = 1000 / dt
        // EMA 平滑，避免瞬时掉帧误触发降级
        this.emaFps = this.emaFps * 0.9 + fps * 0.1
        this.evalAcc += dt
        if (this.evalAcc >= this.spec.evalWindowMs) {
          this.evalAcc = 0
          return this.evaluate()
        }
      }
    }
    return null
  }

  private evaluate(): PerfSnapshot | null {
    const fps = this.emaFps
    if (fps < this.spec.lowFps) {
      this.highStreak = 0
      this.lowStreak++
      if (this.lowStreak >= 2) {
        this.lowStreak = 0
        if (this.stepDown()) return this.snapshot()
      }
    } else if (fps > this.spec.highFps) {
      this.lowStreak = 0
      this.highStreak++
      if (this.highStreak >= 4) {
        this.highStreak = 0
        if (this.stepUp()) return this.snapshot()
      }
    } else {
      // 中间带：双方计数清零，稳定不抖动
      this.lowStreak = 0
      this.highStreak = 0
    }
    return null
  }

  /** 降级一级：先降 DPR，DPR 触底再降阴影。返回是否有变化 */
  private stepDown(): boolean {
    if (this.dprTier < this.spec.dpr.length - 1) {
      this.dprTier++
      return true
    }
    if (this.spec.shadow.length > 0 && this.shadowTier < this.spec.shadow.length - 1) {
      this.shadowTier++
      return true
    }
    return false
  }

  /** 回升一级：先升 DPR，DPR 满血后再升阴影。返回是否有变化 */
  private stepUp(): boolean {
    let changed = false
    if (this.spec.shadow.length > 0 && this.shadowTier > 0) {
      this.shadowTier--
      changed = true
    }
    if (this.dprTier > 0) {
      this.dprTier--
      changed = true
    }
    return changed
  }

  private snapshot(): PerfSnapshot {
    return {
      dpr: this.baselineDpr * this.spec.dpr[this.dprTier],
      shadowMapSize: this.spec.shadow.length > 0 ? this.spec.shadow[this.shadowTier] : null,
    }
  }

  /** 当前 DPR 档位（0 = 满血），便于调试与测试断言 */
  get dprTierLevel(): number {
    return this.dprTier
  }
  /** 当前阴影档位（0 = 满血） */
  get shadowTierLevel(): number {
    return this.shadowTier
  }
}

/** 宅院 3D 性能档位：DPR 三档 + 阴影两档 */
export const COURTYARD_PERF_SPEC: PerfTierSpec = {
  dpr: [1, 0.75, 0.5],
  shadow: [2048, 1024],
  lowFps: 45,
  highFps: 57,
  evalWindowMs: 1000,
}

/** 星辰 3D 性能档位：仅 DPR 三档（星辰无阴影贴图） */
export const STARS_PERF_SPEC: PerfTierSpec = {
  dpr: [1, 0.75, 0.5],
  shadow: [],
  lowFps: 45,
  highFps: 57,
  evalWindowMs: 1000,
}
