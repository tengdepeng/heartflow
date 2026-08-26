<template>
  <div class="nl-create" :class="{ 'nl-create--compact': compact }">
    <div v-if="!compact" class="nl-create__head">
      <span class="nl-create__title">语丝 · 自然语言快建</span>
      <span class="nl-create__sub">说/写即创建 · 习惯 / 计划 / 笔记 / 专注</span>
    </div>

    <!-- 实时意图预览（方案 6） -->
    <transition name="nl-fade">
      <div
        v-if="showPreview"
        class="nl-create__preview"
        :class="`nl-create__preview--${preview.kind}`"
      >
        <span class="nl-create__preview-dot" :class="{ on: preview.kind !== 'unsupported' }" />
        <span class="nl-create__preview-text">{{ previewText }}</span>
        <span v-if="structured.due" class="nl-create__chip">时间 · {{ structured.dueLabel || structured.due }}</span>
        <span v-if="structured.assignee" class="nl-create__chip">执行 · {{ structured.assignee }}</span>
        <span
          v-if="structured.priority !== 'normal'"
          class="nl-create__chip"
          :class="structured.priority === 'high' ? 'nl-create__chip--high' : 'nl-create__chip--low'"
        >{{ structured.priority === 'high' ? '高优先级' : '低优先级' }}</span>
      </div>
    </transition>

    <div class="nl-create__row">
      <input
        ref="inputRef"
        v-model="text"
        class="nl-create__input"
        type="text"
        :placeholder="placeholder"
        @keyup.enter="submit"
      />
      <!-- 语音优先（方案 8） -->
      <button
        v-if="voiceSupported"
        class="nl-create__mic"
        :class="{ on: isListening }"
        type="button"
        :title="isListening ? '点击停止录音' : '语音输入'"
        @click="toggleVoice"
      >
        <span class="nl-create__mic-glyph">{{ isListening ? '◉' : '◌' }}</span>
      </button>
      <button class="nl-create__btn" type="button" :disabled="!canSubmit" @click="submit">
        创建
      </button>
    </div>

    <!-- 意图覆盖（方案 6：可手动切换落库类型） -->
    <transition name="nl-fade">
      <div v-if="showOverride" class="nl-create__override">
        <span class="nl-create__override-label">当作</span>
        <button
          v-for="o in OVERRIDES"
          :key="o.kind"
          type="button"
          class="nl-create__override-btn"
          :class="{ on: overrideKind === o.kind }"
          @click="toggleOverride(o.kind)"
        >
          {{ o.label }}
        </button>
      </div>
    </transition>

    <transition name="nl-fade">
      <div
        v-if="feedback"
        class="nl-create__feedback"
        :class="`nl-create__feedback--${feedback.kind}`"
      >
        <span class="nl-create__feedback-text">{{ feedback.text }}</span>
        <span v-if="feedback.persona" class="nl-create__feedback-persona">{{ feedback.persona }}</span>
        <span
          v-if="feedbackMeta && (feedbackMeta.due || feedbackMeta.assignee || feedbackMeta.priority !== 'normal')"
          class="nl-create__feedback-meta"
        >
          <span v-if="feedbackMeta.due" class="nl-create__chip">时间 · {{ feedbackMeta.dueLabel || feedbackMeta.due }}</span>
          <span v-if="feedbackMeta.assignee" class="nl-create__chip">执行 · {{ feedbackMeta.assignee }}</span>
          <span
            v-if="feedbackMeta.priority !== 'normal'"
            class="nl-create__chip"
            :class="feedbackMeta.priority === 'high' ? 'nl-create__chip--high' : 'nl-create__chip--low'"
          >{{ feedbackMeta.priority === 'high' ? '高优先级' : '低优先级' }}</span>
        </span>
        <button
          v-if="feedback.route"
          class="nl-create__goto"
          type="button"
          @click="go(feedback.route)"
        >
          前往 ›
        </button>
        <button class="nl-create__clear" type="button" @click="clear">清除</button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  executeNaturalLanguageCreate,
  previewIntent,
  personaReply,
  extractStructured,
  type NLCreateResult,
  type NLIntentPreview,
  type NLKind,
  type StructuredIntent,
} from '../modules/mirror/nl-create'
import { useVoiceInput } from '../modules/mirror/voice-input'

const props = withDefaults(defineProps<{
  compact?: boolean
  /** 当前所在房间，用于房间感知路由（方案 11） */
  activeRoomId?: string
  /** 陪伴幕僚性格，用于人格化回应（方案 12） */
  personality?: string
}>(), {
  compact: false,
  activeRoomId: '',
  personality: '',
})

