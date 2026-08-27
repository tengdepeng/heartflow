<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance mr">
    <div data-enter class="mr-ambient">
      <div class="mr-glow-left" />
      <div class="mr-glow-right" />
    </div>

    <header data-enter class="mr-header">
      <div class="header-ornament">
        <span class="orn-line" />
        <span class="orn-diamond">✦</span>
        <span class="orn-line" />
      </div>
      <p class="mr-kicker">你的足迹 · 所有去过的地方</p>
      <h1 class="mr-title">地图室</h1>
      <div class="mr-overview">
        <article class="ov-card">
          <span class="ov-label">地点</span>
          <strong class="ov-value">{{ places.length }}</strong>
        </article>
        <article class="ov-card">
          <span class="ov-label">城市</span>
          <strong class="ov-value">{{ uniqueCities }}</strong>
        </article>
        <article class="ov-card">
          <span class="ov-label">到访次</span>
          <strong class="ov-value">{{ totalVisits }}</strong>
        </article>
        <article class="ov-card">
          <span class="ov-label">已定位</span>
          <strong class="ov-value">{{ locatedCount }}</strong>
        </article>
      </div>
    </header>

    <!-- 足迹星图（本地坐标绘制，无外部瓦片） -->
    <section data-enter class="mr-section">
      <h3 class="section-title">足迹星图 · 本地坐标绘制</h3>
      <div class="map-wrap">
        <svg class="mr-map" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" @click="focusedId = ''">
          <rect x="0" y="0" width="360" height="180" class="map-bg" />
          <g class="graticule">
            <line v-for="x in lngLines" :key="'v' + x" :x1="x" y1="0" :x2="x" y2="180" :class="{ eq: x === 180 }" />
            <line v-for="y in latLines" :key="'h' + y" :x1="0" :y1="y" x2="360" :y2="y" :class="{ eq: y === 90 }" />
          </g>
          <polyline v-if="plotted.length > 1" class="map-journey" :points="journeyPoints" />
          <g v-for="p in plotted" :key="p.id" class="map-point" @click.stop="focusPlace(p.id)">
            <circle :cx="ptX(p)" :cy="ptY(p)" :r="2 + Math.sqrt(p.visitCount)" :fill="typeColor(p.type)" :class="{ focused: p.id === focusedId }">
              <title>{{ p.name }} · {{ p.city }}{{ p.visitCount > 1 ? ' · ' + p.visitCount + '次' : '' }}</title>
            </circle>
          </g>
        </svg>
      </div>
      <p class="map-hint" v-if="!plotted.length">添加带城市（或经纬度）的地点后，将在此自动落点。</p>
      <p class="map-hint" v-else>共 {{ plotted.length }} 个地点已定位 · 点击圆点可在下方展开</p>
    </section>

    <!-- 城市热度榜 -->
    <section data-enter class="mr-section">
      <h3 class="section-title">城市热度榜</h3>
      <div class="heatmap-grid">
        <div v-for="city in topCities" :key="city.name" class="heat-cell" :style="{ background: city.color, opacity: 0.3 + city.pct * 0.7 }" :title="`${city.name} ${city.count}次`">
          <span class="heat-city">{{ city.name }}</span>
          <span class="heat-count">{{ city.count }}</span>
        </div>
      </div>
    </section>

    <!-- 添加地点 -->
    <section data-enter class="mr-section">
      <h3 class="section-title">记录地点</h3>
      <div class="add-row">
        <input v-model="form.name" placeholder="地点名称" class="mr-input" />
        <input v-model="form.city" placeholder="城市（可联想）" class="mr-input" list="cityList" />
        <select v-model="form.type" class="mr-select">
          <option value="city">🏙 城市</option><option value="nature">🏔 自然</option>
          <option value="coast">🏖 海岸</option><option value="cultural">🏛 人文</option>
          <option value="abroad">✈ 境外</option>
        </select>
        <input v-model.number="form.lng" type="number" step="0.01" placeholder="经度" class="mr-input mr-coord" />
        <input v-model.number="form.lat" type="number" step="0.01" placeholder="纬度" class="mr-input mr-coord" />
        <button @click="addPlace" class="mr-btn" :disabled="!form.name">+</button>
      </div>
      <datalist id="cityList">
        <option v-for="c in cityNames" :key="c" :value="c" />
      </datalist>
    </section>

    <!-- 地点列表 -->
    <section data-enter class="mr-section">
      <h3 class="section-title">地点记录</h3>
      <div class="filter-row">
        <select v-model="typeFilter" class="mr-select">
          <option value="">全部类型</option>
          <option value="city">🏙 城市</option><option value="nature">🏔 自然</option>
          <option value="coast">🏖 海岸</option><option value="cultural">🏛 人文</option>
          <option value="abroad">✈ 境外</option>
        </select>
        <input v-model="searchQ" placeholder="搜索地点…" class="mr-input" />
      </div>
      <div class="place-list" v-if="filteredPlaces.length">
        <div v-for="p in filteredPlaces" :key="p.id" class="place-card" :class="{ expanded: p._expanded, focused: p.id === focusedId }" @click="p._expanded = !p._expanded">
          <div class="place-card-header">
            <span class="place-icon">{{ typeIcon(p.type) }}</span>
            <div class="place-info">
              <span class="place-name">{{ p.name }}</span>
              <span class="place-city">{{ p.city }}{{ p.visitCount > 1 ? ` · ${p.visitCount}次` : '' }}{{ isLocated(p) ? ' · 📍' : '' }}</span>
            </div>
            <span class="place-date">{{ fmt(p.at) }}</span>
            <button class="mr-del" @click.stop="removePlace(p.id)">×</button>
          </div>
          <div v-if="p._expanded && p.note" class="place-detail"><p>{{ p.note }}</p></div>
        </div>
      </div>
      <div v-else class="empty-hint">还没有记录地点</div>
    </section>

    <!-- 人生节点时间线 -->
    <section data-enter class="mr-section">
      <h3 class="section-title">人生节点</h3>
      <div class="node-list" v-if="lifeNodes.length">
        <div v-for="n in lifeNodes" :key="n.id" class="node-card" :style="{ borderLeftColor: n.color }">
          <span class="node-year">{{ n.year }}</span>
          <div class="node-body">
            <strong>{{ n.text }}</strong>
            <p v-if="n.detail">{{ n.detail }}</p>
          </div>
          <button class="mr-del" @click.stop="removeNode(n.id)">×</button>
        </div>
        <div class="add-row" style="margin-top:8px">
          <input v-model="nodeForm.year" placeholder="年份" class="mr-input" style="width:60px" />
          <input v-model="nodeForm.text" placeholder="事件" class="mr-input" />
          <button @click="addNode" class="mr-btn" :disabled="!nodeForm.year || !nodeForm.text">+</button>
        </div>
      </div>
      <div v-else class="empty-hint">
        <p>标记人生中重要的迁居、远行或转折</p>
        <div class="add-row" style="margin-top:8px">
          <input v-model="nodeForm.year" placeholder="年份" class="mr-input" style="width:60px" />
          <input v-model="nodeForm.text" placeholder="事件" class="mr-input" />
          <button @click="addNode" class="mr-btn" :disabled="!nodeForm.year || !nodeForm.text">+</button>
        </div>
      </div>
    </section>

    <!-- 足迹志 -->
    <FootprintPanel />

    <!-- 观星指数 -->
    <ObservingPanel />

    <!-- 足迹分析 -->
    <TravelAnalyticsPanel :places="places" />

    <!-- 空间格局 -->
    <SpatialPatternPanel :places="places" />

    <!-- 环球投影 -->
    <GeoProjectionPanel :places="places" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useMap } from '../modules/map'
