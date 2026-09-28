<template>
  <div class="traditions-view">
    <RoomLayout title="文明根系" subtitle="把技艺、仪式与民俗沉淀成本地记忆，随实践而生长">
    <!-- 文明根系 -->
    <section class="trad-block">

      <div class="trad-stats">
        <span class="trad-stat"><b>{{ summary.totalEntries }}</b> 条记录</span>
        <span class="trad-stat trad-stat--warn"><b>{{ summary.endangeredCount }}</b> 项濒危</span>
        <span class="trad-stat"><b>{{ summary.totalPracticeCount }}</b> 次实践</span>
      </div>

      <div class="trad-toolbar">
        <input
          v-model="query"
          class="trad-input trad-search"
          type="text"
          placeholder="搜索名称、描述、标签或地区"
          @input="onSearch"
        />
        <button class="trad-btn trad-btn--primary" @click="toggleForm">
          {{ showForm ? '收起' : '新增根系' }}
        </button>
      </div>

      <!-- 新增 / 编辑 表单 -->
      <div v-if="showForm" class="trad-form">
        <div class="trad-form-grid">
          <label class="trad-field">
            <span>名称</span>
            <input v-model="form.name" class="trad-input" type="text" placeholder="如：端午龙舟" />
          </label>
          <label class="trad-field">
            <span>类别</span>
            <select v-model="form.category" class="trad-input">
              <option v-for="(label, key) in categoryOptions" :key="key" :value="key">{{ label }}</option>
            </select>
          </label>
          <label class="trad-field">
            <span>地区</span>
            <input v-model="form.region" class="trad-input" type="text" placeholder="如：江南" />
          </label>
          <label class="trad-field">
            <span>来源</span>
            <select v-model="form.source" class="trad-input">
              <option value="personal">个人</option>
              <option value="family">家族</option>
            </select>
          </label>
        </div>
        <label class="trad-field">
          <span>描述</span>
          <textarea v-model="form.description" class="trad-input trad-textarea" placeholder="它的由来、讲究与意义" />
        </label>
        <div class="trad-form-grid">
          <label class="trad-field">
            <span>步骤 / 流程（每行一条）</span>
            <textarea v-model="form.stepsText" class="trad-input trad-textarea" placeholder="备料&#10;起手&#10;收尾" />
          </label>
          <label class="trad-field">
            <span>材料 / 器具（每行一条）</span>
            <textarea v-model="form.materialsText" class="trad-input trad-textarea" placeholder="竹篾&#10;彩漆" />
          </label>
        </div>
        <label class="trad-field">
          <span>寓意 / 象征（每行一条）</span>
          <textarea v-model="form.meaningsText" class="trad-input trad-textarea" placeholder="祈福&#10;团圆" />
        </label>
        <label class="trad-field">
          <span>标签（逗号或换行分隔）</span>
          <input v-model="form.tagsText" class="trad-input" type="text" placeholder="民俗, 节令" />
        </label>
        <label class="trad-field trad-field--inline">
          <input v-model="form.endangered" type="checkbox" />
          <span>标记为濒危</span>
        </label>
        <div class="trad-form-actions">
          <button class="trad-btn trad-btn--primary" @click="submitEntry">
            {{ editingId ? '保存修改' : '创建记录' }}
          </button>
          <button class="trad-btn" @click="cancelEdit">取消</button>
        </div>
      </div>

      <!-- 列表 -->
      <ul v-if="displayedEntries.length" class="trad-list">
        <li v-for="entry in displayedEntries" :key="entry.id" class="trad-card trad-entry">
          <div class="trad-card-head">
            <h3 class="trad-card-title">{{ entry.name }}</h3>
            <span class="trad-badge">{{ catLabel(entry.category) }}</span>
            <span v-if="entry.endangered" class="trad-badge trad-badge--warn">濒危</span>
          </div>
          <p class="trad-card-meta">
            {{ entry.region || '未知地区' }} · 来源 {{ sourceLabel(entry.source) }} ·
            实践 {{ entry.practiceCount }} 次
          </p>
          <p v-if="entry.description" class="trad-card-desc">{{ entry.description }}</p>
          <div v-if="entry.tags.length" class="trad-tags">
            <span v-for="t in entry.tags" :key="t" class="trad-tag">#{{ t }}</span>
          </div>
          <div class="trad-card-actions">
            <button class="trad-btn trad-btn--sm" @click="practiceAction(entry.id)">实践 +1</button>
            <button class="trad-btn trad-btn--sm" @click="toggleEndangeredAction(entry)">
              {{ entry.endangered ? '取消濒危' : '标记濒危' }}
            </button>
            <button class="trad-btn trad-btn--sm" @click="editEntry(entry)">编辑</button>
            <button class="trad-btn trad-btn--sm trad-btn--danger" @click="removeEntryAction(entry.id)">删除</button>
          </div>
        </li>
      </ul>
      <EmptyState v-else icon="🌱" title="文明根系还是空的。把家中代代相传的技艺、节令仪式或民俗记下来，它们会在这里生根。" :glow="false" cta-label="" />
    </section>

    <!-- 文明档案（INCR-16）档案概览/技艺/仪式/来源/地域/实践/文明健康/标签/洞察 -->
    <TraditionsArchivePanel :entries="entries" />

    <!-- ============================================================ -->
    <!-- 根系生命力（INCR-377 补挂载孤儿引擎 traditions/root-vitality：培育总览/枝繁/凋零/此刻浇灌/岁时关联，纯函数薄委托） -->
    <!-- ============================================================ -->
    <RootVitalityPanel :entries="entries" />

    <!-- 个人文明收藏 -->
    <section class="trad-block">
      <header class="trad-head">
        <h2 class="trad-title trad-title--sm">个人文明收藏</h2>
        <p class="trad-sub">把零散的根系收拢成一段文明的切片，仅存于本设备，是你私人的收藏</p>
      </header>

      <button class="trad-btn trad-btn--primary trad-mirror-add" @click="toggleMirrorForm">
        {{ showMirrorForm ? '收起' : '新建收藏' }}
      </button>

      <div v-if="showMirrorForm" class="trad-form">
        <div class="trad-form-grid">
          <label class="trad-field">
            <span>名称</span>
            <input v-model="mirrorForm.name" class="trad-input" type="text" placeholder="如：江南水乡岁时记" />
          </label>
          <label class="trad-field">
            <span>覆盖地区</span>
            <input v-model="mirrorForm.region" class="trad-input" type="text" placeholder="如：江南" />
          </label>
          <label class="trad-field">
            <span>覆盖时期</span>
            <input v-model="mirrorForm.period" class="trad-input" type="text" placeholder="如：清末至今" />
          </label>
        </div>
        <label class="trad-field">
          <span>描述</span>
          <textarea v-model="mirrorForm.description" class="trad-input trad-textarea" placeholder="这段收藏想留住什么" />
        </label>
        <label class="trad-field">
          <span>标签（逗号或换行分隔）</span>
          <input v-model="mirrorForm.tagsText" class="trad-input" type="text" placeholder="岁时, 宗族" />
        </label>
        <div class="trad-form-actions">
          <button class="trad-btn trad-btn--primary" @click="submitMirror">创建收藏</button>
          <button class="trad-btn" @click="toggleMirrorForm">取消</button>
        </div>
      </div>

      <ul v-if="mirrors.length" class="trad-list">
        <li v-for="m in mirrors" :key="m.id" class="trad-card trad-mirror">
          <div class="trad-card-head">
            <h3 class="trad-card-title">{{ m.name }}</h3>
            <span class="trad-badge">{{ m.entryCount }} 条根系</span>
          </div>
          <p class="trad-card-meta">{{ m.region || '未知地区' }} · {{ m.period || '不限时期' }}</p>
          <p v-if="m.description" class="trad-card-desc">{{ m.description }}</p>
          <div v-if="m.tags.length" class="trad-tags">
            <span v-for="t in m.tags" :key="t" class="trad-tag">#{{ t }}</span>
          </div>
          <div class="trad-card-actions">
            <button class="trad-btn trad-btn--sm trad-btn--danger" @click="removeMirrorAction(m.id)">删除</button>
          </div>
        </li>
      </ul>
      <EmptyState v-else icon="📦" title="还没有个人文明收藏。把相关的根系收拢成一片切片，留作你自己的文明记忆。" :glow="false" cta-label="" />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTraditionsBridge } from '../modules/traditions/traditions-bridge'
