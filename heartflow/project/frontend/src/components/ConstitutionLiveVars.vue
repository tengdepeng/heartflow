<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useConstitution } from '@/resonance/bridges/constitution'
import { isTargetActive } from '@/engine/constitution-effect'
import type { EffectTarget } from '@/engine/constitution-effects'

const c = useConstitution()

interface LiveVar {
  key: string
  label: string
  desc: string
  /** 若该变量对应 enable 型效果目标，直接读 isTargetActive 显示真实开关态（0/1），而非恒为 1 的强度倍率 */
  activeTarget?: EffectTarget
}

// 宪法效果引擎（constitution-effect.ts applyConstitutionVisualEffects）注入 :root 的运行时变量。
// 这里把它们实时读出，作为「宪法生效」的可验证证据——用户拨开关，数值即时变即证明运行时已生效。
// 注意：夜静调暗 / 数字安息日 两个目标是 enable 型，引擎写入 --hf-night-dim/--hf-sabbath 的是恒 1 的强度倍率
// （getEffectMultiplier 对 enable 恒 1），其真实开关态由 isTargetActive 反映。这两行直接读 isTargetActive 显示 0/1，
// 与面板副标题「拨动开关数值即时变化」一致；其余 6 个数值型变量仍读 CSS 变量原值。
const VARS: LiveVar[] = [
  { key: '--hf-particle-density', label: '粒子密度', desc: '界面粒子浓度倍率' },
  { key: '--hf-animate-speed', label: '动画速度', desc: '过渡与动效快慢' },
  { key: '--hf-breathing-speed', label: '呼吸速度', desc: '环境呼吸节奏' },
  { key: '--hf-scene-transition', label: '场景过渡', desc: '房间切换过渡强度' },
  { key: '--hf-night-dim', label: '夜静调暗', desc: '夜间屏幕调暗强度', activeTarget: 'scene:night-dim' },
  { key: '--hf-sabbath', label: '数字安息日', desc: '周日断联强度', activeTarget: 'scene:sabbath' },
  { key: '--hf-silence', label: '静默', desc: '抑制提示 0/1' },
  { key: '--hf-empty-space', label: '留白', desc: '留白空间 0/1' },
]

const values = ref<Record<string, string>>({})

function refresh() {
  const cs = getComputedStyle(document.documentElement)
  const next: Record<string, string> = {}
  for (const v of VARS) {
    if (v.activeTarget) {
      next[v.key] = isTargetActive(v.activeTarget) ? '1' : '0'
    } else {
      next[v.key] = (cs.getPropertyValue(v.key) || '').trim() || '—'
    }
  }
  values.value = next
}

onMounted(refresh)
// 宪法引擎 watch mutableRules 重写 :root 变量；这里 nextTick 后重读，拿到最新值。
watch(
  () => c.mutableRules,
  () => nextTick(refresh),
  { deep: true },
)
</script>

<template>
  <section class="live-vars-panel">
    <div class="lv-header">
      <span class="lv-icon">📡</span>
      <div class="lv-titles">
        <h2 class="lv-title">宪法生效 · 实时变量</h2>
        <span class="lv-sub">拨动上方戒律开关，数值即时变化即证明运行时已生效</span>
      </div>
    </div>
    <div class="lv-grid">
      <div class="lv-item" v-for="v in VARS" :key="v.key">
        <div class="lv-item-head">
          <span class="lv-label">{{ v.label }}</span>
          <code class="lv-var">{{ v.key }}</code>
        </div>
        <div class="lv-value">{{ values[v.key] ?? '—' }}</div>
        <div class="lv-desc">{{ v.desc }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.live-vars-panel {
  margin: 28px 0;
  padding: 22px 24px;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    rgba(var(--accent-rgb, 212, 165, 116), 0.06),
    rgba(var(--accent-rgb, 212, 165, 116), 0.02)
  );
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.28);
  box-shadow:
    0 0 0 1px rgba(var(--accent-rgb, 212, 165, 116), 0.05),
    0 8px 30px rgba(0, 0, 0, 0.18);
}
.lv-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.lv-icon {
  font-size: 20px;
  filter: drop-shadow(0 0 8px rgba(var(--accent-rgb, 212, 165, 116), 0.5));
}
.lv-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--accent, #d4a574);
  letter-spacing: 0.04em;
}
.lv-sub {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted-alt, #8a8a8a);
}
.lv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.lv-item {
  padding: 14px 14px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.04);
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.16);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}
.lv-item:hover {
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
  transform: translateY(-2px);
}
.lv-item-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}
.lv-label {
  font-size: 13px;
  color: var(--text, #e8e0d4);
  font-weight: 500;
}
.lv-var {
  font-size: 10.5px;
  color: rgba(var(--accent-rgb, 212, 165, 116), 0.7);
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
}
.lv-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--accent, #d4a574);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 14px rgba(var(--accent-rgb, 212, 165, 116), 0.35);
}
.lv-desc {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted-alt, #8a8a8a);
  line-height: 1.4;
}
</style>
