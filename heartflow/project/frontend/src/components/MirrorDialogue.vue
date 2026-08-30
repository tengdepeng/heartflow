<template>
  <Transition name="dialogue-panel">
    <div v-if="visible" class="mirror-dialogue-panel">
      <!-- 顶部栏 -->
      <div class="md-header">
        <div class="md-header-left">
          <div class="md-orb-icon" :class="orbState" />
          <span class="md-header-title">镜我对话</span>
          <span v-if="isProcessing" class="md-processing-dot" />
        </div>
        <button class="md-close-btn" type="button" @click="emit('close')" title="关闭" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- 消息列表 -->
      <div ref="messageListRef" class="md-messages">
        <!-- 空状态：意图场景卡片 -->
        <div v-if="dialogue.length === 0" class="md-empty">
          <div class="md-empty-orb" />
          <p class="md-empty-title">与镜我对话</p>
          <p class="md-empty-hint">说出你的想法，我会帮你处理一切</p>
          <div class="md-empty-scenes">
            <button
              v-for="sg in sceneTemplates"
              :key="sg.text"
              class="md-scene-card"
              type="button"
              @click="handleQuickSend(sg.text)"
            >
              <span class="md-scene-icon">{{ sg.icon }}</span>
              <div class="md-scene-body">
                <span class="md-scene-label">{{ sg.label }}</span>
                <span class="md-scene-desc">{{ sg.desc }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 对话记录 -->
        <div
          v-for="entry in dialogue"
          :key="entry.id"
          class="md-message"
          :class="`md-message--${entry.role}`"
        >
          <!-- 意图标签（仅用户消息且有解析结果时） -->
          <div v-if="entry.role === 'user' && entry.parsedTask" class="md-intent-tag">
            <span class="md-intent-icon">{{ getIntentIcon(entry.parsedTask.intent) }}</span>
            <span class="md-intent-label">{{ getIntentLabel(entry.parsedTask.intent) }}</span>
            <span class="md-intent-confidence">{{ Math.round(entry.parsedTask.confidence * 100) }}%</span>
          </div>

          <div class="md-bubble">
            <p class="md-bubble-text">{{ entry.text }}</p>
            <span class="md-bubble-time">{{ formatTime(entry.timestamp) }}</span>
          </div>

          <!-- 结构化抽取预览（M2：仅用户消息、且仅当抽取到结构化字段时） -->
          <div
            v-if="entry.role === 'user' && structChips(entry.text).length"
            class="md-struct-chips"
          >
            <span
              v-for="(c, ci) in structChips(entry.text)"
              :key="ci"
              class="md-struct-chip"
              :class="c.cls"
            >{{ c.label }}</span>
          </div>

          <!-- 执行结果（仅镜我回应且有执行结果时） -->
          <div v-if="entry.role === 'mirror' && entry.executionResult" class="md-exec-result">
            <div
              v-for="step in entry.executionResult.stepResults"
              :key="step.order"
              class="md-exec-step"
              :class="{ 'md-exec-step--fail': !step.success }"
            >
              <span class="md-exec-step-icon">{{ step.success ? '✓' : '✗' }}</span>
              <span class="md-exec-step-action">{{ getActionLabel(step.action) }}</span>
            </div>
          </div>
        </div>

        <!-- 处理中指示器 -->
        <div v-if="isProcessing" class="md-typing">
          <span class="md-typing-dot" />
          <span class="md-typing-dot" />
          <span class="md-typing-dot" />
        </div>
      </div>

      <!-- 歧义候选（当有多个候选时） -->
      <div v-if="isAmbiguous && candidates.length > 1" class="md-ambiguous">
        <span class="md-ambiguous-hint">你想要的是：</span>
        <button
          v-for="c in candidates.slice(0, 3)"
          :key="c.id"
          class="md-ambiguous-chip"
          type="button"
          @click="handleResolveAmbiguity(c.intent)"
        >
          {{ getIntentIcon(c.intent) }} {{ getIntentLabel(c.intent) }}
        </button>
      </div>

      <!-- 输入区 -->
      <div class="md-input-area">
        <div class="md-input-row">
          <input
            ref="inputRef"
            v-model="inputText"
            class="md-input"
            type="text"
            placeholder="说点什么..."
            :disabled="isProcessing"
            @keydown.enter="handleSend"
          />
          <button
            v-if="voiceSupported"
            class="md-mic-btn"
            :class="{ on: isListening }"
            type="button"
            :title="isListening ? '点击停止录音' : '语音输入'"
            :aria-label="isListening ? '停止录音' : '语音输入'"
            @click="toggleVoice"
          >
            <span class="md-mic-glyph">{{ isListening ? '◉' : '◌' }}</span>
          </button>
          <button
            class="md-send-btn"
            type="button"
            :disabled="!inputText.trim() || isProcessing"
            @click="handleSend"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L14 2L8 14L6 10L2 8Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
              <path d="M6 10L8 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useMirrorDialogue } from '../modules/mirror/useMirrorDialogue'
import { INTENT_INFO } from '../modules/mirror/intents'
import type { IntentCategory, ExecutionAction } from '../modules/mirror/types'
import { useVoiceInput } from '../modules/mirror/voice-input'
import { extractStructured } from '../modules/mirror/nl-create'
import { formatClockTime as formatTime } from '../utils/time'
import { ADVISOR_CONFIRM_EXECUTE_EVENT } from '../modules/operation-mode/gate'

const props = defineProps<{
  visible: boolean
  /** 当前所在房间（M3 房间感知）：镜我创建的笔记将归属此房间 */
  activeRoomId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ---- 镜我对话 ----
const {
  dialogue,
  isProcessing,
  isAmbiguous,
  candidates,
  send,
} = useMirrorDialogue()

// ---- 语音输入（M1，复用语丝同一套 Web Speech API 封装） ----
const voice = useVoiceInput()
const voiceSupported = voice.isSupported
const isListening = voice.isListening

function toggleVoice() {
  if (isListening.value) {
    const t = voice.stop()
    if (t && t.trim()) {
      inputText.value = t.trim()
      inputRef.value?.focus()
    }
  } else {
    voice.start()
  }
}

// ---- 结构化抽取预览（M2，复用语丝 extractStructured） ----
function structChips(text: string): { label: string; cls: string }[] {
  const s = extractStructured(text)
  const chips: { label: string; cls: string }[] = []
  if (s.due) chips.push({ label: `时间 · ${s.dueLabel || s.due}`, cls: '' })
  if (s.assignee) chips.push({ label: `执行 · ${s.assignee}`, cls: '' })
  if (s.priority === 'high') chips.push({ label: '高优先级', cls: 'md-struct-chip--high' })
  else if (s.priority === 'low') chips.push({ label: '低优先级', cls: 'md-struct-chip--low' })
  return chips
}

// ---- 本地状态 ----
const inputText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const messageListRef = ref<HTMLDivElement | null>(null)

// ---- 时段光球状态 ----
const hour = new Date().getHours()
const orbState = computed(() => {
  if (hour >= 5 && hour < 8) return 'orb-dawn'
  if (hour >= 8 && hour < 17) return 'orb-day'
  if (hour >= 17 && hour < 20) return 'orb-dusk'
  return 'orb-night'
})

// ---- 意图场景模板（Kimi 式场景卡入口） ----
const sceneTemplates = [
  { icon: '🎯', label: '开始专注', desc: '进入一段不受打扰的时间', text: '开始专注 25 分钟' },
  { icon: '📝', label: '记录想法', desc: '把此刻的思绪安全地存放下来', text: '记录一个想法' },
  { icon: '🌸', label: '安放情绪', desc: '不需要解释，只是放下这一刻', text: '我今天心情很好' },
  { icon: '⚓', label: '设立锚点', desc: '为今天留下一个可回望的坐标', text: '设立一个锚点' },
  { icon: '📋', label: '制定计划', desc: '把模糊的方向变成清晰的步骤', text: '制定一个计划' },
  { icon: '🔍', label: '查看今日', desc: '回顾今天已经沉淀了什么', text: '查看今天的数据' },
]

// ---- 自动滚动到底部 ----
async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(() => dialogue.value.length, () => {
  scrollToBottom()
})

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => {
      inputRef.value?.focus()
      scrollToBottom()
    })
  }
})

