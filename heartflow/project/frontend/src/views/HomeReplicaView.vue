<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance hr">
    <!-- 3D 复刻舞台（程序化生成，无需外部资产） -->
    <div v-if="webglOk" class="hr-stage">
      <canvas ref="canvasRef" class="hr-canvas"></canvas>

      <!-- 房间导航面板 -->
      <aside class="hr-rooms">
        <!-- 当前房间信息 -->
        <div class="hr-rooms__current">
          <span class="hr-rooms__current-icon">{{ currentRoomInfo?.icon }}</span>
          <div class="hr-rooms__current-text">
            <h2 class="hr-rooms__title">{{ currentRoomInfo?.name }}</h2>
            <p class="hr-rooms__desc">{{ currentRoomInfo?.description }}</p>
          </div>
        </div>

        <!-- 氛围色条 -->
        <div class="hr-atmos-bar" :style="{ background: currentRoomInfo?.color }"></div>

        <!-- 导航按钮 -->
        <div class="hr-nav">
          <button class="hr-nav__btn" :disabled="isTransitioning" @click="navPrev">◀</button>
          <span class="hr-nav__count">{{ roomIndex + 1 }} / {{ roomList.length }}</span>
          <button class="hr-nav__btn" :disabled="isTransitioning" @click="navNext">▶</button>
        </div>

        <!-- 房间列表 -->
        <ul class="hr-rooms__list">
          <li
            v-for="r in roomList"
            :key="r.id"
            class="hr-rooms__item"
            :class="{ active: r.id === currentRoomId }"
            @click="onRoomClick(r.id)"
          >
            <span class="hr-rooms__item-icon">{{ r.icon }}</span>
            <span class="hr-rooms__item-name">{{ r.name }}</span>
            <span class="hr-rooms__item-dot" :style="{ background: r.color }"></span>
          </li>
        </ul>

        <button class="hr-clear" type="button" @click="onClear">清除清单</button>
        <button class="hr-export" type="button" @click="onExport">导出 manifest</button>
        <button class="hr-enter-walk" type="button" @click="enterWalk" v-if="!walkMode">进入漫游</button>
      </aside>
      <!-- 第一人称漫游叠加层 -->
      <div v-if="walkMode" class="hr-walk">
        <div class="hr-crosshair"></div>
        <div class="hr-walk__room">{{ walkRoomName }}</div>
        <div class="hr-walk__hint">WASD / 方向键移动 · 鼠标转视角 · ESC 退出 · 走到门洞穿过房间</div>
        <button class="hr-walk__exit" type="button" @click="exitWalk">退出漫游</button>
      </div>
    </div>

    <!-- WebGL 不可用：降级说明 -->
    <div v-else data-enter class="hr-placeholder">
      <span class="hr-glyph">🏠</span>
      <h1 class="hr-title">家 · 1:1 3D 复刻</h1>
      <p class="hr-sub">蓝图 M3 · 程序化生成</p>
      <p class="hr-note">
        当前环境不支持 WebGL，无法渲染 3D 家空间。请使用支持 WebGL 的现代浏览器访问。
      </p>
      <p class="hr-empty">（数据全部留在本机，绝不外传）</p>
    </div>

    <!-- 清单编辑：导入 / 示例 -->
    <section class="hr-edit">
      <div class="hr-import">
        <label class="hr-import__label">粘贴 manifest JSON 直接导入：</label>
        <textarea
          class="hr-import__text"
          v-model="importText"
          rows="4"
          placeholder='{"version":1,"unit":"m","rooms":[{"id":"living-room","name":"客厅","model":"/home-replica/living-room.glb"}]}'
        ></textarea>
        <div class="hr-import__actions">
          <button class="hr-import__btn" type="button" @click="onImport">导入清单</button>
          <button class="hr-import__file" type="button" @click="onPickFile">选择 .json 文件</button>
          <input
            ref="fileInputRef"
            class="hr-import__input"
            type="file"
            accept=".json,application/json"
            @change="onFile"
          />
        </div>
        <p v-if="importError" class="hr-import__error">{{ importError }}</p>
      </div>

      <div class="hr-sample">
        <button class="hr-sample__btn" type="button" @click="onLoadSample">
          载入示例家（完整 11 房间 · 含真实 3D 模型）
        </button>
        <p class="hr-sample__hint">一键加载完整内置家：11 个房间骨架 + 5 个真实 3D 模型覆盖，与默认家一致、不再退化空场景。可清除后导入你自己的户型图 / 3D 模型（支持 model / image / plan）。</p>

        <button class="hr-sample__btn hr-sample__btn--alt" type="button" @click="onLoadRealPlan">
          载入真实户型图（网上 CC0）
        </button>
        <p class="hr-sample__hint">从 Wikimedia Commons 取得的 CC0 授权真实户型图，演示 plan 格式平铺地面导入。可清除后导入你自己的户型图 / 3D 模型（支持 model / image / plan）。</p>
        <p v-if="sampleError" class="hr-import__error">{{ sampleError }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import {
  useHomeReplica,
  type HomeReplicaManifest,
} from '../modules/home/useHomeReplica'
import {
  useHomeReplicaNavigation,
  ROOM_DISPLAY_NAMES,
} from '../modules/home/useHomeReplicaNavigation'
import {
  createProceduralHomeScene,
  type ProceduralScene,
} from '../modules/home/useHomeReplicaProceduralScene'
import { SAMPLE_MANIFEST, REAL_FLOOR_PLAN_SAMPLE } from '../modules/home/homeReplicaSample'

const { entranceRef, entranceClass } = useViewEntrance()
const { manifest, load, save, reset } = useHomeReplica()
const {
  currentRoomId,
  currentRoom,
  roomList,
  isTransitioning,
  focusRoom,
  focusNext,
  focusPrev,
  endTransition,
} = useHomeReplicaNavigation()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const webglOk = ref(true)
const importText = ref('')
const importError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const sampleError = ref('')

const currentRoomInfo = computed(() => {
  const room = currentRoom.value
  if (!room) return null
  return {
    icon: room.icon,
    name: room.name,
    description: room.description,
    color: room.atmosphereColor,
  }
})

const roomIndex = computed(() =>
  roomList.value.findIndex(r => r.id === currentRoomId.value),
)

let scene: ProceduralScene | null = null

function checkWebGL(): boolean {
  const canvas = canvasRef.value
  if (!canvas) return false
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!gl
  } catch {
    return false
  }
}