import type { Place } from '../modules/map'
import FootprintPanel from '../components/FootprintPanel.vue'
import ObservingPanel from '../components/ObservingPanel.vue'
import TravelAnalyticsPanel from '../components/TravelAnalyticsPanel.vue'
import SpatialPatternPanel from '../components/SpatialPatternPanel.vue'
import GeoProjectionPanel from '../components/GeoProjectionPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const { places, lifeNodes, load, save, loadNodes, saveNodes } = useMap()

// 内置城市经纬度（完全本地，无任何外部请求 / 瓦片 / SDK）
const CITY_COORDS: Record<string, { lng: number; lat: number }> = {
  '北京': { lng: 116.41, lat: 39.90 }, '上海': { lng: 121.47, lat: 31.23 }, '广州': { lng: 113.26, lat: 23.13 },
  '深圳': { lng: 114.06, lat: 22.54 }, '成都': { lng: 104.07, lat: 30.57 }, '杭州': { lng: 120.15, lat: 30.27 },
  '西安': { lng: 108.95, lat: 34.27 }, '重庆': { lng: 106.55, lat: 29.56 }, '武汉': { lng: 114.30, lat: 30.59 },
  '南京': { lng: 118.80, lat: 32.06 }, '天津': { lng: 117.20, lat: 39.13 }, '苏州': { lng: 120.62, lat: 31.32 },
  '厦门': { lng: 118.09, lat: 24.48 }, '昆明': { lng: 102.83, lat: 24.88 }, '哈尔滨': { lng: 126.53, lat: 45.80 },
  '拉萨': { lng: 91.14, lat: 29.65 }, '乌鲁木齐': { lng: 87.62, lat: 43.82 }, '香港': { lng: 114.17, lat: 22.32 },
  '台北': { lng: 121.56, lat: 25.03 }, '青岛': { lng: 120.38, lat: 36.07 }, '大连': { lng: 121.62, lat: 38.91 },
  '长沙': { lng: 112.94, lat: 28.23 },
  '东京': { lng: 139.69, lat: 35.69 }, '首尔': { lng: 126.98, lat: 37.57 }, '新加坡': { lng: 103.82, lat: 1.35 },
  '曼谷': { lng: 100.50, lat: 13.76 }, '巴黎': { lng: 2.35, lat: 48.86 }, '伦敦': { lng: -0.13, lat: 51.51 },
  '纽约': { lng: -74.01, lat: 40.71 }, '洛杉矶': { lng: -118.24, lat: 34.05 }, '旧金山': { lng: -122.42, lat: 37.77 },
  '悉尼': { lng: 151.21, lat: -33.87 }, '柏林': { lng: 13.40, lat: 52.52 }, '罗马': { lng: 12.50, lat: 41.90 },
  '迪拜': { lng: 55.27, lat: 25.20 }, '开普敦': { lng: 18.42, lat: -33.92 }, '里约': { lng: -43.17, lat: -22.91 },
  '莫斯科': { lng: 37.62, lat: 55.75 }, '多伦多': { lng: -79.38, lat: 43.65 }, '温哥华': { lng: -123.12, lat: 49.28 },
  '开罗': { lng: 31.24, lat: 30.04 },
}
const cityNames = Object.keys(CITY_COORDS)

