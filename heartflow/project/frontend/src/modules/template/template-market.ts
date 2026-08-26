// ============================================================
// 模板市场 · 顾问人设/语气数据层
// 为 TemplateMarket.vue 提供标准化的「顾问 persona / tone」存取接口，
// 替代视图内直接的
//   storage.setKV('hf:advisor_persona', ...)
//   storage.setKV('hf:advisor_tone', ...)
// 裸调用。
// 注意：仅下沉 persona / tone 两项；视图中 storage.getConfig() /
// setConfig() 仍保留在视图内。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

const PERSONA_KEY = 'hf:advisor_persona'
const TONE_KEY = 'hf:advisor_tone'

/** 顾问性格数据（persona + tone） */
export interface AdvisorPersonaProfile {
  persona: string
  tone: string
}

// 模块级单例：所有消费方共享同一份顾问配置
const persona = ref<string>('')
const tone = ref<string>('')

/**
 * 模板市场顾问配置数据层：读取 / 写入 persona / tone
 */
export function useTemplateMarket() {
  /** 从存储载入顾问 persona / tone */
  function load(): void {
    persona.value = storage.getKV<string>(PERSONA_KEY, '')
    tone.value = storage.getKV<string>(TONE_KEY, '')
  }

  /** 写入并持久化顾问 persona */
  function setPersona(value: string): void {
    persona.value = value
    storage.setKV(PERSONA_KEY, value)
  }

  /** 写入并持久化顾问 tone */
  function setTone(value: string): void {
    tone.value = value
    storage.setKV(TONE_KEY, value)
  }

  /**
   * 应用顾问模板数据：仅当 persona / tone 存在时才写入，
   * 与重构前 applyTemplate 中的条件 setKV 行为保持一致。
   */
  function applyAdvisor(advisorData: { persona?: string; tone?: string }): void {
    if (advisorData.persona) setPersona(advisorData.persona)
    if (advisorData.tone) setTone(advisorData.tone)
  }

  return { persona, tone, load, setPersona, setTone, applyAdvisor }
}
