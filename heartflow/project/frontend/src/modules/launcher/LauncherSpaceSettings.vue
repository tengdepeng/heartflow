<script setup lang="ts">
// ============================================================
// Launcher · 空间风格设置
// 宪法第 2 条：外观由用户本地保存，不由 AI 定死。预设只是起点。
// 视频背景的现实约束对 UI 明示，不做假承诺：
//   上传视频 = 当前会话临时生效；填绝对路径 = 跨会话持久（Tauri asset 协议）。
// ============================================================
import { computed, ref } from 'vue'
import { useLauncher } from './useLauncher'
import { SPACE_PRESETS } from './spaceTheme'
import type { SpaceLayout } from './spaceLayout'
import { fileToDataUri, fileToObjectUrl, resolveAssetUrl, isPersistentSource } from './spaceMedia'

const { space } = useLauncher()
const cfg = space.config

const videoPath = ref('')
const applying = ref(false)
const note = ref<{ kind: 'ok' | 'warn'; text: string } | null>(null)

const LAYOUTS: ReadonlyArray<{ id: SpaceLayout; name: string; desc: string }> = [
  { id: 'arc', name: '弧墙', desc: '图标沿弧面铺开，纵深推进' },
  { id: 'ring', name: '环阵', desc: '环绕镜头，可旋转巡览' },
  { id: 'grid', name: '网格', desc: '正面墙阵，密集收纳' },
]

const isVideoTemporary = computed(() => !isPersistentSource(cfg.value.backgroundSource))

let noteTimer: ReturnType<typeof setTimeout> | undefined
function flash(kind: 'ok' | 'warn', text: string): void {
  note.value = { kind, text }
  if (noteTimer) clearTimeout(noteTimer)
  noteTimer = setTimeout(() => (note.value = null), 4200)
}

async function onPickImage(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const uri = await fileToDataUri(file)
    space.setBackground('image', uri)
    flash('ok', '背景图已应用并保存')
  } catch {
    flash('warn', '图片读取失败，请换一张试试')
  }
  input.value = ''
}

function onPickVideo(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const url = fileToObjectUrl(file)
  space.setBackground('video', url)
  flash('warn', '视频已应用，但仅当前会话有效；要跨会话请填下方绝对路径')
  input.value = ''
}

async function onApplyVideoPath(): Promise<void> {
  const raw = videoPath.value.trim()
  if (!raw) return
  applying.value = true
  try {
    const url = await resolveAssetUrl(raw)
    space.setBackground('video', url)
    flash('ok', '视频路径已应用（跨会话有效）')
  } catch {
    flash('warn', '路径解析失败，请检查路径是否正确')
  } finally {
    applying.value = false
  }
}

function clearBackground(): void {
  space.setBackground('none', null)
  videoPath.value = ''
  flash('ok', '已清除背景层')
}
</script>

