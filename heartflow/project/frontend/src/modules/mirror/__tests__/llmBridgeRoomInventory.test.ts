// ============================================================
// LLM 桥接层 · 系统提示房间资产注入测试（Item 4）
// 让镜我（LLM 路径）的系统提示词知晓自身院落资产
// ============================================================

import { describe, expect, it } from 'vitest'
import { useLLMBridge } from '../llm-bridge'

describe('LLM 系统提示 · 房间资产感知（Item 4）', () => {
  it('buildSystemPrompt 包含院落真实房间清单', () => {
    const bridge = useLLMBridge()
    const prompt = bridge.buildSystemPrompt()
    expect(prompt).toContain('你拥有的房间')
    expect(prompt).toContain('心流') // 主房间名
    expect(prompt).toContain('劳酬') // 记账空间名
  })
})
