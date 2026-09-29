<script setup lang="ts">
// ============================================================
// 数据视觉工坊 · 数据变换流水线（INCR-129）
// 薄委托面板：直接消费 modules/visualization/datasource-connector.ts
// 的 useTransformPipeline，把此前完全孤立的「变换管道」能力上图。
// ============================================================
import { ref, computed } from 'vue'
import {
  useTransformPipeline,
  type TransformOperation,
  type TransformStep,
  type FilterCondition,
} from '../modules/visualization/datasource-connector'

// ---- 内置演示数据集（本地心流记录样式）----
const DEMO_ROWS: Record<string, unknown>[] = [
  { date: '08-01', domain: '工作', duration: 120, score: 88, note: '深度阅读' },
  { date: '08-02', domain: '健康', duration: 45, score: 64, note: '晨跑' },
  { date: '08-03', domain: '成长', duration: 95, score: 92, note: '写作' },
  { date: '08-04', domain: '工作', duration: 70, score: 55, note: '例会' },
  { date: '08-05', domain: '逸趣', duration: 30, score: 76, note: '练琴' },
  { date: '08-06', domain: '成长', duration: 110, score: 81, note: '复盘' },
  { date: '08-07', domain: '健康', duration: 50, score: 58, note: '冥想' },
]

const DEMO_FIELDS = ['date', 'domain', 'duration', 'score', 'note']

// ---- 操作元信息 ----
const OP_LABELS: Record<TransformOperation, string> = {
  filter: '过滤',
  map: '映射',
  sort: '排序',
  aggregate: '聚合',
  group: '分组',
  paginate: '分页',
  project: '投影',
  join: '连接',
  limit: '截取',
  flatten: '展开',
}

const FILTER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'between'] as const
const AGG_FUNCS = ['sum', 'avg', 'min', 'max', 'count', 'distinct', 'median'] as const
const ADVANCED_OPS: TransformOperation[] = ['aggregate', 'group', 'paginate', 'join', 'flatten', 'map']

// ---- 引擎实例 ----
const pipeline = useTransformPipeline([
  { id: 'tpp_boot_filter', operation: 'filter', enabled: true, config: { field: 'score', operator: 'gte', value: 60 } as FilterCondition },
  { id: 'tpp_boot_sort', operation: 'sort', enabled: true, config: { field: 'score', direction: 'desc' } },
  { id: 'tpp_boot_limit', operation: 'limit', enabled: true, config: 5 },
] as TransformStep[])

// ---- 执行结果 ----
const resultRows = ref<Record<string, unknown>[]>([])
const executed = ref(false)
const inputCount = ref(0)

// ---- 增删步骤（实时）----
function run() {
  inputCount.value = DEMO_ROWS.length
  resultRows.value = pipeline.execute(DEMO_ROWS)
  executed.value = true
}

function removeStep(stepId: string) {
  pipeline.removeStep(stepId)
  if (executed.value) run()
}

function toggleStep(stepId: string) {
  pipeline.toggleStep(stepId)
  if (executed.value) run()
}

function clearPipeline() {
  pipeline.clear()
  resultRows.value = []
  executed.value = false
}

// ---- 快速添加：过滤 / 排序 / 截取 / 投影 / 自定义 ----
const quickMode = ref<TransformOperation | 'raw' | null>(null)

const filterField = ref('score')
const filterOp = ref<FilterCondition['operator']>('gte')
const filterValue = ref('60')
const filterValue2 = ref('')

const sortField = ref('score')
const sortDir = ref<'asc' | 'desc'>('desc')

const limitCount = ref(5)

const projectFields = ref('date,domain,duration,score')

const rawOp = ref<TransformOperation>('aggregate')
const rawField = ref('score')
const rawAggFunc = ref<(typeof AGG_FUNCS)[number]>('sum')
const rawJson = ref('')

function openQuick(mode: TransformOperation | 'raw') {
  quickMode.value = mode
}

function closeQuick() {
  quickMode.value = null
}

