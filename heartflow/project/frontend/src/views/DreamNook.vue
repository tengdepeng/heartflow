<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance dn">
    <RoomLayout title="梦乡小筑" kicker="记录、整理、回看你的梦境" data-enter>

    <transition name="dn-flash">
      <div v-if="flash" class="dn-flash">{{ flash }}</div>
    </transition>

    <!-- 梦境统计 -->
    <section data-enter class="stats-row">
      <div class="stat-item"><span class="stat-num">{{ store.dreams.length }}</span><span class="stat-label">总梦境</span></div>
      <div class="stat-item"><span class="stat-num">{{ thisMonth }}</span><span class="stat-label">本月</span></div>
      <div class="stat-item">
        <span class="stat-num">{{ tagRank[0]?.[1] || 0 }}</span>
        <span class="stat-label">最多 · {{ tagRank[0]?.[0] || '—' }}</span>
      </div>
    </section>

    <!-- 梦境档案（INCR-11：概览/情绪分布/高频主题/温和洞察） -->
    <section data-enter>
      <DreamArchivePanel :dreams="store.dreams" />
    </section>

    <!-- 意象之镜（INCR-169 接线：高频意象/意象回响/温和观照） -->
    <section data-enter class="dmo-section">
      <DreamOmenPanel />
    </section>

    <!-- 标签云 -->
    <section data-enter v-if="allTags.length" class="tag-cloud-section">
      <h3>🏷️ 标签云</h3>
      <div class="tag-cloud">
        <span
          v-for="t in allTags"
          :key="t"
          class="tag-cloud-item"
          :style="{ fontSize: tagCloudSize(tagCount(t)) + 'px', opacity: tagCloudOpacity(tagCount(t)) }"
          role="button"
          tabindex="0"
          :aria-pressed="tagFilter === t"
          :aria-label="'切换标签筛选 ' + t"
          @click="tagFilter = tagFilter === t ? '' : t"
          @keydown.enter.prevent="tagFilter = tagFilter === t ? '' : t"
          @keydown.space.prevent="tagFilter = tagFilter === t ? '' : t"
          :class="{ active: tagFilter === t }"
        >{{ t }}</span>
      </div>
    </section>

    <!-- 导出/导入 -->
    <div data-enter class="dn-io-row">
      <button class="dn-btn dn-ghost-btn" @click="exportDreams">导出</button>
      <button class="dn-btn dn-ghost-btn" @click="triggerImport">导入</button>
      <input ref="importInput" type="file" accept=".json" style="display:none" @change="importDreams" />
      <button
        class="dn-btn dn-ghost-btn"
        @click="showArchived = !showArchived"
        v-if="store.archivedDreams.length"
      >{{ showArchived ? '活跃' : '归档' }} ({{ store.archivedDreams.length }})</button>
    </div>

    <!-- 记录梦境 -->
    <section data-enter><h3>✏️ 记录梦境</h3>
      <div class="dream-form">
        <input v-model="form.title" placeholder="梦境标题（可选）" class="dn-input" />
        <textarea v-model="form.content" placeholder="描述你的梦境…" class="dn-input dn-textarea" rows="3" />
        <div class="form-row">
          <select v-model="form.mood" class="dn-select">
            <option value="neutral">☁️ 平常</option>
            <option value="happy">😊 愉快</option>
            <option value="fear">😨 恐惧</option>
            <option value="sad">😢 悲伤</option>
            <option value="curious">🤔 好奇</option>
            <option value="confused">🌀 困惑</option>
          </select>
          <input v-model="form.dreamDate" type="date" class="dn-input" style="width:140px;flex:none" title="梦境发生日期（可选）" />
        </div>
        <div class="form-row">
          <input v-model="form.tagInput" placeholder="添加标签" class="dn-input" style="flex:1" @keydown.enter.prevent="addTag" />
          <button @click="addTag" class="tag-btn">+</button>
        </div>
        <div class="tag-list">
          <span v-for="(t, i) in form.tags" :key="i" class="tag-pill">{{ t }} <button @click="form.tags.splice(i,1)" class="tag-remove">×</button></span>
        </div>
        <button @click="saveDream" class="dn-btn" :disabled="!form.content.trim()" style="margin-top:8px">💾 保存梦境</button>
      </div>
    </section>

    <!-- 搜索与过滤 -->
    <section data-enter><h3>🔍 搜索梦境</h3>
      <div class="filter-row">
        <input v-model="searchQuery" placeholder="搜索标题或内容…" class="dn-input" style="flex:1" />
        <select v-model="moodFilter" class="dn-select">
          <option value="">全部情绪</option>
          <option value="happy">😊 愉快</option>
          <option value="fear">😨 恐惧</option>
          <option value="sad">😢 悲伤</option>
          <option value="curious">🤔 好奇</option>
          <option value="confused">🌀 困惑</option>
          <option value="neutral">☁️ 平常</option>
        </select>
        <select v-model="tagFilter" class="dn-select">
          <option value="">全部标签</option>
          <option v-for="t in allTags" :key="t" :value="t">{{ t }} ({{ tagCount(t) }})</option>
        </select>
      </div>
    </section>

    <!-- 梦境列表 -->
    <section data-enter><h3>{{ showArchived ? '📦 归档梦境' : '📜 梦境记录' }}</h3>
      <div v-if="displayDreams.length" class="dream-list">
        <div v-for="d in displayDreams" :key="d.id" class="dream-card" role="button" tabindex="0" :aria-expanded="expandedId === d.id" :aria-label="'展开或收起梦境 ' + (d.title || '无标题梦境')" @click="toggleExpand(d.id)" @keydown.enter.prevent="toggleExpand(d.id)" @keydown.space.prevent="toggleExpand(d.id)">
          <div class="dream-header">
            <strong>{{ d.title || '无标题梦境' }}</strong>
            <span class="dream-mood">{{ moodLabel(d.mood) }}</span>
          </div>
          <p class="dream-preview" v-if="d.id !== expandedId">{{ d.content.slice(0, 60) }}{{ d.content.length > 60 ? '…' : '' }}</p>
          <div v-else class="dream-expanded">
            <p class="dream-full">{{ d.content }}</p>
            <div class="dream-tags">
              <span v-for="t in d.tags" :key="t" class="tag-pill">{{ t }}</span>
            </div>
            <div class="dream-actions">
              <span class="dream-date">{{ fmt(d.at) }}</span>
              <button v-if="!d.archived" @click.stop="archiveDream(d.id)" class="tiny-btn archive-btn">归档</button>
              <button v-else @click.stop="unarchiveDream(d.id)" class="tiny-btn restore-btn">恢复</button>
              <button v-if="!d.archived" @click.stop="toggleDreamRealm(d)" class="tiny-btn send-btn" :class="{ linked: isDreamLinked(d) }">{{ isDreamLinked(d) ? '✓ 已映照' : '→ 梦境区' }}</button>
              <button @click.stop="deleteDream(d.id)" class="tiny-btn">删除</button>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else :title="showArchived ? '没有归档的梦境' : '还没有梦境记录'" :glow="false" cta-label="" />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { getLocalDateKey } from '../utils/time'