const router = useRouter()
const emit = defineEmits<{
  (e: 'created', result: NLCreateResult): void
}>()
const text = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const lastResult = ref<NLCreateResult | null>(null)
const lastStructured = ref<StructuredIntent | null>(null)
const overrideKind = ref<Exclude<NLKind, 'unsupported'> | undefined>(undefined)

const placeholder = '例如：每天坚持跑步 / 制定计划：季度复盘 / 记一下灵感'
const canSubmit = computed(() => text.value.trim().length > 0)

const KIND_LABEL: Record<string, string> = {
  habit: '习惯',
  plan: '计划',
  note: '笔记',
  focus: '专注',
}

const ROUTE_MAP: Record<string, string> = {
  habit: '/automation',
  plan: '/knowledge',
  note: '/study',
  focus: '/worklog',
}

const OVERRIDES: { kind: Exclude<NLKind, 'unsupported'>; label: string }[] = [
  { kind: 'habit', label: '习惯' },
  { kind: 'plan', label: '计划' },
  { kind: 'note', label: '笔记' },
  { kind: 'focus', label: '专注' },
]

// ---- 语音（方案 8） ----
const voice = useVoiceInput()
const voiceSupported = voice.isSupported
const isListening = voice.isListening

// ---- 实时意图预览（方案 6 + 房间感知 11） ----
const preview = computed<NLIntentPreview>(() =>
  previewIntent(text.value, { roomId: props.activeRoomId }),
)
const showPreview = computed(() => text.value.trim().length > 0)
const previewText = computed(() => {
  const p = preview.value
  switch (p.kind) {
    case 'habit': return `将养成习惯 · ${p.title || '（待命名）'}`
    case 'plan': return `将制定计划 · ${p.title || text.value}`
    case 'note': return '将记录一条笔记'
    case 'focus': return '将进入专注'
    default: return '暂无法识别 · 试试：每天跑步 / 记一下灵感'
  }
})
const showOverride = computed(
  () => text.value.trim().length > 0 && preview.value.kind !== 'unsupported',
)

// ---- 结构化抽取预览（方案 14） ----
const structured = computed<StructuredIntent>(() => extractStructured(text.value))
const feedbackMeta = computed(() => lastStructured.value)

function toggleVoice() {
  if (isListening.value) {
    const t = voice.stop()
    if (t && t.trim()) {
      text.value = t.trim()
      overrideKind.value = undefined
      inputRef.value?.focus()
    }
  } else {
    voice.start()
  }
}

function toggleOverride(kind: Exclude<NLKind, 'unsupported'>) {
  overrideKind.value = overrideKind.value === kind ? undefined : kind
}

const feedback = computed(() => {
  const r = lastResult.value
  if (!r) return null

  if (r.kind === 'unsupported') {
    return {
      kind: 'unsupported' as const,
      text: `暂不支持该指令（${r.intent}）。试试：每天跑步 / 制定计划：… / 记一下灵感`,
      persona: '',
      route: '',
    }
  }

  if (r.kind === 'focus') {
    return {
      kind: 'focus' as const,
      text: '已为你准备专注，去计时器开始吧。',
      persona: personaReply('focus', props.personality),
      route: ROUTE_MAP.focus,
    }
  }

  const label = KIND_LABEL[r.kind] ?? r.kind
  const title = 'title' in r ? r.title : ''
  const route = ROUTE_MAP[r.kind] ?? ''
  const persona = personaReply(r.kind, props.personality)
  return {
    kind: r.kind,
    text: `已创建${label}${title ? '：' + title : ''}`,
    persona,
    route,
  }
})

function submit() {
  const raw = text.value.trim()
  if (!raw) {
    lastResult.value = { kind: 'unsupported', intent: 'unknown' }
    return
  }
  lastStructured.value = extractStructured(raw)
  const result = executeNaturalLanguageCreate(raw, {
    roomId: props.activeRoomId,
    overrideKind: overrideKind.value,
  })
  lastResult.value = result
  if (result.kind !== 'unsupported') emit('created', result)
  text.value = ''
  overrideKind.value = undefined
  inputRef.value?.focus()
}

function go(route: string) {
  if (route) router.push(route)
}

function clear() {
  lastResult.value = null
  lastStructured.value = null
  text.value = ''
  overrideKind.value = undefined
  inputRef.value?.focus()
}
</script>

<style scoped>
.nl-create {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}

.nl-create--compact {
  padding: 10px 12px;
  gap: 8px;
}

