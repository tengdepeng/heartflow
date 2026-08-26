<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance bw">
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">身体是智慧的殿堂</p>
    <h1 class="bw-title">藏象阁</h1>

    <div data-enter class="bw-overview">
      <div class="bw-overview-card">
        <span class="bw-overview-num">{{ meridianLogs.length }}</span>
        <span class="bw-overview-label">经络记录</span>
      </div>
      <div class="bw-overview-card">
        <span class="bw-overview-num">{{ wisdomLogs.length }}</span>
        <span class="bw-overview-label">心境记录</span>
      </div>
      <div class="bw-overview-card">
        <span class="bw-overview-num">{{ readingLogs.length }}</span>
        <span class="bw-overview-label">阅读记录</span>
      </div>
    </div>

    <div data-enter class="bw-tabs">
      <button :class="['bw-tab',{active:tab==='body'}]" @click="tab='body'">身体层</button>
      <button :class="['bw-tab',{active:tab==='sense'}]" @click="tab='sense'">感知层</button>
      <button :class="['bw-tab',{active:tab==='sutra'}]" @click="tab='sutra'">护持层</button>
    </div>

    <!-- ===== 身体层 ===== -->
    <div data-enter v-if="tab==='body'">
      <section>
        <h3>🕐 子午流注钟</h3>
        <div class="bw-meridian-clock">
          <div v-for="m in meridians" :key="m.hour" class="bw-mer-row" :class="{active:currentHour===m.hour}">
            <span class="bw-mer-time">{{String(m.hour).padStart(2,'0')}}:00</span>
            <span class="bw-mer-organ">{{m.organ}}</span>
            <span class="bw-mer-name">{{m.name}}</span>
            <div class="bw-mer-feelings">
              <button
                v-for="f in feelings"
                :key="f.value"
                class="bw-feeling-btn"
                :class="{selected:getMeridianFeeling(m.hour)===f.value}"
                @click="recordMeridianFeeling(m,f.value)"
                :title="f.label"
              >{{f.icon}}</button>
            </div>
          </div>
        </div>
      </section>
      <section v-if="meridianSummary.today>0">
        <h3>📊 今日记录</h3>
        <div class="bw-summary-card">
          <div class="bw-summary-item"><span class="bw-summary-label">已记录</span><span class="bw-summary-val">{{meridianSummary.today}} 条</span></div>
          <div class="bw-summary-item"><span class="bw-summary-label">好</span><span class="bw-summary-val good">{{meridianSummary.good}}</span></div>
          <div class="bw-summary-item"><span class="bw-summary-label">一般</span><span class="bw-summary-val ok">{{meridianSummary.ok}}</span></div>
          <div class="bw-summary-item"><span class="bw-summary-label">不适</span><span class="bw-summary-val bad">{{meridianSummary.bad}}</span></div>
        </div>
      </section>
      <section data-enter>
        <h3>🪷 被动意象</h3>
        <div class="bw-imagery-list">
          <div v-for="s in passiveImagery" :key="s.key" class="bw-imagery-chip">
            <div class="bw-imagery-head">
              <span class="bw-imagery-key">{{ s.key }}</span>
              <span class="bw-imagery-val">{{ s.intensity }}</span>
            </div>
            <p class="bw-imagery-summary">{{ s.summary }}</p>
            <div class="bw-imagery-bar"><span class="bw-imagery-fill" :style="{ width: s.intensity + '%' }"></span></div>
          </div>
        </div>
        <p class="bw-hint">被动聚合本地日志，仅作意象呈现，不作诊断或建议。</p>
      </section>
      <section v-if="bodyNotes.length">
        <h3>📝 身体层笔记</h3>
        <div v-for="(n,i) in bodyNotes.slice(0,5)" :key="i" class="bw-note-item">{{n}}</div>
      </section>
      <button class="bw-note-btn" @click="openNote('body')">✎ 记一笔</button>
      <!-- 体质趋势（constitution-trend 模块，原已实现但未挂载） -->
      <ConstitutionTrendPanel />
      <!-- 节气养生（solar-term 模块） -->
      <SolarTermPanel />
      <!-- 药膳食谱（medicinal-diet 模块） -->
      <MedicinalDietPanel />
    </div>

    <!-- ===== 感知层 ===== -->
    <div data-enter v-if="tab==='sense'">
      <section>
        <h3>🔮 问境角落</h3>
        <p class="bw-hint">不是问"我会怎么样"，而是"我现在在哪里"。</p>
        <div class="bw-divine-btns">
          <button @click="divine('tarot')" class="bw-divine-btn">🃏 抽三张塔罗</button>
          <button @click="divine('iching')" class="bw-divine-btn">☯ 六爻起卦</button>
        </div>
        <div v-if="divineResult" class="bw-answer-card"><p>{{ divineResult }}</p></div>
      </section>
      <section>
        <h3>💭 今日心境</h3>
        <div class="bw-mood-btns">
          <button
            v-for="m in moods"
            :key="m.value"
            class="bw-mood-btn"
            :class="{selected:moodSelected===m.value}"
            @click="selectMood(m.value)"
          >{{m.emoji}}<span class="bw-mood-label">{{m.label}}</span></button>
        </div>
        <textarea v-model="todayInsight" class="bw-text-input" placeholder="写下此刻的感悟…" rows="3"></textarea>
        <button class="bw-save-btn" @click="saveWisdomLog">记录今日</button>
      </section>
      <section v-if="wisdomLogs.length">
        <h3>📜 近期心境记录</h3>
        <div v-for="(log,i) in wisdomLogs.slice(0,10)" :key="i" class="bw-history-item">
          <div class="bw-history-header">
            <span class="bw-history-mood">{{moodEmoji(log.mood || '')}}</span>
            <span class="bw-history-time">{{formatTime(log.at)}}</span>
          </div>
          <p v-if="log.insight" class="bw-history-insight">{{log.insight}}</p>
        </div>
      </section>
      <section v-if="senseNotes.length">
        <h3>📝 感知层笔记</h3>
        <div v-for="(n,i) in senseNotes.slice(0,5)" :key="i" class="bw-note-item">{{n}}</div>
      </section>
      <button class="bw-note-btn" @click="openNote('sense')">✎ 记一笔</button>
    </div>

    <!-- ===== 护持层 ===== -->
    <div data-enter v-if="tab==='sutra'">
      <section>
        <h3>📿 藏经角落</h3>
        <p class="bw-hint">经文阅读 · 静坐引导 · 能量音乐</p>
        <div class="bw-sutra-list">
          <div v-for="s in sutras" :key="s" class="bw-sutra-card" :class="{'bw-reading':readingSutra===s}" @click="toggleReading(s)">
            <span>{{s}}</span>
            <span v-if="readingSutra===s" class="bw-sutra-timer">{{elapsedTime}}</span>
            <span v-else-if="sutraReadCount(s)>0" class="bw-sutra-read-count">已读 {{sutraReadCount(s)}} 次</span>
          </div>
        </div>
        <div v-if="activeSutra" class="bw-answer-card"><p class="bw-sutra-text">{{ sutraContent }}</p></div>
        <div v-if="activeSutra" class="bw-excerpt-area">
          <textarea v-model="excerptText" class="bw-text-input" placeholder="记录摘录或感悟…" rows="2"></textarea>
          <button class="bw-save-btn" @click="saveExcerpt">保存摘录</button>
        </div>
      </section>
      <section v-if="readingLogs.length">
        <h3>📖 阅读记录</h3>
        <div v-for="(log,i) in readingLogs.slice(0,10)" :key="i" class="bw-history-item">
          <div class="bw-history-header">
            <span class="bw-history-sutra">{{log.sutraName}}</span>
            <span class="bw-history-time">{{formatTime(log.at)}} · {{log.duration}}秒</span>
          </div>
          <p v-if="log.excerpt" class="bw-history-insight">{{log.excerpt}}</p>
        </div>
      </section>
      <section v-if="sutraNotes.length">
        <h3>📝 护持层笔记</h3>
        <div v-for="(n,i) in sutraNotes.slice(0,5)" :key="i" class="bw-note-item">{{n}}</div>
      </section>
      <button class="bw-note-btn" @click="openNote('sutra')">✎ 记一笔</button>
    </div>

    <!-- ===== 笔记弹窗 ===== -->
    <div data-enter v-if="noteTarget" class="bw-note-overlay" @click.self="closeNote">
      <div class="bw-note-dialog">
        <h4 class="bw-note-dialog-title">{{noteTarget==='body'?'身体层':noteTarget==='sense'?'感知层':'护持层'}} · 笔记</h4>
        <textarea v-model="noteText" class="bw-text-input" placeholder="写下你的想法…" rows="4"></textarea>
        <div class="bw-note-actions">
          <button class="bw-save-btn" @click="saveNote">保存</button>
          <button class="bw-cancel-btn" @click="closeNote">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useHealth } from '../resonance/bridges/health'
