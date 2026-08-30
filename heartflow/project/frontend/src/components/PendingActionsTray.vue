<script setup lang="ts">
// ============================================================
// 待确认 / 建议 托盘
// 消费三级操作模式门控发出的 `hf:operation-gate` 事件：
// - confirm：渲染"待确认"卡片，用户点头才真正执行（自动化流程 / 顾问发声）。
// - suggest：渲染"建议"卡片，仅提示，不执行，数秒后自动消失。
// 让"执行前确认"与"仅建议"两种模式有真实可见的落点，而非静默吞掉。
// ============================================================

import { onMounted, onUnmounted, ref } from 'vue'
import { automationEngine } from '../engine/automation'
import { useAdvisorStore } from '../stores/advisor'
import {
  GATE_EVENT_NAME,
  ADVISOR_CONFIRM_EXECUTE_EVENT,
  type OperationGateEvent,
} from '../modules/operation-mode/gate'

interface TrayItem extends OperationGateEvent {
  id: number
  createdAt: number
}

const items = ref<TrayItem[]>([])
let nextId = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function addItem(event: OperationGateEvent) {
  const item: TrayItem = { ...event, id: nextId++, createdAt: Date.now() }
  items.value = [...items.value, item]
  // 仅建议：数秒后自动消失；确认项停留等待用户操作
  if (event.decision === 'suggest') {
    const t = setTimeout(() => dismiss(item.id), 7000)
    timers.set(item.id, t)
  }
}

function dismiss(id: number) {
  const t = timers.get(id)
  if (t) { clearTimeout(t); timers.delete(id) }
  items.value = items.value.filter(i => i.id !== id)
}

function confirmExecute(item: TrayItem) {
  try {
    if (item.kind === 'automation' && item.flow) {
      // 用户点头 → 以手动触发重新执行该流程
      void automationEngine.execute(item.flow, 'manual')
    } else if (item.kind === 'advisor') {
      if (item.originalText) {
        // 用户允许 → 把原始指令回投给镜我，真正执行动作（而非仅发声）
        // MirrorDialogue 监听该事件并以 bypassGate 重新 send，dialogue 状态不分裂
        window.dispatchEvent(
          new CustomEvent(ADVISOR_CONFIRM_EXECUTE_EVENT, {
            detail: { text: item.originalText, intent: item.intent },
          }),
        )
      } else {
        // 兜底：无原始指令时仅发声（保持旧行为，便于其他顾问来源接入）
        useAdvisorStore().say(item.text ?? '', 'click', item.advisorId)
      }
    }
  } catch {
    /* 执行失败不影响托盘移除 */
  }
  dismiss(item.id)
}

function onEvent(e: Event) {
  const detail = (e as CustomEvent<OperationGateEvent>).detail
  if (detail && (detail.kind === 'automation' || detail.kind === 'advisor')) {
    addItem(detail)
  }
}

onMounted(() => {
  window.addEventListener(GATE_EVENT_NAME, onEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener(GATE_EVENT_NAME, onEvent as EventListener)
  timers.forEach(t => clearTimeout(t))
  timers.clear()
})
</script>

<template>
  <div class="pat-stack" aria-live="polite">
    <transition-group name="pat">
      <div
        v-for="item in items"
        :key="item.id"
        class="pat-card"
        :class="`pat-card--${item.decision}`"
      >
        <div class="pat-card__head">
          <span class="pat-badge" :class="`pat-badge--${item.decision}`">
            {{ item.decision === 'confirm' ? '待确认' : '建议' }}
          </span>
          <span class="pat-kind">{{ item.kind === 'automation' ? '自动化流程' : '幕僚顾问' }}</span>
        </div>
        <p class="pat-msg">{{ item.message }}</p>
        <div class="pat-actions" v-if="item.decision === 'confirm'">
          <button class="pat-btn pat-btn--primary" @click="confirmExecute(item)">执行</button>
          <button class="pat-btn" @click="dismiss(item.id)">忽略</button>
        </div>
        <div class="pat-actions" v-else>
          <button class="pat-btn" @click="dismiss(item.id)">知道了</button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.pat-stack {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 320px;
  pointer-events: none;
}

.pat-card {
  pointer-events: auto;
  background: rgba(22, 24, 30, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid var(--accent, #c9a96a);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.pat-card--suggest {
  border-left-color: #6b9fc4;
}

.pat-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.pat-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  color: #1a1c22;
}

.pat-badge--confirm {
  background: var(--accent, #c9a96a);
}

.pat-badge--suggest {
  background: #6b9fc4;
}

.pat-kind {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.pat-msg {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
}

.pat-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.pat-btn {
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.pat-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.pat-btn--primary {
  background: var(--accent, #c9a96a);
  border-color: var(--accent, #c9a96a);
  color: #1a1c22;
  font-weight: 600;
}

.pat-btn--primary:hover {
  filter: brightness(1.08);
  background: var(--accent, #c9a96a);
}

.pat-enter-active,
.pat-leave-active {
  transition: all 0.25s ease;
}

.pat-enter-from,
.pat-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
