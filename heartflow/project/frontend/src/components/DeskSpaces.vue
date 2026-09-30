<template>
  <div class="desk-spaces">
    <!-- 桌面条：一排收纳空间图标（安卓桌面文件夹式：四宫格缩略 + 名称） -->
    <div class="ds-rail">
      <button v-for="s in spaces" :key="s.id" class="ds-folder"
        :style="{ '--ds-accent': s.accent }" :title="`打开「${s.name}」`"
        @click="open(s.id)">
        <span class="ds-folder-grid">
          <span v-for="it in previewOf(s)" :key="it.id" class="ds-cell">{{ it.icon }}</span>
          <span v-for="i in Math.max(0, 4 - previewOf(s).length)" :key="`e${i}`" class="ds-cell ds-cell-empty" />
        </span>
        <span class="ds-folder-name">{{ s.name }}</span>
        <span class="ds-folder-count">{{ s.roomIds.length + (s.appIds?.length ?? 0) }}</span>
      </button>

      <button class="ds-new" title="新建收纳空间" @click="create">
        <span class="ds-new-plus">＋</span>
        <span class="ds-new-text">空间</span>
      </button>
    </div>

    <!-- 打开的空间：气泡面板 / 全屏空间（游戏空间式） -->
    <div v-if="current" class="ds-mask" :class="{ 'ds-mask-full': full }" @click.self="close">
      <section class="ds-panel" :class="{ 'ds-panel-full': full }" :style="{ '--ds-accent': current.accent }">
        <header class="ds-head">
          <span class="ds-head-icon">{{ current.icon }}</span>
          <input v-model="name" class="ds-name" aria-label="空间名称"
            @change="commitName" @keydown.enter="commitName" />
          <span class="ds-count">{{ items.length }} 项</span>
          <button class="ds-btn" :title="full ? '退出全屏' : '全屏进入'" @click="full = !full">
            {{ full ? '⤡' : '⛶' }}
          </button>
          <button class="ds-btn ds-btn-danger" title="删除空间" @click="del">🗑</button>
          <button class="ds-btn" title="关闭" @click="close">✕</button>
        </header>

        <div class="ds-grid">
          <button v-for="it in items" :key="it.id" class="ds-item" :title="it.name" @click="go(it)">
            <span class="ds-item-icon" :style="{ '--c': it.color }">{{ it.icon }}</span>
            <span class="ds-item-name">{{ it.name }}</span>
            <span class="ds-item-out" title="移出空间" @click.stop="takeOut(it)">✕</span>
          </button>
          <p v-if="!items.length" class="ds-empty">
            这个空间还空着，点下面「收纳」，把常用的房间或电脑/手机里已装的 App 收进来。
          </p>
        </div>

        <footer class="ds-foot">
          <button class="ds-foot-btn" :class="{ 'is-on': showPicker }" @click="showPicker = !showPicker">
            {{ showPicker ? '收起' : '＋ 收纳' }}
          </button>
          <button class="ds-foot-btn" :class="{ 'is-on': showStyle }" @click="showStyle = !showStyle">
            {{ showStyle ? '收起' : '🎨 空间样式' }}
          </button>
        </footer>

        <!-- 候选：房间图全量，勾选式收纳（不复制数据，只存 ID 引用） -->
        <div v-if="showPicker" class="ds-picker">
          <div class="ds-picker-head">
            <input v-model="q" class="ds-search" placeholder="搜索房间 / 应用…" />
            <span class="ds-pick-count">{{ candidates.length }} 项可收纳</span>
          </div>
          <div class="ds-pick-grid">
            <button v-for="c in visiblePicks" :key="c.id" class="ds-pick"
              :class="{ 'is-in': has(c) }" @click="toggle(c)" :title="c.kind === 'app' ? `启动 ${c.name}` : c.name">
              <span class="ds-pick-icon">{{ c.icon }}</span>
              <span class="ds-pick-name">{{ c.name }}</span>
              <span v-if="c.kind === 'app'" class="ds-pick-tag">App</span>
              <span v-if="has(c)" class="ds-pick-flag">✓</span>
            </button>
          </div>
          <button v-if="!q && filtered.length > pickCap && !showAll" class="ds-pick-more"
            @click="showAll = true">展开全部 {{ filtered.length }} 项</button>
        </div>

        <div v-if="showStyle" class="ds-style">
          <div class="ds-style-row">
            <span class="ds-style-label">图标</span>
            <button v-for="e in DESK_ICON_PRESETS" :key="e" class="ds-emoji"
              :class="{ 'is-on': current.icon === e }" @click="setIcon(e)">{{ e }}</button>
          </div>
          <div class="ds-style-row">
            <span class="ds-style-label">主色</span>
            <button v-for="c in DESK_ACCENT_PRESETS" :key="c" class="ds-swatch"
              :class="{ 'is-on': current.accent === c }" :style="{ background: c }"
              :title="c" @click="setAccent(c)" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// ============================================================
