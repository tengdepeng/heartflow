<script setup lang="ts">
// ============================================================
// 外链房 · 技能登记面板
// 出口闸横幅（isExternalAIConsented 实时放行状态）+ 内置能力启用开关
// （种子自镜我意图 intents.ts + 顾问调令 commandIntent.ts）+ 外部技能接入位
// （出网需闸门同意）。视觉沿用 RankChannel / PromptTemplates（accent #d4a574）。
// ============================================================
import { ref, computed } from 'vue'
import { isExternalAIConsented } from '../../engine/ai/external-gate'
import {
  getAllSkills,
  isEnabled,
  setEnabled,
  addExternalSkill,
  removeExternalSkill,
  type SkillDef,
  type ExternalSkillInput,
} from '../../modules/external-room/skills'

const consented = computed(() => isExternalAIConsented())

const skills = ref<SkillDef[]>(getAllSkills())
const enabledMap = ref<Record<string, boolean>>(buildEnabledMap())

function buildEnabledMap(): Record<string, boolean> {
  const m: Record<string, boolean> = {}
  for (const s of skills.value) m[s.id] = isEnabled(s.id)
  return m
}

function reload(): void {
  skills.value = getAllSkills()
  enabledMap.value = buildEnabledMap()
}

const mirrorSkills = computed(() => skills.value.filter((s) => s.source === 'mirror'))
const advisorSkills = computed(() => skills.value.filter((s) => s.source === 'advisor'))
const externalSkills = computed(() => skills.value.filter((s) => s.source === 'external'))

const status = computed(() => ({
  total: skills.value.length,
  builtin: skills.value.filter((s) => s.builtin).length,
  external: skills.value.filter((s) => !s.builtin).length,
  enabled: skills.value.filter((s) => enabledMap.value[s.id]).length,
  consented: consented.value,
}))

function toggle(s: SkillDef): void {
  setEnabled(s.id, !isEnabled(s.id))
  reload()
}

// 外部技能接入位
const name = ref('')
const trigger = ref('')
const icon = ref('')
const desc = ref('')
const error = ref('')

function add(): void {
  error.value = ''
  if (!consented.value) {
    error.value = '外部技能需先开启出口闸（宪法页同意远程 AI 端点）'
    return
  }
  const input: ExternalSkillInput = {
    name: name.value,
    trigger: trigger.value,
    icon: icon.value,
    description: desc.value,
  }
  const created = addExternalSkill(input)
  if (!created) {
    error.value = name.value.trim() ? '同名技能已存在' : '请填写技能名'
    return
  }
  name.value = ''
  trigger.value = ''
  icon.value = ''
  desc.value = ''
  reload()
}

function del(id: string): void {
  removeExternalSkill(id)
  reload()
}
</script>

