<template>
  <Transition name="dialogue-panel">
    <div v-if="visible" class="mirror-dialogue-panel" :class="dialogueShapeClass">
      <!-- 顶部栏 -->
      <div class="md-header">
        <div class="md-header-left">
          <div class="md-avatar" :class="orbState">
            <span class="md-avatar-glyph">镜</span>
          </div>
          <div class="md-header-meta">
            <span class="md-header-title">镜我</span>
            <span class="md-header-sub">{{ phaseLabel }} · 随时陪你</span>
          </div>
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
          <p class="md-empty-hint">想做点什么？挑一个，或直接在下面说</p>
          <div class="md-empty-scenes">
            <template v-for="grp in sceneGroups" :key="grp.name">
              <div class="md-scene-group-label">{{ grp.name }}</div>
              <button
                v-for="sg in grp.items"
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
            </template>
          </div>
        </div>

        <!-- 对话记录 -->
        <div
          v-for="entry in dialogue"
          :key="entry.id"
          class="md-message"
          :class="`md-message--${entry.role}`"
        >
          <!-- 镜我消息：左侧伴侣光球头像 -->
          <div v-if="entry.role === 'mirror'" class="md-msg-avatar" :class="orbState">
            <span class="md-msg-avatar-glyph">镜</span>
          </div>

          <div class="md-msg-body">
            <div class="md-msg-tools">
              <button class="md-msg-tool" type="button" @click="copyText(entry.text, entry.id)">{{ copiedId === entry.id ? '已复制' : '复制' }}</button>
              <button v-if="entry.role === 'user'" class="md-msg-tool" type="button" @click="regenerate(entry.text)">重新生成</button>
            </div>
            <!-- 意图标签（仅用户消息且有解析结果时） -->
            <div v-if="entry.role === 'user' && entry.parsedTask" class="md-intent-tag">
              <span class="md-intent-icon">{{ getIntentIcon(entry.parsedTask.intent) }}</span>
              <span class="md-intent-label">{{ getIntentLabel(entry.parsedTask.intent) }}</span>
              <span class="md-intent-confidence">{{ Math.round(entry.parsedTask.confidence * 100) }}%</span>
            </div>

            <div class="md-bubble" :class="{ 'md-bubble--long': isLong(entry) && !isExpanded(entry.id) }">
              <p class="md-bubble-text">{{ entry.text }}</p>
              <span class="md-bubble-time">{{ formatTime(entry.timestamp) }}</span>
              <button v-if="isLong(entry)" class="md-expand-btn" type="button" @click="toggleExpand(entry.id)">{{ isExpanded(entry.id) ? '收起' : '展开' }}</button>
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

            <!-- 知识出处（深度借鉴：作答标注出处，兜底/无计划时注入） -->
            <div v-if="entry.role === 'mirror' && entry.sources?.length" class="md-sources">
              <span class="md-sources-head">📎 作答依据</span>
              <div
                v-for="src in entry.sources"
                :key="src.id"
                class="md-source-item"
                :title="`${src.domainLabel} · ${src.date}`"
              >
                <span class="md-source-domain">{{ src.domainLabel }}</span>
                <span class="md-source-label">{{ src.label }}</span>
                <span class="md-source-date">{{ src.date }}</span>
              </div>
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
        </div>

        <!-- 处理中指示器 -->
        <div v-if="isProcessing" class="md-typing" role="status" aria-label="镜我正在输入">
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
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="md-input md-input--area"
            rows="1"
            placeholder="说点什么..."
            :disabled="isProcessing"
            @keydown.enter.exact.prevent="handleSend"
            @input="autoGrow"
          ></textarea>
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
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useMirrorDialogue } from '../modules/mirror/useMirrorDialogue'
import { INTENT_INFO } from '../modules/mirror/intents'
import type { IntentCategory, ExecutionAction } from '../modules/mirror/types'
import { useVoiceInput } from '../modules/mirror/voice-input'
import { extractStructured } from '../modules/mirror/nl-create'
import { formatClockTime as formatTime } from '../utils/time'
import { ADVISOR_CONFIRM_EXECUTE_EVENT } from '../modules/operation-mode/gate'
import { useAppearance } from '../modules/customization/useAppearance'