import { CRAFT_CATEGORY_LABELS, RITUAL_TYPE_LABELS } from '../modules/traditions'
import type { CraftCategory, RitualType, FolkloreEntry } from '../modules/traditions'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import TraditionsArchivePanel from '../components/TraditionsArchivePanel.vue'
import RootVitalityPanel from '../components/RootVitalityPanel.vue'

const {
  entries,
  mirrors,
  summary,
  searchResults,
  createEntry,
  updateEntry,
  removeEntry,
  practiceEntry,
  toggleEndangered,
  search,
  createMirror,
  removeMirror,
  initialize,
} = useTraditionsBridge()

const categoryOptions = { ...CRAFT_CATEGORY_LABELS, ...RITUAL_TYPE_LABELS } as Record<CraftCategory | RitualType, string>

function catLabel(cat: string): string {
  return CRAFT_CATEGORY_LABELS[cat as CraftCategory] || RITUAL_TYPE_LABELS[cat as RitualType] || cat
}

function sourceLabel(source: FolkloreEntry['source']): string {
  return source === 'family' ? '家族' : '个人'
}

function toLines(text: string): string[] {
  return text
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ---- 检索 ----
const query = ref('')
const displayedEntries = computed<FolkloreEntry[]>(() =>
  query.value.trim() ? searchResults.value : entries.value,
)

function onSearch(): void {
  search(query.value)
}

// ---- 根系 表单 ----
const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  category: 'handicraft' as CraftCategory | RitualType,
  region: '',
  description: '',
  stepsText: '',
  materialsText: '',
  meaningsText: '',
  tagsText: '',
  source: 'personal' as 'personal' | 'family',
  endangered: false,
})