// ---- 三级操作模式 · 待确认回投 ----
// 用户在右下角「待确认」托盘点"执行"后，本面板以 bypassGate 重新执行原始指令，
// 保证对话状态与面板同一实例、不分裂（导航/动作真正发生）。
function onAdvisorConfirmExecute(e: Event) {
  const detail = (e as CustomEvent<{ text: string; intent?: string }>).detail
  if (detail?.text) {
    const intent = detail.intent as IntentCategory | undefined
    void send(detail.text, { overrideIntent: intent, bypassGate: true, roomId: props.activeRoomId })
    scrollToBottom()
  }
}

onMounted(() => {
  window.addEventListener(ADVISOR_CONFIRM_EXECUTE_EVENT, onAdvisorConfirmExecute as EventListener)
})

onUnmounted(() => {
  window.removeEventListener(ADVISOR_CONFIRM_EXECUTE_EVENT, onAdvisorConfirmExecute as EventListener)
})

// ---- 发送消息 ----
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isProcessing.value) return

  inputText.value = ''
  await send(text, { roomId: props.activeRoomId })
  scrollToBottom()
}

async function handleQuickSend(text: string) {
  await send(text, { roomId: props.activeRoomId })
  scrollToBottom()
}

async function handleResolveAmbiguity(_intent: IntentCategory) {
  // M4：把用户选定的意图真正带入 send，强制单一意图，歧义才被真正消解
  const lastUserMsg = [...dialogue.value].reverse().find(d => d.role === 'user')
  if (lastUserMsg) {
    await send(lastUserMsg.text, { overrideIntent: _intent, roomId: props.activeRoomId })
    scrollToBottom()
  }
}