import { useViewEntrance } from '../composables/useViewEntrance'
import { derivePassiveHealthImagery } from '../modules/body-wisdom/passive-health-imagery'
import ConstitutionTrendPanel from '../components/ConstitutionTrendPanel.vue'
import SolarTermPanel from '../components/body-wisdom/SolarTermPanel.vue'
import MedicinalDietPanel from '../components/body-wisdom/MedicinalDietPanel.vue'

const health = useHealth()
const { meridianLogs, wisdomLogs, readingLogs, bodyNotes, senseNotes, sutraNotes } = health

const { entranceRef, entranceClass } = useViewEntrance()

const tab = ref('body')
const currentHour = new Date().getHours()
const meridians = [
  {hour:1,organ:'肝',name:'足厥阴肝经'},{hour:3,organ:'肺',name:'手太阴肺经'},
  {hour:5,organ:'大肠',name:'手阳明大肠经'},{hour:7,organ:'胃',name:'足阳明胃经'},
  {hour:9,organ:'脾',name:'足太阴脾经'},{hour:11,organ:'心',name:'手少阴心经'},
  {hour:13,organ:'小肠',name:'手太阳小肠经'},{hour:15,organ:'膀胱',name:'足太阳膀胱经'},
  {hour:17,organ:'肾',name:'足少阴肾经'},{hour:19,organ:'心包',name:'手厥阴心包经'},
  {hour:21,organ:'三焦',name:'手少阳三焦经'},{hour:23,organ:'胆',name:'足少阳胆经'},
]