function resetForm(): void {
  form.name = ''
  form.category = 'handicraft'
  form.region = ''
  form.description = ''
  form.stepsText = ''
  form.materialsText = ''
  form.meaningsText = ''
  form.tagsText = ''
  form.source = 'personal'
  form.endangered = false
  editingId.value = null
}

function toggleForm(): void {
  if (showForm.value && editingId.value) resetForm()
  showForm.value = !showForm.value
}

function submitEntry(): void {
  if (!form.name.trim()) return
  const payload = {
    name: form.name.trim(),
    category: form.category,
    region: form.region.trim(),
    description: form.description.trim(),
    steps: toLines(form.stepsText),
    materials: toLines(form.materialsText),
    meanings: toLines(form.meaningsText),
    tags: toLines(form.tagsText),
    endangered: form.endangered,
    source: form.source,
    mediaUrls: [] as string[],
  }
  if (editingId.value) {
    updateEntry(editingId.value, {
      name: payload.name,
      category: payload.category,
      region: payload.region,
      description: payload.description,
      steps: payload.steps,
      materials: payload.materials,
      meanings: payload.meanings,
      tags: payload.tags,
      endangered: payload.endangered,
      source: payload.source,
    })
  } else {
    createEntry(payload)
  }
  resetForm()
  showForm.value = false
  query.value = ''
  search('')
}

function editEntry(entry: FolkloreEntry): void {
  editingId.value = entry.id
  form.name = entry.name
  form.category = entry.category
  form.region = entry.region
  form.description = entry.description
  form.stepsText = entry.steps.join('\n')
  form.materialsText = entry.materials.join('\n')
  form.meaningsText = entry.meanings.join('\n')
  form.tagsText = entry.tags.join(', ')
  form.source = entry.source === 'family' ? 'family' : 'personal'
  form.endangered = entry.endangered
  showForm.value = true
}

function cancelEdit(): void {
  resetForm()
  showForm.value = false
}

