<script setup lang="ts">
import { ref } from 'vue'
import { useRadialMenu } from '../modules/radial-menu'
import type { RadialAction } from '../modules/radial-menu'

const { actions, canAdd, addAction, removeAction, trigger, resetActions } = useRadialMenu()

const open = ref(false)
const feedback = ref('')
const newLabel = ref('')

const INSPIRATIONS = [
  '慢一点，也是在前进。',
  '完成，比完美更重要。',
  '先把第一步做完。',
  '此刻的专注，就是答案。',
  '允许自己休息。',
  '你已经做得够好了。',
]

function actionStyle(i: number) {
  const n = actions.value.length || 1
  const angle = (360 / n) * i - 90
  const rad = (angle * Math.PI) / 180
  const R = 92
  const x = Math.round(Math.cos(rad) * R)
  const y = Math.round(Math.sin(rad) * R)
  return {
    transform: open.value
      ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
      : 'translate(-50%, -50%) scale(0.35)',
    opacity: open.value ? '1' : '0',
    transitionDelay: open.value ? `${i * 40}ms` : '0ms',
  } as Record<string, string>
}

function feedbackFor(a: RadialAction): string {
  if (a.id === 'ra_dice' || a.label.includes('骰')) return `掷出了 ${1 + Math.floor(Math.random() * 6)} 点`
  if (a.id === 'ra_spark' || a.label.includes('灵感')) return INSPIRATIONS[Math.floor(Math.random() * INSPIRATIONS.length)]
  if (a.label.includes('呼吸')) return '跟着圆环，吸气 · 呼气'
  if (a.label.includes('水')) return '喝口水，润一润'
  if (a.label.includes('懒腰')) return '伸个懒腰，松一松肩'
  if (a.label.includes('歇') || a.label.includes('休')) return '歇一会，也是正事'
  return `已执行「${a.label}」`
}

function onTrigger(a: RadialAction) {
  trigger(a.id)
  feedback.value = feedbackFor(a)
  open.value = false
}

function onAdd() {
  if (addAction(newLabel.value)) newLabel.value = ''
}
</script>

<template>
  <section class="rdm-panel">
    <header class="rdm-head">
      <div class="rdm-head-text">
        <span class="rdm-kicker">触角 · 快捷操作</span>
        <h3 class="rdm-title">径向扇形菜单</h3>
      </div>
      <span class="rdm-count">{{ actions.length }} 个动作</span>
    </header>

    <div class="rdm-stage" :class="{ 'is-open': open }">
      <button
        v-for="(a, i) in actions"
        :key="a.id"
        class="rdm-action"
        type="button"
        :style="actionStyle(i)"
        :tabindex="open ? 0 : -1"
        :aria-hidden="!open"
        @click="onTrigger(a)"
      >
        <span class="rdm-action-icon">{{ a.icon }}</span>
        <span class="rdm-action-label">{{ a.label }}</span>
      </button>

      <button
        class="rdm-fab"
        type="button"
        :class="{ 'is-open': open }"
        :aria-expanded="open"
        aria-label="展开快捷操作"
        @click="open = !open"
      >
        <span class="rdm-fab-glyph">{{ open ? '×' : '＋' }}</span>
      </button>
    </div>

    <p class="rdm-feedback" :class="{ 'is-active': !!feedback }">
      {{ feedback || '轻点中心按钮，动作呈扇形弹出。' }}
    </p>

    <div class="rdm-manage">
      <div class="rdm-add">
        <input
          v-model="newLabel"
          class="rdm-input"
          type="text"
          maxlength="10"
          placeholder="新增一个快捷动作…"
          @keydown.enter="onAdd"
        />
        <button class="rdm-add-btn" type="button" :disabled="!canAdd" @click="onAdd">添加</button>
      </div>
      <ul class="rdm-chips">
        <li v-for="a in actions" :key="a.id" class="rdm-chip">
          <span class="rdm-chip-text">{{ a.icon }} {{ a.label }}</span>
          <button class="rdm-chip-del" type="button" aria-label="移除动作" @click="removeAction(a.id)">×</button>
        </li>
      </ul>
      <button class="rdm-reset" type="button" @click="resetActions">恢复默认动作</button>
    </div>
  </section>
