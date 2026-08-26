<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance se">
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">调整空间的氛围和场景参数</p>
    <h1 class="se-title">场景编辑器</h1>

    <!-- 场景列表 -->
    <section data-enter class="se-section">
      <div class="se-section-header">
        <h3 class="se-section-title">场景列表 ({{ scenes.length }})</h3>
        <button class="se-btn" @click="addScene">+ 新建场景</button>
      </div>
      <div v-if="scenes.length === 0" class="se-empty">
        <p>还没有场景，新建一个来定义空间氛围</p>
      </div>
      <div v-else class="se-scene-list">
        <div
          v-for="scene in scenes"
          :key="scene.id"
          class="se-scene-card"
          :class="{ active: editingSceneId === scene.id }"
          :style="{ borderLeftColor: scene.atmosphereColor || '#d4a574' }"
          @click="selectScene(scene.id)"
        >
          <div class="se-scene-header">
            <span class="se-scene-name">{{ scene.name }}</span>
            <span class="se-scene-color" :style="{ background: scene.atmosphereColor || '#d4a574' }"></span>
          </div>
          <p class="se-scene-desc" v-if="scene.description">{{ scene.description }}</p>
        </div>
      </div>
    </section>

    <!-- 编辑面板 -->
    <section class="se-section" v-if="editingScene">
      <h3 class="se-section-title">编辑：{{ editingScene.name }}</h3>
      <div class="se-edit-form">
        <div class="se-field">
          <label class="se-label">场景名称</label>
          <input v-model="editForm.name" class="se-input" />
        </div>
        <div class="se-field">
          <label class="se-label">描述</label>
          <textarea v-model="editForm.description" class="se-textarea" rows="2"></textarea>
        </div>
        <div class="se-field">
          <label class="se-label">氛围光色</label>
          <div class="se-color-row">
            <input v-model="editForm.atmosphereColor" type="color" class="se-color-picker" />
            <span class="se-color-value">{{ editForm.atmosphereColor }}</span>
          </div>
        </div>
        <div class="se-field">
          <label class="se-label">过渡动画</label>
          <select v-model="editForm.transition" class="se-select">
            <option value="fade">淡入淡出</option>
            <option value="slide">滑动</option>
            <option value="dissolve">溶解</option>
            <option value="none">无</option>
          </select>
        </div>
        <div class="se-actions">
          <button class="se-btn primary" @click="saveScene">保存</button>
          <button class="se-btn danger" @click="removeScene">删除场景</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useScenes } from '../modules/scene'
import { recordDecorationHistory } from '../modules/decoration-history'

const { entranceRef, entranceClass } = useViewEntrance()
const { scenes, load, save } = useScenes()
const editingSceneId = ref<string | null>(null)
const editingScene = computed(() => scenes.value.find(s => s.id === editingSceneId.value) || null)

onMounted(load)

const editForm = reactive({
  name: '',
  description: '',
  atmosphereColor: '#d4a574',
  transition: 'fade',
})

function saveScenes() {
  save()
}

function selectScene(id: string) {
  editingSceneId.value = id
  const scene = scenes.value.find(s => s.id === id)
  if (scene) {
    editForm.name = scene.name
    editForm.description = scene.description || ''
    editForm.atmosphereColor = scene.atmosphereColor || '#d4a574'
    editForm.transition = scene.transition || 'fade'
  }
}

function addScene() {
  const scene = {
    id: `scn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '新场景',
    description: '',
    atmosphereColor: '#d4a574',
    transition: 'fade',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  scenes.value.push(scene)
  saveScenes()
  selectScene(scene.id)
  recordDecorationHistory('🏞', '新建场景', `创建了场景「${scene.name}」`)
}

function saveScene() {
  const idx = scenes.value.findIndex(s => s.id === editingSceneId.value)
  if (idx === -1) return
  const oldName = scenes.value[idx].name
  scenes.value[idx] = {
    ...scenes.value[idx],
    name: editForm.name,
    description: editForm.description,
    atmosphereColor: editForm.atmosphereColor,
    transition: editForm.transition,
    updatedAt: new Date().toISOString(),
  }
  saveScenes()
  recordDecorationHistory('🏞', '编辑场景', `修改了场景「${oldName}」→「${editForm.name}」`)
}

function removeScene() {
  if (!editingSceneId.value) return
  const removed = scenes.value.find(s => s.id === editingSceneId.value)
  scenes.value = scenes.value.filter(s => s.id !== editingSceneId.value)
  editingSceneId.value = null
  saveScenes()
  if (removed) {
    recordDecorationHistory('🗑', '删除场景', `删除了场景「${removed.name}」`)
  }
}
</script>

<style scoped>
.se {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: transparent;
}
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
.orn-line { display: block; width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent); }
.orn-diamond { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }
.header-kicker { text-align: center; font-size: 12px; color: rgba(var(--accent-rgb), 0.3); letter-spacing: 4px; margin: 0 0 6px; }
.se-title { text-align: center; font-family: var(--font-heading-en); font-size: 28px; font-weight: 400; color: rgba(var(--accent-rgb), 0.75); letter-spacing: 6px; margin: 0 0 20px; }
.se-section { margin-bottom: 24px; }
.se-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.se-section-title { font-size: 15px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.8); margin: 0; }
.se-empty { text-align: center; padding: 40px 0; color: var(--text-faint); font-size: 14px; }
.se-scene-list { display: flex; flex-direction: column; gap: 8px; }
.se-scene-card { padding: 12px; border-radius: 10px; background: var(--card-bg); border: 1px solid rgba(var(--accent-rgb), 0.08); border-left: 3px solid rgba(var(--accent-rgb), 0.3); cursor: pointer; transition: all 0.2s; }
.se-scene-card:hover { background: rgba(55,48,40,0.6); }
.se-scene-card.active { background: rgba(var(--accent-rgb), 0.08); }
.se-scene-header { display: flex; align-items: center; gap: 8px; }
.se-scene-name { font-size: 14px; font-weight: 500; color: rgba(var(--text-primary-rgb), 0.8); flex: 1; }
.se-scene-color { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.se-scene-desc { font-size: 12px; color: var(--text-low); margin: 4px 0 0; }
.se-edit-form { display: flex; flex-direction: column; gap: 12px; }
.se-field { display: flex; flex-direction: column; gap: 4px; }
.se-label { font-size: 12px; color: var(--text-medium); }
.se-input, .se-textarea, .se-select { padding: 8px 10px; border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: 8px; background: rgba(var(--bg-card-rgb), 0.5); color: var(--text-high); font-family: inherit; font-size: 13px; outline: none; }
.se-color-row { display: flex; align-items: center; gap: 8px; }
.se-color-picker { width: 36px; height: 36px; border: none; border-radius: 6px; cursor: pointer; background: transparent; }
.se-color-value { font-size: 12px; color: var(--text-dim); font-family: monospace; }
.se-actions { display: flex; gap: 8px; }
.se-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.2); background: rgba(var(--accent-rgb), 0.08); color: var(--accent); font-family: inherit; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.se-btn:hover { background: rgba(var(--accent-rgb), 0.15); }
.se-btn.primary { background: rgba(var(--accent-rgb), 0.12); }
.se-btn.danger { color: rgba(224,112,80,0.7); border-color: rgba(224,112,80,0.2); }
.se-btn.danger:hover { background: rgba(224,112,80,0.1); }
</style>