.nl-create__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nl-create__title {
  font-size: 15px;
  font-weight: 600;
  color: #e8e6f0;
}

.nl-create__sub {
  font-size: 12px;
  color: rgba(232, 230, 240, 0.55);
}

.nl-create__row {
  display: flex;
  gap: 8px;
}

.nl-create__input {
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: #e8e6f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.18s ease;
}

.nl-create__input:focus {
  border-color: rgba(140, 170, 255, 0.7);
}

.nl-create__input::placeholder {
  color: rgba(232, 230, 240, 0.35);
}

.nl-create__mic {
  flex: 0 0 auto;
  width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  color: rgba(232, 230, 240, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.nl-create__mic:hover {
  border-color: rgba(140, 170, 255, 0.6);
  color: #fff;
}

.nl-create__mic.on {
  border-color: rgba(255, 120, 120, 0.7);
  color: #ff9a9a;
  animation: mic-pulse 1.2s ease-in-out infinite;
}

.nl-create__mic-glyph {
  line-height: 1;
}

@keyframes mic-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 120, 120, 0); }
  50% { box-shadow: 0 0 10px rgba(255, 120, 120, 0.5); }
}

.nl-create__btn {
  flex: 0 0 auto;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6b9fc4, #a07c8c);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.12s ease;
}

.nl-create__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nl-create__btn:not(:disabled):hover {
  transform: translateY(-1px);
}

/* ---- 实时意图预览 ---- */
.nl-create__preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(232, 230, 240, 0.7);
}

.nl-create__preview-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(232, 230, 240, 0.3);
  flex: 0 0 auto;
  transition: all 0.18s ease;
}

.nl-create__preview-dot.on {
  background: #6b9fc4;
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.35);
}

.nl-create__preview--habit { color: #ffd2a8; border-color: rgba(255, 190, 120, 0.3); }
.nl-create__preview--plan { color: #aebfff; border-color: rgba(140, 170, 255, 0.3); }
.nl-create__preview--note { color: #b8f5c8; border-color: rgba(120, 220, 150, 0.3); }
.nl-create__preview--focus { color: #d9b8f5; border-color: rgba(170, 120, 220, 0.3); }

.nl-create__preview-text {
  flex: 1;
  min-width: 0;
}

/* ---- 结构化抽取 chip（方案 14） ---- */
.nl-create__chip {
  flex: 0 0 auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: rgba(232, 230, 240, 0.8);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}

.nl-create__chip--high {
  color: #ffd2a8;
  border-color: rgba(255, 190, 120, 0.4);
  background: rgba(255, 190, 120, 0.08);
}

.nl-create__chip--low {
  color: #aebfff;
  border-color: rgba(140, 170, 255, 0.35);
  background: rgba(140, 170, 255, 0.08);
}

.nl-create__feedback-meta {
  flex: 1 0 100%;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ---- 意图覆盖 ---- */
.nl-create__override {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.nl-create__override-label {
  font-size: 11px;
  color: rgba(232, 230, 240, 0.45);
}

.nl-create__override-btn {
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(232, 230, 240, 0.6);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.nl-create__override-btn:hover {
  color: #fff;
  border-color: rgba(140, 170, 255, 0.5);
}

.nl-create__override-btn.on {
  color: #fff;
  background: rgba(140, 170, 255, 0.18);
  border-color: rgba(140, 170, 255, 0.6);
}

/* ---- 创建反馈（含人格化回应） ---- */
.nl-create__feedback {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.nl-create__feedback--habit,
.nl-create__feedback--plan,
.nl-create__feedback--note,
.nl-create__feedback--focus {
  color: #b8f5c8;
  border: 1px solid rgba(120, 220, 150, 0.3);
}

.nl-create__feedback--unsupported {
  color: #ffd2a8;
  border: 1px solid rgba(255, 190, 120, 0.3);
}

.nl-create__feedback-text {
  flex: 1 0 auto;
  min-width: 0;
}

.nl-create__feedback-persona {
  flex: 1 0 100%;
  font-size: 12px;
  font-style: italic;
  color: rgba(232, 230, 240, 0.6);
}

.nl-create__goto {
  flex: 0 0 auto;
  padding: 4px 10px;
  border: 1px solid rgba(140, 170, 255, 0.5);
  border-radius: 8px;
  background: transparent;
  color: #aebfff;
  font-size: 12px;
  cursor: pointer;
}

.nl-create__clear {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: rgba(232, 230, 240, 0.5);
  font-size: 12px;
  cursor: pointer;
}

.nl-fade-enter-active,
.nl-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.nl-fade-enter-from,
.nl-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
