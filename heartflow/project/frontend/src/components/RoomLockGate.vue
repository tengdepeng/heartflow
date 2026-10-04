<template>
  <transition name="rlg-fade">
    <div v-if="locked" class="rlg-mask" role="dialog" aria-modal="true" :aria-label="`${roomName} 已锁定`">
      <div class="rlg-card">
        <div class="rlg-icon">🔒</div>
        <h2 class="rlg-title">{{ roomName }} 已锁定</h2>
        <p class="rlg-sub">该房间已开启房间锁，输入密码以进入</p>

        <form class="rlg-form" @submit.prevent="submit">
          <input
            ref="pwInput"
            v-model="pwd"
            type="password"
            class="rlg-input"
            placeholder="房间密码"
            autocomplete="off"
            @keyup.enter="submit"
          />
          <button class="rlg-btn" type="submit" :disabled="!pwd">解锁</button>
        </form>

        <p v-if="err" class="rlg-err">密码不正确，请重试</p>
        <p v-if="hint" class="rlg-hint">提示：{{ hint }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
// ============================================================
// 房间级锁 · 进入遮罩（INCR-469）
// 当当前房间「已配置房间锁且本会话未解锁」时覆盖全屏，
// 校验通过即解锁。挂载于 App.vue 主内容区，随路由切换自动重判。
// ============================================================
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoomLock } from '../modules/room-lock'
import { getAllRooms } from '../engine/room-graph'

const props = defineProps<{ roomId: string }>()

const lock = useRoomLock()
const pwd = ref('')
const err = ref(false)
const pwInput = ref<HTMLInputElement | null>(null)

const locked = computed(() => lock.isLocked(props.roomId))
const hint = computed(() => lock.getHint(props.roomId))
const roomName = computed(
  () => getAllRooms().find((r) => r.id === props.roomId)?.name ?? '房间',
)

function focusInput(): void {
  nextTick(() => pwInput.value?.focus())
}

// 切换房间：清空输入与错误，若目标房间上锁则聚焦
watch(
  () => props.roomId,
  () => {
    pwd.value = ''
    err.value = false
    if (locked.value) focusInput()
  },
)

watch(locked, (v) => {
  if (v) focusInput()
})

onMounted(() => {
  if (locked.value) focusInput()
})

function submit(): void {
  if (!pwd.value) return
  if (lock.unlock(props.roomId, pwd.value)) {
    pwd.value = ''
    err.value = false
  } else {
    err.value = true
    pwd.value = ''
    focusInput()
  }
}
</script>

<style scoped>
.rlg-mask {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal, 9999) - 1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(120% 120% at 50% 30%, rgba(28, 22, 18, 0.9), rgba(10, 8, 14, 0.96));
  backdrop-filter: blur(14px);
}

.rlg-card {
  width: min(360px, 90vw);
  padding: 30px 26px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  background: rgba(42, 36, 30, 0.66);
  border: 1px solid rgba(212, 165, 116, 0.18);
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.06);
}

.rlg-icon {
  font-size: 38px;
  line-height: 1;
}

.rlg-title {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 500;
  color: rgba(245, 232, 210, 0.92);
}

.rlg-sub {
  margin: 0;
  font-size: 13px;
  color: rgba(245, 232, 210, 0.5);
  line-height: 1.6;
}

.rlg-form {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

.rlg-input {
  flex: 1;
  min-width: 0;
  padding: 10px 13px;
  border-radius: 11px;
  border: 1px solid rgba(212, 165, 116, 0.22);
  background: rgba(20, 16, 14, 0.5);
  color: rgba(245, 232, 210, 0.9);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.rlg-input:focus {
  border-color: rgba(212, 165, 116, 0.5);
}

.rlg-input::placeholder {
  color: rgba(245, 232, 210, 0.32);
}

.rlg-btn {
  padding: 0 20px;
  border-radius: 11px;
  border: 1px solid rgba(212, 165, 116, 0.4);
  background: rgba(212, 165, 116, 0.14);
  color: #e8c97a;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.rlg-btn:hover:not(:disabled) {
  background: rgba(212, 165, 116, 0.24);
}

.rlg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rlg-err {
  margin: 0;
  font-size: 12px;
  color: #ef8a8a;
}

.rlg-hint {
  margin: 0;
  font-size: 11px;
  color: rgba(245, 232, 210, 0.4);
}

.rlg-fade-enter-active,
.rlg-fade-leave-active {
  transition: opacity 0.25s ease;
}

.rlg-fade-enter-from,
.rlg-fade-leave-to {
  opacity: 0;
}
</style>
