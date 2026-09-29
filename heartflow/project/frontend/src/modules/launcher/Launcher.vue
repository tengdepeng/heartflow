<script setup lang="ts">
// ============================================================
// Launcher · 外部应用启动台视图（路由 /launcher）
// 呈现用户 App 库，按 category 分组；支持增 / 改 / 删 / 启动 / 深链。
// 不嵌入外部 App 窗口（设计规格 §3.2：原生桌面程序无法嵌 webview）。
// ============================================================
import { ref, computed, watch } from 'vue'
import { useLauncher } from './useLauncher'
import type { ExternalAppEntry, EntryInput } from './types'
import { storage } from '../../engine/storage'
import { isImageIcon } from '../../utils/icon'
import LauncherSpace from './LauncherSpace.vue'
import LauncherSpaceSettings from './LauncherSpaceSettings.vue'
import IconPicker from '../../components/IconPicker.vue'

const { entries, grouped, addEntry, updateEntry, removeEntry, moveEntry, renameCategory, launchEntry } =
  useLauncher()

// ——— 视图模式：3D 空间 / 平面列表（选择持久化，宪法「超级自定义」）———
type ViewMode = 'space' | 'list'
const VIEW_KEY = 'launcher:view'
const viewMode = ref<ViewMode>(storage.getKV<ViewMode>(VIEW_KEY, 'space') === 'list' ? 'list' : 'space')
watch(viewMode, (v) => storage.setKV(VIEW_KEY, v))
const showSpaceSettings = ref(false)

/** 3D 空间按 sort 平铺消费（不按分类分组，空间里分类无意义） */
const flatEntries = computed(() => [...entries.value].sort((a, b) => a.sort - b.sort))
const filteredFlat = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return flatEntries.value
  return flatEntries.value.filter((e) =>
    (e.name + e.category + e.launch + (e.deepLink ?? '')).toLowerCase().includes(q),
  )
})

const search = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = ref<EntryInput>(blankForm())
const feedback = ref<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)

function blankForm(): EntryInput {
  return { name: '', icon: '📦', category: '', launch: '', deepLink: '', useDeepLink: false }
}

const filteredGrouped = computed<Array<[string, ExternalAppEntry[]]>>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return grouped.value
  return grouped.value
    .map(([cat, list]) => [cat, list.filter((e) => (e.name + e.category + e.launch + (e.deepLink ?? '')).toLowerCase().includes(q))] as [string, ExternalAppEntry[]])
    .filter(([, list]) => list.length > 0)
})

const totalCount = computed(() => grouped.value.reduce((n, [, list]) => n + list.length, 0))

function openAdd(): void {
  editingId.value = null
  form.value = blankForm()
  showForm.value = true
}

function openEdit(entry: ExternalAppEntry): void {
  editingId.value = entry.id
  form.value = {
    name: entry.name,
    icon: entry.icon,
    iconImage: entry.iconImage,
    category: entry.category,
    launch: entry.launch,
    deepLink: entry.deepLink ?? '',
    useDeepLink: entry.useDeepLink,
  }
  showForm.value = true
}

/** IconPicker 单值模型 → 分流到 icon（字形）/ iconImage（图片）两字段 */
const formIcon = computed(() => form.value.iconImage || form.value.icon || null)
function onIconPick(v: string | null): void {
  if (!v) {
    form.value.iconImage = undefined
    return
  }
  if (isImageIcon(v)) {
    form.value.iconImage = v
  } else {
    form.value.icon = v
    form.value.iconImage = undefined
  }
}

function save(): void {
  if (!form.value.name.trim() || !form.value.launch.trim()) {
    flash('warn', '名称与启动方式（路径 / URI）为必填')
    return
  }
  if (editingId.value) {
    updateEntry(editingId.value, form.value)
    flash('ok', `已更新「${form.value.name.trim()}」`)
  } else {
    addEntry(form.value)
    flash('ok', `已添加「${form.value.name.trim()}」`)
  }
  showForm.value = false
  editingId.value = null
}

function del(entry: ExternalAppEntry): void {
  removeEntry(entry.id)
  flash('ok', `已移除「${entry.name}」`)
}

