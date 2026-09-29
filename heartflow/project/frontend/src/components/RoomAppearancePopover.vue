<template>
  <transition name="rap-pop">
    <section
      v-if="open"
      class="rap-panel hf-fixed-floating"
      role="dialog"
      aria-label="房间外观设置"
      @keydown.esc="close"
    >
      <!-- 头部 -->
      <header class="rap-head">
        <div class="rap-head__mark" aria-hidden="true">
          <span class="rap-head__line" />
          <span class="rap-head__diamond" />
          <span class="rap-head__line" />
        </div>
        <div class="rap-head__titles">
          <h2 class="rap-head__title">房间外观</h2>
          <p class="rap-head__sub">统一壳层 · 一处改动，全部房间即时生效</p>
        </div>
        <button class="rap-close" type="button" aria-label="关闭" title="关闭" @click="close">
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <div class="rap-body">
        <!-- 实时预览（内嵌 RoomLayout，跟随控件实时变化） -->
        <div class="rap-preview" :style="previewStyle">
          <RoomLayout
            title="样张预览"
            kicker="LIVE PREVIEW"
            subtitle="拖动滑块，下方真实房间同步变化"
            :ornament="shell.ornament.value"
            :align="shell.headerAlign.value"
            :size="shell.titleScale.value"
          >
            <div class="rap-preview__cards">
              <div v-for="n in 3" :key="n" class="rap-preview__card">
                <span class="rap-preview__card-dot" />
                <span class="rap-preview__card-line" :style="{ width: 60 + n * 12 + '%' }" />
                <span class="rap-preview__card-line rap-preview__card-line--sm" :style="{ width: 40 + n * 8 + '%' }" />
              </div>
            </div>
          </RoomLayout>
        </div>

        <!-- 控制区 -->
        <div class="rap-controls">
          <!-- 内容内边距 -->
          <div class="rap-field">
            <div class="rap-field__label">
              <span>内容内边距</span>
              <span class="rap-field__hint">{{ padLabel }}</span>
            </div>
            <div class="rap-seg" role="group" aria-label="内容内边距">
              <button
                v-for="opt in padOptions"
                :key="opt.value"
                type="button"
                class="rap-seg__btn"
                :class="{ 'is-active': shell.contentPad.value === opt.value }"
                :aria-pressed="shell.contentPad.value === opt.value"
                @click="shell.setContentPad(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 标题对齐 -->
          <div class="rap-field">
            <div class="rap-field__label">
              <span>标题对齐</span>
              <span class="rap-field__hint">{{ alignLabel }}</span>
            </div>
            <div class="rap-seg" role="group" aria-label="标题对齐">
              <button
                v-for="opt in alignOptions"
                :key="opt.value"
                type="button"
                class="rap-seg__btn"
                :class="{ 'is-active': shell.headerAlign.value === opt.value }"
                :aria-pressed="shell.headerAlign.value === opt.value"
                @click="shell.setHeaderAlign(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 标题尺度 -->
          <div class="rap-field">
            <div class="rap-field__label">
              <span>标题尺度</span>
              <span class="rap-field__hint">{{ scaleLabel }}</span>
            </div>
            <div class="rap-seg" role="group" aria-label="标题尺度">
              <button
                v-for="opt in scaleOptions"
                :key="opt.value"
                type="button"
                class="rap-seg__btn"
                :class="{ 'is-active': shell.titleScale.value === opt.value }"
                :aria-pressed="shell.titleScale.value === opt.value"
                @click="shell.setTitleScale(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 装饰 / 眉标 开关 -->
          <div class="rap-toggles">
            <button
              type="button"
              class="rap-switch"
              role="switch"
              :aria-checked="shell.ornament.value"
              @click="shell.setOrnament(!shell.ornament.value)"
            >
              <span class="rap-switch__text">装饰菱形</span>
              <span class="rap-switch__track" :class="{ 'is-on': shell.ornament.value }">
                <span class="rap-switch__knob" />
              </span>
            </button>
            <button
              type="button"
              class="rap-switch"
              role="switch"
              :aria-checked="shell.showKicker.value"
              @click="shell.setShowKicker(!shell.showKicker.value)"
            >
              <span class="rap-switch__text">眉标显隐</span>
              <span class="rap-switch__track" :class="{ 'is-on': shell.showKicker.value }">
                <span class="rap-switch__knob" />
              </span>
            </button>
          </div>

          <!-- 样张房间（拖动滑块时，下方指定/随机房间同步变化） -->
          <div class="rap-sample">
            <div class="rap-field__label">
              <span>样张房间</span>
              <span class="rap-field__hint">拖动滑块时，下方房间实时变化</span>
            </div>
            <div class="rap-sample__row">
              <span class="rap-sample__current" :title="currentRoom?.name">
                {{ currentRoom?.name ?? '未知' }}
              </span>
              <button type="button" class="rap-sample__rand" @click="randomRoom">随机房间</button>
            </div>
            <select
              class="rap-sample__select"
              :value="currentRoomId"
              aria-label="跳转到指定房间作为样张"
              @change="onPickRoom($event)"
            >
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <footer class="rap-foot">
        <button type="button" class="rap-foot__reset" @click="reset">恢复默认</button>
        <span class="rap-foot__note">所有改动已本地保存</span>
      </footer>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'