import { useDreamNookStore, DREAM_REALM_ID } from '../stores/dreamNook'
import { useViewEntrance } from '../composables/useViewEntrance'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import DreamArchivePanel from '../components/DreamArchivePanel.vue'
import DreamOmenPanel from '../components/DreamOmenPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const store = useDreamNookStore()

const searchQuery = ref('')
const moodFilter = ref('')
const tagFilter = ref('')
const expandedId = ref('')
const showArchived = ref(false)
const importInput = ref<HTMLInputElement>()

const form = reactive({ title: '', content: '', mood: 'neutral' as const, dreamDate: '', tags: [] as string[], tagInput: '' })

const thisMonth = computed(() => store.thisMonthCount)

const allTags = computed(() => store.allTags)

function tagCount(tag: string) { return store.tagCount(tag) }

const tagRank = computed(() => store.tagRank)

const filteredDreams = computed(() => {
  return store.filterDreams(searchQuery.value || undefined, moodFilter.value || undefined, tagFilter.value || undefined)
})

// 标签云大小映射：最小12px，最大22px
function tagCloudSize(count: number): number {
  const max = Math.max(1, ...allTags.value.map(t => tagCount(t)))
  return 12 + (count / max) * 10
}
function tagCloudOpacity(count: number): number {
  const max = Math.max(1, ...allTags.value.map(t => tagCount(t)))
  return 0.4 + (count / max) * 0.6
}

// 当前显示的梦境列表（活跃/归档）
const displayDreams = computed(() => {
  if (showArchived.value) {
    return store.archivedDreams
  }
  return filteredDreams.value
})

function addTag() {
  const t = form.tagInput.trim()
  if (t && !form.tags.includes(t)) { form.tags.push(t) }
  form.tagInput = ''
}

function saveDream() {
  if (!form.content.trim()) return
  store.recordDream(form.content, form.title, form.mood, form.tags, form.dreamDate || undefined)
  form.title = ''; form.content = ''; form.mood = 'neutral'; form.dreamDate = ''; form.tags = []; form.tagInput = ''
}

function deleteDream(id: string) { store.deleteDream(id) }

function archiveDream(id: string) { store.archiveDream(id) }
function unarchiveDream(id: string) { store.unarchiveDream(id) }

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

function moodLabel(mood: string): string {
  return store.moodLabel(mood)
}

// ---- 梦境 ↔ 平行世界·梦境区 联动（#87，本地、无网络） ----
const flash = ref('')
let flashTimer: ReturnType<typeof setTimeout> | null = null
function showFlash(msg: string) {
  flash.value = msg
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flash.value = '' }, 2200)
}

