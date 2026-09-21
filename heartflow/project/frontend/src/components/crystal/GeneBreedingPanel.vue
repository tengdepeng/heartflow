<template>
  <section class="cgb">
    <!-- 标题 -->
    <header class="cgb-header">
      <h3 class="cgb-title">
        <svg class="cgb-title-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2a5 5 0 0 1 5 5c0 1.4-.6 2.7-1.5 3.6L12 14l-3.5-3.4A5 5 0 0 1 12 2z" />
          <path d="M12 12l6 6M12 14l4 4M12 16l-5 3" />
        </svg>
        基因育种工坊
      </h3>
      <p class="cgb-sub">{{ breedingCount }} 株 · 最高第 {{ maxGeneration }} 代 · 基因可杂交繁衍变异</p>
    </header>

    <!-- 操作行 -->
    <div class="cgb-actions">
      <button class="cgb-create" type="button" data-testid="cgb-create-initial" @click="createInitial">
        ✦ 培育初始种子
      </button>
      <button
        class="cgb-breed"
        type="button"
        data-testid="cgb-breed"
        :disabled="!selected"
        @click="breedFromSelected"
      >
        {{ selected ? `杂交育种 · ${geneShapeLabel(selected.genes.shape)}` : '选择亲本后育种' }}
      </button>
      <button class="cgb-reset" type="button" data-testid="cgb-reset" @click="resetCollection">清空</button>
    </div>

    <!-- 族谱展示 -->
    <div class="cgb-genes">
      <p v-if="!breeding.length" class="cgb-empty">尚无种苗。点击「培育初始种子」开始基因育种。</p>

      <div v-for="(b, i) in breeding" :key="i" class="cgb-gene" :class="{ 'cgb-gene--selected': selectedIdx === i }">
        <!-- 可视化：结晶球 -->
        <button
          class="cgb-gene-vis"
          type="button"
          :data-testid="'cgb-select-' + i"
          :style="visStyle(b)"
          @click="select(b, i)"
          :title="'点击作为亲本育种'"
        >
          <span class="cgb-gene-icon">{{ shapeIcon(b.seed.genes.shape) }}</span>
        </button>

        <!-- 基因信息 -->
        <div class="cgb-gene-info">
          <span class="cgb-gene-name">{{ geneShapeLabel(b.seed.genes.shape) }}</span>
          <span class="cgb-chip">第 {{ b.seed.generation }} 代</span>
          <span class="cgb-chip cgb-chip--color" :style="{ background: b.seed.genes.color, borderColor: b.seed.genes.color }"></span>
        </div>

        <div class="cgb-gene-traits">
          <span class="cgb-trait-label">强度</span>
          <div class="cgb-trait-bar"><span class="cgb-trait-fill" :style="{ width: (b.seed.genes.intensity * 100) + '%', background: b.seed.genes.color }"></span></div>
          <span class="cgb-trait-num">{{ pct(b.seed.genes.intensity) }}</span>
        </div>
        <div class="cgb-gene-traits">
          <span class="cgb-trait-label">发光</span>
          <div class="cgb-trait-bar"><span class="cgb-trait-fill" :style="{ width: (b.seed.genes.luminescence * 100) + '%', background: b.seed.genes.color }"></span></div>
          <span class="cgb-trait-num">{{ pct(b.seed.genes.luminescence) }}</span>
        </div>

        <div class="cgb-gene-meta">
          <span class="cgb-chip">显性 {{ Math.round(b.seed.dominance * 100) }}%</span>
          <span class="cgb-chip">突变 {{ Math.round(b.seed.mutationRate * 100) }}%</span>
          <span class="cgb-chip">复杂度 {{ b.seed.genes.complexity.toFixed(2) }}</span>
          <span class="cgb-chip">韧性 {{ pct(b.seed.genes.resilience) }}</span>
        </div>
      </div>

      <div v-if="breeding.length" class="cgb-lineage-note">
        <span class="cgb-lineage-icon">🧬</span>
        <span>第 1 代自初始种子杂交而来，逐代累积基因显性与突变。</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storage } from '../../engine/storage'
import {
  createInitialSeed,
  createChildSeed,
  geneToCrystalVisual,
} from '../../modules/crystal/gene-seed'
import type { GeneSeed } from '../../modules/crystal/gene-seed'

// ---- 育种档案（薄委托：面板持谱系 + storage 持久化，启发式由 gene-seed 引擎承担） ----

const BREEDING_KEY = 'hf:crystal_breeding'

interface BreedingEntry {
  seed: GeneSeed
  parentId: string | null
  createdAt: number
}

const breeding = ref<BreedingEntry[]>([])
const selectedIdx = ref<number | null>(null)

const selected = computed(() =>
  selectedIdx.value === null ? null : breeding.value[selectedIdx.value]?.seed ?? null,
)

const breedingCount = computed(() => breeding.value.length)
const maxGeneration = computed(() =>
  breeding.value.reduce((m, b) => Math.max(m, b.seed.generation), 0),
)

const SHAPE_ICONS: Record<GeneSeed['genes']['shape'], string> = {
  round: '◯',
  sharp: '◆',
  branch: '❋',
  cloud: '☁',
}
const SHAPE_LABELS: Record<GeneSeed['genes']['shape'], string> = {
  round: '圆润',
  sharp: '锋芒',
  branch: '枝生',
  cloud: '云凝',
}