const props = defineProps<{
  visible: boolean
  /** 当前所在房间（M3 房间感知）：镜我创建的笔记将归属此房间 */
  activeRoomId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ---- 对话框形态（宪法第二条超级自定义 · 非方盒，可在设置中切换） ----
const { dialogueShape } = useAppearance()
const dialogueShapeClass = computed(() => `shape-${dialogueShape.value}`)

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
const inputRef = ref<HTMLTextAreaElement | null>(null)
const messageListRef = ref<HTMLDivElement | null>(null)

// ---- 时段光球状态 ----
const hour = new Date().getHours()
const orbState = computed(() => {
  if (hour >= 5 && hour < 8) return 'orb-dawn'
  if (hour >= 8 && hour < 17) return 'orb-day'
  if (hour >= 17 && hour < 20) return 'orb-dusk'
  return 'orb-night'
})
const phaseLabel = computed(() => {
  const s = orbState.value
  if (s === 'orb-dawn') return '晨'
  if (s === 'orb-day') return '昼'
  if (s === 'orb-dusk') return '暮'
  return '夜'
})

// ---- 意图场景模板（Kimi 式场景卡入口） ----
const sceneTemplates = [
  { group: '专注', icon: '🎯', label: '开始专注', desc: '进入一段不受打扰的时间', text: '开始专注 25 分钟' },
  { group: '专注', icon: '📋', label: '制定计划', desc: '把模糊的方向变成清晰的步骤', text: '制定一个计划' },
  { group: '记录', icon: '📝', label: '记录想法', desc: '把此刻的思绪安全地存放下来', text: '记录一个想法' },
  { group: '记录', icon: '🌸', label: '安放情绪', desc: '不需要解释，只是放下这一刻', text: '我今天心情很好' },
  { group: '记录', icon: '⚓', label: '设立锚点', desc: '为今天留下一个可回望的坐标', text: '设立一个锚点' },
  { group: '回顾', icon: '🔍', label: '查看今日', desc: '回顾今天已经沉淀了什么', text: '查看今天的数据' },
]

const sceneGroups = computed(() => {
  const order = ['专注', '记录', '回顾']
  const map = new Map<string, (typeof sceneTemplates)[number][]>()
  for (const t of sceneTemplates) {
    if (!map.has(t.group)) map.set(t.group, [])
    map.get(t.group)!.push(t)
  }
  return order.filter((g) => map.has(g)).map((g) => ({ name: g, items: map.get(g)! }))
})

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
  resetInputHeight()
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


// ---- 长文本折叠（可读性：超长消息默认收起，按需展开） ----
const expanded = reactive<Record<string, boolean>>({})
function isLong(entry: { text: string }): boolean {
  return entry.text.length > 140
}
function isExpanded(id: string): boolean {
  return !!expanded[id]
}
function toggleExpand(id: string): void {
  expanded[id] = !expanded[id]
}


// ---- 输入区：多行自动增高 + 消息操作 ----
const copiedId = ref<string | null>(null)
function autoGrow(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}
function resetInputHeight() {
  const el = inputRef.value
  if (el) el.style.height = 'auto'
}
function copyText(text: string, id: string) {
  if (!navigator.clipboard) return
  navigator.clipboard.writeText(text)
    .then(() => {
      copiedId.value = id
      setTimeout(() => { if (copiedId.value === id) copiedId.value = null }, 1200)
    })
    .catch(() => {})
}
function regenerate(text: string) {
  void send(text, { roomId: props.activeRoomId })
  scrollToBottom()
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
  width: 332px;
  /* 视口自适应：底部锚定 bottom:140px，故可用高 ≈ 100dvh-140；取 min 保上限 480px 且矮窗不顶溢 */
  max-height: min(480px, calc(100dvh - 180px));
  border-radius: var(--glass-radius);
  /* 净透琉璃：露底透明 + 上缘环境反射 + 下缘焦散（全局「琉璃通透度」主控 --glass-clear-alpha 驱动），
     与镜我球同源材质，取代原先 0.93 暖黑实底磨砂。 */
  background:
    var(--glass-clear-sheen),
    radial-gradient(
      ellipse 90% 36% at 50% 100%,
      rgba(255, 255, 255, var(--glass-clear-a-caustic)),
      transparent 74%
    ),
    rgba(26, 24, 30, var(--glass-clear-a-surface));
  border: 1px solid var(--glass-clear-rim);
  box-shadow:
    var(--glass-shadow),
    0 0 0 1px rgba(var(--accent-rgb), 0.06),
    0 18px 50px -18px rgba(var(--accent-rgb), 0.3),
    inset 0 1px 0 rgba(255, 255, 255, calc(var(--glass-clear-a-sheen) * 0.6)),
    inset 0 -1px 6px rgba(0, 0, 0, var(--glass-clear-a-caustic));
  backdrop-filter: blur(var(--glass-blur)) saturate(1.5) brightness(1.06);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.5) brightness(1.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 顶边暖光高光，提升玻璃层精致度 */
  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 240, 220, 0.5), transparent);
    pointer-events: none;
  }
  /* 消费布局契约令牌：对话面板是 bead 弹出的浮层，须高于珠(--z-jade=20)、悬浮栏(--z-floating=90)，
     且 Teleport 到 body 后仍需以此令牌与全局层级对齐（禁裸 z-index） */
  z-index: var(--z-popover, 95);
}