async function mountScene(): Promise<void> {
  const canvas = canvasRef.value
  if (!canvas) return

  if (!checkWebGL()) {
    webglOk.value = false
    return
  }

  scene?.dispose()
  scene = null

  const s = await createProceduralHomeScene(canvas, manifest.value, {
    initialRoomId: currentRoomId.value,
    onTransitionEnd: () => endTransition(),
  })

  if (s) {
    scene = s
    webglOk.value = true
  } else {
    webglOk.value = false
  }
}

function onRoomClick(roomId: string): void {
  if (isTransitioning.value) return
  if (roomId === currentRoomId.value) return
  const ok = focusRoom(roomId)
  if (ok && scene) {
    scene.focusRoom(roomId)
  }
}

function navNext(): void {
  if (isTransitioning.value) return
  focusNext()
  if (scene) {
    scene.focusRoom(currentRoomId.value)
  }
}

function navPrev(): void {
  if (isTransitioning.value) return
  focusPrev()
  if (scene) {
    scene.focusRoom(currentRoomId.value)
  }
}

/** 键盘导航 */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    navNext()
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    navPrev()
  }
}

// ---- 第一人称漫游 ----
const walkMode = ref(false)
const walkRoomId = ref(currentRoomId.value)
const walkRoomName = computed(() => ROOM_DISPLAY_NAMES[walkRoomId.value] ?? walkRoomId.value)
function onRoomChange(id: string): void {
  walkRoomId.value = id
}
function enterWalk(): void {
  if (!scene) return
  scene.setOnRoomChange(onRoomChange)
  scene.enterWalkMode()
  walkMode.value = true
  window.removeEventListener('keydown', onKeydown)
}
function exitWalk(): void {
  if (!scene) return
  scene.exitWalkMode()
  walkMode.value = false
  window.addEventListener('keydown', onKeydown)
  focusRoom(walkRoomId.value)
}

