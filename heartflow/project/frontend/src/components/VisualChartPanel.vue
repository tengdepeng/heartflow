<template>
  <section class="vcp" data-testid="vcp" aria-label="可视化·图表渲染">
    <header class="vcp-head">
      <div class="vcp-head-text">
        <h3 class="vcp-title">图表渲染</h3>
        <p class="vcp-sub">用现今数据的真切形状，把七维星场再译成折线、柱条与环影</p>
      </div>
      <span class="vcp-tag">svg 图表管线</span>
    </header>

    <!-- 空态 -->
    <p v-if="isEmpty" class="vcp-empty" data-testid="vcp-empty">
      尚无该主题的数据。先接入数据源或在心流里留下记录，图表将在画布上显影。
    </p>

    <template v-else>
      <!-- 控制条 -->
      <div class="vcp-bar">
        <label class="vcp-ctl">
          <span class="vcp-ctl-label">数值字段</span>
          <select v-model="field" class="vcp-select" data-testid="vcp-field">
            <option v-for="f in fields" :key="f" :value="f">{{ fieldLabel(f) }}</option>
          </select>
        </label>

        <div class="vcp-ctl">
          <span class="vcp-ctl-label">图型</span>
          <div class="vcp-chips" data-testid="vcp-charttype">
            <button
              v-for="t in chartTypes" :key="t.key"
              class="vcp-chip" :class="{ 'is-active': chartType === t.key }"
              type="button" @click="chartType = t.key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div v-if="chartType === 'line'" class="vcp-ctl">
          <span class="vcp-ctl-label">曲线</span>
          <div class="vcp-chips" data-testid="vcp-interp">
            <button
              v-for="m in interpModes" :key="m.key"
              class="vcp-chip" :class="{ 'is-active': interp === m.key }"
              type="button" @click="interp = m.key"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <label class="vcp-ctl vcp-ctl--auto">
          <input v-model="fit" type="checkbox" class="vcp-check" data-testid="vcp-fit" />
          <span class="vcp-ctl-label">边界适配</span>
        </label>
      </div>

      <!-- 数据边界 -->
      <p class="vcp-bbox" data-testid="vcp-bbox">
        {{ bboxLabel }}
      </p>

      <!-- SVG 图表 -->
      <div class="vcp-canvas" v-html="svgMarkup" data-testid="vcp-svg"></div>

      <!-- 图例说明 -->
      <p class="vcp-note" data-testid="vcp-note">{{ note }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SevenDimensionDataItem } from '../modules/visualization/dimension-mapping/seven-dimensions'
import {
  getInterpolator,
  mapDataToPlot,
  generateGridLines,
  generateAxisPaths,
  renderAxisAsString,
  generateBarRects,
  generateRingSectors,
  generateArcPath,
  generateAreaPath,
  generateLegend,
  getPointsBBox,
} from '../modules/visualization/svg'

const props = defineProps<{ items: SevenDimensionDataItem[] }>()

// ---- 温暖调色板（与工坊星金同源） ----
const PALETTE = ['#d4a574', '#e87030', '#80b8d0', '#8a9a7a', '#f0c040', '#c46a5a', '#9080b8', '#5ab8a0']

type ChartType = 'line' | 'bar' | 'donut'
type InterpKey = 'catmull-rom' | 'linear' | 'step-before'

const chartTypes: { key: ChartType; label: string }[] = [
  { key: 'line', label: '折线' },
  { key: 'bar', label: '柱条' },
  { key: 'donut', label: '环影' },
]
const interpModes: { key: InterpKey; label: string }[] = [
  { key: 'catmull-rom', label: '平滑' },
  { key: 'linear', label: '线性' },
  { key: 'step-before', label: '阶梯' },
]

const chartType = ref<ChartType>('line')
const interp = ref<InterpKey>('catmull-rom')
const fit = ref(true)

// ---- 可用数值字段 ----
const fields = computed<string[]>(() => {
  const set = new Set<string>()
  for (const it of props.items) for (const k of Object.keys(it.values)) set.add(k)
  return [...set]
})
const field = ref<string>('')

// 默认取 fields 第一个；items 变化（换主题）时同步
function syncField(): void {
  if (!fields.value.includes(field.value)) field.value = fields.value[0] ?? ''
}
syncField()

const isEmpty = computed(() => props.items.length === 0 || fields.value.length === 0)

function fieldLabel(f: string): string {
  return { elapsedMin: '专注分钟', plannedMin: '计划分钟', focusRatio: '专注达成', weight: '情绪强度', driftCount: '漂移次数', tagCount: '标签数', titleLen: '标题长度' }[f] ?? f
}

const SIZE = { width: 640, height: 320, padding: { top: 28, right: 26, bottom: 48, left: 62 } }
const pad = SIZE.padding
const plotW = SIZE.width - pad.left - pad.right
const plotH = SIZE.height - pad.top - pad.bottom

