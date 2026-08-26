// ============================================================
// 性能自适应 · 质量档组合式（M2）
// ============================================================
// 自动探测设备档 → 推导质量档（Canvas DPR 上限 / 粒子缩放 / 动画 / 特效）；
// 支持用户覆盖并持久化（KV）。视图层消费 profile 实现降级，不触碰渲染细节。

import { ref, computed } from 'vue'
import { detectDeviceTier, type DeviceTier } from './device-tier'
import { storage } from '@/engine/storage'
import { useBreakpoint } from '@/composables/useBreakpoint'

export interface QualityProfile {
  /** 生效档（自动或用户覆盖） */
  tier: DeviceTier
  /** Canvas 设备像素比上限（省 GPU 带宽） */
  dprCap: number
  /** 粒子密度缩放（1=不变，<1=降密度） */
  particleScale: number
  /** 非必要动画是否启用 */
  animationEnabled: boolean
  /** 辉光/模糊等特效强度缩放 */
  effectScale: number
}

const PROFILES: Record<DeviceTier, Omit<QualityProfile, 'tier'>> = {
  low: { dprCap: 1, particleScale: 0.4, animationEnabled: false, effectScale: 0.5 },
  mid: { dprCap: 1.5, particleScale: 0.75, animationEnabled: true, effectScale: 0.85 },
  high: { dprCap: 2, particleScale: 1, animationEnabled: true, effectScale: 1 },
}

const OVERRIDE_KEY = 'hf:adaptive-tier'

export function useAdaptiveQuality() {
  const detectedTier = detectDeviceTier()
  const override = ref<DeviceTier | null>(storage.getKV<DeviceTier | null>(OVERRIDE_KEY, null))

  // 手机（窄屏）强制 low 档以保证流畅（T7.2）；用户显式覆盖仍优先（宪法第2条：超级自定义）
  const bp = useBreakpoint()
  const effectiveTier = computed<DeviceTier>(() => {
    if (!override.value && bp.isPhone.value) return 'low'
    return override.value ?? detectedTier
  })
  const profile = computed<QualityProfile>(() => ({ tier: effectiveTier.value, ...PROFILES[effectiveTier.value] }))

  /** 设置用户覆盖（null = 跟随自动探测） */
  function setOverride(tier: DeviceTier | null): void {
    override.value = tier
    storage.setKV(OVERRIDE_KEY, tier)
  }

  return {
    detectedTier,
    override,
    effectiveTier,
    profile,
    setOverride,
  }
}
