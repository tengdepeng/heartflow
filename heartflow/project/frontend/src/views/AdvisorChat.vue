<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance achat">
    <!-- Header -->
    <div data-enter class="achat-header">
      <div class="achat-back-row">
        <button class="achat-back-btn" @click="goBack">← 返回</button>
      </div>
      <div class="achat-advisor-info" v-if="advisorProfile">
        <div class="achat-avatar" :style="avatarStyle">
          <span class="achat-avatar-icon">{{ roleIcon }}</span>
        </div>
        <div class="achat-advisor-meta">
          <span class="achat-advisor-name">{{ advisorProfile.name }}</span>
          <span class="achat-advisor-role">{{ roleLabel }}</span>
        </div>
        <div class="achat-affinity-badge" :style="affinityBadgeStyle">
          {{ affinityTier }}
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div class="achat-conversation" ref="chatContainerRef">
      <div v-if="!advisorProfile" class="achat-invalid">
        <span class="achat-invalid-icon">⚠️</span>
        <p class="achat-invalid-title">无效的幕僚 ID</p>
        <p class="achat-invalid-desc">该幕僚不存在或已被移除，无法开始对话。</p>
        <button class="achat-invalid-back" @click="goBack">返回幕僚列表</button>
      </div>
      <div v-else-if="chatMessages.length === 0" class="achat-empty">
        <span class="achat-empty-icon">💬</span>
        <p class="achat-empty-text">开始与 {{ advisorProfile?.name ?? '幕僚' }} 对话</p>
      </div>
      <!-- 对话分身档案（INCR-08：DeepSeek/Kimi 式分身画像） -->
      <AdvisorChatArchivePanel :advisor-id="advisorId" />
      <div
        v-for="(msg, idx) in chatMessages"
        :key="msg.id"
        class="achat-msg"
        :class="msg.direction === 'advisor_says' ? 'achat-msg--advisor' : 'achat-msg--user'"
        :style="{ '--chat-delay': idx * 0.04 + 's' }"
      >
        <div class="achat-msg-bubble" :class="msg.direction === 'advisor_says' ? 'achat-bubble--advisor' : 'achat-bubble--user'">
          <p class="achat-msg-text">{{ msg.text }}</p>
          <span class="achat-msg-time">{{ fmtTime(msg.at) }}</span>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="achat-input-area">
      <textarea
        v-model="inputText"
        class="achat-input"
        :placeholder="advisorProfile ? '输入消息…' : '请选择有效幕僚后开始对话'"
        rows="2"
        @keydown.enter.exact="handleSend"
        :disabled="sending || !advisorProfile"
      ></textarea>
      <button
        class="achat-send-btn"
        @click="handleSend"
        :disabled="!inputText.trim() || sending || !advisorProfile"
      >
        {{ sending ? '…' : '发送' }}
      </button>
    </div>

    <!-- 性格提示 -->
    <p class="achat-personality-hint" v-if="personalityStyle">
      当前对话风格：{{ personalityStyle }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { ADVISOR_PERSONALITIES, AFFINITY_TIERS } from '../types'
import { useViewEntrance } from '../composables/useViewEntrance'
import AdvisorChatArchivePanel from '../components/AdvisorChatArchivePanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const router = useRouter()
const route = useRoute()
const advisor = useAdvisor()

const advisorId = route.params.id as string
const inputText = ref('')
const sending = ref(false)
const chatContainerRef = ref<HTMLDivElement | null>(null)

// ---- 幕僚信息 ----
const advisorProfile = computed(() => advisor.getAdvisorById(advisorId))
const personalityDef = computed(() => {
  if (!advisorProfile.value) return null
  return ADVISOR_PERSONALITIES.find(p => p.key === advisorProfile.value!.personality) ?? null
})

const roleIcon = computed(() => {
  const icons: Record<string, string> = {
    hermit: '🧘', scholar: '📚', craftsman: '🔨', guardian: '🛡️',
  }
  return icons[advisorProfile.value?.role ?? ''] ?? '🧘'
})

const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    hermit: '隐士', scholar: '学士', craftsman: '匠人', guardian: '守护者',
  }
  return labels[advisorProfile.value?.role ?? ''] ?? ''
})

const personalityStyle = computed(() => {
  return personalityDef.value?.style ?? null
})

const avatarStyle = computed(() => {
  const cs = advisorProfile.value?.customColorScheme ?? personalityDef.value?.colorScheme
  return {
    background: cs ? `${cs.primary}22` : 'rgba(var(--accent-rgb), 0.1)',
    borderColor: cs ? `${cs.primary}44` : 'rgba(var(--accent-rgb), 0.2)',
  }
})

// ---- 好感度 ----
const affinityTier = computed(() => {
  if (!advisorProfile.value) return '--'
  const p = advisorProfile.value
  for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
    const t = AFFINITY_TIERS[i]
    if (p.affinity >= t.threshold && p.totalInteractions >= t.minInteractions) {
      return t.title
    }
  }
  return AFFINITY_TIERS[0].title
})