// ---- 数值序列（DataPoint） ----
const series = computed(() => {
  if (isEmpty.value) return []
  return props.items.map((it, i) => ({
    x: i,
    y: it.values[field.value] ?? 0,
    label: it.label ?? `#${i + 1}`,
    value: it.values[field.value] ?? 0,
    color: PALETTE[i % PALETTE.length],
  }))
})

function yDomain(pts: { value: number }[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const p of pts) {
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  if (!isFinite(min)) return [0, 1]
  min = Math.min(min, 0)
  if (max === min) max = min + 1
  return [min, max]
}

// ---- 边界适配：Y 轴值域（关闭=零基准铺满高度；开启=贴合数据值域） ----
function dataDomain(pts: { value: number }[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const p of pts) {
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  if (!isFinite(min)) return [0, 1]
  if (max === min) return [min - 0.5, max + 0.5]
  return [min, max]
}

const bboxLabel = computed(() => {
  if (isEmpty.value) return ''
  const pts = series.value.map((p) => ({ x: p.x, y: p.value }))
  const b = getPointsBBox(pts)
  return `数据边界：x ${b.minX.toFixed(0)}–${b.maxX.toFixed(0)} · y ${b.minY.toFixed(1)}–${b.maxY.toFixed(1)}`
})

// ---- 图例 ----
/** generateLegend 产出的是 SVG 片段，须包进 <svg> 才能渲染出色块与文字 */
function wrapLegend(inner: string, itemCount: number, itemWidth: number, itemGap: number): string {
  const totalW = itemCount * itemWidth + Math.max(0, itemCount - 1) * itemGap
  return `<svg class="vcp-legend" viewBox="0 0 ${totalW} 18" role="img" aria-label="图例">${inner}</svg>`
}

function legendBlock(): string {
  if (chartType.value === 'donut') return donutLegend()
  const items = [{ label: fieldLabel(field.value), color: PALETTE[0], shape: chartType.value === 'line' ? 'line' as const : 'rect' as const }]
  return wrapLegend(
    generateLegend(items, { show: true, position: 'bottom', itemWidth: 180, itemGap: 24 }),
    1, 180, 24,
  )
}

// ---- 折线 / 柱条 ----
/** 刻度档数随数据点自适应（2–6 档）：点数少于刻度上限时逐点标注，避免序号重复 */
function tickCountFor(n: number): number {
  return Math.max(2, Math.min(6, n))
}

/** 刻度：复用 generateAxisPaths 生成刻度短线，Y 轴标真实数值、X 轴标记录序号 */
function buildTicks(pts: { value: number }[], minV: number, maxV: number, tickCount: number): string {
  const n = pts.length
  const { xTicks, yTicks } = generateAxisPaths(SIZE, { show: true, tickCount })
  const yRange = maxV - minV || 1
  const dec = yRange >= 10 ? 0 : 1
  // generateAxisPaths 返回的是路径数据字符串，须包进 <path> 才会渲染成刻度短线
  let out = `<path class="vcp-tick" d="${[...xTicks, ...yTicks].join(' ')}" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="1" />`
  for (let i = 0; i < tickCount; i++) {
    const t = i / (tickCount - 1)
    const y = pad.top + plotH - t * plotH
    out += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" opacity="0.6" fill="currentColor">${(minV + t * yRange).toFixed(dec)}</text>`
  }
  if (n >= 2) {
    for (let i = 0; i < tickCount; i++) {
      const t = i / (tickCount - 1)
      const x = pad.left + t * plotW
      out += `<text x="${x}" y="${pad.top + plotH + 18}" text-anchor="middle" font-size="10" opacity="0.5" fill="currentColor">${Math.round(t * (n - 1))}</text>`
    }
  }
  return out
}

function buildCartesianSvg(): string {
  const pts = series.value
  // 边界适配：X 始终铺满宽度；Y 关闭时以零为基准，开启时贴合数据值域
  const domain = fit.value ? dataDomain(pts) : yDomain(pts)
  const [minV, maxV] = domain
  const mapped = mapDataToPlot(pts, SIZE, domain)
  const tickCount = tickCountFor(pts.length)
  const grid = generateGridLines(SIZE, tickCount).join('')
  const ticks = buildTicks(pts, minV, maxV, tickCount)
  const axis = renderAxisAsString(
    SIZE,
    { show: true, tickCount, grid: { show: false }, label: fieldLabel(field.value) },
    fieldLabel(field.value),
    '数值',
  )
  let body = ''
  if (chartType.value === 'line') {
    const interpFn = getInterpolator(interp.value)
    const baseY = pad.top + plotH
    const path = interpFn(mapped)
    body += `<path d="${path}" fill="none" stroke="${PALETTE[0]}" stroke-width="2.2" stroke-linecap="round" />`
    body += `<path d="${generateAreaPath(mapped, baseY, interpFn)}" fill="${PALETTE[0]}" fill-opacity="0.10" />`
    body += mapped.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${PALETTE[0]}" />`).join('')
  } else {
    const n = pts.length || 1
    const barW = (plotW / n) * 0.62
    const range = maxV - minV || 1
    const bars = pts.map((p, i) => {
      const x = pad.left + (i / n) * plotW + (plotW / n - barW) / 2
      const h = Math.max(1, ((p.value - minV) / range) * plotH)
      return { x, y: pad.top + plotH - h, width: barW, height: h, color: p.color, radius: 2 }
    })
    body += generateBarRects(bars)
  }
  return `${legendBlock()}<svg viewBox="0 0 ${SIZE.width} ${SIZE.height}" role="img" aria-label="${chartType.value === 'line' ? '折线图' : '柱状图'}">${grid}${ticks}${axis}${body}</svg>`
}

// ---- 环影（按类别字段归组汇总） ----
function catField(): string {
  const first = props.items[0]
  const keys = first ? Object.keys(first.categories ?? {}) : []
  return keys[0] ?? 'type'
}

function donutSegments(): { key: string; value: number; color: string }[] {
  const key = catField()
  const map = new Map<string, number>()
  for (const it of props.items) {
    const k = (it.categories && it.categories[key]) || '未分组'
    const v = it.values[field.value] ?? 0
    map.set(k, (map.get(k) ?? 0) + v)
  }
  return [...map.entries()].map(([k, value], i) => ({ key: k, value, color: PALETTE[i % PALETTE.length] }))
}

function buildDonutSvg(): string {
  const segs = donutSegments()
  const total = segs.reduce((s, g) => s + g.value, 0) || 1
  const cx = SIZE.width / 2
  const cy = SIZE.height / 2 + 10
  const innerR = 58
  const outerR = 96
  const sectors = generateRingSectors(segs.map((g) => ({ value: g.value, color: g.color })), cx, cy, innerR, outerR, 1.2)
  const arcs = sectors.map((s) => `<path d="${s.path}" fill="${s.color}" stroke="#171310" stroke-width="2" />`).join('')
  const outline = `<path d="${generateArcPath(cx, cy, innerR - 3, outerR + 3, 0, 360)}" fill="none" stroke="${PALETTE[0]}" stroke-opacity="0.25" stroke-width="1" />`
  const center = `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="26" font-weight="600" fill="currentColor">${Math.round(total)}</text>`
  const centerSub = `<text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.55">${fieldLabel(field.value)}</text>`
  return `${legendBlock()}<svg viewBox="0 0 ${SIZE.width} ${SIZE.height}" role="img" aria-label="环状图">${outline}${arcs}${center}${centerSub}</svg>`
}

function donutLegend(): string {
  const segs = donutSegments()
  return wrapLegend(
    generateLegend(
      segs.map((g) => ({ label: g.key, color: g.color })),
      { show: true, position: 'bottom', itemWidth: 140, itemGap: 18 },
    ),
    segs.length, 140, 18,
  )
}

const svgMarkup = computed(() => {
  if (isEmpty.value) return ''
  if (chartType.value === 'donut') return buildDonutSvg()
  return buildCartesianSvg()
})

const note = computed(() => {
  const n = props.items.length
  return `基于 ${n} 条记录 · 字段「${fieldLabel(field.value)}」 · ${chartTypes.find((c) => c.key === chartType.value)?.label}${chartType.value === 'line' ? ' · ' + interpModes.find((m) => m.key === interp.value)?.label : ''}${fit.value ? ' · 边界适配开' : ''}`
})
</script>

<style scoped>
.vcp {
  position: relative;
  margin: 20px 0;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.18));
  background: rgba(26, 22, 18, 0.45);
}