import RoomLayout from './RoomLayout.vue'
import { useRouter } from 'vue-router'
import { useRoomShellAppearance, CONTENT_PAD_PX } from '../modules/customization/useRoomShellAppearance'
import type { ContentPadDensity, HeaderAlign, TitleScale } from '../modules/customization/useRoomShellAppearance'
import { getAllRooms } from '../engine/room-graph'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { safePush } from '@/utils/router-safe'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const shell = useRoomShellAppearance()
const router = useRouter()
const nav = useRoomNavigation()
const rooms = getAllRooms()

const currentRoomId = computed(() => nav.currentRoomId.value)
const currentRoom = computed(() => rooms.find((r) => r.id === currentRoomId.value))

const padOptions: { value: ContentPadDensity; label: string }[] = [
  { value: 'compact', label: '紧凑' },
  { value: 'normal', label: '标准' },
  { value: 'spacious', label: '宽松' },
]
const alignOptions: { value: HeaderAlign; label: string }[] = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
]
const scaleOptions: { value: TitleScale; label: string }[] = [
  { value: 'default', label: '常规' },
  { value: 'hero', label: '首屏大' },
]

const padLabel = computed(() => padOptions.find((o) => o.value === shell.contentPad.value)?.label ?? '')
const alignLabel = computed(() => alignOptions.find((o) => o.value === shell.headerAlign.value)?.label ?? '')
const scaleLabel = computed(() => scaleOptions.find((o) => o.value === shell.titleScale.value)?.label ?? '')

// 预览区：就地覆盖 --room-content-pad，使内边距变化在样张中即时可见（不依赖全局 :root 时机）
const previewStyle = computed<Record<string, string>>(() => ({
  '--room-content-pad': CONTENT_PAD_PX[shell.contentPad.value] ?? CONTENT_PAD_PX.normal,
}))

function close(): void {
  emit('update:open', false)
}

function onPickRoom(e: Event): void {
  const id = (e.target as HTMLSelectElement).value
  const room = rooms.find((r) => r.id === id)
  if (room) safePush(router, room.path)
}

function randomRoom(): void {
  const pool = rooms.filter((r) => r.id !== 'home' && r.id !== currentRoomId.value)
  if (!pool.length) return
  const pick = pool[Math.floor(Math.random() * pool.length)]
  safePush(router, pick.path)
}

function reset(): void {
  shell.setContentPad('normal')
  shell.setHeaderAlign('left')
  shell.setOrnament(true)
  shell.setShowKicker(true)
  shell.setTitleScale('default')
}

// Esc 关闭
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}
watch(
  () => props.open,
  (v) => {
    if (v) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
  { immediate: true },
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* ============================================================
   房间外观 · 悬浮设置窗（impeccable · 净透琉璃风）
   右下角常驻浮层，不挡住下方房间；拖动滑块，房间实时变化。
   ============================================================ */
.rap-panel {
  /* 定位：桌面贴右上角；移动端改底部抽屉（见媒体查询） */
  position: fixed;
  top: clamp(16px, 2vw, 28px);
  right: clamp(16px, 2vw, 28px);
  z-index: 200;
  width: min(384px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* 净透琉璃材质：露底透明 + 上缘环境反射 + 厚边环 */
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(18, 16, 22, 0.72);
  backdrop-filter: blur(22px) saturate(1.3);
  -webkit-backdrop-filter: blur(22px) saturate(1.3);
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.18);
  border-radius: 18px;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: var(--text-primary, #e8e0d8);
}

/* 入场动画：scale + 位移 + 淡入，ease-out-expo 收束 */
.rap-pop-enter-active,
.rap-pop-leave-active {
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.rap-pop-enter-from,
.rap-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.97);
}

/* ---- 头部 ---- */
.rap-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.1);
}
.rap-head__mark {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.rap-head__line {
  width: 20px;
  height: 1px;
  background: var(--accent, #d4a574);
  opacity: 0.45;
}
.rap-head__diamond {
  width: 6px;
  height: 6px;
  transform: rotate(45deg);
  background: var(--accent, #d4a574);
  box-shadow: 0 0 10px var(--accent, #d4a574);
}
.rap-head__titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}
.rap-head__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
}
.rap-head__sub {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  letter-spacing: 0.3px;
}
.rap-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.rap-close:hover {
  color: var(--accent, #d4a574);
  border-color: rgba(var(--accent-rgb, 212, 165, 116), 0.4);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.08);
}

/* ---- 主体（预览 + 控制）---- */
.rap-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px 4px;
  overflow-y: auto;
  min-height: 0;
}

/* 预览：内嵌 RoomLayout，整块做轻微玻璃卡，padding 变化即时可见 */
.rap-preview {
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.12);
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
  /* padding 变化平滑过渡（ease-out-quart） */
  transition: --room-content-pad 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}
