<template>
  <div class="timeline-view view-entrance" :class="entranceClass">
    <!-- 装饰性头部：时间长廊 -->
    <div class="timeline-header" data-enter>
      <div class="header-ornament">
        <span class="ornament-line"></span>
        <span class="ornament-diamond">✦</span>
        <span class="ornament-line"></span>
      </div>
      <h1 class="header-title">时间长廊</h1>
      <p class="header-subtitle">把专注、锚点、情绪和笔记放回同一条时间流里逐日回看</p>
      <div class="header-stats">
        <div class="stat-card">
          <span class="stat-value">{{ riverItems.length }}</span>
          <span class="stat-label">总记录数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ riverItems.filter(i => new Date(i.ts).toISOString().slice(0,10) === new Date().toISOString().slice(0,10)).length }}</span>
          <span class="stat-label">今日记录</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ riverFragments.length }}</span>
          <span class="stat-label">累计天数</span>
        </div>
      </div>

      <!-- 时间线枢纽导航 -->
      <div class="hub-nav" data-enter>
        <button class="hub-nav-btn" @click="router.push('/timeline-index')">
          <span class="hub-nav-icon">◉</span>
          <span>时间线索引</span>
        </button>
        <button class="hub-nav-btn" @click="router.push('/time-corridor')">
          <span class="hub-nav-icon">◈</span>
          <span>时间长廊</span>
        </button>
      </div>
    </div>

    <div class="tab-bar" data-enter>
      <button v-for="t in subTabs" :key="t.id" :class="['sub-tab',{active:activeSubTab===t.id}]" @click="activeSubTab=t.id">
        <span class="sub-tab-icon">{{t.icon}}</span><span>{{t.label}}</span>
      </button>
    </div>

    <div class="sub-view-container">
      <Transition name="slide-up" mode="out-in">
        <!-- 统一时间线 -->
        <div v-if="activeSubTab==='river'" key="river" class="river-view">
          <!-- 模式切换 -->
          <div class="river-filter">
            <button v-for="f in typeFilters" :key="f.key" :class="['river-filter-btn',{active:activeFilters.includes(f.key)}]" @click="toggleFilter(f.key)">{{f.icon}} {{f.label}}</button>
            <span style="flex:1"/>
              <button class="river-filter-btn replay-btn" :class="{active:replayMode}" @click="toggleReplay">{{replayMode?'退出回看':'▶ 逐日回看'}}</button>
             <button class="river-filter-btn export-btn" @click="dataPort.downloadMarkdown(30)">↓ MD</button>
             <button class="river-filter-btn export-btn" @click="dataPort.downloadJSON()">↓ JSON</button>
             <button class="river-filter-btn export-btn" @click="openImportFilePicker">↑ 导入 JSON</button>
             <input ref="importFileInput" class="import-file-input" type="file" accept="application/json,.json" @change="handleImportFileChange">
           </div>
           <div v-if="importFeedback" class="import-feedback" :class="`is-${importFeedback.kind}`" :role="importFeedback.kind==='error'?'alert':'status'">
             <template v-if="importFeedback.kind==='success'">
               <span>已从本地文件导入新增数据：</span>
               <span v-for="entry in importEntries" :key="entry.key" class="import-count-item">{{entry.label}} +{{entry.count}}</span>
             </template>
             <span v-else>{{importFeedback.message}}</span>
           </div>

          <!-- 回看控件 -->
          <div v-if="replayMode" class="replay-bar">
            <button @click="replaySlower">⏪</button>
            <button @click="toggleReplayPause">{{replayPaused?'▶':'⏸'}}</button>
            <button @click="replayFaster">⏩</button>
            <span class="replay-speed">×{{replaySpeed}}x</span>
            <span class="replay-date">{{replayCurrentDate}}</span>
            <div class="replay-progress"><div class="replay-progress-fill" :style="{width:replayProgress+'%'}"/></div>
          </div>

          <!-- 时间河流 -->
          <div class="river-scroll" ref="riverScrollRef" v-if="riverFragments.length>0">
            <template v-for="(group,gi) in riverFragments" :key="gi">
              <div class="date-separator" :class="{dimmed:group.dimmed}">
                <span class="date-line"/>
                <span class="date-label">{{group.label}}</span>
                <span class="date-line"/>
              </div>
              <TimelineFragment v-for="item in group.items" :key="getRiverItemKey(item)"
                :type="item.type" :crystal="item.crystal??null" :session="item.session??null"
                :note="item.note??null" :emotion="item.emotion??null" :anchor="item.anchor??null"
                :body="item.body??null" :habit="item.habit??null"
                :movement="item.movement??null" :rest="item.rest??null" :dialogue="item.dialogue??null"
                :class="{'frag-highlight':highlightedIds.has(getRiverItemKey(item)), 'frag-dimmed':dimmedIds.has(getRiverItemKey(item))}"
                @click="handleFragmentClick(item)"/>
            </template>
          </div>
          <div v-else class="river-empty"><span class="empty-icon">◌</span><p>时间之河还静默着</p></div>
        </div>

        <CalendarView v-else-if="activeSubTab==='calendar'" key="calendar"/>
        <StatsPanel v-else-if="activeSubTab==='stats'" key="stats"/>
        <TimeLensPanel v-else-if="activeSubTab==='lens'" key="lens"/>
        <TimeArchivePanel v-else-if="activeSubTab==='archive'" key="archive"/>
        <RecordList v-else-if="activeSubTab==='records'" key="records"/>
        <TimeCorridor v-else-if="activeSubTab==='corridor'" key="corridor" :sessionMap="sessionMap"/>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import CalendarView from '../components/CalendarView.vue'