// 桌面收纳空间（DeskSpaces）
// 安卓桌面文件夹 / 「游戏空间」式：桌面一排收纳图标，点开是只装着
// 指定房间的独立空间；可全屏进入（带空间主色氛围）。
// 数据只存房间 ID 引用，房间改名换图标后空间内自动跟随。
// ============================================================
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeskSpaces, DESK_ICON_PRESETS, DESK_ACCENT_PRESETS } from '../modules/desk'
import type { DeskItem, DeskSpace } from '../modules/desk'
import { launchExec } from '../modules/launcher/open'

const {
  spaces, candidates, itemsOf, createSpace, renameSpace,
  setSpaceIcon, setSpaceAccent, removeSpace, toggleItem, hasItem, removeItem, getSpace,
} = useDeskSpaces()

const router = useRouter()

const openId = ref<string | null>(null)
const full = ref(false)
const showPicker = ref(false)
const showStyle = ref(false)
const showAll = ref(false)
const q = ref('')
const name = ref('')

const current = computed(() => (openId.value ? getSpace(openId.value) : undefined))
const items = computed<DeskItem[]>(() => (current.value ? itemsOf(current.value) : []))

/**
 * 候选过滤：房间图 + 系统已装应用可到 200+ 项，不砍条数；
 * 搜索即时收窄。空搜索即全量候选。
 */
const filtered = computed<DeskItem[]>(() => {
  const k = q.value.trim().toLowerCase()
  if (!k) return candidates.value
  return candidates.value.filter(c => c.name.toLowerCase().includes(k))
})

/**
 * 长列表性能折叠：未搜索且候选超过 pickCap 时，先渲染前 pickCap 项，
 * 配合 .ds-pick 的 content-visibility:auto，保证 200+ 项首屏不卡；
 * 点「展开全部」或输入搜索即呈现完整结果。
 */
const pickCap = 150
const visiblePicks = computed<DeskItem[]>(() => {
  const list = filtered.value
  if (!q.value.trim() && !showAll.value && list.length > pickCap) {
    return list.slice(0, pickCap)
  }
  return list
})

/** 文件夹缩略：取前 4 个收纳项 */
function previewOf(s: DeskSpace): DeskItem[] {
  return itemsOf(s).slice(0, 4)
}

function open(id: string) {
  openId.value = id
  name.value = getSpace(id)?.name ?? ''
  full.value = false
  showPicker.value = false
  showStyle.value = false
  showAll.value = false
  q.value = ''
}
function close() {
  openId.value = null
  full.value = false
}
function create() {
  const s = createSpace()
  open(s.id)
  showPicker.value = true
}
function commitName() {
  if (openId.value) renameSpace(openId.value, name.value)
}
function del() {
  if (!openId.value) return
  removeSpace(openId.value)
  close()
}
function setIcon(icon: string) {
  if (openId.value) setSpaceIcon(openId.value, icon)
}
function setAccent(accent: string) {
  if (openId.value) setSpaceAccent(openId.value, accent)
}
function toggle(it: DeskItem) {
  if (openId.value) toggleItem(openId.value, it)
}
function has(it: DeskItem): boolean {
  return openId.value ? hasItem(openId.value, it) : false
}
function takeOut(it: DeskItem) {
  if (openId.value) removeItem(openId.value, it)
}
function go(it: DeskItem) {
  close()
  // 系统应用：直接启动（.lnk/.app 路径或安卓包名）
  if (it.kind === 'app' && it.launch) {
    void launchExec(it.launch)
    return
  }
  // 房间：跳转对应路由
  if (it.path) void router.push(it.path)
}
</script>