// ---- 格式化 ----

function getIntentIcon(intent: IntentCategory): string {
  return INTENT_INFO[intent]?.icon ?? '❓'
}

function getIntentLabel(intent: IntentCategory): string {
  return INTENT_INFO[intent]?.label ?? '未知'
}

function getActionLabel(action: ExecutionAction): string {
  const labels: Record<ExecutionAction, string> = {
    'start-focus': '启动专注',
    'create-note': '创建笔记',
    'log-emotion': '记录情绪',
    'create-anchor': '创建锚点',
    'complete-anchor': '完成锚点',
    'list-anchors': '列出锚点',
    'create-plan': '创建计划',
    'list-notes': '列出笔记',
    'show-stats': '显示统计',
    'start-rest': '开始休息',
    'navigate': '导航',
    'respond': '回应',
  }
  return labels[action] ?? action
}
</script>

<style scoped>
/* ========== 面板容器 ========== */
.mirror-dialogue-panel {
  position: fixed;
  bottom: 140px;
  right: 32px;
  width: 360px;
  /* 视口自适应：底部锚定 bottom:140px，故可用高 ≈ 100dvh-140；取 min 保上限 520px 且矮窗不顶溢 */
  max-height: min(520px, calc(100dvh - 200px));
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 消费布局契约令牌：对话面板是 bead 弹出的浮层，须高于珠(--z-jade=20)、悬浮栏(--z-floating=90)，
     且 Teleport 到 body 后仍需以此令牌与全局层级对齐（禁裸 z-index） */
  z-index: var(--z-popover, 95);
}