import StatsPanel from '../components/StatsPanel.vue'
import TimeArchivePanel from '../components/TimeArchivePanel.vue'
import RecordList from '../components/RecordList.vue'
import TimelineFragment from '../components/TimelineFragment.vue'
import TimeCorridor from '../components/TimeCorridor.vue'
import TimeLensPanel from '../components/TimeLensPanel.vue'
import { storage, storageVersion } from '../engine/storage'
import { useDataPort } from '../composables/useDataPort'
import { createReplayTimer, createRiverItems, getRiverItemKey, getRiverSource } from '../modules/timeline/river'
import type { RiverItemType, RiverItem } from '../modules/timeline/river'
import type { FocusSession } from '../types'
import type { ImportCounts } from '../engine/data-port'
import { getImportCountEntries } from '../engine/data-port'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceClass } = useViewEntrance()

const router=useRouter();const dataPort=useDataPort()
const activeSubTab=ref<string>('river')
const subTabs=[{id:'river',label:'时间之河',icon:'≋'},{id:'calendar',label:'日历',icon:'📅'},{id:'stats',label:'统计',icon:'📊'},{id:'lens',label:'透视',icon:'🔭'},{id:'archive',label:'时光档案',icon:'🗓️'},{id:'records',label:'记录',icon:'📋'},{id:'corridor',label:'时间长廊',icon:'◈'}]
const activeFilters=ref<RiverItemType[]>(['crystal','note','emotion','session','anchor','body','habit','movement','rest','dialogue'])
const typeFilters:{key:RiverItemType;label:string;icon:string}[]=[{key:'crystal',label:'结晶',icon:'💎'},{key:'note',label:'笔记',icon:'📝'},{key:'emotion',label:'情绪',icon:'🌷'},{key:'session',label:'专注',icon:'⏱️'},{key:'anchor',label:'心锚',icon:'⚓'},{key:'body',label:'身体',icon:'🌿'},{key:'habit',label:'习惯',icon:'🎯'},{key:'movement',label:'运动',icon:'🏃'},{key:'rest',label:'休息',icon:'🍃'},{key:'dialogue',label:'对话',icon:'💬'}]
function toggleFilter(k:RiverItemType){const i=activeFilters.value.indexOf(k);i>=0&&activeFilters.value.length>1?activeFilters.value.splice(i,1):activeFilters.value.push(k)}

