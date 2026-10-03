<script setup lang="ts">
// ============================================================
// 幕僚的克制 · 治理可视化（INCR-444）
// 宪法第44条「幕僚的克制」是**全局开关**：幕僚不得代用户决策 / 发送 / 交易 / 外部交互。
// 本面板就地展示这条全局克制状态 + 受限动作类别 + 宪法第44条解释——
// 是 AdvisorHub 此前缺失的治理可视化，且全部来自真实运行时数据（非 per-advisor 造假）。
// 零 props 自持读桥：直接消费 modules/advisor/restraint 的 isAdvisorRestrained / RESTRICTED_ADVISOR_ACTIONS，
// 并订阅宪法效果引擎的 onEffectEvent，使克制开关被拨动时本面板即时刷新。
// ============================================================
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { isAdvisorRestrained, RESTRICTED_ADVISOR_ACTIONS } from '../modules/advisor/restraint'
import { onEffectEvent } from '../engine/constitution-effect'

/** 受限动作的中文标签与释义（与 restraint.ts 中的 Set 注释同源） */
const RESTRICTED_ACTION_META: Record<string, { label: string; desc: string }> = {
  send: { label: '代发消息', desc: '幕僚不得代替你发出任何消息' },
  trade: { label: '代交易', desc: '幕僚不得代替你执行任何交易' },
  'external-interact': { label: '代表你与外部世界交互', desc: '幕僚不得代表你与外部世界产生交互' },
}

/** 全局克制是否生效（宪法第44条默认启用） */
const restrained = ref(isAdvisorRestrained())

/** 受限动作清单（静态集合 → 展示数组，并补中文标签） */
const actionList = computed(() =>
  [...RESTRICTED_ADVISOR_ACTIONS].map((key) => ({
    key,
    label: RESTRICTED_ACTION_META[key]?.label ?? key,
    desc: RESTRICTED_ACTION_META[key]?.desc ?? '',
  })),
)

function refresh() {
  restrained.value = isAdvisorRestrained()
}

let stopListener: (() => void) | undefined

onMounted(() => {
  refresh()
  // 宪法效果引擎在规则开关变化时通知；届时重读克制态，保持面板与运行时一致。
  stopListener = onEffectEvent(() => refresh())
})
onUnmounted(() => {
  stopListener?.()
})
</script>

<template>
  <section class="ah-scheduler-section arp" :class="restrained ? 'is-active' : 'is-off'">
    <h3 class="ah-scheduler-heading">🛡 幕僚的克制</h3>
    <p class="ah-aura-desc">
      宪法第44条：幕僚可以陪伴你，但不能替代你。这是一条全局守护——无论哪位幕僚，都不得代替你决策、发送、交易或与外部世界交互。
    </p>

    <!-- 全局克制状态徽标 -->
    <div class="arp-status" :class="restrained ? 'is-active' : 'is-off'" role="status" aria-live="polite">
      <span class="arp-status-dot"></span>
      <span class="arp-status-text">
        <template v-if="restrained">克制生效中 · 幕僚不会代你决策 / 发送 / 交易 / 对外交互</template>
        <template v-else>克制已关闭 · 代执行动作将被放行</template>
      </span>
    </div>

    <!-- 受限动作清单 -->
    <ul class="arp-actions" v-if="actionList.length">
      <li class="arp-action" v-for="a in actionList" :key="a.key">
        <span class="arp-action-tag">{{ a.label }}</span>
        <span class="arp-action-desc">{{ a.desc }}</span>
        <span class="arp-action-state">{{ restrained ? '拦截' : '放行' }}</span>
      </li>
    </ul>

    <!-- 宪法第44条解释 -->
    <p class="arp-note">
      幕僚的建议永远是「你可以考虑」，不是「你应该」；幕僚可以表达看法，但必须明确标注为主观。
      你随时可以在宪法编辑器关闭此条——关闭后，上述动作将不再被拦截。
    </p>
  </section>
</template>

<style scoped>
/* 复用 .ah-scheduler-section / .ah-scheduler-heading / .ah-aura-desc 由 AdvisorHub 提供；此处仅定义 arp-* 局部样式。 */

.arp {
  position: relative;
  z-index: 1;
}

/* ---- 状态徽标 ---- */
.arp-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0 14px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
}
.arp-status.is-active {
  background: rgba(var(--success-rgb, 90, 184, 160), 0.08);
  border: 1px solid rgba(var(--success-rgb, 90, 184, 160), 0.28);
  color: var(--success, #5ab8a0);
}
.arp-status.is-off {
  background: rgba(224, 49, 49, 0.08);
  border: 1px solid rgba(224, 49, 49, 0.28);
  color: #e03131;
}
.arp-status-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px 1px currentColor;
}
.arp-status.is-active .arp-status-dot {
  animation: arp-breathe 2.4s ease-in-out infinite;
}
@keyframes arp-breathe {
  0%, 100% { opacity: 0.5; box-shadow: 0 0 5px 0px currentColor; }
  50% { opacity: 1; box-shadow: 0 0 10px 2px currentColor; }
}
.arp-status-text {
  font-weight: 500;
}

/* ---- 受限动作清单 ---- */
.arp-actions {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.arp-action {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.arp-action-tag {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.10);
  color: var(--accent);
  white-space: nowrap;
}
.arp-action-desc {
  flex: 1 1 auto;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(var(--accent-rgb), 0.45);
}
.arp-action-state {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
}
.arp-action-state {
  color: var(--success, #5ab8a0);
  background: rgba(var(--success-rgb, 90, 184, 160), 0.12);
}
/* 克制关闭时，列表整体呈「放行」暖红提示 */
.arp:not(.is-active) .arp-action-state {
  color: #e03131;
  background: rgba(224, 49, 49, 0.12);
}

/* ---- 宪法说明 ---- */
.arp-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(var(--accent-rgb), 0.38);
}
</style>