.rap-preview :deep(.room-layout__body) {
  gap: 12px;
  transition: padding 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}
.rap-preview :deep(.rh-title) {
  /* 预览标题稍小，避免样张喧宾夺主 */
  font-size: clamp(16px, 2.4vw, 20px) !important;
  letter-spacing: 1px !important;
}
.rap-preview__cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rap-preview__card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rap-preview__card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent, #d4a574);
  flex-shrink: 0;
}
.rap-preview__card-line {
  height: 7px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.28);
}
.rap-preview__card-line--sm {
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
}

/* ---- 控制区 ---- */
.rap-controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rap-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.rap-field__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.rap-field__label > span:first-child {
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: var(--text-primary, #e8e0d8);
}
.rap-field__hint {
  font-size: 10.5px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  letter-spacing: 0.2px;
}

/* 分段控件：滑动激活指示 */
.rap-seg {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 11px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rap-seg__btn {
  flex: 1 1 0;
  min-width: 0;
  padding: 7px 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition:
    color 0.22s ease,
    background 0.22s ease,
    box-shadow 0.22s ease;
}
.rap-seg__btn:hover {
  color: var(--text-primary, #e8e0d8);
}
.rap-seg__btn.is-active {
  color: #fff;
  background: linear-gradient(180deg, var(--accent, #d4a574), color-mix(in srgb, var(--accent, #d4a574) 78%, #000));
  box-shadow: 0 4px 14px rgba(var(--accent-rgb, 212, 165, 116), 0.35);
}

/* 开关 */
.rap-toggles {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rap-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: none;
  background: none;
  padding: 2px 0;
  cursor: pointer;
  color: var(--text-primary, #e8e0d8);
  font-size: 12.5px;
}
.rap-switch__text {
  letter-spacing: 0.3px;
}
.rap-switch__track {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.26s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.26s ease;
  flex-shrink: 0;
}
.rap-switch__track.is-on {
  background: linear-gradient(180deg, var(--accent, #d4a574), color-mix(in srgb, var(--accent, #d4a574) 75%, #000));
  border-color: transparent;
}
.rap-switch__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rap-switch__track.is-on .rap-switch__knob {
  transform: translateX(18px);
}

/* 样张房间 */
.rap-sample {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rap-sample__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rap-sample__current {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 7px 10px;
  border-radius: 9px;
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.08);
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.14);
  font-size: 12px;
  color: var(--text-primary, #e8e0d8);
}
.rap-sample__rand {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.3);
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.1);
  color: var(--accent, #d4a574);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.rap-sample__rand:hover {
  background: rgba(var(--accent-rgb, 212, 165, 116), 0.18);
}
.rap-sample__select {
  width: 100%;
  padding: 7px 10px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
  cursor: pointer;
}
.rap-sample__select:focus-visible {
  outline: 1px solid var(--accent, #d4a574);
}

/* ---- 底部 ---- */
.rap-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px 14px;
  border-top: 1px solid rgba(var(--accent-rgb, 212, 165, 116), 0.1);
}
.rap-foot__reset {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.rap-foot__reset:hover {
  color: var(--text-primary, #e8e0d8);
  border-color: rgba(255, 255, 255, 0.2);
}
.rap-foot__note {
  font-size: 10.5px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  letter-spacing: 0.2px;
}

/* ---- 移动端：改底部抽屉，避让底栏 ---- */
@media (max-width: 639px) {
  .rap-panel {
    top: auto;
    right: 0;
    left: 0;
    bottom: calc(var(--edge-bar-h, 56px) + 8px);
    width: 100%;
    max-height: 78dvh;
    border-radius: 18px 18px 0 0;
  }
  .rap-pop-enter-from,
  .rap-pop-leave-to {
    transform: translateY(16px) scale(1);
  }
}
@media (max-width: 374px) {
  .rap-panel {
    bottom: calc(var(--edge-bar-h, 56px) + 4px);
  }
}
</style>
