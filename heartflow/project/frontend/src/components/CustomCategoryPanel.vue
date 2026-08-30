<template>
  <section class="ccp-panel" aria-label="自定义分类">
    <header class="ccp-head">
      <span class="ccp-title">🏷️ 自定义分类</span>
      <span class="ccp-sub">增删改分类 · 命名 / 配色 / 图标 · 支持层级与既有键位兼容</span>
    </header>

    <!-- 收支类型切换 -->
    <div class="ccp-tabs">
      <button :class="['ccp-tab', { active: kind === 'income' }]" @click="kind = 'income'">收入</button>
      <button :class="['ccp-tab', { active: kind === 'expense' }]" @click="kind = 'expense'">支出</button>
    </div>

    <!-- 分类列表 -->
    <div class="ccp-list">
      <div v-for="c in visibleCats" :key="c.id" class="ccp-row" :style="{ paddingLeft: 10 + c.depth * 18 + 'px' }">
        <span class="ccp-swatch" :style="{ background: c.color }"></span>
        <span class="ccp-icon">{{ c.icon }}</span>
        <span class="ccp-name">{{ c.label }}</span>
        <span v-if="c.parentLabel" class="ccp-parent">⊂ {{ c.parentLabel }}</span>
        <span v-if="c.builtin" class="ccp-badge">内置</span>
        <button class="ccp-btn ccp-btn--ghost" :title="'编辑 ' + c.label" @click="startEdit(c)">✏</button>
        <button
          class="ccp-del"
          :disabled="c.builtin"
          :title="c.builtin ? '内置分类不可删除' : '删除 ' + c.label"
          @click="emit('remove', c.id)"
        >✕</button>
      </div>
      <p v-if="!visibleCats.length" class="ccp-empty">暂无{{ kind === 'income' ? '收入' : '支出' }}分类，可在下方新建。</p>
    </div>

    <!-- 编辑分类 -->
    <form v-if="editing" class="ccp-edit" @submit.prevent="saveEdit">
      <div class="ccp-edit-h">✏ 编辑「{{ editing.label }}」</div>
      <div class="ccp-form-grid">
        <input v-model="editForm.name" class="ccp-input" placeholder="名称" :maxlength="12" required />
        <input v-model="editForm.icon" class="ccp-input ccp-input-icon" placeholder="图标" :maxlength="2" />
        <select v-model="editForm.parentId" class="ccp-input ccp-select">
          <option value="">顶级分类</option>
          <option v-for="p in parentOptions" :key="p.value" :value="p.value">{{ p.indent }}{{ p.label }}</option>
        </select>
      </div>
      <div class="ccp-swatches">
        <button
          v-for="c in PALETTE"
          :key="c"
          type="button"
          class="ccp-swatch-btn"
          :class="{ on: editForm.color === c }"
          :style="{ background: c }"
          @click="editForm.color = c"
        ></button>
      </div>
      <div class="ccp-edit-actions">
        <button type="button" class="ccp-btn ccp-btn--ghost" @click="cancelEdit">取消</button>
        <button class="ccp-btn ccp-btn--primary" :disabled="!editForm.name.trim()">保存</button>
      </div>
    </form>

    <!-- 新增分类 -->
    <form class="ccp-form" @submit.prevent="submit">
      <div class="ccp-form-grid">
        <input v-model="form.name" class="ccp-input" placeholder="新分类名，如：宠物" :maxlength="12" required />
        <input v-model="form.icon" class="ccp-input ccp-input-icon" placeholder="图标(emoji)" :maxlength="2" />
        <select v-model="form.parentId" class="ccp-input ccp-select">
          <option value="">顶级分类</option>
          <option v-for="p in parentOptions" :key="p.value" :value="p.value">{{ p.indent }}{{ p.label }}</option>
        </select>
      </div>
      <div class="ccp-swatches">
        <button
          v-for="c in PALETTE"
          :key="c"
          type="button"
          class="ccp-swatch-btn"
          :class="{ on: form.color === c }"
          :style="{ background: c }"
          @click="form.color = c"
        ></button>
      </div>
      <button class="ccp-btn ccp-btn--primary" :disabled="!form.name.trim()">➕ 建分类</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { categoryOptions, type CustomCategory } from '../modules/reward/custom-category'

const PALETTE = ['#8a9a7a', '#c46a5a', '#f0c040', '#6b9fc4', '#e0a96d', '#d98c7a', '#94a3b8', '#a0c080']

const props = defineProps<{ categories: CustomCategory[] }>()
const emit = defineEmits<{
  (e: 'create', data: { name: string; kind: CustomCategory['kind']; icon: string; color: string; parentId?: string | null }): void
  (e: 'update', payload: { id: string; patch: Partial<CustomCategory> }): void
  (e: 'remove', id: string): void
}>()

const kind = ref<CustomCategory['kind']>('expense')