function addQuickStep() {
  if (quickMode.value === 'filter') {
    const num = Number(filterValue.value)
    pipeline.addStep('filter', {
      field: filterField.value,
      operator: filterOp.value,
      value: Number.isFinite(num) && filterValue.value.trim() !== '' ? num : filterValue.value,
      ...(filterOp.value === 'between' && filterValue2.value ? { value2: Number(filterValue2.value) } : {}),
    } as FilterCondition)
  } else if (quickMode.value === 'sort') {
    pipeline.addStep('sort', { field: sortField.value, direction: sortDir.value })
  } else if (quickMode.value === 'limit') {
    pipeline.addStep('limit', Math.max(1, Number(limitCount.value) || 1))
  } else if (quickMode.value === 'project') {
    const fields = projectFields.value.split(',').map(s => s.trim()).filter(Boolean)
    pipeline.addStep('project', { fields, exclude: false })
  } else if (quickMode.value === 'raw') {
    // 高级：聚合 / 分组 / 分页 / 连接 / 展开 / 映射
    if (rawOp.value === 'aggregate') {
      pipeline.addStep('aggregate', { field: rawField.value, function: rawAggFunc.value })
    } else if (rawOp.value === 'group') {
      pipeline.addStep('group', { fields: [rawField.value] })
    } else if (rawOp.value === 'paginate') {
      pipeline.addStep('paginate', { page: 1, pageSize: Number(rawJson.value) || 5 })
    } else if (rawOp.value === 'flatten') {
      pipeline.addStep('flatten', { field: rawField.value })
    } else if (rawOp.value === 'join') {
      pipeline.addStep('join', {
        rightData: [],
        leftField: rawField.value,
        rightField: rawField.value,
        type: 'inner',
      })
    } else if (rawOp.value === 'map') {
      pipeline.addStep('map', { [rawField.value]: rawJson.value ? Number(rawJson.value) : rawJson.value })
    }
  }
  closeQuick()
  if (executed.value) run()
}

// ---- 展示 ----
const opCount = computed(() => pipeline.stepCount.value)
const enabledCount = computed(() => pipeline.enabledStepCount.value)
const previewLimit = computed(() => Math.min(resultRows.value.length, 6))

function opLabel(op: TransformOperation): string {
  return OP_LABELS[op] || op
}

function stepSummary(step: TransformStep): string {
  switch (step.operation) {
    case 'filter': {
      const c = step.config as FilterCondition
      const v = Array.isArray(c.value) ? `[${(c.value as unknown[]).join(',')}]` : String(c.value)
      const range = c.operator === 'between' ? ` ${c.value2 ?? ''} ~ ${v}` : ` ${v}`
      return `当 ${c.field} ${c.operator}${range}`
    }
    case 'sort': {
      const c = step.config as { field: string; direction: string }
      return `按 ${c.field} ${c.direction === 'asc' ? '升序' : '降序'}`
    }
    case 'limit':
      return `仅保留前 ${Number(step.config)} 行`
    case 'project': {
      const c = step.config as { fields: string[]; exclude?: boolean }
      return c.exclude ? `排除 ${c.fields.join('、')}` : `保留 ${c.fields.join('、')}`
    }
    case 'aggregate': {
      const c = step.config as { field: string; function: string; alias?: string }
      return `${c.function}(${c.field})${c.alias ? ` → ${c.alias}` : ''}`
    }
    case 'group': {
      const c = step.config as { fields: string[] }
      return `按 ${c.fields.join('、')} 分组`
    }
    case 'paginate': {
      const c = step.config as { page: number; pageSize: number }
      return `第 ${c.page} 页 × ${c.pageSize}/页`
    }
    case 'join': {
      const c = step.config as { leftField: string; rightField: string; type: string }
      return `${c.type} 连接（${c.leftField}↔${c.rightField}）`
    }
    case 'flatten': {
      const c = step.config as { field: string }
      return `展开 ${c.field}`
    }
    case 'map': {
      const c = step.config as Record<string, unknown>
      return `映射 ${Object.keys(c).join('、')}`
    }
    default:
      return ''
  }
}

const resultTableColumns: string[] = ['date', 'domain', 'duration', 'score']
</script>