/* ========== 顶部栏 ========== */
.md-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.md-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.md-orb-icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.md-orb-icon.orb-dawn {
  background: radial-gradient(circle, rgba(255, 200, 100, 0.8), rgba(255, 180, 80, 0.4));
  box-shadow: 0 0 6px rgba(255, 200, 100, 0.3);
}
.md-orb-icon.orb-day {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.7), rgba(200, 200, 200, 0.3));
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.2);
}
.md-orb-icon.orb-dusk {
  background: radial-gradient(circle, rgba(255, 150, 80, 0.8), rgba(200, 100, 50, 0.4));
  box-shadow: 0 0 6px rgba(255, 150, 80, 0.3);
}
.md-orb-icon.orb-night {
  background: radial-gradient(circle, rgba(100, 120, 200, 0.8), rgba(60, 80, 160, 0.4));
  box-shadow: 0 0 6px rgba(100, 120, 200, 0.3);
}

.md-header-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5px;
}

.md-processing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(100, 180, 255, 0.8);
  animation: processing-pulse 1.2s ease-in-out infinite;
}

@keyframes processing-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.md-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.2s;
}
.md-close-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

/* ========== 消息列表 ========== */
.md-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.md-messages::-webkit-scrollbar {
  width: 3px;
}
.md-messages::-webkit-scrollbar-track {
  background: transparent;
}
.md-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

/* ========== 空状态 ========== */
.md-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  gap: 6px;
}

.md-empty-orb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, rgba(200, 180, 150, 0.5), rgba(100, 70, 40, 0.3));
  box-shadow: 0 0 20px rgba(180, 150, 100, 0.12);
  margin-bottom: 6px;
  animation: core-breathe 4s ease-in-out infinite;
}

@keyframes core-breathe {
  0%, 100% { transform: scale(0.85); }
  50% { transform: scale(1.1); }
}

.md-empty-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.md-empty-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  margin: 0 0 12px;
}

.md-empty-scenes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 280px;
}

.md-scene-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
  width: 100%;
}

.md-scene-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.md-scene-card:active {
  transform: translateX(2px) scale(0.98);
}

.md-scene-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.md-scene-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.md-scene-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.3px;
}

.md-scene-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.28);
  line-height: 1.4;
}

/* 键盘焦点 */
.md-scene-card:focus-visible {
  outline: 2px solid rgba(140, 170, 255, 0.8);
  outline-offset: 2px;
}

/* ========== 消息气泡 ========== */
.md-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 85%;
}

.md-message--user {
  align-self: flex-end;
}

.md-message--mirror {
  align-self: flex-start;
}

/* 意图标签 */
.md-intent-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  align-self: flex-end;
  font-size: 10px;
}

.md-intent-icon {
  font-size: 10px;
  line-height: 1;
}

.md-intent-label {
  color: rgba(255, 255, 255, 0.5);
}

.md-intent-confidence {
  color: rgba(255, 255, 255, 0.25);
  font-size: 9px;
}

/* 气泡 */
.md-bubble {
  padding: 8px 12px;
  border-radius: 14px;
  line-height: 1.45;
}

.md-message--user .md-bubble {
  background: rgba(100, 140, 220, 0.15);
  border: 1px solid rgba(100, 140, 220, 0.12);
  border-bottom-right-radius: 4px;
}

.md-message--mirror .md-bubble {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom-left-radius: 4px;
}

.md-bubble-text {
  font-size: 13px;
  color: rgba(240, 242, 255, 0.85);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.md-bubble-time {
  display: block;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.2);
  margin-top: 4px;
  text-align: right;
}

/* 执行结果 */
.md-exec-result {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 4px;
}

.md-exec-step {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(100, 200, 130, 0.08);
  border: 1px solid rgba(100, 200, 130, 0.1);
  font-size: 10px;
}