async function launch(entry: ExternalAppEntry): Promise<void> {
  const res = await launchEntry(entry)
  if (res.ok && res.degraded) {
    flash('warn', `已尝试拉起（降级路径）：${entry.name}`)
  } else if (res.ok) {
    flash('ok', `已拉起：${entry.name}`)
  } else {
    flash('err', `无法打开：${entry.name}（请检查路径 / URI）`)
  }
}

// ——— 拖拽排序（规格 §3.4）———
const dragId = ref<string | null>(null)
const overId = ref<string | null>(null)
const dragCat = ref<string | null>(null)

function onDragStart(e: DragEvent, entry: ExternalAppEntry, cat: string): void {
  dragId.value = entry.id
  dragCat.value = cat
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', entry.id)
  }
}
function onDragOver(entry: ExternalAppEntry): void {
  if (dragCat.value && entry.category === dragCat.value) overId.value = entry.id
}
function onDrop(e: DragEvent, entry: ExternalAppEntry): void {
  e.preventDefault()
  if (dragId.value && entry.id !== dragId.value && dragCat.value === entry.category) {
    moveEntry(dragId.value, entry.id)
  }
  onDragEnd()
}
function onDragEnd(): void {
  dragId.value = null
  overId.value = null
  dragCat.value = null
}

// ——— 分类管理：内联重命名（规格 §3.4）———
const catEditing = ref<string | null>(null)
const catDraft = ref('')
function startRenameCat(cat: string): void {
  catEditing.value = cat
  catDraft.value = cat
}
function commitRenameCat(oldCat: string): void {
  renameCategory(oldCat, catDraft.value)
  catEditing.value = null
}

let feedbackTimer: ReturnType<typeof setTimeout> | undefined
function flash(kind: 'ok' | 'warn' | 'err', text: string): void {
  feedback.value = { kind, text }
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => (feedback.value = null), 2600)
}
</script>