<template>
  <div class="sc">
    <!-- 出口闸状态 -->
    <div class="sc-banner" :class="consented ? 'is-open' : 'is-closed'">
      <span class="sc-dot"></span>
      <span>出口闸：{{ consented ? '已允许远程 AI 端点' : '仅本地端点放行（默认）' }} · 外部技能出网须经此闸</span>
    </div>

    <!-- 概览 -->
    <div class="sc-stats">
      <div class="sc-stat"><span class="num">{{ status.builtin }}</span><span class="lbl">内置能力</span></div>
      <div class="sc-stat"><span class="num">{{ status.external }}</span><span class="lbl">外部技能</span></div>
      <div class="sc-stat"><span class="num">{{ status.enabled }}</span><span class="lbl">已启用</span></div>
      <div class="sc-stat"><span class="num">{{ status.total }}</span><span class="lbl">总计</span></div>
    </div>

    <!-- 镜我意图 -->
    <section class="sc-group">
      <h3 class="sc-title">镜我意图（种子自 intents.ts）</h3>
      <div v-for="s in mirrorSkills" :key="s.id" class="sc-row" :class="{ off: !enabledMap[s.id] }">
        <span class="sc-ic">{{ s.icon }}</span>
        <div class="sc-meta">
          <div class="sc-name">{{ s.label }}</div>
          <div class="sc-desc">{{ s.description }}</div>
        </div>
        <span class="sc-src">mirror</span>
        <button class="sc-toggle" :class="{ on: enabledMap[s.id] }" @click="toggle(s)">
          {{ enabledMap[s.id] ? '开' : '关' }}
        </button>
      </div>
    </section>

    <!-- 顾问调令 -->
    <section class="sc-group">
      <h3 class="sc-title">顾问调令（种子自 commandIntent.ts）</h3>
      <div v-for="s in advisorSkills" :key="s.id" class="sc-row" :class="{ off: !enabledMap[s.id] }">
        <span class="sc-ic">{{ s.icon }}</span>
        <div class="sc-meta">
          <div class="sc-name">{{ s.label }}</div>
          <div class="sc-desc">{{ s.description }}</div>
        </div>
        <span class="sc-src">advisor</span>
        <button class="sc-toggle" :class="{ on: enabledMap[s.id] }" @click="toggle(s)">
          {{ enabledMap[s.id] ? '开' : '关' }}
        </button>
      </div>
    </section>

    <!-- 外部技能接入位 -->
    <section class="sc-group">
      <h3 class="sc-title">外部技能接入位（出网经出口闸）</h3>

      <div v-if="externalSkills.length" class="sc-list">
        <div v-for="s in externalSkills" :key="s.id" class="sc-row">
          <span class="sc-ic">{{ s.icon }}</span>
          <div class="sc-meta">
            <div class="sc-name">{{ s.label }}</div>
            <div class="sc-desc">{{ s.description }}</div>
          </div>
          <span class="sc-src sc-src--warn">出网</span>
          <button class="sc-del" @click="del(s.id)">移除</button>
        </div>
      </div>

      <div class="sc-form">
        <input v-model="name" class="sc-input" placeholder="技能名（如：联网查天气）" />
        <input v-model="trigger" class="sc-input" placeholder="触发词 / 描述（本地规则）" />
        <input v-model="icon" class="sc-input sc-input--icon" placeholder="图标 emoji（可选）" />
        <input v-model="desc" class="sc-input" placeholder="说明（可选）" />
        <button class="sc-add" :disabled="!consented" @click="add">
          {{ consented ? '添加外部技能' : '需先开启出口闸' }}
        </button>
      </div>
      <p v-if="error" class="sc-err">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.sc {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--text-primary, #e9e0d0);
}
.sc-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  align-self: flex-start;
}
.sc-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.sc-banner.is-closed .sc-dot { background: #7fd0bb; }
.sc-banner.is-open .sc-dot { background: #e0a06a; }

.sc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.sc-stat {
  padding: 10px 12px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex; flex-direction: column; gap: 2px;
}
.sc-stat .num { font-size: 20px; font-weight: 500; color: var(--accent, #d4a574); }
.sc-stat .lbl { font-size: 11px; opacity: 0.5; }

.sc-group { display: flex; flex-direction: column; gap: 8px; }
.sc-title { margin: 0; font-size: 12px; letter-spacing: 1px; opacity: 0.55; font-weight: 500; }

.sc-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
}
.sc-row.off { opacity: 0.5; }
.sc-ic { font-size: 18px; flex: none; }
.sc-meta { flex: 1; min-width: 0; }
.sc-name { font-size: 13px; font-weight: 500; }
.sc-desc { font-size: 11px; opacity: 0.5; }
.sc-src { font-size: 10px; opacity: 0.4; flex: none; }
.sc-src--warn { color: #e0a06a; opacity: 0.85; }

.sc-toggle {
  flex: none; padding: 5px 14px; border-radius: 8px; font-size: 12px; cursor: pointer;
  background: rgba(255, 255, 255, 0.05); color: var(--text-primary, #e9e0d0);
  border: 1px solid rgba(255, 255, 255, 0.1); transition: border-color 0.2s ease, background 0.2s ease;
}
.sc-toggle.on { background: rgba(212, 165, 116, 0.2); color: var(--accent, #d4a574); border-color: rgba(212, 165, 116, 0.4); }

.sc-list { display: flex; flex-direction: column; gap: 8px; }
.sc-del {
  flex: none; padding: 5px 14px; border-radius: 8px; font-size: 12px; cursor: pointer;
  background: transparent; color: #e08a7a; border: 1px solid rgba(224, 138, 122, 0.3);
  transition: border-color 0.2s ease;
}
.sc-del:hover { border-color: rgba(224, 138, 122, 0.55); }

.sc-form { display: flex; flex-wrap: wrap; gap: 8px; }
.sc-input {
  flex: 1 1 200px; min-width: 0; padding: 8px 11px; border-radius: 9px; font-size: 13px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e9e0d0); font-family: inherit;
}
.sc-input--icon { flex: 1 1 90px; }
.sc-input::placeholder { opacity: 0.4; }
.sc-input:disabled { opacity: 0.4; cursor: default; }

.sc-add {
  flex: none; padding: 8px 16px; border-radius: 9px; font-size: 13px; cursor: pointer;
  background: rgba(212, 165, 116, 0.18); color: var(--accent, #d4a574);
  border: 1px solid rgba(212, 165, 116, 0.35); transition: border-color 0.2s ease;
}
.sc-add:disabled { opacity: 0.4; cursor: default; }
.sc-err { margin: 0; font-size: 12px; color: #e08a7a; }
</style>