interface MapForm { name: string; city: string; type: string; note: string; lng: number | null; lat: number | null }
const form = reactive<MapForm>({ name: '', city: '', type: 'city', note: '', lng: null, lat: null })
const nodeForm = reactive({ year: '', text: '', detail: '' })
const typeFilter = ref('')
const searchQ = ref('')
const focusedId = ref('')

const typeIcons: Record<string, string> = { city: '🏙', nature: '🏔', coast: '🏖', cultural: '🏛', abroad: '✈' }
function typeIcon(t: string) { return typeIcons[t] || '📍' }
const typeColors: Record<string, string> = { city: '#6b9fc4', nature: '#5ab8a0', coast: '#6b9fc4', cultural: '#d4a574', abroad: '#a07c8c' }
function typeColor(t: string) { return typeColors[t] || '#c4956a' }

const uniqueCities = computed(() => new Set(places.value.map(p => p.city).filter(Boolean)).size)
const totalVisits = computed(() => places.value.reduce((s, p) => s + p.visitCount, 0))
const locatedCount = computed(() => places.value.filter(p => isFinite(p.lng ?? NaN) && isFinite(p.lat ?? NaN)).length)
const plotted = computed(() => places.value.filter(p => isFinite(p.lng ?? NaN) && isFinite(p.lat ?? NaN)))

const topCities = computed(() => {
  const map = new Map<string, number>()
  places.value.forEach(p => {
    const c = p.city || p.name
    map.set(c, (map.get(c) || 0) + p.visitCount)
  })
  const max = Math.max(...map.values(), 1)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count, pct: count / max, color: pickColor(name) }))
})

