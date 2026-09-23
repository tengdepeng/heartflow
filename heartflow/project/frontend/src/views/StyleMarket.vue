<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance sm">
    <!-- 统一房间壳层 -->
    <RoomLayout
      title="风格工坊"
      kicker="自定义你的殿堂风格"
      data-enter
    >
      <template #meta>
        <!-- Overview cards -->
        <div data-enter class="sm-overview">
      <div class="sm-overview-card">
        <div class="sm-overview-value">{{ packs.length }}</div>
        <div class="sm-overview-label">风格包</div>
      </div>
      <div class="sm-overview-card">
        <div class="sm-overview-value">2</div>
        <div class="sm-overview-label">明暗模式</div>
      </div>
      <div class="sm-overview-card">
        <div class="sm-overview-value">1</div>
        <div class="sm-overview-label">导入区</div>
      </div>
    </div>
      </template>

    <!-- 我的风格包 -->
    <section data-enter class="sm-section">
      <h2 class="sm-section-title">我的风格包</h2>
      <div v-if="packs.length === 0" class="sm-empty-hint">
        暂无风格包，创建一个吧
      </div>
      <div v-else class="sm-pack-grid">
        <article
          v-for="pack in packs"
          :key="pack.id"
          class="sm-pack-card"
          :class="{ 'sm-pack-card--active': pack.id === activeId }"
        >
          <div class="sm-pack-colors">
            <span :style="{ background: pack.theme.colors.accent }" />
            <span :style="{ background: pack.theme.colors.bgPrimary }" />
            <span :style="{ background: pack.theme.colors.textPrimary }" />
            <span :style="{ background: pack.theme.colors.bgSecondary }" />
          </div>
          <div class="sm-pack-info">
            <h3 class="sm-pack-name">{{ pack.name }}</h3>
            <span class="sm-pack-version">v{{ pack.version }}</span>
          </div>
          <div class="sm-pack-actions">
            <button
              class="sm-pack-btn"
              :class="{ active: pack.id === activeId }"
            :disabled="pack.id === activeId"
            @click="style.activate(pack.id)"
            >
              {{ pack.id === activeId ? '使用中' : '应用' }}
            </button>
            <button class="sm-pack-btn" @click="style.exportPack(pack.id)">
              导出
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- 创建新风格包 -->
    <section data-enter class="sm-section">
      <h2 class="sm-section-title">创建新风格包</h2>
      <div class="sm-create-form">
        <div class="sm-mode-tabs">
          <button
            class="sm-mode-tab"
            :class="{ active: newPackMode === 'dark' }"
            @click="newPackMode = 'dark'"
          >
            暗色
          </button>
          <button
            class="sm-mode-tab"
            :class="{ active: newPackMode === 'light' }"
            @click="newPackMode = 'light'"
          >
            亮色
          </button>
        </div>
        <div class="sm-form-row">
          <label class="sm-form-label">风格包名称</label>
          <input
            v-model="newPackName"
            class="sm-form-input"
            placeholder="输入风格包名称"
            type="text"
          />
        </div>
        <div class="sm-form-row">
          <label class="sm-form-label">基础色</label>
          <div class="sm-palette-preview">
            <button
              v-for="c in paletteColors"
              :key="c"
              class="sm-palette-color"
              :class="{ active: newPackColor === c }"
              :style="{ background: c }"
              :aria-label="'选择颜色 ' + c"
              @click="newPackColor = c"
            />
          </div>
        </div>
        <button
          class="sm-form-btn"
          :disabled="!newPackName.trim()"
          @click="handleCreate"
        >
          创建风格包
        </button>
      </div>
    </section>

    <!-- 导入风格包 -->
    <section data-enter class="sm-section">
      <h2 class="sm-section-title">导入风格包</h2>
      <div class="sm-import-section">
        <input
          ref="fileInputRef"
          class="sr-only"
          type="file"
          accept=".hf-style.json,.json"
          @change="handleImport"
        />
        <button class="sm-import-btn" @click="fileInputRef?.click()">
          选择文件并导入
        </button>
        <p v-if="importError" class="sm-empty-hint sm-empty-hint--error">{{ importError }}</p>
        <p v-if="importSuccess" class="sm-empty-hint sm-empty-hint--success">{{ importSuccess }}</p>
      </div>
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useStyle } from '../resonance/bridges/style'
import { importStylePack } from '../modules/style'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import { CATEGORY_PALETTE } from '../theme/categoryColors'

const { entranceRef, entranceClass } = useViewEntrance()
const style = useStyle()
const { packs, activeId } = style

const fileInputRef = ref<HTMLInputElement | null>(null)
const importError = ref('')
const importSuccess = ref('')

const newPackName = ref('')
const newPackColor = ref('#d4a574')
const newPackMode = ref<'dark' | 'light'>('dark')

const paletteColors = [
  CATEGORY_PALETTE[0],  // 琥珀（品牌主色）
  CATEGORY_PALETTE[3],  // 赭石
  CATEGORY_PALETTE[2],  // 古铜
  CATEGORY_PALETTE[5],  // 陶土玫
  CATEGORY_PALETTE[6],  // 烟玫
  CATEGORY_PALETTE[7],  // 雾紫（低饱和紫点缀）
  CATEGORY_PALETTE[10], // 雾青（低饱和青点缀）
  CATEGORY_PALETTE[14], // 暖锈（红·暖替）
]