.md-exec-step--fail {
  background: rgba(220, 100, 100, 0.08);
  border-color: rgba(220, 100, 100, 0.12);
}

.md-exec-step-icon {
  font-size: 9px;
  color: rgba(100, 200, 130, 0.7);
}

.md-exec-step--fail .md-exec-step-icon {
  color: rgba(220, 100, 100, 0.7);
}

.md-exec-step-action {
  color: rgba(255, 255, 255, 0.4);
}

/* ========== 处理中 ========== */
.md-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  align-self: flex-start;
}

.md-typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  animation: typing-dot 1.4s ease-in-out infinite;
}

.md-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.md-typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-dot {
  0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
  30% { opacity: 0.8; transform: translateY(-3px); }
}

/* ========== 歧义候选 ========== */
.md-ambiguous {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.md-ambiguous-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.md-ambiguous-chip {
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 200, 100, 0.15);
  background: rgba(255, 200, 100, 0.05);
  color: rgba(255, 200, 100, 0.6);
  font-size: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.md-ambiguous-chip:hover {
  background: rgba(255, 200, 100, 0.1);
  border-color: rgba(255, 200, 100, 0.25);
  color: rgba(255, 200, 100, 0.8);
}

/* ========== 输入区 ========== */
.md-input-area {
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.md-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.md-input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--bg-surface);
  color: rgba(240, 242, 255, 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

/* 语音按钮（M1，复用语丝样式语义） */
.md-mic-btn {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.2s;
}
.md-mic-btn:hover {
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.6);
}
.md-mic-btn.on {
  border-color: rgba(255, 120, 120, 0.7);
  color: #ff9a9a;
  animation: md-mic-pulse 1.2s ease-in-out infinite;
}
.md-mic-glyph {
  font-size: 14px;
  line-height: 1;
}
@keyframes md-mic-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 120, 120, 0); }
  50% { box-shadow: 0 0 10px rgba(255, 120, 120, 0.5); }
}

/* 结构化抽取预览 chips（M2） */
.md-struct-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-self: flex-end;
  max-width: 85%;
}
.md-struct-chip {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}
.md-struct-chip--high {
  color: #ffd2a8;
  border-color: rgba(255, 190, 120, 0.4);
  background: rgba(255, 190, 120, 0.08);
}
.md-struct-chip--low {
  color: #aebfff;
  border-color: rgba(140, 170, 255, 0.35);
  background: rgba(140, 170, 255, 0.08);
}

.md-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.md-input:focus {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}

.md-input:disabled {
  opacity: 0.4;
}

.md-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.md-send-btn:hover:not(:disabled) {
  background: rgba(100, 140, 220, 0.15);
  border-color: rgba(100, 140, 220, 0.2);
  color: rgba(100, 160, 255, 0.7);
}
.md-send-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

/* ========== 键盘焦点可见性（WCAG 2.2） ========== */
.md-close-btn:focus-visible,
.md-mic-btn:focus-visible,
.md-send-btn:focus-visible,
.md-scene-card:focus-visible,
.md-ambiguous-chip:focus-visible {
  outline: 2px solid rgba(140, 170, 255, 0.8);
  outline-offset: 2px;
}

/* ========== 面板动画 ========== */
.dialogue-panel-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.dialogue-panel-leave-active {
  transition: all 0.2s ease-in;
}
.dialogue-panel-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.94);
}
.dialogue-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

/* ---- 移动端：近全宽底部表单，避让底部安全区与浮坞 ---- */
@media (max-width: 640px) {
  .mirror-dialogue-panel {
    left: calc(12px + env(safe-area-inset-left, 0px));
    right: calc(12px + env(safe-area-inset-right, 0px));
    width: auto;
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    max-height: calc(100dvh - 120px);
  }

  .md-mic-btn,
  .md-send-btn {
    width: 40px;
    height: 40px;
  }

  .md-close-btn {
    width: 32px;
    height: 32px;
  }
}
</style>