function onClear(): void {
  scene?.dispose()
  scene = null
  reset()
  nextTick().then(mountScene)
}

function onExport(): void {
  const m = manifest.value
  if (!m) return
  const json = JSON.stringify(m, null, 2)
  try {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'home-replica-manifest.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.warn('[home-replica] 导出失败，manifest：', json, e)
  }
}

function onImport(): void {
  importError.value = ''
  let parsed: unknown
  try {
    parsed = JSON.parse(importText.value)
  } catch (e) {
    importError.value = 'JSON 解析失败：' + (e as Error).message
    return
  }
  if (!save(parsed as HomeReplicaManifest)) {
    importError.value = '清单格式不合法（需 version:1 / unit:"m" / 非空 rooms，每项含 id、name、model）'
    return
  }
  importText.value = ''
  nextTick().then(mountScene)
}

function onPickFile(): void {
  fileInputRef.value?.click()
}

function onFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    importText.value = String(reader.result ?? '')
    onImport()
  }
  reader.onerror = () => {
    importError.value = '文件读取失败'
  }
  reader.readAsText(f)
  input.value = ''
}

/** 载入内置示例家 */
function onLoadSample(): void {
  sampleError.value = ''
  if (!save(SAMPLE_MANIFEST)) {
    sampleError.value = '示例清单格式不合法'
    return
  }
  nextTick().then(mountScene)
}

/** 载入真实网上户型图（CC0）示例 */
function onLoadRealPlan(): void {
  sampleError.value = ''
  if (!save(REAL_FLOOR_PLAN_SAMPLE)) {
    sampleError.value = '示例清单格式不合法'
    return
  }
  nextTick().then(mountScene)
}

onMounted(() => {
  load()
  mountScene()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  scene?.dispose()
  scene = null
})
</script>