function shapeIcon(shape: GeneSeed['genes']['shape']): string {
  return SHAPE_ICONS[shape] ?? '◯'
}
function geneShapeLabel(shape: GeneSeed['genes']['shape']): string {
  return SHAPE_LABELS[shape] ?? '圆润'
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

function visStyle(b: BreedingEntry): Record<string, string> {
  const v = geneToCrystalVisual(b.seed)
  return {
    background: b.seed.genes.color,
    boxShadow: `0 0 18px ${v.glowIntensity}`,
    borderRadius: b.seed.genes.shape === 'round' ? '50%' : '22%',
    opacity: String(0.65 + b.seed.genes.luminescence * 0.35),
  }
}

function persist() {
  storage.setKV(BREEDING_KEY, breeding.value)
}

function load() {
  const loaded = storage.getKV(BREEDING_KEY, []) as BreedingEntry[]
  breeding.value = Array.isArray(loaded)
    ? loaded.filter(e => e && e.seed && e.seed.genes)
    : []
}

function createInitial() {
  const seed = createInitialSeed()
  breeding.value.push({ seed, parentId: null, createdAt: Date.now() })
  selectedIdx.value = breeding.value.length - 1
  persist()
}

function breedFromSelected() {
  const s = selected.value
  if (!s) return
  const child = createChildSeed(s.genes, s.parentId ?? `seed_${s.generation}`, s.generation, s.mutationRate)
  breeding.value.push({ seed: child, parentId: s.parentId ?? `seed_${s.generation}`, createdAt: Date.now() })
  persist()
}

function select(_b: BreedingEntry, i: number) {
  selectedIdx.value = selectedIdx.value === i ? null : i
}

function resetCollection() {
  breeding.value = []
  selectedIdx.value = null
  storage.setKV(BREEDING_KEY, [])
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.cgb {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border-radius: 14px;
  background: var(--card-bg, rgba(32, 28, 24, 0.5));
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.cgb-header { display: flex; flex-direction: column; gap: 4px; }
.cgb-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: rgba(var(--accent-rgb), 0.85); margin: 0; }
.cgb-title-icon { opacity: 0.7; }
.cgb-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.35); margin: 0; }

.cgb-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.cgb-create, .cgb-breed, .cgb-reset {
  font-size: 12px; padding: 8px 14px; border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.cgb-create { background: rgba(var(--accent-rgb), 0.14); color: var(--accent); }
.cgb-create:hover { background: rgba(var(--accent-rgb), 0.22); }
.cgb-breed { background: transparent; color: rgba(var(--accent-rgb), 0.7); }
.cgb-breed:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.1); }
.cgb-breed:disabled { opacity: 0.4; cursor: not-allowed; }
.cgb-reset { background: transparent; color: rgba(var(--accent-rgb), 0.4); }
.cgb-reset:hover { background: rgba(var(--accent-rgb), 0.08); }

.cgb-genes { display: flex; flex-direction: column; gap: 10px; }
.cgb-empty { font-size: 12px; color: rgba(var(--accent-rgb), 0.35); text-align: center; padding: 20px 0; margin: 0; }

.cgb-gene {
  display: grid;
  grid-template-columns: 52px 1fr 1fr;
  grid-template-areas:
    "vis info info"
    "vis a b"
    "vis meta meta";
  gap: 4px 14px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  transition: all 0.2s;
}
.cgb-gene--selected { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.12); }

.cgb-gene-vis {
  grid-area: vis;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: none; cursor: pointer; font-size: 20px; color: rgba(255,255,255,0.9);
  transition: transform 0.2s;
}
.cgb-gene-vis:hover { transform: scale(1.08); }
.cgb-gene-icon { line-height: 1; }

.cgb-gene-info { grid-area: info; display: flex; align-items: center; gap: 8px; }
.cgb-gene-name { font-size: 13px; font-weight: 500; color: rgba(var(--accent-rgb), 0.8); }
.cgb-chip {
  font-size: 10px; padding: 2px 8px; border-radius: 20px;
  background: rgba(var(--accent-rgb), 0.1); color: rgba(var(--accent-rgb), 0.55);
}
.cgb-chip--color { width: 12px; height: 12px; padding: 0; border: 1px solid transparent; }

.cgb-gene-traits { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: center; }
.cgb-trait-label { font-size: 10px; color: rgba(var(--accent-rgb), 0.4); }
.cgb-trait-bar { height: 5px; border-radius: 3px; background: rgba(var(--accent-rgb), 0.08); overflow: hidden; }
.cgb-trait-fill { display: block; height: 100%; border-radius: 3px; }
.cgb-trait-num { font-size: 10px; color: rgba(var(--accent-rgb), 0.45); min-width: 30px; text-align: right; }

.cgb-gene-meta { grid-area: meta; display: flex; gap: 8px; flex-wrap: wrap; }

.cgb-lineage-note {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: rgba(var(--accent-rgb), 0.45);
  padding: 10px 12px; border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.2);
}
.cgb-lineage-icon { font-size: 14px; }

@media (max-width: 640px) {
  .cgb-gene { grid-template-columns: 44px 1fr; grid-template-areas: "vis info" "vis a" "vis b" "vis meta"; }
}
</style>