type ImportFeedback = { kind:'success';counts:ImportCounts } | { kind:'error';message:string }
const importFileInput=ref<HTMLInputElement|null>(null)
const importFeedback=ref<ImportFeedback|null>(null)
const importEntries = computed(() =>
  importFeedback.value?.kind === 'success' ? getImportCountEntries(importFeedback.value.counts) : []
)
function openImportFilePicker(){importFileInput.value?.click()}
async function handleImportFileChange(event:Event){
  const input=event.target as HTMLInputElement
  const file=input.files?.[0]
  input.value=''
  if(!file)return

  let json:string
  try{json=await file.text()}
  catch{importFeedback.value={kind:'error',message:'无法读取此本地文件。请确认文件可访问后重试。'};return}

  try{importFeedback.value={kind:'success',counts:dataPort.importJSON(json)}}
  catch(error){
    importFeedback.value={kind:'error',message:error instanceof SyntaxError?'无法解析此本地 JSON 文件。请确认文件内容是有效的 JSON 后重试。':'此本地 JSON 文件暂时无法导入，原有数据未被更改。'}
  }
}

// 高亮/暗淡
const highlightedIds=ref(new Set<string>());const dimmedIds=ref(new Set<string>())
const riverScrollRef=ref<HTMLElement|null>(null)

// 沉浸回看
const replayMode=ref(false);const replayPaused=ref(false);const replaySpeed=ref(1)
const replayCurrentDate=ref('');const replayProgress=ref(0)
const replayTimer=createReplayTimer(()=>{
  if(replayPaused.value)return
  const dates=[...new Set(riverItems.value.map(i=>new Date(i.ts).toISOString().slice(0,10)))].sort()
  const idx=dates.indexOf(replayCurrentDate.value)
  if(idx<dates.length-1){replayCurrentDate.value=dates[idx+1];replayProgress.value=Math.min(((idx+1)/dates.length)*100,100);highlightDay()}
  else{stopReplay();replayMode.value=false}
})
function toggleReplay(){
  replayMode.value=!replayMode.value
  if(replayMode.value){startReplay()}else{stopReplay()}
}
function startReplay(options:{date?:string;paused?:boolean}={}){
  if(!riverFragments.value.length)return
  const today=new Date().toISOString().slice(0,10)
  const dates=[...new Set(riverItems.value.map(i=>new Date(i.ts).toISOString().slice(0,10)))].sort()
  const todayIdx=dates.indexOf(today)
  if(options.date){replayCurrentDate.value=options.date}
  else if(todayIdx>=0){replayCurrentDate.value=dates[Math.max(0,todayIdx-3)]}
  else{replayCurrentDate.value=dates[0]||today}
  replayProgress.value=0;highlightDay()
  replayPaused.value=options.paused??false
  if(replayPaused.value)replayTimer.stop()
  else replayTimer.start(replaySpeed.value)
}
function stopReplay(){replayTimer.stop();highlightedIds.value=new Set();dimmedIds.value=new Set();replayProgress.value=0}
function toggleReplayPause(){replayPaused.value=!replayPaused.value;if(replayPaused.value)replayTimer.stop();else replayTimer.start(replaySpeed.value)}
function replaySlower(){replaySpeed.value=Math.max(0.5,replaySpeed.value-0.5);if(replayMode.value&&!replayPaused.value)replayTimer.start(replaySpeed.value)}
function replayFaster(){replaySpeed.value=Math.min(5,replaySpeed.value+1);if(replayMode.value&&!replayPaused.value)replayTimer.start(replaySpeed.value)}
function highlightDay(){
  const h=new Set<string>();const d=new Set<string>()
  for(const item of riverItems.value){
    const ds=new Date(item.ts).toISOString().slice(0,10)
    const itemKey=getRiverItemKey(item)
    if(ds===replayCurrentDate.value)h.add(itemKey)
    else if(ds>replayCurrentDate.value)d.add(itemKey)
  }
  highlightedIds.value=h;dimmedIds.value=d
}