// ========================
// 身体层 - 子午流注钟
// ========================
const feelings = [
  {value:'good',label:'好',icon:'✓'},
  {value:'ok',label:'一般',icon:'○'},
  {value:'bad',label:'不适',icon:'✗'},
]

function getMeridianFeeling(hour:number):string|undefined {
  return health.getMeridianFeeling(hour)
}

function recordMeridianFeeling(m:typeof meridians[0],feeling:string) {
  health.recordMeridianFeeling(m.hour, feeling, { organ: m.organ, name: m.name })
}

const meridianSummary = computed(()=>{
  const today = new Date().toISOString().slice(0,10)
  const logs = meridianLogs.value.filter(l=>l.date===today)
  return {
    today:logs.length,
    good:logs.filter(l=>l.feeling==='good').length,
    ok:logs.filter(l=>l.feeling==='ok').length,
    bad:logs.filter(l=>l.feeling==='bad').length,
  }
})

// ========================
// 被动健康意象（#86 · 本地聚合，中性呈现，不评判）
// ========================
const passiveImagery = computed(() => derivePassiveHealthImagery({
  bodyLogs: health.bodyLogs.value,
  meridianLogs: health.meridianLogs.value,
}))

// ========================
// 感知层 - 问境角落
// ========================
const divineResult = ref('')
function divine(type:string){
  if(type==='tarot'){
    const cards=['愚者·新的开始','隐者·内省','星星·希望','月亮·潜意识','太阳·喜悦']
    divineResult.value=`${cards[Math.floor(Math.random()*cards.length)]} | ${cards[Math.floor(Math.random()*cards.length)]} | ${cards[Math.floor(Math.random()*cards.length)]}\n\n这只是映照。你从中看到了什么？`
  }else{
    divineResult.value=`乾卦·元亨利贞\n\n天行健，君子以自强不息。\n\n此刻的你，正在哪个"位"上？时机合不合适？`
  }
}