<style scoped>
.hr {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 32px 20px 64px;
}
.hr-edit {
  width: 100%;
  max-width: 920px;
  box-sizing: border-box;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 16px;
  padding: 20px 22px;
  text-align: left;
}
.hr-stage {
  display: flex;
  gap: 20px;
  width: 100%;
  max-width: 920px;
  height: calc(100vh - 140px);
  min-height: 420px;
}
.hr-canvas {
  flex: 1;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: radial-gradient(120% 120% at 50% 20%, rgba(var(--accent-rgb), 0.06), transparent);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

/* ---- 房间导航面板 ---- */
.hr-rooms {
  width: 260px;
  flex: none;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 16px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.hr-rooms__current {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.hr-rooms__current-icon {
  font-size: 28px;
  line-height: 1;
  flex: none;
}
.hr-rooms__current-text {
  min-width: 0;
}
.hr-rooms__title {
  font-size: 15px;
  margin: 0 0 4px;
  color: var(--text-primary);
}
.hr-rooms__desc {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* 氛围色条 */
.hr-atmos-bar {
  height: 3px;
  border-radius: 2px;
  margin-bottom: 14px;
  opacity: 0.7;
  transition: background 0.5s ease;
}

/* 导航按钮 */
.hr-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.hr-nav__btn {
  background: rgba(var(--accent-rgb), 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
.hr-nav__btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.24);
}
.hr-nav__btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.hr-nav__count {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* 房间列表 */
.hr-rooms__list {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
  flex: 1;
  overflow-y: auto;
}
.hr-rooms__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  font-size: 13px;
  color: var(--text-secondary);
}
.hr-rooms__item:hover {
  background: rgba(var(--accent-rgb), 0.08);
}
.hr-rooms__item.active {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--text-primary);
}
.hr-rooms__item-icon {
  font-size: 14px;
  flex: none;
}
.hr-rooms__item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hr-rooms__item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  opacity: 0.7;
}

/* 操作按钮 */
.hr-clear {
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 12px;
  margin-bottom: 6px;
}
.hr-clear:hover {
  background: rgba(var(--accent-rgb), 0.18);
  color: var(--text-primary);
}
.hr-export {
  background: rgba(var(--accent-rgb), 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}
.hr-export:hover {
  background: rgba(var(--accent-rgb), 0.2);
}

/* ---- 降级说明 ---- */
.hr-placeholder {
  max-width: 520px;
  text-align: center;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 16px;
  padding: 36px 32px;
}
.hr-glyph {
  font-size: 40px;
}
.hr-title {
  font-size: 22px;
  margin: 12px 0 4px;
  color: var(--text-primary);
}
.hr-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px;
  letter-spacing: 1px;
}
.hr-note {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.hr-empty {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 16px;
}

/* ---- 清单编辑 ---- */
.hr-sample {
  margin-top: 18px;
  text-align: center;
}
.hr-sample__btn {
  background: rgba(var(--accent-rgb), 0.18);
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 10px 18px;
  cursor: pointer;
  font-size: 13px;
}
.hr-sample__btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.28);
}
.hr-sample__btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.hr-sample__hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 10px auto 0;
  max-width: 420px;
}
.hr-import {
  margin-top: 18px;
  text-align: left;
}
.hr-import__label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.hr-import__text {
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.5;
  resize: vertical;
}
.hr-import__text:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.4);
}
.hr-import__actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}
.hr-import__btn,
.hr-import__file {
  background: rgba(var(--accent-rgb), 0.14);
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
}
.hr-import__btn:hover,
.hr-import__file:hover {
  background: rgba(var(--accent-rgb), 0.24);
}
.hr-import__input {
  font-size: 12px;
  color: var(--text-secondary);
}
.hr-import__error {
  font-size: 12px;
  color: #ff8a8a;
  margin: 8px 0 0;
}

/* ---- 第一人称漫游 ---- */
.hr-walk {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.hr-crosshair {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
}
.hr-walk__room {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 14px;
  border-radius: 999px;
  letter-spacing: 1px;
}
.hr-walk__hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.4);
  padding: 8px 16px;
  border-radius: 10px;
  white-space: nowrap;
}
.hr-walk__exit {
  position: absolute;
  bottom: 18px;
  right: 18px;
  pointer-events: auto;
  background: rgba(var(--accent-rgb), 0.2);
  border: 1px solid rgba(var(--accent-rgb), 0.4);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
}
.hr-walk__exit:hover {
  background: rgba(var(--accent-rgb), 0.32);
}
.hr-enter-walk {
  background: rgba(var(--accent-rgb), 0.18);
  border: 1px solid rgba(var(--accent-rgb), 0.32);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  margin-top: 6px;
  width: 100%;
}
.hr-enter-walk:hover {
  background: rgba(var(--accent-rgb), 0.28);
}

/* 480px 及以下 */
@media (max-width: 480px) {
  .hr {
    padding: 24px 14px 56px;
    gap: 16px;
  }

  .hr-stage {
    flex-direction: column;
    height: auto;
    min-height: 0;
    gap: 12px;
  }

  .hr-canvas {
    width: 100%;
    height: 52vh;
    min-height: 280px;
  }

  .hr-rooms {
    width: 100%;
    flex: none;
    max-height: 320px;
  }

  .hr-edit {
    padding: 16px 14px;
  }

  .hr-placeholder {
    padding: 28px 20px;
  }
}
</style>