interface RiverGroup{label:string;date:string;dimmed:boolean;items:RiverItem[]}

// 时间长廊状态
const sessionMap=computed<Map<string,FocusSession>>(()=>{storageVersion.value;return new Map(storage.getSessions().map(s=>[s.id,s]))})

const today=new Date();const todayStr=today.toISOString().slice(0,10);const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10)
const riverItems=computed<RiverItem[]>(()=>{
  storageVersion.value
  return createRiverItems(getRiverSource(), activeFilters.value)
})

const riverFragments=computed<RiverGroup[]>(()=>{
  const groups:RiverGroup[]=[]
  for(const item of riverItems.value){
    const ds=new Date(item.ts).toISOString().slice(0,10)
    const label=ds===todayStr?'今天':ds===yesterday?'昨天':`${new Date(item.ts).getMonth()+1}月${new Date(item.ts).getDate()}日`
     let g=groups.find(g=>g.date===ds);if(!g){g={label,date:ds,dimmed:replayMode.value && ds>replayCurrentDate.value,items:[]};groups.push(g)}
     g.items.push(item)
   }
   return groups
})

function handleFragmentClick(item:RiverItem){
  if(item.type==='crystal'&&item.crystal){
    // 结晶重访: 高亮那一天
    const ds=new Date(item.crystal.createdAt).toISOString().slice(0,10)
    replayMode.value=true;startReplay({date:ds,paused:true})
  }else if(item.type==='note')router.push('/study')
  else if(item.type==='emotion')router.push('/garden')
  else if(item.type==='anchor')router.push('/anchor')
  else if(item.type==='body')router.push('/body')
  else if(item.type==='habit')router.push('/discipline')
  else if(item.type==='movement')router.push('/movement')
  else if(item.type==='rest')router.push('/rest')
  else if(item.type==='dialogue')router.push('/word-mirror')
}

onUnmounted(stopReplay)
</script>

<style scoped>
/* ===== 深夜食堂 · 暖琥珀主题 ===== */
:root {
  --bg-primary: var(--bg-primary);
  --accent: var(--accent);
  --accent-dim: rgba(var(--accent-rgb), 0.2);
  --text-primary: var(--text-high);
  --text-secondary: var(--text-secondary);
  --text-muted: var(--text-secondary);
  --border-color: rgba(var(--accent-rgb), 0.12);
  --bg-card: var(--bg-card);
}

/* ===== 光丝动画 ===== */
@keyframes filamentPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.8; }
}

@keyframes flowDown {
  0% { background-position-y: 0; }
  100% { background-position-y: 60px; }
}

@keyframes nodeGlow {
  0%, 100% { box-shadow: 0 0 4px var(--accent, #d4a574), 0 0 10px rgba(var(--accent-rgb), 0.2); }
  50% { box-shadow: 0 0 8px var(--accent, #d4a574), 0 0 20px rgba(var(--accent-rgb), 0.4); }
}

@keyframes cardGlow {
  0%, 100% { box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.04); }
  50% { box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.08); }
}

@keyframes titleGlow {
  0%, 100% { text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.15), 0 0 40px rgba(var(--accent-rgb), 0.08); }
  50% { text-shadow: 0 0 35px rgba(var(--accent-rgb), 0.3), 0 0 60px rgba(var(--accent-rgb), 0.15); }
}

@keyframes staggerIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 基础容器 */
.timeline-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: transparent;
}

/* 暖色侧光 — 光从光丝向两侧扩散 */
.timeline-view::before,
.timeline-view::after {
  content: '';
  position: fixed;
  top: 0;
  bottom: 0;
  width: 200px;
  pointer-events: none;
  z-index: 0;
}
.timeline-view::before {
  left: 0;
  background:
    radial-gradient(ellipse 180px 100% at 0% 50%, rgba(var(--accent-rgb), 0.06), transparent 70%),
    radial-gradient(ellipse 120px 80% at 20% 50%, rgba(var(--accent-rgb), 0.025), transparent 60%);
}
.timeline-view::after {
  right: 0;
  background:
    radial-gradient(ellipse 180px 100% at 100% 50%, rgba(var(--accent-rgb), 0.06), transparent 70%),
    radial-gradient(ellipse 120px 80% at 80% 50%, rgba(var(--accent-rgb), 0.025), transparent 60%);
}