function pickColor(s: string) {
  const colors = ['#d4a574', '#5ab8a0', '#6b9fc4', '#f0c040', '#a07c8c', '#c4956a', '#e8c8a8', '#7a9a8a']
  const hash = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const filteredPlaces = computed(() => {
  return places.value.filter(p => {
    if (typeFilter.value && p.type !== typeFilter.value) return false
    if (searchQ.value && !p.name.includes(searchQ.value) && !p.city.includes(searchQ.value)) return false
    return true
  })
})

// ---- 本地坐标星图 ----
function isFiniteCoord(v: number | undefined): v is number { return typeof v === 'number' && isFinite(v) }
function isLocated(p: Place) { return isFiniteCoord(p.lng) && isFiniteCoord(p.lat) }
function projX(lng: number) { return lng + 180 }
function projY(lat: number) { return 90 - lat }
function ptX(p: Place) { return projX(p.lng as number) }
function ptY(p: Place) { return projY(p.lat as number) }

const lngLines = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
const latLines = [0, 30, 60, 90, 120, 150, 180]
const journeyPoints = computed(() =>
  plotted.value.slice().sort((a, b) => a.at.localeCompare(b.at))
    .map(p => `${projX(p.lng as number)} ${projY(p.lat as number)}`).join(' '),
)

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  if (s === '') return undefined
  const n = Number(s)
  return isFinite(n) ? n : undefined
}