function handleCreate() {
  const name = newPackName.value.trim()
  if (!name) return
  style.createFromBaseColor(name, newPackColor.value, newPackMode.value)
  newPackName.value = ''
  newPackColor.value = '#d4a574'
  newPackMode.value = 'dark'
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importError.value = ''
  importSuccess.value = ''

  const reader = new FileReader()
  reader.onload = () => {
    const json = reader.result as string
    const share = importStylePack(json)
    if (!share) {
      importError.value = '文件格式不正确，请检查是否为有效的风格包文件。'
      return
    }
    style.importPack(share)
    importSuccess.value = `成功导入风格包「${share.name}」`
  }
  reader.onerror = () => {
    importError.value = '文件读取失败，请重试。'
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<style scoped>
/* =========================================================
   Style Market — Warm Amber Theme
   All classes use sm- prefix.
   ========================================================= */

/* === Base Container === */
.sm {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  background: transparent;
  color: var(--text-primary);
  isolation: isolate;
  min-height: 100%;
}

.sm :deep(.room-layout) {
  position: relative;
  z-index: 1;
}

/* Ambient glow — top-left aura */
.sm::before {
  content: '';
  position: fixed;
  top: -30%;
  left: 50%;
  translate: -50% 0;
  width: 700px;
  height: 700px;
  background: radial-gradient(
    ellipse,
    rgba(var(--accent-rgb), 0.07) 0%,
    transparent 65%
  );
  pointer-events: none;
  z-index: 0;
}

/* Ambient glow — bottom-right aura */
.sm::after {
  content: '';
  position: fixed;
  bottom: -25%;
  right: -15%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    ellipse,
    rgba(var(--accent-rgb), 0.04) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}


/* === Overview Cards === */
.sm-overview {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.sm-overview-card {
  flex: 1;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  text-align: center;
  transition: border-color 0.25s ease, background 0.25s ease;
}

.sm-overview-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(255, 255, 255, 0.04);
}

.sm-overview-value {
  font-size: 24px;
  font-weight: 300;
  color: var(--accent);
  line-height: 1.2;
  margin-bottom: 4px;
}

.sm-overview-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
  letter-spacing: 1px;
}

/* === Section === */
.sm-section {
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}

.sm-section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  margin: 0 0 16px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
}

/* === Empty Hint === */
.sm-empty-hint {
  padding: 32px 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-low);
  border-radius: 12px;
  border: 1px dashed rgba(var(--accent-rgb), 0.12);
  background: rgba(255, 255, 255, 0.02);
}

.sm-empty-hint--error {
  color: #e87a6b;
  border-color: rgba(232, 122, 107, 0.2);
  background: rgba(232, 122, 107, 0.04);
  margin-top: 12px;
}

.sm-empty-hint--success {
  color: #7ab88a;
  border-color: rgba(122, 184, 138, 0.2);
  background: rgba(122, 184, 138, 0.04);
  margin-top: 12px;
}

/* === Pack Grid === */
.sm-pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.sm-pack-card {
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.25s ease, background 0.25s ease;
}

.sm-pack-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.sm-pack-card--active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.06);
}

/* === Pack Colors (inline color dots) === */
.sm-pack-colors {
  display: flex;
  gap: 6px;
}

.sm-pack-colors span {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* === Pack Info === */
.sm-pack-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sm-pack-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.sm-pack-version {
  font-size: 11px;
  color: var(--text-secondary);
}

/* === Pack Actions === */
.sm-pack-actions {
  display: flex;
  gap: 8px;
}

.sm-pack-btn {
  flex: 1;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sm-pack-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.sm-pack-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.sm-pack-btn.active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--text-primary);
}

/* === Create Form === */
.sm-create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

/* === Mode Tabs === */
.sm-mode-tabs {
  display: flex;
  gap: 8px;
}

.sm-mode-tab {
  flex: 1;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: rgba(var(--text-primary-rgb), 0.6);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.sm-mode-tab:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.sm-mode-tab.active {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--text-primary);
}

/* === Form Row === */
.sm-form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-form-label {
  font-size: 12px;
  color: var(--text-medium);
  letter-spacing: 0.5px;
}

.sm-form-input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.sm-form-input:focus {
  border-color: var(--accent);
}

.sm-form-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.25);
}

/* === Palette Preview === */
.sm-palette-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sm-palette-color {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.sm-palette-color:hover {
  transform: scale(1.1);
}

.sm-palette-color.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.3);
}

/* === Form Button === */
.sm-form-btn {
  align-self: flex-start;
  padding: 10px 24px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sm-form-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.25);
}

.sm-form-btn:disabled {
  opacity: 0.35;
  cursor: default;
  border-color: rgba(var(--accent-rgb), 0.08);
}

/* === Import Section === */
.sm-import-section {
  padding: 24px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px dashed rgba(var(--accent-rgb), 0.15);
  text-align: center;
}

.sm-import-btn {
  padding: 10px 24px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sm-import-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(var(--accent-rgb), 0.25);
}

/* === Screen Reader Only === */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .sm { padding: 32px 20px 64px; }
  .sm-pack-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .sm-title { font-size: 26px; }
}

@media (max-width: 640px) {
  .sm { padding: 24px 14px 56px; }
  .sm-pack-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .sm-pack-card { padding: 14px; }
  .sm-pack-actions { flex-direction: column; }
  .sm-pack-btn { width: 100%; }
}
</style>