/* 装饰性头部 */
.timeline-header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 32px 20px 16px;
  flex-shrink: 0;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ornament-line {
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent, #d4a574), transparent);
  opacity: 0.6;
}

.ornament-diamond {
  font-size: 14px;
  color: var(--accent, #d4a574);
  opacity: 0.7;
  text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.3);
  animation: nodeGlow 3s ease-in-out infinite;
}

.header-title {
  font-family: var(--font-heading-zh);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, var(--text-high));
  letter-spacing: 4px;
  margin: 0 0 8px;
  animation: titleGlow 4s ease-in-out infinite;
}

.header-subtitle {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, var(--text-secondary));
  max-width: 480px;
  margin: 0 auto 20px;
  letter-spacing: 0.5px;
}

/* 概览统计卡片 */
.header-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 24px;
  min-width: 100px;
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
  border-radius: 12px;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.03), inset 0 0 20px rgba(var(--accent-rgb), 0.02);
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent, #d4a574);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  letter-spacing: 1px;
}

/* ---- 枢纽导航 ---- */
.hub-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
}

.hub-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 8px;
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.55);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.hub-nav-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  color: var(--accent, #d4a574);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.06);
}

.hub-nav-icon {
  font-size: 16px;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 0 20px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.sub-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px 8px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted, var(--text-muted));
  background: transparent;
  transition: all 0.3s ease;
  position: relative;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.sub-tab:hover {
  color: var(--text-secondary, var(--text-secondary));
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
}

.sub-tab.active {
  color: var(--accent, #d4a574);
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
}

.sub-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--accent, #d4a574);
  border-radius: 1px 1px 0 0;
  box-shadow: 0 0 6px var(--accent, #d4a574);
}

.sub-tab-icon {
  font-size: 16px;
}

/* 子视图容器 */
.sub-view-container {
  flex: 1;
  overflow: hidden;
  padding: 16px 20px 20px;
  background: var(--bg-card, rgba(42, 36, 30, 0.6));
  margin: 0 16px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
  position: relative;
  z-index: 1;
  box-shadow: inset 0 0 30px rgba(var(--accent-rgb), 0.02);
}

/* 河流视图 */
.river-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 过滤器 */
.river-filter {
  display: flex;
  gap: 4px;
  padding-bottom: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
}

.river-filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
  background: transparent;
  color: var(--text-muted, var(--text-muted));
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  min-height: 26px;
}

.river-filter-btn:hover {
  color: var(--text-secondary, var(--text-secondary));
  border-color: var(--accent, #d4a574);
}

.river-filter-btn.active {
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  border-color: var(--accent, #d4a574);
  color: var(--accent, #d4a574);
}

.replay-btn {
  border-color: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  color: var(--accent, #d4a574);
}

.replay-btn.active {
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
}

.export-btn {
  font-size: 10px;
  letter-spacing: 1px;
}

.import-file-input {
  display: none;
}

.import-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  margin: -4px 0 8px;
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
}

.import-feedback.is-success {
  border-color: var(--accent, #d4a574);
}

.import-feedback.is-error {
  color: var(--text-secondary, var(--text-secondary));
  border-color: rgba(var(--accent-rgb), 0.2);
}

.import-count-item {
  color: var(--accent, #d4a574);
  font-weight: 500;
}

/* 回看栏 */
.replay-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.04);
}

.replay-bar button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(var(--accent-rgb), 0.12));
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary, var(--text-secondary));
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.replay-bar button:hover {
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2));
}

