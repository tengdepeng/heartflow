<template>
  <section class="chp">
    <div class="chp-head">
      <div class="chp-title-wrap">
        <span class="chp-title">✒️ 自定义字库</span>
        <span class="chp-sub">把查过的、想留的字，收进自己的字库</span>
      </div>
      <span class="chp-count">{{ customChars.length }} / {{ totalChars }} 字</span>
    </div>

    <!-- 新增 -->
    <div class="chp-add">
      <div class="chp-add-row">
        <input v-model="form.char" class="chp-input chp-char" maxlength="1" placeholder="字" />
        <input v-model="form.pinyin" class="chp-input" placeholder="拼音（如 xīn）" />
        <input v-model="form.radical" class="chp-input" placeholder="部首" />
        <input v-model.number="form.strokes" class="chp-input chp-num" type="number" min="1" max="40" placeholder="笔画" />
      </div>
      <div class="chp-add-row">
        <input v-model="form.structure" class="chp-input" placeholder="构字法（如 形声）" />
        <input v-model="form.meaning" class="chp-input chp-meaning" placeholder="释义" />
        <input v-model="form.words" class="chp-input" placeholder="组词（逗号分隔）" />
      </div>
      <div class="chp-add-foot">
        <span v-if="feedback" class="chp-feedback" :class="feedback.ok ? 'is-ok' : 'is-bad'">{{ feedback.msg }}</span>
        <button class="chp-add-btn" :disabled="!canAdd" @click="add">收入字库</button>
      </div>
    </div>

    <!-- 自定义字列表 -->
    <div v-if="customChars.length" class="chp-list">
      <div v-for="c in customChars" :key="c.char" class="chp-item">
        <span class="chp-char-big">{{ c.char }}</span>
        <div class="chp-item-body">
          <div class="chp-item-head">
            <span class="chp-pinyin">{{ c.pinyin }}</span>
            <span class="chp-meta">{{ c.radical }} · {{ c.strokes }}画 · {{ c.structure }}</span>
          </div>
          <p class="chp-meaning-text">{{ c.meaning }}</p>
          <div v-if="c.words.length" class="chp-words">
            <span v-for="w in c.words" :key="w" class="chp-word">{{ w }}</span>
          </div>
        </div>
        <button class="chp-del" title="移出字库" @click="remove(c.char)">×</button>
      </div>
    </div>
    <p v-else class="chp-none">字库还是空的。输入一个字，收入你的字库。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { loadHanziAll, addHanzi, removeHanzi } from '../modules/hanzi'
import type { HanziEntry } from '../modules/hanzi'

const BUILTIN = new Set<string>()

const all = ref<HanziEntry[]>([])
const customChars = ref<HanziEntry[]>([])

const form = ref({
  char: '',
  pinyin: '',
  radical: '',
  strokes: 1,
  structure: '',
  meaning: '',
  words: '',
})
const feedback = ref<{ ok: boolean; msg: string } | null>(null)

const totalChars = computed(() => all.value.length)
const canAdd = computed(() => {
  const c = form.value.char.trim()
  return c.length === 1 && form.value.meaning.trim().length > 0
})

function refresh() {
  all.value = loadHanziAll()
  customChars.value = all.value.filter(c => !BUILTIN.has(c.char))
}

function add() {
  const char = form.value.char.trim()
  if (!char || BUILTIN.has(char)) {
    feedback.value = { ok: false, msg: BUILTIN.has(char) ? '「' + char + '」已在内置字库中' : '请输入一个字' }
    return
  }
  const words = form.value.words.split(/[,，、\s]+/).filter(Boolean)
  const ok = addHanzi({
    char,
    pinyin: form.value.pinyin.trim() || char,
    noTone: form.value.pinyin.trim().toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, m => 'aeiou'['āáǎà'.includes(m) ? 0 : 'ēéěè'.includes(m) ? 1 : 'īíǐì'.includes(m) ? 2 : 'ōóǒò'.includes(m) ? 3 : 4]),
    initial: '',
    radical: form.value.radical.trim() || '?',
    radicalStrokes: 0,
    strokes: Math.max(1, form.value.strokes || 1),
    structure: form.value.structure.trim() || '自定义',
    meaning: form.value.meaning.trim(),
    words,
  })
  feedback.value = ok
    ? { ok: true, msg: '「' + char + '」已收入字库' }
    : { ok: false, msg: '「' + char + '」已存在或无法添加' }
  if (ok) {
    form.value = { char: '', pinyin: '', radical: '', strokes: 1, structure: '', meaning: '', words: '' }
    refresh()
  }
}

function remove(char: string) {
  if (removeHanzi(char)) refresh()
}

onMounted(() => {
  loadHanziAll().forEach(c => BUILTIN.add(c.char))
  refresh()
})
</script>

<style scoped>
.chp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.chp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.chp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.chp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.chp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.chp-count { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.chp-add { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
.chp-add-row { display: flex; gap: 8px; }
.chp-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, #d8c3a5); font-size: 12px; font-family: inherit; outline: none; }
.chp-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.chp-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.chp-char { max-width: 64px; text-align: center; font-size: 16px; }
.chp-num { max-width: 72px; }
.chp-meaning { flex: 2; }
.chp-add-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.chp-feedback { font-size: 11px; }
.chp-feedback.is-ok { color: #8ab87a; }
.chp-feedback.is-bad { color: #c46a5a; }
.chp-add-btn { padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d8c3a5); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.chp-add-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.chp-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.chp-list { display: flex; flex-direction: column; gap: 8px; }
.chp-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.chp-char-big { font-size: 28px; font-weight: 600; color: var(--text-high, #d8c3a5); line-height: 1; flex-shrink: 0; }
.chp-item-body { flex: 1; min-width: 0; }
.chp-item-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.chp-pinyin { font-size: 13px; color: var(--text-high, #d8c3a5); }
.chp-meta { font-size: 10px; color: rgba(232, 221, 208, 0.45); }
.chp-meaning-text { font-size: 12px; color: rgba(232, 221, 208, 0.7); margin: 4px 0; line-height: 1.5; }
.chp-words { display: flex; flex-wrap: wrap; gap: 5px; }
.chp-word { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); }
.chp-del { width: 24px; height: 24px; border-radius: 50%; border: 1px solid transparent; background: transparent; color: rgba(232, 221, 208, 0.35); font-size: 14px; font-family: inherit; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
.chp-del:hover { color: #c46a5a; border-color: rgba(196,106,90,0.4); background: rgba(196,106,90,0.1); }

.chp-none { font-size: 12px; color: rgba(232, 221, 208, 0.45); text-align: center; padding: 16px 0; margin: 0; }

@media (max-width: 640px) {
  .chp { padding: 14px 14px; }
  .chp-add-row { flex-direction: column; }
}
</style>