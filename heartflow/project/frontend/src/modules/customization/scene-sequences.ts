// ============================================================
// 装修工坊 · 场景序列引擎（可持久化薄委托）
// 包装 environment-templates 的纯函数场景序列引擎，
// 持有状态并明文 JSON 落盘 hf:customization:sequences
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import {
  createSequence as engineCreateSequence,
  addStep as engineAddStep,
  removeStep as engineRemoveStep,
  reorderSteps as engineReorderSteps,
  advanceStep as engineAdvanceStep,
  getSequenceDuration,
  getCurrentStep,
  BUILTIN_SEQUENCES,
  BUILTIN_TEMPLATES,
} from './environment-templates'
import type { SceneSequence, SceneStep, SceneTrigger } from './environment-templates'

/** 场景序列存储键 */
export const SEQUENCE_STORAGE_KEY = 'hf:customization:sequences'

/** 过渡效果中文标签 */
export const TRANSITION_LABELS: Record<SceneStep['transition'], string> = {
  fade: '淡入淡出',
  'slide-left': '左滑',
  'slide-right': '右滑',
  'slide-up': '上滑',
  'slide-down': '下滑',
  zoom: '缩放',
  none: '无',
}

function deepClone<T>(list: T[]): T[] {
  return list.map(item => JSON.parse(JSON.stringify(item)))
}

/** 加载序列：空存储时以内置序列为初始数据（深拷贝，避免共享引用） */
function loadSequences(): SceneSequence[] {
  try {
    const raw = storage.getKV<string>(SEQUENCE_STORAGE_KEY, '[]')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : deepClone(BUILTIN_SEQUENCES)
  } catch {
    return deepClone(BUILTIN_SEQUENCES)
  }
}

export function useSceneSequences() {
  const sequences = ref<SceneSequence[]>(loadSequences())

  function persist() {
    storage.setKV(SEQUENCE_STORAGE_KEY, JSON.stringify(sequences.value))
  }

  function find(seqId: string): SceneSequence | null {
    return sequences.value.find(s => s.id === seqId) || null
  }

  /** 创建自定义序列 */
  function create(name: string, description: string = '', loop: boolean = false): SceneSequence | null {
    if (!name.trim()) return null
    const seq = engineCreateSequence(name.trim(), description, loop)
    sequences.value.push(seq)
    persist()
    return seq
  }

  /** 删除序列 */
  function remove(seqId: string): boolean {
    const idx = sequences.value.findIndex(s => s.id === seqId)
    if (idx === -1) return false
    sequences.value.splice(idx, 1)
    persist()
    return true
  }

  /** 切换启用/停用 */
  function toggleEnable(seqId: string): boolean {
    const seq = find(seqId)
    if (!seq) return false
    seq.enabled = !seq.enabled
    if (!seq.enabled) {
      seq.currentStepIndex = -1
      seq.playing = false
    }
    persist()
    return true
  }

  /** 切换循环 */
  function toggleLoop(seqId: string): boolean {
    const seq = find(seqId)
    if (!seq) return false
    seq.loop = !seq.loop
    persist()
    return true
  }

  /** 添加步骤 */
  function addStep(
    seqId: string,
    templateId: string,
    duration: number,
    transition: SceneStep['transition'] = 'fade',
    transitionDuration: number = 500,
    options: Partial<Pick<SceneStep, 'trigger' | 'label'>> = {},
  ): boolean {
    const seq = find(seqId)
    if (!seq || !templateId) return false
    const updated = engineAddStep(seq, templateId, Math.max(0, duration), transition, transitionDuration, options)
    replace(seqId, updated)
    persist()
    return true
  }

  /** 移除步骤 */
  function removeStep(seqId: string, stepId: string): boolean {
    const seq = find(seqId)
    if (!seq) return false
    replace(seqId, engineRemoveStep(seq, stepId))
    persist()
    return true
  }

  /** 重排步骤 */
  function reorder(seqId: string, from: number, to: number): boolean {
    const seq = find(seqId)
    if (!seq || from < 0 || to < 0 || from >= seq.steps.length || to >= seq.steps.length) return false
    replace(seqId, engineReorderSteps(seq, from, to))
    persist()
    return true
  }

  /** 前进到下一步 */
  function advance(seqId: string): boolean {
    const seq = find(seqId)
    if (!seq || seq.steps.length === 0) return false
    replace(seqId, engineAdvanceStep(seq))
    persist()
    return true
  }

  /** 重置播放位置 */
  function resetPlayback(seqId: string): boolean {
    const seq = find(seqId)
    if (!seq) return false
    seq.currentStepIndex = -1
    seq.playing = false
    persist()
    return true
  }

  function replace(seqId: string, updated: SceneSequence) {
    const idx = sequences.value.findIndex(s => s.id === seqId)
    if (idx !== -1) sequences.value[idx] = updated
  }

  /** 模板查找 */
  function templateById(templateId: string) {
    return BUILTIN_TEMPLATES.find(t => t.id === templateId) || null
  }

  /** 步骤关联模板名 */
  function stepTemplateName(step: SceneStep): string {
    return templateById(step.templateId)?.name || step.templateId
  }

  /** 序列总时长（毫秒） */
  function durationOf(seqId: string): number {
    const seq = find(seqId)
    return seq ? getSequenceDuration(seq) : 0
  }

  /** 当前步骤 */
  function currentStepOf(seqId: string): SceneStep | null {
    const seq = find(seqId)
    return seq ? getCurrentStep(seq) : null
  }

  const totalSteps = computed(() => sequences.value.reduce((sum, s) => sum + s.steps.length, 0))

  return {
    sequences,
    totalSteps,
    BUILTIN_TEMPLATES,
    TRANSITION_LABELS,
    create,
    remove,
    toggleEnable,
    toggleLoop,
    addStep,
    removeStep,
    reorder,
    advance,
    resetPlayback,
    templateById,
    stepTemplateName,
    durationOf,
    currentStepOf,
    getSequenceDuration,
  }
}

export type { SceneSequence, SceneStep, SceneTrigger }