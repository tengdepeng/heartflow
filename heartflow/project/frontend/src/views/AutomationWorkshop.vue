<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance aw">
    <!-- 装饰性头部 -->
    <div data-enter class="aw-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">自动化工作流编排</p>
      <h1 class="aw-title">自动化工坊</h1>
    </div>

    <!-- 概览卡片 -->
    <div data-enter class="overview-cards">
      <div class="overview-card">
        <span class="ov-icon">📜</span>
        <span class="ov-value">{{ savedFlows.length }}</span>
        <span class="ov-label">已保存流程</span>
      </div>
      <div class="overview-card">
        <span class="ov-icon">📋</span>
        <span class="ov-value">{{ history.length }}</span>
        <span class="ov-label">执行记录</span>
      </div>
      <div class="overview-card">
        <span class="ov-icon">📦</span>
        <span class="ov-value">{{ templates.length }}</span>
        <span class="ov-label">预置模板</span>
      </div>
    </div>

    <!-- 编排画布 -->
    <section data-enter><h3>🎬 编排画布</h3>
      <div class="aw-canvas-area">
        <div class="canvas-toolbar">
          <span class="canvas-label">触发条件</span>
          <div class="trigger-pool">
            <span v-for="t in triggers" :key="t.key" class="chip trig-chip" draggable="true" @dragstart="dragTrigger=t.key">{{t.icon}} {{t.label}}</span>
          </div>
        </div>
        <div class="canvas-stage" @drop.prevent="onDrop" @dragover.prevent>
          <div v-if="!flowSteps.length" class="stage-hint">将触发、条件、操作拖到这里…</div>
          <div v-for="(step,i) in flowSteps" :key="i" class="flow-step" :class="`step-${step.type}`">
            <span class="step-icon">{{step.icon}}</span>
            <span class="step-label">{{step.label}}</span>
            <span v-if="step.type==='condition'" class="cond-badge">if/else</span>
            <span v-if="i<flowSteps.length-1" class="step-connector">→</span>
            <button class="step-del" @click="flowSteps.splice(i,1)">×</button>
          </div>
        </div>
        <div class="canvas-toolbar">
          <span class="canvas-label">逻辑节点</span>
          <div class="cond-pool">
            <span class="chip cond-chip" draggable="true" @dragstart="dragCondition='if'">❓ 条件分支</span>
          </div>
        </div>
        <div class="canvas-toolbar">
          <span class="canvas-label">原子操作</span>
          <div class="action-pool">
            <span v-for="a in actions" :key="a.key" class="chip action-chip" draggable="true" @dragstart="dragAction=a.key">{{a.icon}} {{a.label}}</span>
          </div>
        </div>
      </div>
      <div class="flow-actions" v-if="flowSteps.length">
        <button class="aw-btn" @click="previewFlow">▶ 预览</button>
        <button class="aw-btn save-btn" @click="saveFlow">保存流程</button>
        <button class="aw-btn danger-btn" @click="flowSteps=[]">清空</button>
        <label class="timer-label">
          <span class="timer-icon">⏱</span>
          <input class="timer-input" type="number" min="0" placeholder="0" v-model.number="cronInterval" />
          <span class="timer-unit">定时(分钟)</span>
        </label>
      </div>
    </section>

    <!-- 流程模板 -->
    <section data-enter><h3>📦 模板</h3>
      <div class="aw-template-grid">
        <div v-for="t in templates" :key="t.id" class="aw-template-card" role="button" tabindex="0" :aria-label="'应用模板 ' + t.name" @click="loadTemplate(t)" @keydown.enter.prevent="loadTemplate(t)" @keydown.space.prevent="loadTemplate(t)">
          <span class="tpl-icon">{{t.icon}}</span>
          <div class="tpl-info">
            <span class="aw-template-name">{{t.name}}</span>
            <span class="aw-template-desc">{{t.description}}</span>
          </div>
          <span class="tpl-apply">应用</span>
        </div>
      </div>
    </section>

    <!-- 演员系统 -->
    <section data-enter><h3>🎭 演员</h3>
      <div class="actor-row">
        <span v-for="a in actors" :key="a.key" class="actor-chip" :class="{active:selectedActor===a.key}" role="radio" tabindex="0" :aria-checked="selectedActor===a.key" :aria-label="'选择演员 ' + a.icon" @click="selectedActor=a.key" @keydown.enter.prevent="selectedActor=a.key" @keydown.space.prevent="selectedActor=a.key">{{a.icon}}</span>
      </div>
      <div v-if="runningFlows.length" class="running-flows">
        <div v-for="rf in runningFlows" :key="rf.id" class="running-flow">
          <span class="rf-actor">{{rf.actor}}</span>
          <span class="rf-name">{{rf.name}}</span>
          <span class="rf-status">● 运行中</span>
          <button @click="stopFlow(rf.id)" class="aw-del">×</button>
        </div>
      </div>
    </section>

    <!-- 已保存流程 -->
    <section data-enter><h3>📜 已保存流程</h3>
      <div v-if="savedFlows.length" class="aw-flow-list">
        <div v-for="f in savedFlows" :key="f.id" class="aw-flow-card" role="button" tabindex="0" :aria-label="'载入流程 ' + f.name" @click="loadFlow(f)" @keydown.enter.prevent="loadFlow(f)" @keydown.space.prevent="loadFlow(f)">
          <span class="sf-icon">{{f.actor}}</span>
          <div class="sf-info"><span class="aw-flow-name">{{f.name}}</span><span class="aw-flow-meta">{{f.steps.length}} 步 · {{f.description || ''}}</span></div>
          <button class="aw-del" @click.stop="deleteFlow(f.id)">×</button>
        </div>
      </div>
      <p v-else class="aw-empty-hint">还没有保存的流程</p>
    </section>

    <!-- 执行历史 -->
    <section data-enter><h3>📋 执行历史</h3>
      <div v-if="history.length" class="aw-history-list">
        <div v-for="h in history.slice(0,8)" :key="h.id" class="aw-history-item" :class="{ 'hist-row--expandable': h.details?.length }" role="button" tabindex="0" :aria-expanded="expandedDetail === h.id" :aria-label="'展开或收起执行记录 ' + h.flowName" @click="toggleDetail(h.id)" @keydown.enter.prevent="toggleDetail(h.id)" @keydown.space.prevent="toggleDetail(h.id)">
          <span>{{h.flowName}}</span>
          <span class="aw-history-time">{{fmt(h.at)}}</span>
          <span :class="`aw-flow-status ${h.status}`">{{h.status==='ok'?'✅':h.status==='warn'?'⚠️':'✕'}}</span>
          <span v-if="h.message" class="hist-msg" :title="h.message">ⓘ</span>
          <div v-if="expandedDetail === h.id && h.details" class="hist-detail">
            <div v-for="d in h.details" :key="d.step" class="detail-row">
              <span class="detail-step">{{d.step}}</span>
              <span :class="`detail-status ${d.status}`">{{d.status}}</span>
              <span v-if="d.message" class="detail-msg">{{d.message}}</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="aw-empty-hint">还没有执行记录</p>
    </section>

    <!-- 安全红线 -->
    <section data-enter><h3>🛡 安全红线</h3>
      <div class="rules"><p>• 全部本地 · 不上传不云端</p><p>• 敏感操作不可编排(发送消息/删除数据/转账)</p><p>• 三指三连点 = 全局紧急终止</p><p>• 所有编排数据本地加密存储</p></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { automationEngine, getFlowTemplates, type SavedFlow, type ExecutionRecord, type FlowStep, type FlowTemplate } from '../engine/automation'