/* ========== 对话框形态（宪法第二条超级自定义 · 非方盒，设置可切换） ========== */
/* bubble 对话泡：右下收尖 + 自右下升起的偏光，似从幕僚珠浮起 */
.mirror-dialogue-panel.shape-bubble {
  border-radius: 24px 24px 8px 24px;
  box-shadow:
    var(--glass-shadow),
    0 0 0 1px rgba(var(--accent-rgb), 0.08),
    0 18px 50px -18px rgba(var(--accent-rgb), 0.32),
    -6px 8px 18px -10px rgba(var(--accent-rgb), 0.28);
}
/* blob 有机斑团：非对称柔润轮廓 + 柔和内透 */
.mirror-dialogue-panel.shape-blob {
  border-radius: 42px 38px 30px 34px / 36px 32px 42px 38px;
  box-shadow:
    var(--glass-shadow),
    0 0 0 1px rgba(var(--accent-rgb), 0.06),
    0 18px 50px -18px rgba(var(--accent-rgb), 0.3),
    inset 0 0 22px rgba(var(--accent-rgb), 0.05);
}
/* arc 弧顶卡：顶部大拱 + 顶部 accent 亮边 */
.mirror-dialogue-panel.shape-arc {
  border-radius: 34px 34px 14px 14px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.22);
  box-shadow:
    var(--glass-shadow),
    0 0 0 1px rgba(var(--accent-rgb), 0.08),
    0 -4px 18px -8px rgba(var(--accent-rgb), 0.3),
    0 18px 50px -18px rgba(var(--accent-rgb), 0.3);
}
/* capsule 极简胶囊：统一大圆角 + 全柔光环 */
.mirror-dialogue-panel.shape-capsule {
  border-radius: 28px;
  box-shadow:
    var(--glass-shadow),
    0 0 0 1px rgba(var(--accent-rgb), 0.1),
    0 16px 44px -18px rgba(var(--accent-rgb), 0.34),
    0 0 0 4px rgba(var(--accent-rgb), 0.04);
}

/* ========== 顶部栏 ========== */
.md-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 12px 11px 14px;
  border-bottom: 1px solid var(--glass-border-faint);
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.07), transparent 72%);
}