const affinityBadgeStyle = computed(() => {
  if (!advisorProfile.value) return {}
  const p = advisorProfile.value
  let idx = 0
  for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
    const t = AFFINITY_TIERS[i]
    if (p.affinity >= t.threshold && p.totalInteractions >= t.minInteractions) {
      idx = i
      break
    }
  }
  const bgColors = [
    'rgba(120,120,120,0.2)',
    'rgba(160,160,160,0.2)',
    'rgba(140,120,200,0.2)',
    'rgba(120,100,220,0.25)',
    'rgba(200,160,80,0.25)',
    'rgba(220,180,60,0.3)',
  ]
  const textColors = [
    'rgba(255,255,255,0.35)',
    'rgba(255,255,255,0.45)',
    'rgba(255,255,255,0.55)',
    'rgba(200,180,255,0.75)',
    'rgba(255,220,120,0.85)',
    'rgba(255,200,80,1)',
  ]
  return {
    background: bgColors[idx] ?? bgColors[0],
    color: textColors[idx] ?? textColors[0],
  }
})

// ---- 对话消息 ----
interface ChatMsg {
  id: string
  text: string
  at: string
  direction: 'advisor_says' | 'user_replies'
}

const chatMessages = computed<ChatMsg[]>(() => {
  return advisor.messages
    .filter(m => {
      // 只显示该幕僚相关的消息或用户回复
      return m.direction === 'user_replies' || (m.direction === 'advisor_says' && m.trigger === 'advisor_reply')
    })
    .slice(-50)
    .map(m => ({
      id: m.id,
      text: m.text,
      at: m.at,
      direction: m.direction as 'advisor_says' | 'user_replies',
    }))
})

// 滚动到底部
watch(chatMessages, async () => {
  await nextTick()
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}, { deep: true })

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value || !advisorProfile.value) return
  sending.value = true
  inputText.value = ''

  try {
    await advisor.reply(advisorId, text)
  } catch {
    // 失败时使用同步回复
    advisor.replySync(advisorId, text)
  } finally {
    sending.value = false
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goBack() {
  router.push('/advisors')
}
</script>

<style scoped>
/* =============================================================
   幕僚对话 — Warm Amber Theme
   ============================================================= */
.achat {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 32px 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.achat::before {
  content: '';
  position: absolute;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.achat-header {
  position: relative;
  z-index: 1;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.achat-back-row {
  margin-bottom: 12px;
}
.achat-back-btn {
  background: none;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  padding: 6px 14px;
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.achat-back-btn:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.achat-advisor-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.achat-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.achat-avatar-icon {
  font-size: 22px;
  line-height: 1;
}
.achat-advisor-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.achat-advisor-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255,240,224,0.92);
}
.achat-advisor-role {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}
.achat-affinity-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

/* ---- Conversation Area ---- */
.achat-conversation {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
  position: relative;
  z-index: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--accent-rgb), 0.1) transparent;
}

/* ---- Invalid ---- */
.achat-invalid {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  text-align: center;
}
.achat-invalid-icon {
  font-size: 36px;
  opacity: 0.45;
}
.achat-invalid-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(240, 232, 224, 0.85);
  margin: 0;
}
.achat-invalid-desc {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.4);
  margin: 0;
}
.achat-invalid-back {
  margin-top: 8px;
  padding: 8px 22px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.achat-invalid-back:hover {
  background: rgba(var(--accent-rgb), 0.22);
}

/* ---- Empty ---- */
.achat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  text-align: center;
}
.achat-empty-icon {
  font-size: 36px;
  opacity: 0.3;
}
.achat-empty-text {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.25);
  margin: 0;
}

/* ---- Message ---- */
.achat-msg {
  display: flex;
  animation: chat-fade-in 0.3s ease both;
  animation-delay: var(--chat-delay, 0s);
}
@keyframes chat-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.achat-msg--advisor {
  justify-content: flex-start;
}
.achat-msg--user {
  justify-content: flex-end;
}

.achat-msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
}
.achat-bubble--advisor {
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-bottom-left-radius: 4px;
}
.achat-bubble--user {
  background: rgba(var(--accent-rgb), 0.15);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-bottom-right-radius: 4px;
}

.achat-msg-text {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(240,232,224,0.9);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.achat-msg-time {
  display: block;
  font-size: 9px;
  color: rgba(var(--accent-rgb), 0.2);
  margin-top: 4px;
  text-align: right;
}

/* ---- Input Area ---- */
.achat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 0;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}
.achat-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(240,232,224,0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
}
.achat-input::placeholder {
  color: rgba(var(--accent-rgb), 0.2);
}
.achat-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.achat-input:disabled {
  opacity: 0.5;
}
.achat-send-btn {
  align-self: flex-end;
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.achat-send-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.25);
}
.achat-send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ---- Personality Hint ---- */
.achat-personality-hint {
  text-align: center;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.2);
  margin: 0 0 12px;
  padding: 0;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .achat { padding: 24px 14px 0; }
  .achat-msg-bubble { max-width: 85%; }
  .achat-input-area { padding: 8px 0; }
}
</style>