import { useAutomationFlows } from '../modules/automation'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const { flows: savedFlows, load: loadFlows, save: saveFlows } = useAutomationFlows()
onMounted(loadFlows)

const triggers=[{key:'manual',icon:'👆',label:'手动触发'},{key:'timer',icon:'⏰',label:'定时触发'},{key:'event',icon:'📡',label:'殿堂事件'},{key:'device',icon:'📱',label:'设备状态'}]
const actions=[{key:'focus',icon:'⏱️',label:'开始专注'},{key:'pause',icon:'⏸',label:'暂停专注'},{key:'room',icon:'🚪',label:'进入房间'},{key:'note',icon:'📝',label:'快速记录'},{key:'sound',icon:'🔊',label:'播放环境音'},{key:'dim',icon:'🔅',label:'调整亮度'},{key:'notify',icon:'💬',label:'本地提示'}]
const actors=[{key:'sprite',icon:'✨'},{key:'gear',icon:'⚙️'},{key:'bookworm',icon:'📖'},{key:'eye',icon:'👁'},{key:'droplet',icon:'💧'},{key:'bell',icon:'🔔'},{key:'shadow',icon:'👤'},{key:'particle',icon:'•'}]
const templates = getFlowTemplates()

const flowSteps=ref<FlowStep[]>([])
const selectedActor=ref('sprite')
const dragTrigger=ref('');const dragAction=ref('');const dragCondition=ref('')
const runningFlows=ref<{id:string;name:string;actor:string}[]>([])
const history=ref<ExecutionRecord[]>(automationEngine.getHistory())
const cronInterval=ref<number>(0)
const expandedDetail=ref<string>('')