<template>
  <div class="sp-settings">
    <div class="sp-block">
      <span class="sp-title">风格预设</span>
      <div class="sp-preset-row">
        <button
          v-for="p in SPACE_PRESETS"
          :key="p.id"
          class="sp-preset"
          :class="{ 'is-on': cfg.accent === p.config.accent && cfg.layout === p.config.layout }"
          @click="space.applyPreset(p.id)"
        >
          <span class="sp-preset-dot" :style="{ background: p.config.accent }"></span>
          {{ p.name }}
        </button>
      </div>
    </div>

    <div class="sp-block">
      <span class="sp-title">空间形态</span>
      <div class="sp-layout-row">
        <button
          v-for="l in LAYOUTS"
          :key="l.id"
          class="sp-layout"
          :class="{ 'is-on': cfg.layout === l.id }"
          @click="space.setLayout(l.id)"
        >
          <span class="sp-layout-name">{{ l.name }}</span>
          <span class="sp-layout-desc">{{ l.desc }}</span>
        </button>
      </div>
    </div>

    <div class="sp-block">
      <span class="sp-title">背景层</span>
      <div class="sp-row">
        <button class="sp-tab" :class="{ 'is-on': cfg.backgroundKind === 'none' }" @click="clearBackground">
          无
        </button>
        <label class="sp-tab" :class="{ 'is-on': cfg.backgroundKind === 'image' }">
          图片
          <input type="file" accept="image/*" class="sp-file" @change="onPickImage" />
        </label>
        <label class="sp-tab" :class="{ 'is-on': cfg.backgroundKind === 'video' }">
          视频
          <input type="file" accept="video/*" class="sp-file" @change="onPickVideo" />
        </label>
      </div>

      <div v-if="cfg.backgroundKind === 'video'" class="sp-sub">
        <div class="sp-path-row">
          <input
            v-model="videoPath"
            class="sp-input"
            placeholder="视频绝对路径，如 D:\Media\loop.mp4"
            @keydown.enter="onApplyVideoPath"
          />
          <button class="sp-btn" :disabled="applying" @click="onApplyVideoPath">
            {{ applying ? '解析中' : '应用路径' }}
          </button>
        </div>
        <p class="sp-hint">
          上传的视频仅当前会话有效（浏览器安全限制，无法写入本地库）。填入绝对路径后可跨会话生效。
        </p>
        <p v-if="isVideoTemporary" class="sp-hint sp-hint--warn">当前视频背景为临时源，刷新后会失效。</p>
      </div>

      <button
        v-if="cfg.backgroundKind !== 'none'"
        class="sp-btn sp-btn--ghost"
        @click="clearBackground"
      >
        清除背景
      </button>
    </div>

    <div class="sp-block">
      <span class="sp-title">特效强度</span>
      <div class="sp-row sp-row--slider">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="cfg.fxIntensity"
          @input="space.setFxIntensity(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="sp-value">{{ Math.round(cfg.fxIntensity * 100) }}%</span>
      </div>
      <p class="sp-hint">控制星尘密度、光环亮度与呼吸幅度。调低可显著减少 GPU 占用。</p>
    </div>

    <div class="sp-block">
      <span class="sp-title">巡览与配色</span>
      <label class="sp-check">
        <input
          type="checkbox"
          :checked="cfg.autoRotate"
          @change="space.setAutoRotate(($event.target as HTMLInputElement).checked)"
        />
        <span>自动巡览（缓慢旋转，静止时也保持空间感）</span>
      </label>
      <div class="sp-row">
        <span class="sp-label">主色</span>
        <input
          type="color"
          class="sp-color"
          :value="cfg.accent"
          @input="space.setAccent(($event.target as HTMLInputElement).value)"
        />
        <span class="sp-value">{{ cfg.accent }}</span>
      </div>
      <div class="sp-row">
        <span class="sp-label">名称</span>
        <button
          class="sp-tab sp-tab--sm"
          :class="{ 'is-on': cfg.labelMode === 'hover' }"
          @click="space.setLabelMode('hover')"
        >
          悬停显示
        </button>
        <button
          class="sp-tab sp-tab--sm"
          :class="{ 'is-on': cfg.labelMode === 'always' }"
          @click="space.setLabelMode('always')"
        >
          总是显示
        </button>
      </div>
    </div>

    <div class="sp-foot">
      <button class="sp-btn sp-btn--ghost" @click="space.resetSpace()">恢复默认</button>
      <Transition name="sp-fade">
        <span v-if="note" class="sp-note" :class="`sp-note--${note.kind}`">{{ note.text }}</span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.sp-settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--text-primary, #e8e0d8);
}

.sp-block {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.sp-title {
  font-size: 12px;
  letter-spacing: 1px;
  opacity: 0.5;
}

.sp-preset-row,
.sp-layout-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sp-preset {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary, #e8e0d8);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.sp-preset:hover,
.sp-layout:hover {
  border-color: rgba(212, 165, 116, 0.3);
}
.sp-preset.is-on,
.sp-layout.is-on,
.sp-tab.is-on {
  border-color: rgba(212, 165, 116, 0.6);
  background: rgba(212, 165, 116, 0.12);
}
.sp-preset-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}

.sp-layout {
  flex: 1 1 150px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary, #e8e0d8);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.sp-layout-name {
  font-size: 14px;
  font-weight: 500;
}
.sp-layout-desc {
  font-size: 11px;
  opacity: 0.5;
}

.sp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sp-row--slider input[type='range'] {
  flex: 1;
  min-width: 160px;
}
.sp-tab {
  position: relative;
  padding: 7px 16px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary, #e8e0d8);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease, background 0.2s ease;
}
.sp-tab--sm {
  padding: 5px 12px;
  font-size: 12px;
}
.sp-file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.sp-sub {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.sp-path-row {
  display: flex;
  gap: 8px;
}
.sp-input {
  flex: 1;
  min-width: 0;
  padding: 7px 11px;
  border-radius: 9px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e8e0d8);
}
.sp-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  opacity: 0.45;
}
.sp-hint--warn {
  opacity: 0.75;
  color: #e0a06a;
}

.sp-btn {
  padding: 7px 15px;
  border-radius: 9px;
  font-size: 13px;
  cursor: pointer;
  background: rgba(212, 165, 116, 0.16);
  color: var(--accent, #d4a574);
  border: 1px solid rgba(212, 165, 116, 0.3);
}
.sp-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.sp-btn--ghost {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #e8e0d8);
  border-color: rgba(255, 255, 255, 0.1);
  align-self: flex-start;
}

.sp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.85;
}
.sp-label {
  font-size: 12px;
  opacity: 0.55;
}
.sp-color {
  width: 40px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 7px;
  background: none;
  cursor: pointer;
}
.sp-value {
  font-size: 12px;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.sp-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.sp-note {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  opacity: 0.85;
}
.sp-note--warn {
  color: #e0a06a;
}
.sp-note--ok {
  color: #7fd0bb;
}

.sp-fade-enter-active,
.sp-fade-leave-active {
  transition: opacity 0.2s ease;
}
.sp-fade-enter-from,
.sp-fade-leave-to {
  opacity: 0;
}
</style>
