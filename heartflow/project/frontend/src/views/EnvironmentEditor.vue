<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance ee">
    <RoomLayout title="环境编辑器" kicker="调整全局环境参数" data-enter>
      <div class="ee-form" data-enter>
        <!-- 背景氛围 -->
        <div class="ee-field">
          <label class="ee-label">背景氛围</label>
          <select v-model="form.background" class="ee-select">
            <option value="default">默认暖色</option>
            <option value="dark">深色静谧</option>
            <option value="light">明亮清新</option>
            <option value="nature">自然绿意</option>
            <option value="ocean">海洋蓝调</option>
          </select>
        </div>

        <!-- 环境光色 -->
        <div class="ee-field">
          <label class="ee-label">环境光色</label>
          <div class="ee-color-row">
            <input v-model="form.accentColor" type="color" class="ee-color-picker" />
            <span class="ee-color-value">{{ form.accentColor }}</span>
          </div>
        </div>

        <!-- 显示密度 -->
        <div class="ee-field">
          <label class="ee-label">显示密度</label>
          <div class="ee-density-row">
            <button
              v-for="d in densities"
              :key="d.value"
              class="ee-density-btn"
              :class="{ active: form.density === d.value }"
              @click="form.density = d.value"
            >
              <span class="ee-density-icon">{{ d.icon }}</span>
              <span class="ee-density-label">{{ d.label }}</span>
            </button>
          </div>
        </div>

        <!-- 字体偏好 -->
        <div class="ee-field">
          <label class="ee-label">字体偏好</label>
          <select v-model="form.fontFamily" class="ee-select">
            <option value="serif">衬线体 (Serif)</option>
            <option value="sans-serif">无衬线体 (Sans)</option>
            <option value="monospace">等宽体 (Mono)</option>
          </select>
        </div>

        <!-- 过渡动画 -->
        <div class="ee-field">
          <label class="ee-label">页面过渡动画</label>
          <select v-model="form.transition" class="ee-select">
            <option value="fade">淡入淡出</option>
            <option value="slide">滑动</option>
            <option value="none">无</option>
          </select>
        </div>

        <div class="ee-actions">
          <button class="ee-btn primary" @click="saveEnvironment">保存设置</button>
          <button class="ee-btn" @click="resetEnvironment">重置默认</button>
        </div>
      </div>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useStyleStore } from '../stores/style'
import { recordDecorationHistory } from '../modules/decoration-history'
import RoomLayout from '../components/RoomLayout.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const styleStore = useStyleStore()
const densities = [
  { value: 'compact', label: '紧凑', icon: '📏' },
  { value: 'normal', label: '标准', icon: '📐' },
  { value: 'spacious', label: '宽松', icon: '📜' },
]

const form = reactive({
  background: 'default',
  accentColor: '#d4a574',
  density: 'normal',
  fontFamily: 'serif',
  transition: 'fade',
})

onMounted(() => {
  const config = storage.getConfig()
  if (config) {
    form.background = (config as any).background || 'default'
    form.accentColor = (config as any).accentColor || '#d4a574'
    form.density = (config as any).density || 'normal'
    form.fontFamily = (config as any).fontFamily || 'serif'
    form.transition = (config as any).transition || 'fade'
  }
})

function saveEnvironment() {
  const config = storage.getConfig()
  const updated = {
    ...config,
    background: form.background,
    accentColor: form.accentColor,
    density: form.density,
    fontFamily: form.fontFamily,
    transition: form.transition,
  } as any
  storage.setConfig(updated)
  // 将环境参数即时应用到全局主题（此前存了却未被消费，导致"改了不生效"）
  styleStore.applyEnvironmentConfig(updated)
  recordDecorationHistory('🎨', '调整环境', `背景:${form.background} 光色:${form.accentColor} 密度:${form.density}`)
}

function resetEnvironment() {
  form.background = 'default'
  form.accentColor = '#d4a574'
  form.density = 'normal'
  form.fontFamily = 'serif'
  form.transition = 'fade'
  saveEnvironment()
}
</script>

<style scoped>
.ee {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  min-height: 100%;
  overflow-y: auto;
  background: transparent;
}
.ee-form { display: flex; flex-direction: column; gap: 20px; }
.ee-field { display: flex; flex-direction: column; gap: 6px; }
.ee-label { font-size: 13px; font-weight: 500; color: var(--text-bright); }
.ee-select { padding: 10px 12px; border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 8px; background: rgba(var(--bg-card-rgb), 0.5); color: var(--text-high); font-family: inherit; font-size: 13px; outline: none; }
.ee-color-row { display: flex; align-items: center; gap: 10px; }
.ee-color-picker { width: 40px; height: 40px; border: none; border-radius: 6px; cursor: pointer; background: transparent; }
.ee-color-value { font-size: 12px; color: var(--text-dim); font-family: monospace; }
.ee-density-row { display: flex; gap: 8px; }
.ee-density-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.08); background: var(--card-bg); cursor: pointer; font-family: inherit; transition: all 0.2s; }
.ee-density-btn:hover { background: rgba(55,48,40,0.6); }
.ee-density-btn.active { background: rgba(var(--accent-rgb), 0.1); border-color: rgba(var(--accent-rgb), 0.25); }
.ee-density-icon { font-size: 20px; }
.ee-density-label { font-size: 11px; color: var(--text-medium); }
.ee-actions { display: flex; gap: 10px; padding-top: 8px; }
.ee-btn { padding: 10px 20px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.2); background: rgba(var(--accent-rgb), 0.08); color: var(--accent); font-family: inherit; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.ee-btn:hover { background: rgba(var(--accent-rgb), 0.15); }
.ee-btn.primary { background: rgba(var(--accent-rgb), 0.12); }
</style>