function onDrop(_e:DragEvent){
  if(dragTrigger.value){
    const t=triggers.find(t=>t.key===dragTrigger.value)
    if(t)flowSteps.value.unshift({type:'trigger',key:t.key,icon:t.icon,label:t.label})
  }else if(dragCondition.value){
    flowSteps.value.push({
      type:'condition',key:'if',icon:'❓',label:'条件分支',
      condition:{type:'count',left:'今日专注次数',operator:'gte',right:'1'},
      thenSteps:[{type:'action',key:'notify',icon:'💬',label:'条件满足时',params:{message:'条件满足'}}],
      elseSteps:[{type:'action',key:'notify',icon:'💬',label:'条件不满足时',params:{message:'条件未满足'}}],
    })
  }else if(dragAction.value){
    const a=actions.find(a=>a.key===dragAction.value)
    if(a)flowSteps.value.push({type:'action',key:a.key,icon:a.icon,label:a.label})
  }
  dragTrigger.value='';dragAction.value='';dragCondition.value=''
}

function loadTemplate(t: FlowTemplate) {
  flowSteps.value = t.steps.map(s => ({ ...s }))
  selectedActor.value = actors.find(a => a.key === t.actor)?.key || 'sprite'
}

async function previewFlow(){
  if(!flowSteps.value.length)return
  const actor=actors.find(a=>a.key===selectedActor.value)
  const tempFlow:SavedFlow={
    id:`sf${Date.now()}`,
    name:`预览流程 ${runningFlows.value.length+1}`,
    actor:actor?.icon||'✨',
    steps:[...flowSteps.value],
    createdAt:new Date().toISOString(),
  }
  const record=await automationEngine.execute(tempFlow, 'manual')
  runningFlows.value.push({id:record.id,name:tempFlow.name,actor:tempFlow.actor})
  history.value=automationEngine.getHistory()
  setTimeout(()=>{runningFlows.value=runningFlows.value.filter(rf=>rf.id!==record.id)},3000)
}

function saveFlow(){
  if(!flowSteps.value.length)return
  const actor=actors.find(a=>a.key===selectedActor.value)
  const flow:SavedFlow={
    id:`sf${Date.now()}`,
    name:`流程 ${savedFlows.value.length+1}`,
    actor:actor?.icon||'✨',
    steps:[...flowSteps.value],
    createdAt:new Date().toISOString(),
    cron: cronInterval.value>0 ? `*/${cronInterval.value} * * * *` : undefined,
  }
  savedFlows.value.unshift(flow)
  saveFlows()

  if(cronInterval.value>0){
    automationEngine.startTimerFlow(flow, cronInterval.value*60*1000)
    runningFlows.value.push({id:flow.id,name:`${flow.name} (定时)`,actor:flow.actor})
  }

  flowSteps.value=[]
  cronInterval.value=0
}