function addPlace() {
  if (!form.name.trim()) return
  const city = form.city.trim()
  const known = CITY_COORDS[city]
  const lng = toNum(form.lng) ?? known?.lng
  const lat = toNum(form.lat) ?? known?.lat
  const place: Place = {
    id: `pl${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    name: form.name.trim(),
    city,
    type: form.type,
    note: form.note.trim(),
    visitCount: 1,
    at: new Date().toISOString(),
    _expanded: false,
  }
  if (isFiniteCoord(lng)) place.lng = lng
  if (isFiniteCoord(lat)) place.lat = lat
  places.value.unshift(place)
  save()
  form.name = ''; form.city = ''; form.type = 'city'; form.note = ''; form.lng = null; form.lat = null
}

function removePlace(id: string) { places.value = places.value.filter(p => p.id !== id); save() }

function focusPlace(id: string) {
  focusedId.value = id
  const p = places.value.find(x => x.id === id)
  if (p) p._expanded = true
}

function addNode() {
  if (!nodeForm.year.trim() || !nodeForm.text.trim()) return
  lifeNodes.value.unshift({
    id: `ln${Date.now()}`,
    year: nodeForm.year.trim(),
    text: nodeForm.text.trim(),
    detail: nodeForm.detail.trim(),
    color: pickColor(nodeForm.text),
    at: new Date().toISOString(),
  })
  saveNodes()
  nodeForm.year = ''; nodeForm.text = ''; nodeForm.detail = ''
}

function removeNode(id: string) { lifeNodes.value = lifeNodes.value.filter(n => n.id !== id); saveNodes() }

function fmt(iso: string) {
  const d = new Date(iso); const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => { load(); loadNodes() })
</script>

<style scoped>
/* ============================================================
   容器 & 氛围
   ============================================================ */
.mr {
  max-width: 560px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
.mr-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.mr-glow-left {
  position: absolute;
  top: 0;
  left: -5%;
  width: 35%;
  height: 55%;
  background: radial-gradient(ellipse at 30% 20%, rgba(var(--accent-rgb), 0.04), transparent 60%);
}
.mr-glow-right {
  position: absolute;
  bottom: 0;
  right: -5%;
  width: 40%;
  height: 45%;
  background: radial-gradient(ellipse at 70% 80%, rgba(90, 184, 160, 0.03), transparent 60%);
}

/* ============================================================
   头部
   ============================================================ */
.mr-header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 4px;
}
.orn-line {
  display: block;
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}
.orn-diamond {
  font-size: 8px;
  color: var(--accent);
  opacity: 0.35;
}
.mr-kicker {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-low);
}
.mr-title {
  font-size: 30px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--text-high);
  font-family: var(--font-heading-zh);
  margin: 0;
}
.mr-overview {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.ov-card {
  padding: 14px 12px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  transition: all 0.25s ease;
}
.ov-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.ov-label {
  font-size: 10px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}
.ov-value {
  font-size: 22px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}

/* ============================================================
   Sections
   ============================================================ */
.mr-section {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}
.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-dim);
  margin: 0 0 12px;
  letter-spacing: 0.5px;
}

/* ---- 本地坐标星图 ---- */
.map-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: linear-gradient(180deg, rgba(var(--bg-deep), 0.6), rgba(var(--bg-deepest), 0.6));
}
.mr-map {
  width: 100%;
  display: block;
  aspect-ratio: 2 / 1;
}
.map-bg { fill: rgba(var(--accent-rgb), 0.02); }
.graticule line { stroke: rgba(var(--text-primary-rgb), 0.08); stroke-width: 0.3; }
.graticule line.eq { stroke: rgba(var(--accent-rgb), 0.28); stroke-width: 0.5; }
.map-journey { fill: none; stroke: rgba(var(--accent-rgb), 0.4); stroke-width: 0.6; stroke-dasharray: 2 2; }
.map-point circle {
  stroke: rgba(0, 0, 0, 0.3);
  stroke-width: 0.3;
  cursor: pointer;
  transition: r 0.2s ease;
}
.map-point circle.focused { stroke: #fff; stroke-width: 0.9; }
.map-hint {
  font-size: 11px;
  color: var(--text-faint);
  text-align: center;
  margin: 8px 0 0;
}

/* ---- 热力图 ---- */
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}
.heat-cell {
  padding: 14px 8px;
  border-radius: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s;
}
.heat-cell:hover {
  transform: scale(1.05);
}
.heat-city {
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}
.heat-count {
  font-size: 10px;
  opacity: 0.5;
  color: rgba(var(--text-primary-rgb), 0.6);
}

/* ---- 输入 ---- */
.add-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.mr-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  min-width: 60px;
  transition: border-color 0.2s;
}
.mr-input.mr-coord { flex: 0 0 72px; min-width: 72px; }
.mr-input:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.mr-input::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}
.mr-select {
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 8px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.65);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.mr-select:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.mr-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.mr-btn:hover {
  background: rgba(var(--accent-rgb), 0.14);
}
.mr-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* ---- 筛选 ---- */
.filter-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

/* ---- 地点列表 ---- */
.place-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.place-card {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  transition: all 0.2s;
}
.place-card:hover {
  background: rgba(55, 48, 40, 0.45);
}
.place-card.focused {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.06);
}
.place-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.place-icon {
  font-size: 16px;
}
.place-info {
  flex: 1;
}
.place-name {
  font-size: 13px;
  font-weight: 500;
  display: block;
  color: rgba(var(--text-primary-rgb), 0.85);
}
.place-city {
  font-size: 11px;
  opacity: 0.4;
  color: var(--text-dim);
}
.place-date {
  font-size: 11px;
  color: var(--text-faint);
}
.place-detail {
  margin-top: 4px;
  padding-left: 26px;
}
.place-detail p {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--text-primary-rgb), 0.45);
  margin: 0;
}

/* ---- 删除按钮 ---- */
.mr-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.place-card:hover .mr-del,
.node-card:hover .mr-del {
  opacity: 0.5;
}
.mr-del:hover {
  color: #e06b6b;
  opacity: 1 !important;
}

/* ---- 人生节点 ---- */
.node-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.node-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  border-left: 3px solid;
  transition: all 0.2s;
}
.node-card:hover {
  background: rgba(55, 48, 40, 0.45);
}
.node-year {
  font-size: 11px;
  color: var(--text-low);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
}
.node-body {
  flex: 1;
}
.node-body strong {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.8);
  font-weight: 500;
}
.node-body p {
  font-size: 11px;
  color: var(--text-low);
  margin: 2px 0 0;
}

/* ---- 空状态 ---- */
.empty-hint {
  font-size: 12px;
  color: var(--text-faint);
  text-align: center;
  padding: 20px 0;
  line-height: 1.8;
}
.empty-hint p {
  margin: 0;
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 860px) {
  .mr { padding: 24px 16px 72px; }
  .mr-title { font-size: 26px; }
  .mr-overview { grid-template-columns: repeat(4, 1fr); }
  .heatmap-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 480px) {
  .mr-overview { grid-template-columns: repeat(2, 1fr); }
  .heatmap-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
