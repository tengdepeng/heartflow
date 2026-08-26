<template>
  <div class="unlock-gate" data-enter>
    <div class="unlock-card">
      <div class="unlock-orb">
        <div class="unlock-orb-core"></div>
        <div class="unlock-orb-ring"></div>
      </div>
      <h2 class="unlock-title">心流已锁</h2>
      <p class="unlock-desc">本地存储已加密。输入口令以解锁你的心流。</p>

      <form class="unlock-form" @submit.prevent="submit">
        <input
          ref="pwInput"
          v-model="password"
          type="password"
          class="unlock-input"
          placeholder="存储口令"
          autocomplete="current-password"
          :disabled="busy"
          @keyup.enter="submit"
        />
        <button class="unlock-btn" type="submit" :disabled="busy || !password">
          {{ busy ? '解锁中…' : '解锁' }}
        </button>
      </form>

      <p v-if="error" class="unlock-error">{{ error }}</p>

      <button class="unlock-device" type="button" :disabled="busy" @click="useDevice">
        用本设备解锁（忘记口令时）
      </button>
      <p class="unlock-hint">本机已开启设备兜底解锁：即使忘记口令，也能在本机恢复数据。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useViewEntrance } from '../../composables/useViewEntrance'
import { useUnlockStore } from '../../stores/unlock'

useViewEntrance()

const unlockStore = useUnlockStore()
const password = ref('')
const error = ref('')
const busy = ref(false)
const pwInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  nextTick(() => pwInput.value?.focus())
})

async function submit() {
  if (!password.value || busy.value) return
  busy.value = true
  error.value = ''
  const ok = await unlockStore.unlockWithPassword(password.value)
  busy.value = false
  if (!ok) {
    error.value = '口令错误，请重试'
    password.value = ''
    pwInput.value?.focus()
  }
}

async function useDevice() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  const ok = await unlockStore.unlockWithDeviceKey()
  busy.value = false
  if (!ok) error.value = '本设备解锁失败'
}
</script>

<style scoped>
.unlock-gate {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(120% 120% at 50% 30%, rgba(28, 22, 18, 0.92), rgba(10, 8, 14, 0.96));
  backdrop-filter: blur(18px);
}

.unlock-card {
  width: min(380px, 88vw);
  padding: 36px 32px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: rgba(42, 36, 30, 0.62);
  border: 1px solid rgba(212, 165, 116, 0.18);
  border-radius: 22px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.06);
}

.unlock-orb {
  position: relative;
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.unlock-orb-core {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f4d9a8, #d4a574 55%, #9c6b3f 100%);
  box-shadow: 0 0 26px rgba(212, 165, 116, 0.55), inset 0 2px 6px rgba(255, 255, 255, 0.4);
  animation: unlock-float 4s ease-in-out infinite;
}

.unlock-orb-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(212, 165, 116, 0.35);
  animation: unlock-spin 9s linear infinite;
}

@keyframes unlock-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes unlock-spin {
  to { transform: rotate(360deg); }
}

.unlock-title {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
  color: rgba(245, 232, 210, 0.9);
}

.unlock-desc {
  margin: 0;
  font-size: 13px;
  color: rgba(245, 232, 210, 0.5);
  text-align: center;
  line-height: 1.6;
}

.unlock-form {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

.unlock-input {
  flex: 1;
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid rgba(212, 165, 116, 0.22);
  background: rgba(20, 16, 14, 0.5);
  color: rgba(245, 232, 210, 0.9);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.unlock-input:focus {
  border-color: rgba(212, 165, 116, 0.5);
}

.unlock-input::placeholder {
  color: rgba(245, 232, 210, 0.32);
}

.unlock-btn {
  padding: 0 22px;
  border-radius: 11px;
  border: 1px solid rgba(212, 165, 116, 0.4);
  background: rgba(212, 165, 116, 0.14);
  color: #e8c97a;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-btn:hover:not(:disabled) {
  background: rgba(212, 165, 116, 0.24);
}

.unlock-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.unlock-error {
  margin: 0;
  font-size: 12px;
  color: #ef8a8a;
}

.unlock-device {
  margin-top: 4px;
  background: none;
  border: none;
  color: rgba(212, 165, 116, 0.8);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.unlock-device:hover:not(:disabled) {
  color: #e8c97a;
}

.unlock-device:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.unlock-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(245, 232, 210, 0.32);
  text-align: center;
  line-height: 1.5;
}
</style>
