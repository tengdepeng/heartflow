<script setup lang="ts">
// ============================================================
// 外链房 · 写作提示词（用户模板）面板
// 内置模板只读；用户模板可增改删；编辑时自动解析 {{变量}} 并实时预览。
// 复用 engine/ai/prompt 的 renderTemplate，不另造渲染逻辑。
// ============================================================
import { ref, computed, reactive } from 'vue'
import {
  getUserTemplates,
  getBuiltinTemplates,
  addUserTemplate,
  updateUserTemplate,
  removeUserTemplate,
  duplicateBuiltin,
  extractVariables,
  previewTemplate,
  type UserPromptTemplate,
} from '../../modules/external-room/prompts'
import type { AIPromptTemplate } from '../../engine/ai/types'

const templates = ref<UserPromptTemplate[]>(getUserTemplates())
const builtins = getBuiltinTemplates()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ name: '', systemTemplate: '' })
const varInputs = ref<Record<string, string>>({})
const notice = ref<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)

const variables = computed(() => extractVariables(form.systemTemplate))
const preview = computed(() => {
  const vars: Record<string, string> = {}
  for (const v of variables.value) vars[v] = varInputs.value[v] ?? ''
  return previewTemplate(form.systemTemplate, vars)
})

let noticeTimer: ReturnType<typeof setTimeout> | undefined
function flash(kind: 'ok' | 'warn' | 'err', text: string): void {
  notice.value = { kind, text }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3600)
}

function reload(): void {
  templates.value = getUserTemplates()
}

function openAdd(): void {
  editingId.value = null
  form.name = ''
  form.systemTemplate = ''
  varInputs.value = {}
  showForm.value = true
}

function openEdit(t: UserPromptTemplate): void {
  editingId.value = t.id
  form.name = t.name
  form.systemTemplate = t.systemTemplate
  varInputs.value = { ...t.defaultVariables }
  showForm.value = true
}

function setVar(v: string, val: string): void {
  varInputs.value = { ...varInputs.value, [v]: val }
}

function save(): void {
  if (!form.name.trim()) {
    flash('warn', '请填写模板名称')
    return
  }
  if (!form.systemTemplate.trim()) {
    flash('warn', '请填写系统提示词内容')
    return
  }
  const vars: Record<string, string> = {}
  for (const v of variables.value) vars[v] = varInputs.value[v]?.trim() ?? ''
  if (editingId.value) {
    updateUserTemplate(editingId.value, {
      name: form.name,
      systemTemplate: form.systemTemplate,
      defaultVariables: vars,
    })
    flash('ok', `已更新「${form.name.trim()}」`)
  } else {
    addUserTemplate({ name: form.name, systemTemplate: form.systemTemplate, defaultVariables: vars })
    flash('ok', `已保存「${form.name.trim()}」`)
  }
  reload()
  showForm.value = false
  editingId.value = null
}

function del(t: UserPromptTemplate): void {
  removeUserTemplate(t.id)
  reload()
  flash('ok', `已删除「${t.name}」`)
}

function duplicate(b: AIPromptTemplate): void {
  const t = duplicateBuiltin(b.id)
  if (!t) {
    flash('err', '复制失败：未找到内置模板')
    return
  }
  reload()
  flash('ok', `已复制「${b.name}」为你的起点，去「我的模板」编辑`)
}
</script>