<template>
  <div class="view-entrance launcher">
    <!-- 头部 -->
    <div data-enter class="header-section">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <span class="header-kicker">桌面启动台 · 外部应用库</span>
      <h1 class="header-title">启动器</h1>
      <p class="header-sub">把常用外部应用收进心流。仅找入口启动，深链跳子页（目标 App 认协议才跳，否则停在首页）。</p>
      <div class="overview-cards">
        <div class="overview-card">
          <span class="overview-num">{{ totalCount }}</span>
          <span class="overview-label">应用条目</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ grouped.length }}</span>
          <span class="overview-label">分类数</span>
        </div>
        <div class="overview-card">
          <span class="overview-num">{{ grouped.reduce((n, [, l]) => n + l.filter((e) => e.useDeepLink).length, 0) }}</span>
          <span class="overview-label">启用深链</span>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div data-enter class="toolbar">
      <input class="search-input" v-model="search" placeholder="搜索应用 / 分类 / 路径…" />
      <div class="view-switch" role="group" aria-label="视图切换">
        <button class="vs-btn" :class="{ 'is-on': viewMode === 'space' }" @click="viewMode = 'space'">
          空间
        </button>
        <button class="vs-btn" :class="{ 'is-on': viewMode === 'list' }" @click="viewMode = 'list'">
          列表
        </button>
      </div>
      <button v-if="viewMode === 'space'" class="ln-btn ln-ghost" @click="showSpaceSettings = !showSpaceSettings">
        {{ showSpaceSettings ? '收起设置' : '空间设置' }}
      </button>
      <button class="ln-btn ln-primary" @click="openAdd">+ 添加应用</button>
    </div>

    <!-- 空间风格设置（仅空间视图下展开） -->
    <Transition name="ln-fade">
      <div v-if="viewMode === 'space' && showSpaceSettings" data-enter class="space-settings-wrap">
        <LauncherSpaceSettings />
      </div>
    </Transition>

    <!-- 空态 -->
    <div v-if="totalCount === 0" data-enter class="empty-state">
      <div class="empty-glyph">🚀</div>
      <p>还没有外部应用入口。</p>
      <p class="empty-hint">点击「添加应用」，填入启动路径（如 <code>C:\App\foo.exe</code> 或 <code>weixin://</code>）与可选深链。</p>
      <button class="ln-btn ln-primary" @click="openAdd">添加第一个应用</button>
    </div>

    <!-- 3D 空间视图（默认）：按 sort 平铺，分类在空间中不作为分组维度 -->
    <LauncherSpace v-else-if="viewMode === 'space'" :entries="filteredFlat" @launch="launch" />

    <!-- 分组列表 -->
    <template v-else>
    <div v-for="[cat, list] in filteredGrouped" :key="cat" data-enter class="cat-block">
      <div class="cat-head">
        <span v-if="catEditing !== cat" class="cat-name">{{ cat }}</span>
        <input
          v-else
          class="cat-rename"
          v-model="catDraft"
          @keydown.enter="commitRenameCat(cat)"
          @blur="commitRenameCat(cat)"
        />
        <span class="cat-count">{{ list.length }}</span>
        <button v-if="catEditing !== cat" class="cat-edit" title="重命名分类" @click="startRenameCat(cat)">✎</button>
      </div>
      <div class="app-grid">
        <div
          v-for="e in list"
          :key="e.id"
          class="app-card hf-press"
          :class="{ 'is-dragging': dragId === e.id, 'is-over': overId === e.id }"
          draggable="true"
          @dragstart="onDragStart($event, e, cat)"
          @dragover.prevent="onDragOver(e)"
          @drop.prevent="onDrop($event, e)"
          @dragend="onDragEnd"
        >
          <div class="app-icon">{{ e.icon }}</div>
          <div class="app-body">
            <div class="app-name">{{ e.name }}</div>
            <div class="app-meta">
              <span v-if="e.useDeepLink && e.deepLink" class="badge badge-deep">深链</span>
              <span v-else class="badge">启动</span>
              <span class="app-target" :title="e.useDeepLink && e.deepLink ? e.deepLink : e.launch">{{ e.useDeepLink && e.deepLink ? e.deepLink : e.launch }}</span>
            </div>
            <div class="app-foot">
              <span class="app-stat">启动 {{ e.launchCount }} 次</span>
              <span v-if="e.lastLaunchedAt" class="app-stat app-stat--muted">{{ new Date(e.lastLaunchedAt).toLocaleString() }}</span>
            </div>
          </div>
          <div class="app-actions">
            <button class="ln-btn ln-go" :title="`拉起 ${e.name}`" @click="launch(e)">启动</button>
            <button class="ln-btn ln-ghost" title="编辑" @click="openEdit(e)">改</button>
            <button class="ln-btn ln-ghost ln-danger" title="删除" @click="del(e)">删</button>
          </div>
        </div>
      </div>
    </div>
    </template>

    <!-- 添加 / 编辑表单 -->
    <Transition name="ln-fade">
      <div v-if="showForm" class="ln-mask" @click.self="showForm = false">
        <div class="ln-modal" role="dialog" aria-modal="true">
          <div class="ln-modal-head">
            <span>{{ editingId ? '编辑应用' : '添加应用' }}</span>
            <button class="ln-x" @click="showForm = false">✕</button>
          </div>
          <div class="ln-form">
            <label class="ln-row">
              <span class="ln-label">显示名 *</span>
              <input v-model="form.name" class="ln-input" placeholder="如 网易云音乐" @keydown.enter="save" />
            </label>
            <div class="ln-row">
              <span class="ln-label">图标</span>
              <IconPicker
                :model-value="formIcon"
                label="应用图标"
                @update:model-value="onIconPick"
              />
            </div>
            <label class="ln-row">
              <span class="ln-label">分类</span>
              <input v-model="form.category" class="ln-input" placeholder="音乐 / 支付 / 办公…" list="ln-cats" />
              <datalist id="ln-cats">
                <option v-for="[c] in grouped" :key="c" :value="c" />
              </datalist>
            </label>
            <label class="ln-row">
              <span class="ln-label">启动方式 *</span>
              <input v-model="form.launch" class="ln-input" placeholder="C:\App\foo.exe 或 weixin://" @keydown.enter="save" />
            </label>
            <label class="ln-row">
              <span class="ln-label">深链 URI</span>
              <input v-model="form.deepLink" class="ln-input" placeholder="orpheus://playlist/{id}（可选）" />
            </label>
            <label class="ln-row ln-row--check">
              <input type="checkbox" v-model="form.useDeepLink" />
              <span class="ln-label">优先用深链（不勾则直接用启动方式）</span>
            </label>
          </div>
          <div class="ln-modal-foot">
            <button class="ln-btn ln-ghost" @click="showForm = false">取消</button>
            <button class="ln-btn ln-primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 反馈 -->
    <Transition name="ln-fade">
      <div v-if="feedback" class="ln-toast" :class="`ln-toast--${feedback.kind}`">{{ feedback.text }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.launcher {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 24px 140px;
  color: var(--text-primary, #e8e0d8);
}

.header-section { text-align: center; }
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 10px; opacity: 0.7; }
.orn-line { width: 46px; height: 1px; background: linear-gradient(90deg, transparent, var(--accent, #d4a574), transparent); }
.orn-diamond { color: var(--accent, #d4a574); font-size: 12px; }
.header-kicker { display: block; margin-top: 10px; font-size: 12px; letter-spacing: 3px; opacity: 0.5; }
.header-title { margin: 4px 0 0; font-size: 34px; font-weight: 600; letter-spacing: 2px; }
.header-sub { margin: 8px auto 0; max-width: 560px; font-size: 13px; line-height: 1.7; opacity: 0.55; }

.overview-cards { display: flex; gap: 14px; justify-content: center; margin-top: 18px; }
.overview-card {
  min-width: 92px; padding: 12px 16px; border-radius: 14px;
  background: rgba(212, 165, 116, 0.08); border: 1px solid rgba(212, 165, 116, 0.18);
}
.overview-num { display: block; font-size: 24px; font-weight: 700; color: var(--accent, #d4a574); }
.overview-label { font-size: 11px; letter-spacing: 1px; opacity: 0.55; }

.toolbar { display: flex; gap: 12px; margin: 26px 0 18px; flex-wrap: wrap; }

.view-switch {
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.vs-btn {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e0d8);
  transition: background 0.2s ease, color 0.2s ease;
}
.vs-btn:hover { background: rgba(212, 165, 116, 0.08); }
.vs-btn.is-on {
  background: rgba(212, 165, 116, 0.18);
  color: var(--accent, #d4a574);
}

.space-settings-wrap {
  padding: 18px 20px;
  margin-bottom: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.search-input {
  flex: 1; padding: 10px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-primary, #e8e0d8); font-size: 14px;
}
.search-input::placeholder { color: rgba(233, 224, 208, 0.4); }

.ln-btn {
  padding: 8px 16px; border-radius: 10px; border: 1px solid transparent;
  font-size: 13px; cursor: pointer; transition: transform 0.12s ease, background 0.2s ease;
}
.ln-btn:hover { transform: translateY(-1px); }
.ln-btn:active { transform: translateY(0); }
.ln-primary { background: var(--accent, #d4a574); color: #1c1712; font-weight: 600; }
.ln-ghost { background: rgba(255, 255, 255, 0.05); color: var(--text-primary, #e8e0d8); border-color: rgba(255, 255, 255, 0.1); }
.ln-go { background: rgba(212, 165, 116, 0.16); color: var(--accent, #d4a574); border-color: rgba(212, 165, 116, 0.3); }
.ln-danger { color: #e07a6a; }

.empty-state { text-align: center; padding: 48px 20px; opacity: 0.7; }
.empty-glyph { font-size: 42px; margin-bottom: 10px; }
.empty-hint { font-size: 13px; opacity: 0.55; margin: 6px 0 18px; line-height: 1.7; }
.empty-hint code { background: rgba(255, 255, 255, 0.06); padding: 1px 6px; border-radius: 5px; font-size: 12px; }

.cat-block { margin-bottom: 26px; }
.cat-head { display: flex; align-items: center; gap: 8px; margin: 6px 0 12px; opacity: 0.7; }
.cat-name { font-size: 13px; letter-spacing: 2px; }
.cat-count { font-size: 11px; opacity: 0.5; background: rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 1px 8px; }
.cat-edit { background: none; border: none; color: var(--accent, #d4a574); opacity: 0.45; cursor: pointer; font-size: 13px; padding: 0 4px; transition: opacity 0.2s ease; }
.cat-edit:hover { opacity: 1; }
.cat-rename {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(212, 165, 116, 0.4);
  border-radius: 6px; color: var(--text-primary, #e8e0d8); font-size: 13px;
  padding: 1px 8px; letter-spacing: 2px; width: 130px;

  min-height: 26px;
}
.cat-rename:focus { outline: none; border-color: var(--accent, #d4a574); }

.app-card { cursor: grab; }
.app-card:active { cursor: grabbing; }
.app-card.is-dragging { opacity: 0.4; }
.app-card.is-over { border-color: rgba(212, 165, 116, 0.65); box-shadow: 0 0 0 1px rgba(212, 165, 116, 0.45) inset; }

.app-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.app-card {
  display: flex; align-items: center; gap: 12px; padding: 14px;
  border-radius: 16px; background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.07); transition: border-color 0.2s ease, background 0.2s ease;
}
.app-card:hover { border-color: rgba(212, 165, 116, 0.3); background: rgba(212, 165, 116, 0.06); }
.app-icon { font-size: 30px; width: 46px; height: 46px; display: grid; place-items: center; background: rgba(255, 255, 255, 0.05); border-radius: 12px; flex: none; }
.app-body { flex: 1; min-width: 0; }
.app-name { font-size: 15px; font-weight: 600; }
.app-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.badge { font-size: 10px; padding: 1px 7px; border-radius: 7px; background: rgba(255, 255, 255, 0.08); opacity: 0.7; flex: none; }
.badge-deep { background: rgba(90, 184, 160, 0.18); color: #7fd0bb; opacity: 1; }
.app-target { font-size: 11px; opacity: 0.65; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-foot { display: flex; gap: 10px; margin-top: 6px; }
.app-stat { font-size: 10px; opacity: 0.55; }
.app-stat--muted { opacity: 0.4; }
.app-actions { display: flex; flex-direction: column; gap: 5px; flex: none; }
.app-actions .ln-btn { padding: 5px 12px; font-size: 12px; }

.ln-mask {
  position: fixed; inset: 0; z-index: 200; display: grid; place-items: center;
  background: rgba(10, 8, 6, 0.55); backdrop-filter: blur(3px);
}
.ln-modal {
  width: min(440px, 92vw); border-radius: 18px; padding: 18px 20px 20px;
  background: #211b15; border: 1px solid rgba(212, 165, 116, 0.25);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}
.ln-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: 600; margin-bottom: 14px; }
.ln-x { background: none; border: none; color: var(--text-primary, #e8e0d8); opacity: 0.5; cursor: pointer; font-size: 16px; }
.ln-form { display: flex; flex-direction: column; gap: 12px; }
.ln-row { display: flex; flex-direction: column; gap: 5px; }
.ln-row--check { flex-direction: row; align-items: center; gap: 8px; }
.ln-label { font-size: 12px; opacity: 0.6; letter-spacing: 0.5px; }
.ln-input {
  padding: 9px 12px; border-radius: 10px; font-size: 14px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e8e0d8);
}
.ln-input--icon { width: 72px; text-align: center; font-size: 20px; }
.ln-modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.ln-toast {
  position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%);
  padding: 10px 18px; border-radius: 12px; font-size: 13px; z-index: 210;
  background: #211b15; border: 1px solid rgba(212, 165, 116, 0.3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}
.ln-toast--ok { border-color: rgba(90, 184, 160, 0.4); }
.ln-toast--warn { border-color: rgba(212, 165, 116, 0.5); }
.ln-toast--err { border-color: rgba(224, 122, 106, 0.5); }

.ln-fade-enter-active, .ln-fade-leave-active { transition: opacity 0.2s ease; }
.ln-fade-enter-from, .ln-fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .app-grid { grid-template-columns: 1fr; }
}
</style>