.md-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 伴侣头像（时段渐变） */
.md-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.25), 0 0 12px rgba(var(--accent-rgb), 0.2);
}
.md-avatar-glyph {
  font-size: 13px;
  font-weight: 600;
  color: #fff7ec;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.md-avatar.orb-dawn {
  background: radial-gradient(circle at 38% 34%, #ffd28a, #e8973f 68%, #c9742a);
}
.md-avatar.orb-day {
  background: radial-gradient(circle at 38% 34%, #f6f2ec, #cfc7bd 68%, #a89e92);
}
.md-avatar.orb-dusk {
  background: radial-gradient(circle at 38% 34%, #ffb072, #e8803f 68%, #b95523);
}
.md-avatar.orb-night {
  background: radial-gradient(circle at 38% 34%, #f0d3ac, var(--accent) 68%, #9c7448);
}

.md-header-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.2;
}
.md-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 0.5px;
}
.md-header-sub {
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

.md-processing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.8);
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
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.md-close-btn:hover {
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-bright);
}

/* ========== 消息列表 ========== */
.md-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}

.md-messages::-webkit-scrollbar {
  width: 3px;
}
.md-messages::-webkit-scrollbar-track {
  background: transparent;
}
.md-messages::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-rgb), 0.08);
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
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, rgba(212, 165, 116, 0.55), rgba(120, 80, 45, 0.32));
  box-shadow: 0 0 18px rgba(212, 165, 116, 0.18), inset 0 0 8px rgba(255, 240, 220, 0.25);
  margin-bottom: 6px;
  animation: core-breathe 5s ease-in-out infinite;
}

@keyframes core-breathe {
  0%, 100% { transform: scale(0.85); }
  50% { transform: scale(1.1); }
}

.md-empty-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
}

.md-empty-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.md-empty-scenes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 8px;
  row-gap: 8px;
  width: 100%;
  max-width: 320px;
}

.md-scene-group-label {
  grid-column: 1 / -1;
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-muted);
  padding: 2px 2px 0;
}

.md-scene-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 11px;
  border: 1px solid var(--glass-border-faint);
  background: var(--glass-surface);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s;
  width: 100%;
}

.md-scene-card:hover {
  background: rgba(var(--accent-rgb), 0.07);
  border-color: var(--glass-border);
  transform: translateY(-2px);
  box-shadow: 0 8px 18px -10px rgba(var(--accent-rgb), 0.5);
}

.md-scene-card:active {
  transform: translateY(0) scale(0.98);
}

.md-scene-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(var(--accent-rgb), 0.12);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.18), 0 0 10px rgba(var(--accent-rgb), 0.08);
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
  color: var(--text-bright);
  letter-spacing: 0.3px;
}

.md-scene-desc {
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 键盘焦点 */
.md-scene-card:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.8);
  outline-offset: 2px;
}