<template>
  <section class="tpp" aria-label="数据变换流水线">
    <header class="tpp-head">
      <h3 class="tpp-title">数据变换流水线</h3>
      <p class="tpp-sub">对原始心流数据逐级变换：过滤 · 排序 · 截取 · 投影，为视觉转译备好精炼数据集</p>
    </header>

    <!-- 统计条 -->
    <div class="tpp-stats">
      <span class="tpp-stat">步骤 <b>{{ opCount }}</b></span>
      <span class="tpp-stat">启用 <b>{{ enabledCount }}</b></span>
      <span v-if="executed" class="tpp-stat">输出 <b>{{ resultRows.length }}</b> 行</span>
    </div>

    <!-- 添加步骤 -->
    <div class="tpp-add">
      <button class="tpp-chip" type="button" @click="openQuick('filter')">＋ 过滤</button>
      <button class="tpp-chip" type="button" @click="openQuick('sort')">＋ 排序</button>
      <button class="tpp-chip" type="button" @click="openQuick('limit')">＋ 截取</button>
      <button class="tpp-chip" type="button" @click="openQuick('project')">＋ 投影</button>
      <button class="tpp-chip tpp-chip--raw" type="button" @click="openQuick('raw')">＋ 高级</button>
    </div>

    <!-- 内联添加表单 -->
    <form v-if="quickMode" class="tpp-form" @submit.prevent="addQuickStep">
      <template v-if="quickMode === 'filter'">
        <label>字段
          <select v-model="filterField">
            <option v-for="f in DEMO_FIELDS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <label>条件
          <select v-model="filterOp">
            <option v-for="o in FILTER_OPS" :key="o" :value="o">{{ o }}</option>
          </select>
        </label>
        <label>值<input v-model="filterValue" type="text" /></label>
        <label v-if="filterOp === 'between'" class="tpp-form-wide">上界<input v-model="filterValue2" type="text" /></label>
      </template>

      <template v-else-if="quickMode === 'sort'">
        <label>字段
          <select v-model="sortField">
            <option v-for="f in DEMO_FIELDS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <label>方向
          <select v-model="sortDir">
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </label>
      </template>

      <template v-else-if="quickMode === 'limit'">
        <label>保留前 <input v-model.number="limitCount" type="number" min="1" /> 行</label>
      </template>

      <template v-else-if="quickMode === 'project'">
        <label class="tpp-form-wide">保留字段（逗号分隔）<input v-model="projectFields" type="text" /></label>
      </template>

      <template v-else-if="quickMode === 'raw'">
        <label>操作
          <select v-model="rawOp">
            <option v-for="o in ADVANCED_OPS" :key="o" :value="o">{{ OP_LABELS[o] }}</option>
          </select>
        </label>
        <template v-if="rawOp === 'aggregate'">
          <label>字段
            <select v-model="rawField">
              <option v-for="f in DEMO_FIELDS" :key="f" :value="f">{{ f }}</option>
            </select>
          </label>
          <label>函数
            <select v-model="rawAggFunc">
              <option v-for="fn in AGG_FUNCS" :key="fn" :value="fn">{{ fn }}</option>
            </select>
          </label>
        </template>
        <template v-else-if="rawOp === 'group' || rawOp === 'flatten' || rawOp === 'join'">
          <label>{{ rawOp === 'group' ? '分组字段' : rawOp === 'flatten' ? '展开字段' : '联接字段' }}
            <select v-model="rawField">
              <option v-for="f in DEMO_FIELDS" :key="f" :value="f">{{ f }}</option>
            </select>
          </label>
        </template>
        <label v-else class="tpp-form-wide">数值 / 说明
          <input v-model="rawJson" type="text" placeholder="分页每页数 / 映射目标值" />
        </label>
      </template>

      <div class="tpp-form-actions">
        <button class="tpp-btn tpp-btn--primary" type="submit">添加</button>
        <button class="tpp-btn" type="button" @click="closeQuick">取消</button>
      </div>
    </form>

    <!-- 步骤清单 -->
    <ol v-if="pipeline.steps.value.length" class="tpp-steps">
      <li v-for="(step, idx) in pipeline.steps.value" :key="step.id" class="tpp-step" :class="{ 'is-off': !step.enabled }">
        <span class="tpp-step-idx">{{ idx + 1 }}</span>
        <span class="tpp-step-op">{{ opLabel(step.operation) }}</span>
        <span class="tpp-step-summary">{{ stepSummary(step) }}</span>
        <button class="tpp-step-toggle" type="button" :aria-label="step.enabled ? '停用' : '启用'" @click="toggleStep(step.id)">
          {{ step.enabled ? '启用' : '停用' }}
        </button>
        <button class="tpp-step-remove" type="button" aria-label="移除" @click="removeStep(step.id)">×</button>
      </li>
    </ol>
    <p v-else class="tpp-empty">管线为空——点上方按钮添加变换步骤。</p>

    <!-- 执行区 -->
    <div class="tpp-run">
      <button class="tpp-btn tpp-btn--primary" type="button" @click="run">执行变换</button>
      <button class="tpp-btn" type="button" @click="clearPipeline">清空管线</button>
      <span v-if="executed" class="tpp-run-hint">输入 {{ inputCount }} 行 → 输出 {{ resultRows.length }} 行</span>
    </div>

    <!-- 结果预览 -->
    <div v-if="executed && resultRows.length" class="tpp-result">
      <table class="tpp-table">
        <thead>
          <tr><th v-for="c in resultTableColumns" :key="c">{{ c }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in resultRows.slice(0, previewLimit)" :key="ri">
            <td v-for="c in resultTableColumns" :key="c">{{ row[c] }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="resultRows.length > previewLimit" class="tpp-more">… 共 {{ resultRows.length }} 行，仅预览前 {{ previewLimit }} 行</p>
    </div>
    <p v-else-if="executed" class="tpp-empty">执行后无数据——请调整或移除拦截步骤。</p>
  </section>
</template>

<style scoped>
.tpp {
  max-width: 720px;
  margin-top: 20px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border, rgba(212, 165, 116, 0.18));
  background: rgba(26, 22, 18, 0.45);
}
.tpp-head { margin-bottom: 12px; }
.tpp-title { font-size: 15px; font-weight: 600; color: var(--text-primary, #e8e0d8); margin: 0 0 4px; }
.tpp-sub { margin: 0; font-size: 12px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); line-height: 1.6; }

.tpp-stats { display: flex; gap: 16px; margin-bottom: 12px; font-size: 12px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
.tpp-stat b { color: var(--text-primary, #e8e0d8); }

.tpp-add { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.tpp-chip {
  padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border, rgba(212, 165, 116, 0.3));
  background: rgba(212, 165, 116, 0.08); color: var(--text-primary, #e8e0d8); font-size: 12px; cursor: pointer;
  transition: all 0.2s ease;
}
.tpp-chip:hover { background: rgba(212, 165, 116, 0.2); }
.tpp-chip--raw { border-style: dashed; }

.tpp-form {
  display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; margin-bottom: 10px;
  border-radius: 10px; background: rgba(15, 12, 10, 0.6); font-size: 12px;
}
.tpp-form label { display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
.tpp-form-wide { flex: 1 1 100%; }
.tpp-form select, .tpp-form input {
  border-radius: 8px; border: 1px solid var(--border, rgba(212, 165, 116, 0.25));
  background: rgba(15, 12, 10, 0.7); color: var(--text-primary, #e8e0d8); padding: 5px 8px; font-size: 12px;
}
.tpp-form-actions { display: flex; gap: 8px; align-items: flex-end; flex: 1 1 100%; }

.tpp-steps { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tpp-step {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px;
  border-radius: 10px; border: 1px solid var(--border, rgba(212, 165, 116, 0.2)); background: rgba(212, 165, 116, 0.05);
  font-size: 12px;
}
.tpp-step.is-off { opacity: 0.5; }
.tpp-step-idx {
  width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(212, 165, 116, 0.2); color: var(--text-primary, #e8e0d8); font-size: 11px; flex: none;
}
.tpp-step-op { font-weight: 600; color: var(--text-primary, #e8e0d8); flex: none; }
.tpp-step-summary { flex: 1; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpp-step-toggle { border: none; background: transparent; color: var(--accent, #d4a574); cursor: pointer; font-size: 12px; }
.tpp-step-remove { border: none; background: transparent; color: #c46a5a; cursor: pointer; font-size: 15px; line-height: 1; }
/* 三端细节 P2：移动端把过窄的步骤启用/移除钮抬到可点宽度（高度由全局 min-height:36 兜底） */
@media (max-width: 639px) {
  .tpp-step-toggle { min-width: 48px !important; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; }
  .tpp-step-remove { min-width: 36px !important; display: inline-flex; align-items: center; justify-content: center; }
}

.tpp-run { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.tpp-btn {
  padding: 6px 16px; border-radius: 10px; border: 1px solid var(--border, rgba(212, 165, 116, 0.3));
  background: rgba(212, 165, 116, 0.08); color: var(--text-primary, #e8e0d8); font-size: 12px; cursor: pointer;
  transition: all 0.2s ease;
}
.tpp-btn--primary { background: rgba(212, 165, 116, 0.22); border-color: rgba(212, 165, 116, 0.55); }
.tpp-btn:hover { background: rgba(212, 165, 116, 0.3); }
.tpp-run-hint { font-size: 12px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }

.tpp-result { border-radius: 10px; border: 1px solid var(--border, rgba(212, 165, 116, 0.15)); overflow: hidden; }
.tpp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.tpp-table th, .tpp-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border, rgba(212, 165, 116, 0.12)); }
.tpp-table th { color: var(--text-secondary, rgba(232, 224, 216, 0.55)); font-weight: 500; background: rgba(212, 165, 116, 0.05); }
.tpp-table td { color: var(--text-primary, #e8e0d8); }
.tpp-more { padding: 6px 10px; font-size: 11px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
.tpp-empty { margin: 8px 0 0; font-size: 12px; color: var(--text-secondary, rgba(232, 224, 216, 0.55)); }
</style>