<template>
  <div class="pt">
    <!-- 内置模板（只读） -->
    <div class="pt-block">
      <span class="pt-title">内置模板（只读）</span>
      <div class="pt-list">
        <div v-for="b in builtins" :key="b.id" class="pt-card">
          <div class="pt-card-head">
            <span class="pt-name">{{ b.name }}</span>
            <span class="pt-tag">内置</span>
          </div>
          <p class="pt-card-meta">{{ b.systemTemplate.replace(/\{\{.*?\}\}/g, '…').slice(0, 48) }}…</p>
          <button class="pt-btn pt-btn--ghost pt-clone" @click="duplicate(b)">复制为起点</button>
        </div>
      </div>
    </div>

    <!-- 我的模板 -->
    <div class="pt-block">
      <div class="pt-block-head">
        <span class="pt-title">我的模板</span>
        <button class="pt-btn pt-btn--primary" @click="openAdd">+ 新增</button>
      </div>

      <div v-if="templates.length === 0" class="pt-empty">
        还没有私有模板。从上方「复制为起点」，或点「新增」从零写。
      </div>

      <div class="pt-list">
        <div v-for="t in templates" :key="t.id" class="pt-card pt-card--mine">
          <div class="pt-card-head">
            <span class="pt-name">{{ t.name }}</span>
            <span class="pt-tag pt-tag--cnt">{{ Object.keys(t.defaultVariables).length }} 变量</span>
          </div>
          <p class="pt-card-meta">{{ t.systemTemplate.replace(/\{\{.*?\}\}/g, '…').slice(0, 48) }}…</p>
          <div class="pt-card-actions">
            <button class="pt-btn pt-btn--ghost" @click="openEdit(t)">编辑</button>
            <button class="pt-btn pt-btn--ghost pt-danger" @click="del(t)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑 / 新增表单 -->
    <div v-if="showForm" class="pt-modal-mask" @click.self="showForm = false">
      <div class="pt-modal" role="dialog" aria-modal="true">
        <div class="pt-modal-head">
          <span>{{ editingId ? '编辑模板' : '新增模板' }}</span>
          <button class="pt-x" @click="showForm = false">✕</button>
        </div>

        <div class="pt-form">
          <label class="pt-row">
            <span class="pt-label">名称 *</span>
            <input v-model="form.name" class="pt-input" placeholder="如 小说开篇、周报助手" />
          </label>

          <label class="pt-row">
            <span class="pt-label">系统提示词 *</span>
            <textarea
              v-model="form.systemTemplate"
              class="pt-input pt-area"
              rows="5"
              placeholder="用 {{变量名}} 占位，如：你是{{role}}，为{{theme}}写开篇。"
            ></textarea>
          </label>

          <div v-if="variables.length" class="pt-vars">
            <span class="pt-label">变量默认值（实时预览用）</span>
            <div v-for="v in variables" :key="v" class="pt-var">
              <span class="pt-var-name">{{ v }}</span>
              <input
                class="pt-input"
                :value="varInputs[v] ?? ''"
                :placeholder="`${v} 的默认值`"
                @input="setVar(v, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>

        <div class="pt-preview">
          <span class="pt-label">实时预览</span>
          <p class="pt-preview-text">{{ preview || '（模板为空）' }}</p>
          <span class="pt-preview-hint">未填变量自动留空 · 复用引擎 renderTemplate</span>
        </div>

        <div class="pt-modal-foot">
          <button class="pt-btn pt-btn--ghost" @click="showForm = false">取消</button>
          <button class="pt-btn pt-btn--primary" @click="save">保存</button>
        </div>
      </div>
    </div>

    <Transition name="pt-fade">
      <span v-if="notice" class="pt-notice" :class="`pt-notice--${notice.kind}`">{{ notice.text }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.pt {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--text-primary, #e8e0d8);
}
.pt-block { display: flex; flex-direction: column; gap: 10px; }
.pt-block-head { display: flex; align-items: center; justify-content: space-between; }
.pt-title { font-size: 12px; letter-spacing: 1px; opacity: 0.5; }

.pt-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.pt-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 13px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.pt-card--mine { background: rgba(212, 165, 116, 0.06); border-color: rgba(212, 165, 116, 0.28); }
.pt-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pt-name { font-size: 14px; font-weight: 500; }
.pt-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.07); opacity: 0.6;
}
.pt-tag--cnt { background: rgba(212, 165, 116, 0.16); color: var(--accent, #d4a574); opacity: 1; }
.pt-card-meta { margin: 0; font-size: 11px; opacity: 0.45; line-height: 1.5; word-break: break-all; }
.pt-card-actions { display: flex; gap: 8px; }
.pt-empty { font-size: 13px; opacity: 0.55; line-height: 1.7; padding: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); }

.pt-btn {
  padding: 7px 15px; border-radius: 9px; font-size: 13px; cursor: pointer;
  background: rgba(255, 255, 255, 0.05); color: var(--text-primary, #e8e0d8);
  border: 1px solid rgba(255, 255, 255, 0.1); transition: border-color 0.2s ease, background 0.2s ease;
}
.pt-btn:hover { border-color: rgba(212, 165, 116, 0.35); }
.pt-btn--primary { background: rgba(212, 165, 116, 0.18); color: var(--accent, #d4a574); border-color: rgba(212, 165, 116, 0.35); }
.pt-btn--ghost { background: transparent; }
.pt-btn--danger { color: #e08a7a; }
.pt-clone { align-self: flex-start; padding: 5px 12px; font-size: 12px; }

.pt-modal-mask {
  position: fixed; inset: 0; z-index: 200; display: grid; place-items: center;
  background: rgba(8, 6, 5, 0.6);
}
.pt-modal {
  width: min(560px, 94vw); max-height: 88vh; overflow-y: auto;
  border-radius: 18px; padding: 18px 20px 20px;
  background: #1e1913; border: 1px solid rgba(212, 165, 116, 0.25);
}
.pt-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: 500; margin-bottom: 14px; }
.pt-x { background: none; border: none; color: var(--text-primary, #e8e0d8); opacity: 0.5; cursor: pointer; font-size: 16px; }
.pt-form { display: flex; flex-direction: column; gap: 12px; }
.pt-row { display: flex; flex-direction: column; gap: 5px; }
.pt-label { font-size: 12px; opacity: 0.6; }
.pt-input {
  padding: 8px 11px; border-radius: 9px; font-size: 13px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e8e0d8); font-family: inherit;
}
.pt-area { resize: vertical; line-height: 1.6; }
.pt-vars { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
.pt-var { display: flex; align-items: center; gap: 8px; }
.pt-var-name { font-size: 12px; opacity: 0.7; min-width: 72px; font-family: var(--font-mono, ui-monospace, monospace); }

.pt-preview { padding: 12px 14px; border-radius: 12px; background: rgba(212, 165, 116, 0.05); border: 1px solid rgba(212, 165, 116, 0.25); }
.pt-preview-text { margin: 6px 0 6px; font-size: 13px; line-height: 1.7; color: rgba(233, 224, 208, 0.92); white-space: pre-wrap; }
.pt-preview-hint { font-size: 11px; opacity: 0.45; }

.pt-modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.pt-notice {
  position: fixed; left: 50%; bottom: 64px; transform: translateX(-50%);
  padding: 9px 18px; border-radius: 999px; font-size: 13px; z-index: 210;
  background: #211b15; border: 1px solid rgba(212, 165, 116, 0.35);
}
.pt-notice--ok { color: #7fd0bb; }
.pt-notice--warn { color: #e0a06a; }
.pt-notice--err { color: #e08a7a; }

.pt-fade-enter-active, .pt-fade-leave-active { transition: opacity 0.2s ease; }
.pt-fade-enter-from, .pt-fade-leave-to { opacity: 0; }
</style>