const moods = [
  {value:'calm',label:'平静',emoji:'😌'},
  {value:'curious',label:'好奇',emoji:'🤔'},
  {value:'tired',label:'疲惫',emoji:'😴'},
  {value:'anxious',label:'焦虑',emoji:'😰'},
  {value:'joyful',label:'愉悦',emoji:'😊'},
  {value:'sad',label:'忧伤',emoji:'😢'},
]

const moodEmojiMap:Record<string,string> = {
  calm:'😌',curious:'🤔',tired:'😴',anxious:'😰',joyful:'😊',sad:'😢',
}

const moodSelected = ref('')
const todayInsight = ref('')

function selectMood(value:string) {
  moodSelected.value = moodSelected.value===value?'':value
}

function moodEmoji(mood:string):string {
  return moodEmojiMap[mood]||'💭'
}

function saveWisdomLog() {
  if (!moodSelected.value&&!todayInsight.value.trim()) return
  health.addWisdomLog(todayInsight.value.trim() || moodSelected.value, {
    mood: moodSelected.value,
    insight: todayInsight.value.trim(),
  })
  moodSelected.value = ''
  todayInsight.value = ''
}

// ========================
// 护持层 - 藏经角落
// ========================
const sutras = ['心经','清静经','大学·首章','黄帝内经·上古天真论']
const activeSutra = ref('')
const sutraContent = ref('观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。舍利子，色不异空，空不异色，色即是空，空即是色。受想行识，亦复如是。')

const readingSutra = ref('')
const readingStart = ref(0)
const elapsedTime = ref('00:00')
let timerInterval:ReturnType<typeof setInterval>|null = null

function toggleReading(s:string) {
  if (readingSutra.value===s) {
    stopReading()
  } else {
    if (readingSutra.value) stopReading()
    startReading(s)
  }
}