function loadFlow(f:SavedFlow){flowSteps.value=[...f.steps];selectedActor.value=actors.find(a=>a.icon===f.actor)?.key||'sprite'}
function deleteFlow(id:string){
  savedFlows.value=savedFlows.value.filter(f=>f.id!==id)
  saveFlows()
  automationEngine.stopTimerFlow(id)
  runningFlows.value=runningFlows.value.filter(rf=>rf.id!==id)
}
function stopFlow(id:string){
  automationEngine.stopTimerFlow(id)
  runningFlows.value=runningFlows.value.filter(rf=>rf.id!==id)
}
function toggleDetail(id: string) {
  expandedDetail.value = expandedDetail.value === id ? '' : id
}
function fmt(iso:string){const d=new Date(iso);return`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
</script>

<style scoped>
/* ===== Warm Amber Theme ===== */
.aw {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  position: relative;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  overflow-y: auto;
}

/* ambient glow */
.aw::before {
  content: '';
  position: fixed;
  top: -40%;
  left: 50%;
  translate: -50% 0;
  width: 600px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.aw::after {
  content: '';
  position: fixed;
  bottom: -20%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.aw > * { position: relative; z-index: 1; }

/* ===== Header ===== */
.aw-header { text-align: center; margin-bottom: 32px; }
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
.orn-line { display: block; width: 48px; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); }
.orn-diamond { font-size: 12px; color: var(--accent); opacity: 0.8; }
.header-kicker { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(var(--accent-rgb), 0.5); margin-bottom: 6px; }
.aw-title { font-size: 26px; font-weight: 500; letter-spacing: 4px; color: var(--accent); margin: 0; }

/* ===== Overview Cards ===== */
.overview-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
.overview-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 16px 8px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  position: relative;
  overflow: hidden;
}
.overview-card::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
}
.ov-icon { font-size: 20px; }
.ov-value { font-size: 24px; font-weight: 500; color: var(--accent); line-height: 1; }
.ov-label { font-size: 11px; opacity: 0.5; }

/* ===== Sections ===== */
section { margin-bottom: 28px; }
section h3 { font-size: 14px; opacity: 0.7; margin-bottom: 10px; font-weight: 500; letter-spacing: 1px; }

/* ===== Canvas Area ===== */
.aw-canvas-area { border-radius: 14px; border: 1px solid rgba(var(--accent-rgb), 0.08); overflow: hidden; margin-bottom: 12px; background: rgba(0,0,0,0.15); }
.canvas-toolbar { padding: 10px 14px; background: rgba(var(--accent-rgb), 0.02); border-bottom: 1px solid rgba(var(--accent-rgb), 0.04); display: flex; align-items: center; gap: 10px; }
.canvas-toolbar:last-child { border-bottom: none; border-top: 1px solid rgba(var(--accent-rgb), 0.04); }
.canvas-label { font-size: 11px; opacity: 0.52; white-space: nowrap; }
.trigger-pool, .action-pool, .cond-pool { display: flex; gap: 4px; flex-wrap: wrap; }
.chip { padding: 4px 10px; border-radius: 12px; font-size: 11px; cursor: grab; border: 1px solid; transition: all 0.2s; user-select: none; }
.trig-chip { border-color: rgba(240,192,64,0.25); background: rgba(240,192,64,0.06); color: var(--warning); }
.trig-chip:hover { background: rgba(240,192,64,0.12); }
.cond-chip { border-color: rgba(129,199,132,0.25); background: rgba(129,199,132,0.06); color: #81c784; }
.cond-chip:hover { background: rgba(129,199,132,0.12); }
.action-chip { border-color: rgba(var(--accent-rgb), 0.25); background: rgba(var(--accent-rgb), 0.06); color: var(--accent); }
.action-chip:hover { background: rgba(var(--accent-rgb), 0.12); }

.canvas-stage { min-height: 80px; padding: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stage-hint { font-size: 12px; color: rgba(255, 255, 255, 0.35); font-style: italic; width: 100%; text-align: center; }
.flow-step { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; border: 1px solid; font-size: 12px; animation: pulseIn 0.3s ease-out; }
@keyframes pulseIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.step-trigger { border-color: rgba(240,192,64,0.3); background: rgba(240,192,64,0.08); color: var(--warning); }
.step-action { border-color: rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.08); color: var(--accent); }
.step-condition { border-color: rgba(129,199,132,0.3); background: rgba(129,199,132,0.08); color: #81c784; }
.step-connector { opacity: 0.3; font-size: 14px; }
.step-del { width: 16px; height: 16px; border-radius: 50%; border: none; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }
.step-del:hover { color: var(--danger); }
.cond-badge { font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(129,199,132,0.2); color: #81c784; }

.flow-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.aw-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent); font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.aw-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.save-btn { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.08); color: var(--success); }
.save-btn:hover { background: rgba(52,211,153,0.15); }
.danger-btn { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.05); color: rgba(239,68,68,0.6); }
.danger-btn:hover { background: rgba(239,68,68,0.1); }

/* ===== Template Grid ===== */
.aw-template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.aw-template-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.06); background: rgba(var(--accent-rgb), 0.02); cursor: pointer; transition: all 0.2s; }
.aw-template-card:hover { border-color: rgba(var(--accent-rgb), 0.2); background: rgba(var(--accent-rgb), 0.06); }
.aw-template-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: rgba(var(--accent-rgb), 0.2);
}
.tpl-icon { font-size: 20px; }
.tpl-info { flex: 1; min-width: 0; }
.aw-template-name { font-size: 13px; display: block; }
.aw-template-desc { font-size: 11px; opacity: 0.55; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpl-apply { font-size: 11px; padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.2); color: var(--accent); opacity: 0.7; }

/* ===== Actors ===== */
.actor-row { display: flex; gap: 6px; flex-wrap: wrap; }
.actor-chip { font-size: 20px; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.06); background: rgba(var(--accent-rgb), 0.02); cursor: pointer; transition: all 0.2s; }
.actor-chip:hover { background: rgba(var(--accent-rgb), 0.08); }
.actor-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.08);
}
.actor-chip.active { border-color: rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.12); }
.running-flows { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.running-flow { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; background: rgba(52,211,153,0.05); border: 1px solid rgba(52,211,153,0.1); font-size: 12px; }
.rf-actor { font-size: 16px; }
.rf-name { flex: 1; }
.rf-status { color: var(--success); animation: pulse 1s infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
.aw-del { width: 18px; height: 18px; border-radius: 50%; border: none; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }
.aw-del:hover { color: var(--danger); }

/* ===== Flow List ===== */
.aw-flow-list { display: flex; flex-direction: column; gap: 6px; }
.aw-flow-card { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.02); border: 1px solid rgba(var(--accent-rgb), 0.04); cursor: pointer; transition: all 0.2s; }
.aw-flow-card:hover { background: rgba(var(--accent-rgb), 0.06); }
.aw-flow-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  background: rgba(var(--accent-rgb), 0.06);
}
.sf-icon { font-size: 20px; }
.sf-info { flex: 1; }
.aw-flow-name { font-size: 13px; display: block; }
.aw-flow-meta { font-size: 11px; opacity: 0.55; display: block; }

/* ===== History List ===== */
.aw-history-list { display: flex; flex-direction: column; gap: 4px; }
.aw-history-item { display: flex; gap: 12px; padding: 6px 8px; border-radius: 4px; font-size: 13px; cursor: default; flex-wrap: wrap; }
.aw-history-item.hist-row--expandable { cursor: pointer; }
.aw-history-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-radius: 6px;
}
.aw-history-time { opacity: 0.55; flex: 1; text-align: right; }
.aw-flow-status { width: 24px; text-align: center; }
.aw-flow-status.ok { color: var(--success); }
.aw-flow-status.warn { color: var(--warning); }
.aw-flow-status.error { color: var(--danger); }
.hist-msg { cursor: help; opacity: 0.55; font-size: 11px; }
.hist-detail { width: 100%; padding: 6px 8px; margin-top: 4px; background: rgba(var(--accent-rgb), 0.02); border-radius: 6px; font-size: 11px; }
.detail-row { display: flex; gap: 8px; padding: 2px 0; }
.detail-step { flex: 1; opacity: 0.6; }
.detail-status { width: 48px; text-align: center; }
.detail-status.ok { color: var(--success); }
.detail-status.error { color: var(--danger); }
.detail-status.skipped { color: var(--warning); }
.detail-msg { opacity: 0.55; }

/* ===== Timer ===== */
.timer-label { display: flex; align-items: center; gap: 4px; margin-left: auto; font-size: 12px; opacity: 0.6; }
.timer-icon { font-size: 13px; }
.timer-input { width: 44px; padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.1); background: rgba(var(--accent-rgb), 0.04); color: inherit; font-size: 12px; font-family: inherit; text-align: center; outline: none; }
.timer-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.timer-unit { white-space: nowrap; font-size: 11px; }

/* ===== Rules ===== */
.rules p { font-size: 12px; opacity: 0.4; padding: 2px 0; }

/* ===== Empty hint ===== */
.aw-empty-hint { font-size: 13px; color: rgba(255, 255, 255, 0.38); padding: 8px 0; }

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .aw { padding: 32px 20px 64px; }
  .overview-cards { gap: 8px; }
  .aw-template-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .aw { padding: 24px 14px 56px; }
  .overview-cards { flex-direction: column; }
}

@media (max-width: 480px) {
  .overview-cards { grid-template-columns: repeat(2, 1fr); }
  .aw-template-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
}
</style>