/* ========== 消息气泡 ========== */
.md-message {
  display: flex;
  gap: 7px;
  max-width: 92%;
  animation: md-msg-in 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.md-message--user {
  align-self: flex-end;
  flex-direction: row;
  align-items: flex-start;
}

.md-message--mirror {
  align-self: flex-start;
  flex-direction: row;
  align-items: flex-start;
}

/* 镜我消息左侧伴侣头像 */
.md-msg-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.22), 0 0 9px rgba(var(--accent-rgb), 0.16);
}
.md-msg-avatar-glyph {
  font-size: 11px;
  font-weight: 600;
  color: #fff7ec;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.md-msg-avatar.orb-dawn {
  background: radial-gradient(circle at 38% 34%, #ffd28a, #e8973f 68%, #c9742a);
}
.md-msg-avatar.orb-day {
  background: radial-gradient(circle at 38% 34%, #f6f2ec, #cfc7bd 68%, #a89e92);
}
.md-msg-avatar.orb-dusk {
  background: radial-gradient(circle at 38% 34%, #ffb072, #e8803f 68%, #b95523);
}
.md-msg-avatar.orb-night {
  background: radial-gradient(circle at 38% 34%, #f0d3ac, var(--accent) 68%, #9c7448);
}

.md-msg-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  position: relative;
}
.md-message--user .md-msg-body {
  align-items: flex-end;
}
.md-message--mirror .md-msg-body {
  align-items: flex-start;
}
/* 消息 hover 工具条 */
.md-msg-tools {
  display: flex;
  gap: 4px;
  align-self: flex-end;
  opacity: 0;
  transition: opacity 0.18s;
  margin-bottom: 2px;
}
.md-message--mirror .md-msg-tools {
  align-self: flex-start;
}
.md-message:hover .md-msg-tools {
  opacity: 1;
}
.md-msg-tool {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid var(--glass-border-faint);
  background: var(--glass-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s, border-color 0.2s;
}
.md-msg-tool:hover {
  color: var(--text-bright);
  border-color: var(--glass-border);
}


@keyframes md-msg-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 意图标签 */
.md-intent-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--glass-surface);
  border: 1px solid var(--glass-border-faint);
  align-self: flex-end;
  font-size: 10px;
}

.md-intent-icon {
  font-size: 10px;
  line-height: 1;
}

.md-intent-label {
  color: var(--text-secondary);
}

.md-intent-confidence {
  color: var(--text-muted);
  font-size: 9px;
}

/* 气泡 */
.md-bubble {
  padding: 7px 11px;
  border-radius: 13px;
  line-height: 1.5;
  letter-spacing: 0.2px;
}

.md-message--user .md-bubble {
  background: rgba(var(--accent-rgb), 0.2);
  border: 1px solid var(--glass-border);
  border-bottom-right-radius: 4px;
}

.md-message--mirror .md-bubble {
  background: var(--glass-surface);
  border: 1px solid var(--glass-border-faint);
  border-bottom-left-radius: 4px;
  box-shadow: inset 2px 0 0 rgba(var(--accent-rgb), 0.4);
}

.md-bubble-text {
  font-size: 12.5px;
  color: var(--text-high);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.md-bubble-time {
  display: block;
  font-size: 9px;
  color: var(--text-muted);
  margin-top: 4px;
  text-align: right;
}
.md-message--mirror .md-bubble-time {
  text-align: left;
}
/* 长文本折叠：默认收起 + 底部渐隐遮罩 */
.md-bubble--long .md-bubble-text {
  max-height: 6em;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, #000 70%, transparent);
  mask-image: linear-gradient(180deg, #000 70%, transparent);
}
.md-expand-btn {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 0;
  font-size: 10px;
  font-family: inherit;
  color: var(--accent);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.md-expand-btn:hover {
  opacity: 0.75;
  text-decoration: underline;
}


/* 知识出处（深度借鉴：作答标注出处） */
.md-sources {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-self: flex-start;
  max-width: 94%;
  padding: 5px 8px 5px 9px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.md-sources-head {
  font-size: 9.5px;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.md-source-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.md-source-domain {
  flex-shrink: 0;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}

.md-source-label {
  flex: 1;
  min-width: 0;
  font-size: 10.5px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.md-source-date {
  flex-shrink: 0;
  font-size: 9px;
  color: var(--text-muted);
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
  color: var(--text-secondary);
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
  background: rgba(var(--accent-rgb), 0.25);
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
  border-top: 1px solid var(--glass-border-faint);
  flex-shrink: 0;
}

.md-ambiguous-hint {
  font-size: 10px;
  color: var(--text-muted);
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
  padding: 9px 12px;
  border-top: 1px solid var(--glass-border-faint);
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
  padding: 7px 11px;
  border-radius: var(--glass-radius-sm);
  border: 1px solid var(--border-color);
  background: var(--glass-surface);
  color: var(--text-high);
  font-size: 12.5px;
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
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--glass-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.md-mic-btn:hover {
  border-color: var(--glass-border);
  color: var(--text-bright);
}
.md-mic-btn.on {
  border-color: rgba(255, 120, 120, 0.75);
  color: #ff9a9a;
  background: rgba(255, 120, 120, 0.08);
  animation: md-mic-pulse 1.1s ease-in-out infinite;
}
.md-mic-glyph {
  font-size: 14px;
  line-height: 1;
}
@keyframes md-mic-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 120, 120, 0); }
  50% { box-shadow: 0 0 14px rgba(255, 120, 120, 0.65); }
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
  color: var(--text-bright);
  background: var(--glass-surface);
  border: 1px solid var(--border-color);
  white-space: nowrap;
}
.md-struct-chip--high {
  color: #ffd2a8;
  border-color: rgba(255, 190, 120, 0.4);
  background: rgba(255, 190, 120, 0.08);
}
.md-struct-chip--low {
  color: #aebfff;
  border-color: rgba(var(--accent-rgb), 0.35);
  background: rgba(var(--accent-rgb), 0.08);
}

.md-input::placeholder {
  color: var(--text-muted);
}
.md-input--area {
  resize: none;
  overflow-y: auto;
  line-height: 1.45;
  max-height: 120px;
}


.md-input:focus {
  border-color: var(--glass-border);
  background: rgba(var(--accent-rgb), 0.08);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.14), 0 0 14px rgba(var(--accent-rgb), 0.18);
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
  border: 1px solid var(--glass-border-faint);
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.16), rgba(var(--accent-rgb), 0.06));
  color: var(--accent);
  cursor: pointer;
  transition: transform 0.15s, background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}
.md-send-btn:hover:not(:disabled) {
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.32), rgba(var(--accent-rgb), 0.18));
  border-color: var(--glass-border);
  color: var(--accent);
  box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.36);
}
.md-send-btn:active:not(:disabled) {
  transform: scale(0.9);
}
.md-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ========== 键盘焦点可见性（WCAG 2.2） ========== */
.md-close-btn:focus-visible,
.md-mic-btn:focus-visible,
.md-send-btn:focus-visible,
.md-scene-card:focus-visible,
.md-ambiguous-chip:focus-visible {
  outline: 2px solid rgba(var(--accent-rgb), 0.8);
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
  /* 手机端：袖珍浮卡——右锚定窄卡（贴幕僚珠），带边距飘起而非铺满屏 */
  .mirror-dialogue-panel {
    left: auto;
    right: calc(16px + env(safe-area-inset-right, 0px));
    width: min(340px, calc(100vw - 32px));
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    max-height: min(440px, calc(100dvh - 140px));
  }

  /* 顶部栏收紧 */
  .md-header { padding: 8px 10px 8px 12px; }
  .md-header-left { gap: 8px; }
  .md-avatar { width: 22px; height: 22px; }
  .md-avatar-glyph { font-size: 11px; }
  .md-header-title { font-size: 13px; }
  .md-header-sub { font-size: 10px; }

  /* 空状态收紧 */
  .md-empty { padding: 12px 0; gap: 4px; }
  .md-empty-orb { width: 28px; height: 28px; }
  .md-empty-title { font-size: 13px; }
  .md-empty-hint { font-size: 10px; margin: 0 0 8px; }
  .md-empty-scenes { gap: 5px 6px; row-gap: 6px; max-width: 300px; }
  .md-scene-card { padding: 7px 9px; gap: 7px; border-radius: 10px; }
  .md-scene-icon { width: 26px; height: 26px; font-size: 14px; }
  .md-scene-label { font-size: 12px; }
  .md-scene-desc { font-size: 9.5px; }

  /* 气泡与消息收紧 */
  .md-message { gap: 6px; max-width: 94%; }
  .md-msg-avatar { width: 20px; height: 20px; }
  .md-msg-avatar-glyph { font-size: 10px; }
  .md-bubble { padding: 6px 10px; border-radius: 12px; }
  .md-bubble-text { font-size: 12px; }
  .md-bubble-time { font-size: 8.5px; margin-top: 3px; }
  .md-msg-tool { font-size: 9px; padding: 2px 7px; }

  /* 输入区收紧 */
  .md-input-area { padding: 7px 10px; }
  .md-input-row { gap: 6px; }
  .md-input { padding: 7px 10px; font-size: 12.5px; }

  /* 触控目标保持可用，仅略收 */
  .md-mic-btn,
  .md-send-btn { width: 38px; height: 38px; }
  .md-close-btn { width: 30px; height: 30px; }
}
</style>