function startReading(s:string) {
  readingSutra.value = s
  readingStart.value = Date.now()
  activeSutra.value = s
  timerInterval = setInterval(()=>{
    const elapsed = Math.floor((Date.now()-readingStart.value)/1000)
    elapsedTime.value = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`
  },1000)
}

function stopReading() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  const now = Date.now()
  const duration = Math.round((now-readingStart.value)/1000)
  health.addReadingLog(readingSutra.value, '', {
    sutraName: readingSutra.value,
    startTime: new Date(readingStart.value).toISOString(),
    endTime: new Date(now).toISOString(),
    duration,
    excerpt: '',
  })
  readingSutra.value = ''
  elapsedTime.value = '00:00'
}

const excerptText = ref('')

function saveExcerpt() {
  if (!excerptText.value.trim()||!readingLogs.value.length) return
  readingLogs.value[0].excerpt = excerptText.value.trim()
  health.persistReadingLogs()
  excerptText.value = ''
}

function sutraReadCount(s:string):number {
  return readingLogs.value.filter(l=>l.sutraName===s).length
}

onUnmounted(()=>{
  if (timerInterval) clearInterval(timerInterval)
})

// ========================
// 笔记功能（各层通用）
// ========================
const noteTarget = ref<'body'|'sense'|'sutra'|null>(null)
const noteText = ref('')

function openNote(target:'body'|'sense'|'sutra') {
  noteTarget.value = target
  noteText.value = ''
}

function closeNote() {
  noteTarget.value = null
  noteText.value = ''
}

function saveNote() {
  if (!noteTarget.value||!noteText.value.trim()) return
  const noteContent = noteText.value.trim()+' · '+new Date().toLocaleString('zh-CN')
  if (noteTarget.value === 'body') health.addBodyNote(noteContent)
  else if (noteTarget.value === 'sense') health.addSenseNote(noteContent)
  else if (noteTarget.value === 'sutra') health.addSutraNote(noteContent)
  closeNote()
}

// ========================
// 工具函数
// ========================
function formatTime(iso:string):string {
  const d = new Date(iso)
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<style scoped>
.bw {
  --accent: var(--accent);
  --accent-dim: rgba(var(--accent-rgb), 0.15);
  --accent-border: rgba(var(--accent-rgb), 0.3);
  --accent-glow: rgba(var(--accent-rgb), 0.04);
  --text-primary: rgba(255, 255, 255, 0.85);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-muted: rgba(255, 255, 255, 0.3);
  --card-bg: var(--card-bg);
  --card-border: rgba(var(--accent-rgb), 0.08);
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  overflow: hidden;
}
.bw::before {
  content: '';
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
}
.bw::after {
  content: '';
  position: absolute;
  bottom: -80px;
  right: -60px;
  width: 300px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
}

/* 头部装饰 */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}
.orn-line {
  display: block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}
.orn-diamond {
  font-size: 12px;
  color: var(--accent);
  opacity: 0.6;
}
.header-kicker {
  text-align: center;
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 3px;
  margin: 0 0 4px;
}
.bw-title {
  text-align: center;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 24px;
}

/* 概览卡片 */
.bw-overview {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}
.bw-overview-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}
.bw-overview-num {
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.bw-overview-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}

/* 标签页 */
.bw-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  justify-content: center;
}
.bw-tab {
  padding: 7px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s;
}
.bw-tab:hover {
  color: rgba(255, 255, 255, 0.6);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.bw-tab.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

section { margin-bottom: 24px; }
section h3 {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 10px;
  color: var(--text-primary);
}

/* 子午流注钟 */
.bw-meridian-clock { font-size: 12px; }
.bw-mer-row {
  display: flex;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  align-items: center;
  transition: background 0.2s;
}
.bw-mer-row.active {
  background: rgba(var(--accent-rgb), 0.08);
}
.bw-mer-time { opacity: 0.4; width: 40px; flex-shrink: 0; color: var(--text-secondary); }
.bw-mer-organ { font-weight: 600; width: 40px; flex-shrink: 0; color: var(--text-primary); }
.bw-mer-name { opacity: 0.5; flex-shrink: 0; color: var(--text-secondary); }
.bw-mer-feelings { display: flex; gap: 2px; margin-left: auto; }
.bw-feeling-btn {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.2);
  font-size: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; font-family: inherit; padding: 0; line-height: 1;
}
.bw-feeling-btn:hover { color: rgba(255, 255, 255, 0.5); background: rgba(255, 255, 255, 0.05); }
.bw-feeling-btn.selected {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}

/* 今日汇总卡片 */
.bw-summary-card {
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}
.bw-summary-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.bw-summary-label { font-size: 11px; opacity: 0.4; color: var(--text-secondary); }
.bw-summary-val { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.55); }
.bw-summary-val.good { color: #7ecf7e; }
.bw-summary-val.ok { color: #d4b872; }
.bw-summary-val.bad { color: #cf7e7e; }

/* 心境按钮 */
.bw-mood-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.bw-mood-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 12px; border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.45);
  font-size: 20px; cursor: pointer;
  transition: all 0.2s; font-family: inherit; min-width: 56px;
}
.bw-mood-btn:hover { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.65); }
.bw-mood-btn.selected {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: var(--accent);
  color: var(--accent);
}
.bw-mood-label { font-size: 11px; }

/* 通用输入 */
.bw-text-input {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  font-size: 13px; font-family: inherit; resize: vertical;
  box-sizing: border-box; transition: border-color 0.2s; line-height: 1.6;
}
.bw-text-input:focus { outline: none; border-color: rgba(var(--accent-rgb), 0.3); }
.bw-text-input::placeholder { color: rgba(255, 255, 255, 0.15); }

/* 保存按钮 */
.bw-save-btn {
  padding: 6px 16px; border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all 0.2s; margin-top: 6px;
}
.bw-save-btn:hover { background: rgba(var(--accent-rgb), 0.2); }

/* 取消按钮 */
.bw-cancel-btn {
  padding: 6px 16px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all 0.2s; margin-top: 6px;
}
.bw-cancel-btn:hover { color: rgba(255, 255, 255, 0.55); }

/* 历史记录 */
.bw-history-item {
  padding: 8px 12px; border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  margin-bottom: 6px;
}
.bw-history-header { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.bw-history-mood { font-size: 18px; }
.bw-history-time { font-size: 11px; opacity: 0.35; color: var(--text-secondary); }
.bw-history-sutra { font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.55); }
.bw-history-insight { font-size: 12px; color: rgba(255, 255, 255, 0.4); line-height: 1.5; margin: 4px 0 0; }

/* 护持层 - 经书卡片 */
.bw-sutra-list { display: flex; flex-direction: column; gap: 6px; }
.bw-sutra-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-left: 3px solid transparent;
  cursor: pointer; font-size: 13px;
  transition: all 0.2s; color: var(--text-primary);
}
.bw-sutra-card:hover {
  background: var(--bg-card);
  border-left-color: rgba(var(--accent-rgb), 0.3);
}
.bw-sutra-card.bw-reading {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
  border-left-color: var(--accent);
}
.bw-sutra-timer {
  font-size: 12px; color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.bw-sutra-read-count { font-size: 11px; opacity: 0.3; color: var(--text-secondary); }
.bw-sutra-text { font-style: italic; line-height: 1.8 !important; color: var(--text-primary); }
.bw-excerpt-area { margin-top: 8px; }

/* 笔记按钮 */
.bw-note-btn {
  display: block; width: 100%; padding: 8px; border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.06);
  background: transparent;
  color: rgba(255, 255, 255, 0.2);
  font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all 0.2s; margin-top: 4px;
}
.bw-note-btn:hover { color: rgba(255, 255, 255, 0.4); border-color: rgba(var(--accent-rgb), 0.15); }

/* 笔记列表项 */
.bw-note-item {
  font-size: 12px; color: rgba(255, 255, 255, 0.3);
  padding: 6px 0; border-bottom: 1px solid var(--bg-surface);
  line-height: 1.5;
}

/* 笔记弹窗 */
.bw-note-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.bw-note-dialog {
  width: 360px; max-width: 90vw; padding: 20px; border-radius: 12px;
  background: var(--bg-deep);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
}
.bw-note-dialog-title {
  font-size: 14px; font-weight: 500; margin: 0 0 12px;
  color: rgba(var(--accent-rgb), 0.7);
}
.bw-note-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* 通用 */
.bw-hint { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
.bw-divine-btns { display: flex; gap: 8px; }
.bw-divine-btn {
  padding: 8px 16px; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-secondary);
  font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.2s;
}
.bw-divine-btn:hover { background: rgba(var(--accent-rgb), 0.06); color: var(--accent); }
.bw-answer-card {
  padding: 14px; border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  margin-top: 10px; white-space: pre-line;
}
.bw-answer-card p { font-size: 13px; line-height: 1.7; margin: 0; color: var(--text-primary); }
.bw-empty { font-size: 13px; color: rgba(255, 255, 255, 0.12); padding: 8px 0; }

/* 被动意象（#86） */
.bw-imagery-list { display: flex; flex-direction: column; gap: 8px; }
.bw-imagery-chip {
  padding: 10px 12px; border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}
.bw-imagery-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.bw-imagery-key { font-size: 13px; font-weight: 500; color: var(--accent); }
.bw-imagery-val { font-size: 12px; color: rgba(255, 255, 255, 0.4); font-variant-numeric: tabular-nums; }
.bw-imagery-summary { font-size: 12px; color: rgba(255, 255, 255, 0.5); line-height: 1.6; margin: 0 0 8px; }
.bw-imagery-bar { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
.bw-imagery-fill { display: block; height: 100%; border-radius: 2px; background: rgba(var(--accent-rgb), 0.5); transition: width 0.4s ease; }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .bw { padding: 32px 20px 64px; }
  .bw-overview { gap: 8px; }
  .bw-mood-btns { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .bw { padding: 24px 14px 56px; }
  .bw-overview { flex-direction: column; }
}

@media (max-width: 480px) {
  .bw { padding: 12px; }
  .bw-overview { flex-direction: column; gap: 6px; }
  .bw-mood-btns { gap: 4px; }
}
</style>