.vcp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.vcp-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
}

.vcp-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  max-width: 480px;
  line-height: 1.6;
}

.vcp-tag {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.3));
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 11px;
  white-space: nowrap;
}

.vcp-empty {
  margin: 6px 0 10px;
  font-size: 13px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.vcp-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
  margin-bottom: 10px;
}

.vcp-ctl {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vcp-ctl--auto {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding-bottom: 6px;
}

.vcp-ctl-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.vcp-select {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.25));
  background: rgba(15, 12, 10, 0.6);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
}

.vcp-chips {
  display: flex;
  gap: 6px;
}

.vcp-chip {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.22));
  background: rgba(212, 165, 116, 0.05);
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vcp-chip.is-active {
  background: rgba(212, 165, 116, 0.2);
  color: var(--text-primary, #e8e0d8);
  border-color: rgba(212, 165, 116, 0.5);
}

.vcp-check {
  accent-color: #d4a574;
}

.vcp-bbox {
  margin: 0 0 10px;
  font-size: 12px;
  font-family: ui-monospace, monospace;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}

.vcp-canvas :deep(svg) {
  display: block;
  width: 100%;
  max-width: 640px;
  height: auto;
  margin: 0 auto;
  border-radius: 10px;
  background: rgba(15, 12, 10, 0.5);
}

.vcp-canvas :deep(.vcp-legend) {
  width: auto;
  max-width: 100%;
  height: 18px;
  margin: 0 0 8px;
  border-radius: 0;
  background: none;
}

.vcp-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  text-align: right;
}
</style>