function removeEntryAction(id: string): void {
  removeEntry(id)
  query.value = ''
  search('')
}

function practiceAction(id: string): void {
  practiceEntry(id)
}

function toggleEndangeredAction(entry: FolkloreEntry): void {
  toggleEndangered(entry.id, !entry.endangered)
}

// ---- 收藏 表单 ----
const showMirrorForm = ref(false)
const mirrorForm = reactive({
  name: '',
  region: '',
  period: '',
  description: '',
  tagsText: '',
})

function toggleMirrorForm(): void {
  showMirrorForm.value = !showMirrorForm.value
}

function submitMirror(): void {
  if (!mirrorForm.name.trim()) return
  // 宪法安全：收藏为本地私有，绝不对外公开（isPublic=false）
  createMirror(
    mirrorForm.name.trim(),
    mirrorForm.region.trim(),
    mirrorForm.period.trim(),
    mirrorForm.description.trim(),
    toLines(mirrorForm.tagsText),
    false,
  )
  mirrorForm.name = ''
  mirrorForm.region = ''
  mirrorForm.period = ''
  mirrorForm.description = ''
  mirrorForm.tagsText = ''
  showMirrorForm.value = false
}

function removeMirrorAction(id: string): void {
  removeMirror(id)
}

onMounted(async () => {
  await initialize()
})
</script>

<style scoped>
.traditions-view {
  min-height: 100%;
  color: var(--text-primary, #e8e3da);
  background: transparent;
  position: relative;
}

.traditions-view::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(120% 80% at 15% 0%, rgba(196, 160, 96, 0.10), transparent 60%);
  z-index: -1;
}

.trad-block {
  max-width: 880px;
  margin: 0 auto 36px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trad-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trad-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.trad-title--sm {
  font-size: 18px;
}

.trad-sub {
  margin: 0;
  font-size: 13px;
  opacity: 0.62;
}

.trad-stats {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.trad-stat {
  font-size: 13px;
  opacity: 0.78;
}

.trad-stat b {
  font-size: 16px;
  font-weight: 600;
  opacity: 1;
}

.trad-stat--warn b {
  color: #d6a96a;
}

.trad-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.trad-search {
  flex: 1 1 auto;
}

.trad-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 10px;
  padding: 9px 12px;
  color: var(--text-primary, #e8e3da);
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.trad-input:focus {
  border-color: rgba(196, 160, 96, 0.55);
}

.trad-textarea {
  min-height: 64px;
  resize: vertical;
  line-height: 1.6;
}

.trad-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 8px 14px;
  color: var(--text-primary, #e8e3da);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.trad-btn:hover {
  background: rgba(255, 255, 255, 0.10);
}

.trad-btn--primary {
  background: rgba(196, 160, 96, 0.18);
  border-color: rgba(196, 160, 96, 0.5);
  color: #e8d8b8;
}

.trad-btn--primary:hover {
  background: rgba(196, 160, 96, 0.28);
}

.trad-btn--sm {
  padding: 5px 10px;
  font-size: 12px;
}

.trad-btn--danger {
  border-color: rgba(214, 120, 96, 0.45);
  color: #e0a890;
}

.trad-btn--danger:hover {
  background: rgba(214, 120, 96, 0.18);
}

.trad-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.trad-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.trad-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  opacity: 0.82;
}

.trad-field--inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.trad-form-actions {
  display: flex;
  gap: 10px;
}

.trad-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trad-card {
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trad-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.trad-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.trad-badge {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(196, 160, 96, 0.16);
  border: 1px solid rgba(196, 160, 96, 0.4);
  color: #e8d8b8;
}

.trad-badge--warn {
  background: rgba(214, 120, 96, 0.16);
  border-color: rgba(214, 120, 96, 0.45);
  color: #e0a890;
}

.trad-card-meta {
  margin: 0;
  font-size: 12px;
  opacity: 0.6;
}

.trad-card-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.85;
}

.trad-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.trad-tag {
  font-size: 11px;
  opacity: 0.7;
}

.trad-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.trad-mirror-add {
  align-self: flex-start;
}

</style>