.replay-speed {
  font-size: 11px;
  color: var(--accent, #d4a574);
  min-width: 30px;
}

.replay-date {
  font-size: 12px;
  color: var(--text-secondary, var(--text-secondary));
  min-width: 80px;
}

.replay-progress {
  flex: 1;
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.replay-progress-fill {
  height: 100%;
  background: var(--accent, #d4a574);
  transition: width 0.5s;
}

/* 河流滚动区 — 光丝主轴容器 */
.river-scroll {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  position: relative;
  z-index: 0;
}

/* 光丝主轴 — 一条极淡的垂直光丝，从顶部贯穿到底部 */
.river-scroll::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--accent-rgb), 0.02) 8%,
    rgba(var(--accent-rgb), 0.07) 20%,
    rgba(var(--accent-rgb), 0.12) 50%,
    rgba(var(--accent-rgb), 0.07) 80%,
    rgba(var(--accent-rgb), 0.02) 92%,
    transparent 100%
  );
  animation: filamentPulse 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

/* 流动光点 — 光丝上流动的光点 */
.river-scroll::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 100%;
  background: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 26px,
    rgba(var(--accent-rgb), 0.25) 26px,
    rgba(var(--accent-rgb), 0.55) 27px,
    rgba(var(--accent-rgb), 0.25) 28px,
    transparent 28px,
    transparent 56px
  );
  background-size: 3px 56px;
  animation: flowDown 2.5s linear infinite;
  pointer-events: none;
  z-index: 0;
  opacity: 0.5;
}

/* 日期分隔 — 光丝上的节点 */
.date-separator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 0 12px;
  position: relative;
}

.date-separator:first-child {
  padding-top: 8px;
}

/* 中央光点 — 光丝上的节点 */
.date-separator::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent, #d4a574);
  box-shadow: 0 0 6px var(--accent, #d4a574), 0 0 14px rgba(var(--accent-rgb), 0.3);
  z-index: 1;
  animation: nodeGlow 3s ease-in-out infinite;
}

.date-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.15), transparent);
  opacity: 0.5;
}

.date-label {
  font-size: 12px;
  color: var(--accent, #d4a574);
  flex-shrink: 0;
  letter-spacing: 1.5px;
  opacity: 0.75;
  z-index: 2;
  position: relative;
  padding: 0 22px;
  font-weight: 400;
  text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.15);
}

.date-separator.dimmed {
  opacity: 0.5;
}

/* 条目卡片发光增强 — 从父组件穿透到 TimelineFragment */
.river-scroll :deep(.fragment) {
  position: relative;
  border-radius: 8px;
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.04);
  animation: cardGlow 4s ease-in-out infinite;
  transition: box-shadow 0.4s ease, background 0.3s ease, transform 0.3s ease;
  z-index: 1;
}

/* 卡片边缘发光 — 用伪元素实现柔和光晕 */
.river-scroll :deep(.fragment)::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.06), transparent 40%, transparent 60%, rgba(var(--accent-rgb), 0.04)) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.6;
  transition: opacity 0.4s ease;
}

/* hover 卡片增强发光 */
.river-scroll :deep(.fragment):hover {
  box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.12), 0 0 30px rgba(var(--accent-rgb), 0.05);
  background: var(--card-bg);
  transform: translateX(2px);
}

.river-scroll :deep(.fragment):hover::before {
  opacity: 1;
  border-color: rgba(var(--accent-rgb), 0.15);
}

/* 片段入场交错动画 */
.river-scroll :deep(.fragment) {
  animation: staggerIn 0.4s ease both;
}