/** 该梦境是否已映照到平行世界·梦境区 */
function isDreamLinked(d: { relatedParallelWorldId?: string | null }): boolean {
  return d.relatedParallelWorldId === DREAM_REALM_ID
}

/** 切换映照 / 取消映照（双向联动的本地来源侧） */
function toggleDreamRealm(d: { id: string; relatedParallelWorldId?: string | null }) {
  if (isDreamLinked(d)) {
    store.linkParallelWorld(d.id, null)
    showFlash('已取消映照到平行世界·梦境区')
  } else {
    store.linkParallelWorld(d.id, DREAM_REALM_ID)
    showFlash('已映照到平行世界·梦境区，去平行世界看看吧')
  }
}

function fmt(iso: string) {
  const d = new Date(iso); const now = new Date();
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function exportDreams() {
  const data = store.exportDreams()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `heartflow-dreams-${getLocalDateKey()}.json`
  a.click(); URL.revokeObjectURL(url)
}
function triggerImport() { importInput.value?.click() }
function importDreams(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const result = store.importDreams(reader.result as string)
      alert(`导入完成，新增 ${result.added} 条梦境`)
    } catch { alert('导入失败：文件格式不正确') }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<style scoped>
.dn {
  position: relative;
  max-width: 520px;
  margin: 0 auto;
  overflow-y: auto;
  background: transparent;
  color: var(--text-high);
}

/* 环境光晕 */
.dn::before,
.dn::after {
  content: '';
  position: fixed;
  top: 0;
  bottom: 0;
  width: 240px;
  pointer-events: none;
  z-index: 0;
}
.dn::before {
  left: 0;
  background: radial-gradient(ellipse at left center, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}
.dn::after {
  right: 0;
  background: radial-gradient(ellipse at right center, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
}

section {
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}
section h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}
.stat-item {
  text-align: center;
  padding: 14px 10px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  transition: background 0.2s;
}
.stat-item:hover {
  background: rgba(55, 48, 40, 0.7);
}
.stat-num {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: var(--accent);
}
.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

/* 输入框 */
.dn-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-high);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.dn-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.dn-input::placeholder {
  color: var(--text-secondary);
}
.dn-textarea {
  resize: vertical;
  line-height: 1.6;
  margin-top: 6px;
}

.dn-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-high);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.dn-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.form-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  align-items: stretch;
}
.form-row input {
  flex: 1;
}

.tag-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.tag-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.tag-pill {
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tag-remove {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.tag-remove:hover {
  opacity: 1;
}

.dn-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}
.dn-btn:hover {
  background: rgba(var(--accent-rgb), 0.18);
}
.dn-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.filter-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 梦境列表 */
.dream-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dream-card {
  padding: 14px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  cursor: pointer;
  transition: all 0.2s;
}
.dream-card:hover {
  background: rgba(55, 48, 40, 0.7);
}
.dream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.dream-header strong {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high);
}
.dream-mood {
  font-size: 16px;
}
.dream-preview {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
.dream-expanded {
  margin-top: 6px;
}
.dream-full {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 10px;
  white-space: pre-line;
}
.dream-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.dream-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dream-date {
  font-size: 11px;
  color: var(--text-secondary);
}
.tiny-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: transparent;
  color: #f87171;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;

  min-height: 26px;
}
.tiny-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}
.tiny-btn.archive-btn {
  border-color: rgba(var(--accent-rgb), 0.15);
  color: var(--text-secondary);
}
.tiny-btn.archive-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
}
.tiny-btn.restore-btn {
  border-color: rgba(52, 211, 153, 0.15);
  color: #6ee7b7;
}
.tiny-btn.restore-btn:hover {
  background: rgba(52, 211, 153, 0.08);
}
.tiny-btn.send-btn {
  border-color: rgba(167, 139, 250, 0.2);
  color: #b5707a;
}
.tiny-btn.send-btn:hover {
  background: rgba(167, 139, 250, 0.1);
}
.tiny-btn.send-btn.linked {
  border-color: rgba(167, 139, 250, 0.55);
  color: #c4b5fd;
  background: rgba(167, 139, 250, 0.18);
}

/* 映照反馈 toast（#87，非阻塞替代 alert） */
.dn-flash {
  position: fixed;
  left: 50%;
  bottom: 36px;
  transform: translateX(-50%);
  z-index: 120;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 13px;
  color: #ede9fe;
  background: rgba(76, 29, 149, 0.92);
  border: 1px solid rgba(167, 139, 250, 0.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}
.dn-flash-enter-active, .dn-flash-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.dn-flash-enter-from, .dn-flash-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .stats-row { gap: 8px; }
  .stats-row { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .stats-row { flex-direction: column; }
}

@media (max-width: 480px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .stat-item { padding: 8px; }
  .dream-card { padding: 10px; }
}
:deep(.room-layout){position:relative;z-index:1}
</style>