const visibleCats = computed(() => {
  const byId = new Map(props.categories.map(c => [c.id, c]))
  return categoryOptions(kind.value, props.categories).map(o => ({
    id: o.value,
    ...o,
    builtin: byId.get(o.value)?.builtin ?? false,
    parentLabel: o.depth > 0 ? byId.get(parentOf(o.value))?.name ?? '' : '',
  }))
})
function parentOf(id: string): string {
  return props.categories.find(c => c.id === id)?.parentId ?? ''
}

/** 同 kind 分类（排除自身与自身后代）作为父级候选，带缩进示意 */
const parentOptions = computed(() => {
  const ex = new Set(editing.value ? descendants(editing.value.value) : [])
  return categoryOptions(kind.value, props.categories)
    .filter(o => !ex.has(o.value))
    .map(o => ({ value: o.value, label: o.label, indent: '　'.repeat(o.depth) }))
})
function descendants(id: string): string[] {
  const out = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const c of props.categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id)
        changed = true
      }
    }
  }
  return [...out]
}

// ---- 新增 ----
const form = reactive({ name: '', icon: '📦', color: PALETTE[0], parentId: '' })
function submit(): void {
  if (!form.name.trim()) return
  emit('create', {
    name: form.name.trim(),
    kind: kind.value,
    icon: form.icon.trim() || '📦',
    color: form.color,
    parentId: form.parentId || null,
  })
  form.name = ''
  form.parentId = ''
}

// ---- 编辑 ----
const editing = ref<{ value: string; label: string } | null>(null)
const editForm = reactive({ name: '', icon: '📦', color: PALETTE[0], parentId: '' })
function startEdit(c: { value: string; label: string; icon: string; color: string }): void {
  editing.value = { value: c.value, label: c.label }
  editForm.name = c.label
  editForm.icon = c.icon
  editForm.color = c.color
  editForm.parentId = parentOf(c.value)
}
function saveEdit(): void {
  if (!editing.value || !editForm.name.trim()) return
  emit('update', {
    id: editing.value.value,
    patch: {
      name: editForm.name.trim(),
      icon: editForm.icon.trim() || '📦',
      color: editForm.color,
      parentId: editForm.parentId || null,
    },
  })
  cancelEdit()
}
function cancelEdit(): void {
  editing.value = null
}
</script>

<style scoped>
.ccp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.ccp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.ccp-title { font-weight: 600; }
.ccp-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.ccp-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.ccp-tab {
  background: transparent; border: 1px solid #374136; color: #b7c0a8;
  border-radius: 8px; padding: 4px 14px; cursor: pointer; font-size: 12px;
}
.ccp-tab.active { background: #8a9a7a; color: #171a15; border-color: #8a9a7a; font-weight: 600; }

.ccp-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.ccp-row {
  display: flex; align-items: center; gap: 8px; font-size: 12px;
  padding: 5px 4px; border-bottom: 1px dashed #2c312b;
}
.ccp-swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.ccp-icon { flex-shrink: 0; }
.ccp-name { font-weight: 600; }
.ccp-parent { color: #6b7563; font-size: 11px; }
.ccp-badge {
  font-size: 10px; color: #8a9a7a; border: 1px solid #374136;
  border-radius: 6px; padding: 0 5px;
}
.ccp-empty { font-size: 12px; color: #8a9a7a; }

.ccp-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 4px 10px; cursor: pointer; font-weight: 600; font-size: 11px; }
.ccp-btn--ghost { background: transparent; border: 1px solid #374136; color: #b7c0a8; margin-left: auto; }
.ccp-btn--primary { padding: 6px 14px; font-size: 12px; }
.ccp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ccp-del { background: none; border: none; color: #6b7563; cursor: pointer; font-size: 13px; }
.ccp-del:hover:not(:disabled) { color: #c46a5a; }
.ccp-del:disabled { opacity: 0.3; cursor: not-allowed; }

.ccp-edit { background: #1a1e18; border: 1px solid #3a443a; border-radius: 10px; padding: 10px; margin-bottom: 12px; }
.ccp-edit-h { font-size: 12px; color: #f0c040; font-weight: 600; margin-bottom: 8px; }
.ccp-edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

.ccp-form { border-top: 1px solid #2c312b; padding-top: 10px; }
.ccp-form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
@media (max-width: 640px) { .ccp-form-grid { grid-template-columns: 1fr; } }
.ccp-input, .ccp-select {
  background: #161a15; border: 1px solid #374136; border-radius: 8px; color: #d9decf;
  padding: 6px 8px; font-size: 12px; min-width: 0;
}
.ccp-select { color-scheme: dark; }
.ccp-input-icon { text-align: center; }

.ccp-swatches { display: flex; gap: 6px; margin: 8px 0; flex-wrap: wrap; }
.ccp-swatch-btn { width: 20px; height: 20px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; }
.ccp-swatch-btn.on { border-color: #f0c040; box-shadow: 0 0 0 1px #f0c040; }
</style>