/* 用 nth-child 实现交错延迟 */
.river-scroll :deep(.fragment):nth-child(2)  { animation-delay: 0.02s; }
.river-scroll :deep(.fragment):nth-child(3)  { animation-delay: 0.04s; }
.river-scroll :deep(.fragment):nth-child(4)  { animation-delay: 0.06s; }
.river-scroll :deep(.fragment):nth-child(5)  { animation-delay: 0.08s; }
.river-scroll :deep(.fragment):nth-child(6)  { animation-delay: 0.10s; }
.river-scroll :deep(.fragment):nth-child(7)  { animation-delay: 0.12s; }
.river-scroll :deep(.fragment):nth-child(8)  { animation-delay: 0.14s; }
.river-scroll :deep(.fragment):nth-child(9)  { animation-delay: 0.16s; }
.river-scroll :deep(.fragment):nth-child(10) { animation-delay: 0.18s; }
.river-scroll :deep(.fragment):nth-child(11) { animation-delay: 0.20s; }
.river-scroll :deep(.fragment):nth-child(12) { animation-delay: 0.22s; }

/* 高亮/暗淡 */
.frag-highlight {
  background: var(--accent-dim, rgba(var(--accent-rgb), 0.2)) !important;
  border-radius: 8px;
}

.frag-dimmed {
  opacity: 0.25;
  pointer-events: none;
}

/* 空状态 */
.river-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 6px;
  color: var(--text-muted, var(--text-muted));
}

.river-empty .empty-icon {
  font-size: 40px;
  opacity: 0.4;
}

.river-empty p {
  font-size: 14px;
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* ---- 响应式 ---- */
@media (max-width: 860px) {
  /* 平板端：紧凑化 */
  .timeline-header {
    padding: 20px 16px 12px;
  }

  .header-title {
    font-size: 20px;
    letter-spacing: 3px;
  }

  .header-subtitle {
    font-size: 12px;
    max-width: 360px;
    margin-bottom: 16px;
  }

  .header-stats {
    gap: 10px;
  }

  .stat-card {
    padding: 10px 16px;
    min-width: 80px;
}

  .stat-value {
    font-size: 18px;
  }

  .stat-label {
    font-size: 10px;
  }

  .tab-bar {
    padding: 0 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tab-bar::-webkit-scrollbar { display: none; }

  .sub-tab {
    padding: 6px 14px;
    font-size: 13px;
    flex-shrink: 0;
  }

  .sub-view-container {
    padding: 12px 14px 16px;
    margin: 0 10px 12px;
    border-radius: 10px;
  }

  .river-filter {
    gap: 3px;
  }

  .river-filter-btn {
    font-size: 10px;
    padding: 3px 8px;
  }
}

@media (max-width: 640px) {
  /* 移动端：完全重排 */
  .timeline-header {
    padding: 48px 12px 10px;
  }

  .header-ornament {
    gap: 8px;
    margin-bottom: 8px;
  }

  .ornament-line {
    width: 28px;
  }

  .ornament-diamond {
    font-size: 10px;
  }

  .header-title {
    font-size: 18px;
    letter-spacing: 2px;
  }

  .header-subtitle {
    font-size: 11px;
    max-width: 100%;
    margin-bottom: 12px;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-stats {
    gap: 6px;
  }

  .stat-card {
    padding: 8px 10px;
    min-width: 60px;
    min-height: 56px;
    flex: 1;
  }

  .stat-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 9px;
  }

  .sub-tab {
    padding: 6px 10px;
    font-size: 12px;
  }

  .sub-tab-icon {
    font-size: 13px;
  }

  .sub-view-container {
    padding: 10px 10px 12px;
    margin: 0 6px 10px;
    border-radius: 8px;
  }

  .river-filter {
    gap: 2px;
    padding-bottom: 8px;
  }

  .river-filter-btn {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 8px;
  }

  .replay-btn {
    font-size: 9px;
  }

  .export-btn {
    font-size: 9px;
  }

  .replay-bar {
    flex-wrap: wrap;
    padding: 6px 10px;
    gap: 4px;
  }

  .replay-date {
    font-size: 10px;
    min-width: 60px;
}

  .date-separator {
    padding: 10px 0 6px;
  }

  .date-label {
    font-size: 10px;
  }

  .river-empty .empty-icon {
    font-size: 28px;
  }

  .river-empty p {
    font-size: 12px;
  }
}
</style>