</template>

<style scoped>
.rdm-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(212, 163, 90, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(52, 40, 30, 0.55), rgba(36, 28, 22, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #f2e7d6;
}

.rdm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.rdm-kicker { font-size: 12px; letter-spacing: 0.12em; color: #d4a35a; opacity: 0.9; }
.rdm-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; color: #f7eddb; }

.rdm-count {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(212, 163, 90, 0.16);
  font-size: 12px;
  color: #e2c290;
}

.rdm-stage {
  position: relative;
  height: 300px;
  margin: 4px 0 8px;
}

.rdm-action,
.rdm-fab {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.42s cubic-bezier(0.22, 1.2, 0.36, 1), opacity 0.28s ease;
}

.rdm-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 62px;
  height: 62px;
  border: 1px solid rgba(212, 163, 90, 0.4);
  background: linear-gradient(160deg, rgba(72, 56, 40, 0.95), rgba(48, 36, 26, 0.95));
  color: #f0e2c8;
  pointer-events: auto;
}

.rdm-stage:not(.is-open) .rdm-action { pointer-events: none; }

.rdm-action:hover { border-color: #d4a35a; box-shadow: 0 0 14px rgba(212, 163, 90, 0.4); }
.rdm-action-icon { font-size: 18px; line-height: 1; }
.rdm-action-label { font-size: 10px; letter-spacing: 0.02em; color: #d8c4a2; }

.rdm-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(212, 163, 90, 0.6);
  background: radial-gradient(circle at 40% 35%, rgba(212, 163, 90, 0.95), rgba(150, 106, 48, 0.95));
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  z-index: 2;
}

.rdm-fab-glyph { font-size: 26px; color: #2a1d10; font-weight: 600; transition: transform 0.35s ease; }
.rdm-fab.is-open .rdm-fab-glyph { transform: rotate(90deg); }
.rdm-fab:active { transform: translate(-50%, -50%) scale(0.94); }

.rdm-feedback {
  min-height: 20px;
  margin: 0 0 6px;
  text-align: center;
  font-size: 13px;
  color: #a8937a;
  transition: color 0.2s ease;
}

.rdm-feedback.is-active { color: #e2c290; }

.rdm-manage { margin-top: 10px; border-top: 1px solid rgba(212, 163, 90, 0.16); padding-top: 12px; }
.rdm-add { display: flex; gap: 8px; }

.rdm-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(212, 163, 90, 0.3);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  color: #f2e7d6;
  font-size: 13px;
}

.rdm-input::placeholder { color: #a8937a; }

.rdm-add-btn {
  flex: none;
  padding: 8px 16px;
  border: 1px solid rgba(212, 163, 90, 0.4);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: #e2c290;
  font-size: 13px;
  cursor: pointer;
}

.rdm-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.rdm-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }

.rdm-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 11px;
  border: 1px solid rgba(212, 163, 90, 0.26);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.16);
  font-size: 12px;
  color: #e7d6bb;
}

.rdm-chip-del {
  width: 18px;
  height: 18px;
  line-height: 1;
  border: none;
  border-radius: 50%;
  background: rgba(196, 106, 90, 0.28);
  color: #f0c6bb;
  font-size: 13px;
  cursor: pointer;
}

.rdm-reset {
  margin-top: 12px;
  padding: 5px 12px;
  border: 1px solid rgba(212, 163, 90, 0.24);
  border-radius: 8px;
  background: none;
  color: #c2ad8d;
  font-size: 12px;
  cursor: pointer;
}

.rdm-reset:hover { color: #e2c290; }
</style>