<style scoped>
.desk-spaces { width: 100%; }

/* ---- 桌面条 ---- */
.ds-rail {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 4px 2px 10px;
}
.ds-folder {
  position: relative; width: 74px; padding: 8px 6px 6px; border-radius: 14px;
  border: 1px solid rgba(150, 170, 210, .16);
  background: rgba(24, 30, 48, .6);
  backdrop-filter: blur(10px);
  color: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;
  transition: transform .14s ease, border-color .14s ease, background .14s ease;
}
.ds-folder:hover {
  transform: translateY(-2px);
  border-color: var(--ds-accent, #c49a6a);
  background: rgba(38, 46, 68, .72);
}
.ds-folder-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px;
  width: 46px; height: 46px; padding: 5px; border-radius: 10px;
  background: rgba(0, 0, 0, .22);
}
.ds-cell { display: grid; place-items: center; font-size: 14px; }
.ds-cell-empty { opacity: .18; }
.ds-folder-name {
  font-size: 11px; max-width: 100%; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; opacity: .85;
}
.ds-folder-count {
  position: absolute; top: 4px; right: 5px; font-size: 9px;
  padding: 0 5px; border-radius: 7px; background: rgba(0, 0, 0, .3); opacity: .6;
}
.ds-new {
  width: 74px; padding: 10px 6px; border-radius: 14px;
  border: 1px dashed rgba(150, 170, 210, .3); background: transparent;
  color: #8a94ad; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; gap: 3px;
}
.ds-new:hover { border-color: var(--accent, #c49a6a); color: #dbe3f7; }
.ds-new-plus { font-size: 18px; line-height: 1; }
.ds-new-text { font-size: 11px; }

/* ---- 打开的空间 ---- */
.ds-mask {
  position: fixed; inset: 0; z-index: 120; display: grid; place-items: center;
  background: rgba(8, 10, 18, .55); backdrop-filter: blur(3px);
}
.ds-panel {
  width: min(560px, 92vw); max-height: 82vh; overflow-y: auto;
  border-radius: 18px; padding: 14px 16px 16px;
  background: #1b2132;
  border: 1px solid color-mix(in srgb, var(--ds-accent, #c49a6a) 38%, transparent);
  box-shadow: 0 24px 60px rgba(0, 0, 0, .5);
  color: var(--text-primary, #e8ecf6);
  display: flex; flex-direction: column; gap: 12px;
}
/* 全屏：空间主色氛围（游戏空间式） */
.ds-mask-full { background: rgba(6, 8, 14, .8); }
.ds-panel-full {
  width: min(920px, 96vw); height: 92vh; max-height: none;
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--ds-accent, #c49a6a) 16%, transparent) 0%, transparent 60%),
    #1b2132;
}

.ds-head { display: flex; align-items: center; gap: 8px; flex: none; }
.ds-head-icon { font-size: 22px; }
.ds-name {
  flex: 1; min-width: 0; padding: 5px 10px; border-radius: 9px; font-size: 15px; font-weight: 600;
  background: rgba(255, 255, 255, .05); border: 1px solid transparent; color: inherit;
}
.ds-name:hover, .ds-name:focus { border-color: color-mix(in srgb, var(--ds-accent, #c49a6a) 45%, transparent); outline: none; }
.ds-count { font-size: 11px; opacity: .55; }
.ds-btn {
  width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(150, 170, 210, .18);
  background: rgba(255, 255, 255, .04); color: #b6c0d8; font-size: 13px; cursor: pointer; line-height: 1;
}
.ds-btn:hover { background: rgba(120, 140, 200, .18); color: #fff; }
.ds-btn-danger:hover { background: rgba(220, 90, 90, .22); color: #ff9f9f; }

.ds-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 10px;
}
.ds-item {
  position: relative; padding: 12px 6px 8px; border-radius: 14px;
  border: 1px solid rgba(150, 170, 210, .14); background: rgba(255, 255, 255, .035);
  color: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px;
  transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.ds-item:hover {
  transform: translateY(-2px);
  border-color: var(--c, #c49a6a); background: rgba(255, 255, 255, .07);
}
.ds-item-icon {
  width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; font-size: 20px;
  background: color-mix(in srgb, var(--c, #c49a6a) 18%, transparent);
}
.ds-item-name {
  font-size: 11px; max-width: 100%; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; opacity: .8;
}
.ds-item-out {
  position: absolute; top: 3px; right: 4px; width: 18px; height: 18px; border-radius: 6px;
  display: grid; place-items: center; font-size: 10px; color: #8a94ad; opacity: 0;
}
.ds-item:hover .ds-item-out { opacity: 1; }
.ds-item-out:hover { background: rgba(220, 90, 90, .25); color: #ff9f9f; }
.ds-empty { grid-column: 1 / -1; margin: 12px 0; font-size: 13px; opacity: .6; text-align: center; }

.ds-foot { display: flex; gap: 8px; flex: none; }
.ds-foot-btn {
  padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(150, 170, 210, .2);
  background: rgba(255, 255, 255, .04); color: #c6d0e8; font-size: 12px; cursor: pointer;
}
.ds-foot-btn:hover, .ds-foot-btn.is-on { background: color-mix(in srgb, var(--ds-accent, #c49a6a) 22%, transparent); border-color: var(--ds-accent, #c49a6a); color: #fff; }

.ds-picker, .ds-style {
  border-top: 1px solid rgba(150, 170, 210, .12); padding-top: 12px;
  display: flex; flex-direction: column; gap: 10px;
}
.ds-picker-head { display: flex; align-items: center; gap: 10px; }
.ds-search {
  flex: 1; padding: 8px 12px; border-radius: 10px; font-size: 13px;
  background: rgba(255, 255, 255, .05); border: 1px solid rgba(255, 255, 255, .1); color: inherit;
}
.ds-pick-count { font-size: 11px; opacity: .55; white-space: nowrap; }
.ds-pick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; max-height: 300px; overflow-y: auto; }
.ds-pick {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 9px;
  border: 1px solid rgba(150, 170, 210, .14); background: rgba(255, 255, 255, .03);
  color: #b6c0d8; font-size: 12px; cursor: pointer; text-align: left;
  /* 长列表（200+ 项）滚动性能：离屏项跳过布局/绘制 */
  content-visibility: auto; contain-intrinsic-size: auto 32px;
}
.ds-pick:hover { background: rgba(120, 140, 200, .14); color: #fff; }
.ds-pick.is-in { border-color: var(--ds-accent, #c49a6a); background: color-mix(in srgb, var(--ds-accent, #c49a6a) 16%, transparent); color: #fff; }
.ds-pick-icon { font-size: 14px; }
.ds-pick-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ds-pick-tag { font-size: 9px; padding: 0 5px; border-radius: 6px; background: rgba(124, 141, 181, .3); color: #cdd6ec; opacity: .8; }
.ds-pick-flag { font-size: 11px; opacity: .8; }
.ds-pick-more {
  margin: 2px auto 0; padding: 6px 16px; border-radius: 999px;
  border: 1px solid rgba(150, 170, 210, .2); background: rgba(255, 255, 255, .04);
  color: #c6d0e8; font-size: 12px; cursor: pointer;
}
.ds-pick-more:hover { background: color-mix(in srgb, var(--ds-accent, #c49a6a) 22%, transparent); border-color: var(--ds-accent, #c49a6a); color: #fff; }

.ds-style-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ds-style-label { font-size: 11px; opacity: .6; width: 34px; flex: none; }
.ds-emoji {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(150, 170, 210, .14);
  background: rgba(255, 255, 255, .03); font-size: 15px; cursor: pointer; line-height: 1;
}
.ds-emoji.is-on { border-color: var(--ds-accent, #c49a6a); background: color-mix(in srgb, var(--ds-accent, #c49a6a) 22%, transparent); }
.ds-swatch {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
}
.ds-swatch.is-on { border-color: #fff; }

@media (max-width: 640px) {
  .ds-folder, .ds-new { width: 64px; }
  .ds-folder-grid { width: 40px; height: 40px; }
  .ds-grid { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); }
}
</style>
