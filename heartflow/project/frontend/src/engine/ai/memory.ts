// ============================================================
// 心流工坊 · 对话记忆管理
// P3: AI 引擎 — 滑动窗口上下文 + 摘要压缩
// ============================================================

import type { AIMessage, AIMemoryConfig, AIConversationSnapshot } from './types'
import { DEFAULT_MEMORY_CONFIG } from './types'
import { storage } from '../storage'
import { loadSchema } from '../storage/core'

/** KV 存储键前缀 */
const MEMORY_STORAGE_PREFIX = 'hf:ai_memory:'
const SUMMARY_STORAGE_PREFIX = 'hf:ai_summary:'

// ---- 内存缓存 ----

/** 对话缓存（内存级，加速热访问） */
const conversationCache = new Map<string, AIMessage[]>()

// ---- 关键函数 ----

/** 生成对话缓存的存储键 */
function memoryKey(conversationId: string): string {
  return `${MEMORY_STORAGE_PREFIX}${conversationId}`
}

/** 生成摘要缓存的存储键 */
function summaryKey(conversationId: string): string {
  return `${SUMMARY_STORAGE_PREFIX}${conversationId}`
}

/**
 * 生成对话 ID（基于幕僚 ID）
 */
export function makeConversationId(advisorId: string): string {
  return `advisor_${advisorId}`
}

/**
 * 获取对话消息列表
 * @param conversationId 对话 ID
 * @param memoryConfig 记忆配置（可选，默认使用配置）
 */
export function getConversationMessages(
  conversationId: string,
  memoryConfig?: AIMemoryConfig,
): AIMessage[] {
  // 先检查缓存
  const cached = conversationCache.get(conversationId)
  if (cached) return cached

  // 从 storage 加载
  const stored = storage.getKV<AIMessage[]>(memoryKey(conversationId), [])
  conversationCache.set(conversationId, stored)

  // 如果记忆已启用，应用滑动窗口裁剪
  const config = memoryConfig ?? DEFAULT_MEMORY_CONFIG
  return applySlidingWindow(conversationId, stored, config)
}

/**
 * 添加消息到对话记忆
 * @param conversationId 对话 ID
 * @param message 要添加的消息
 * @param memoryConfig 记忆配置（可选）
 */
export function addMessage(
  conversationId: string,
  message: AIMessage,
  memoryConfig?: AIMemoryConfig,
): void {
  const messages = getConversationMessages(conversationId, memoryConfig)
  messages.push({
    ...message,
    timestamp: message.timestamp ?? new Date().toISOString(),
  })

  // 更新缓存
  conversationCache.set(conversationId, messages)

  // 持久化
  storage.setKV(memoryKey(conversationId), messages)
}

/**
 * 添加系统提示词（始终放在最前面，或替换最后的系统提示词）
 * @param conversationId 对话 ID
 * @param systemPrompt 系统提示词内容
 */
export function setSystemPrompt(conversationId: string, systemPrompt: string): void {
  const messages = getConversationMessages(conversationId)
  // 移除旧的系统提示词
  const filtered = messages.filter(m => m.role !== 'system')
  // 在最前面插入新的系统提示词
  filtered.unshift({ role: 'system', content: systemPrompt })
  conversationCache.set(conversationId, filtered)
  storage.setKV(memoryKey(conversationId), filtered)
}

/**
 * 获取系统提示词
 */
export function getSystemPrompt(conversationId: string): string | null {
  const messages = getConversationMessages(conversationId)
  const systemMsg = messages.find(m => m.role === 'system')
  return systemMsg?.content ?? null
}

/**
 * 清除对话记忆
 * @param conversationId 对话 ID
 */
export function clearConversation(conversationId: string): void {
  conversationCache.delete(conversationId)
  storage.setKV(memoryKey(conversationId), [])
  storage.setKV(summaryKey(conversationId), '')
}

/**
 * 获取对话上下文快照
 */
export function getConversationSnapshot(conversationId: string): AIConversationSnapshot {
  const messages = getConversationMessages(conversationId)
  const rounds = messages.filter(m => m.role === 'user').length
  return {
    conversationId,
    advisorId: conversationId.replace('advisor_', ''),
    messages,
    updatedAt: new Date().toISOString(),
    totalRounds: rounds,
  }
}

/**
 * 获取对话摘要文本
 */
export function getConversationSummary(conversationId: string): string {
  return storage.getKV<string>(summaryKey(conversationId), '')
}

/**
 * 设置对话摘要文本
 */
export function setConversationSummary(conversationId: string, summary: string): void {
  storage.setKV(summaryKey(conversationId), summary)
}

/**
 * 获取幕僚最近的对话历史（用于构建上下文）
 * @param advisorId 幕僚 ID
 * @param maxRounds 最大轮数
 */
export function getRecentAdvisorConversation(
  advisorId: string,
  maxRounds?: number,
): AIMessage[] {
  const conversationId = makeConversationId(advisorId)
  const messages = getConversationMessages(conversationId)
  // 保留系统提示词 + 最近 N 轮对话
  const systemMsg = messages.filter(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')
  const limit = maxRounds ?? DEFAULT_MEMORY_CONFIG.maxRounds
  const recent = chatMessages.slice(-limit * 2) // *2 因为 user + assistant 为一轮
  return [...systemMsg, ...recent]
}

// ---- 滑动窗口管理 ----

/**
 * 应用滑动窗口裁剪
 * 保留系统提示词 + 最近 N 轮对话
 * 摘要启用时，将旧对话压缩为摘要
 */
function applySlidingWindow(
  _conversationId: string,
  messages: AIMessage[],
  config: AIMemoryConfig,
): AIMessage[] {
  if (messages.length === 0) return messages

  const systemMessages = messages.filter(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  // 计算总轮数（用户消息数）
  const totalRounds = chatMessages.filter(m => m.role === 'user').length

  // 如果轮数未超过阈值，无需裁剪
  if (totalRounds <= config.maxRounds) {
    return messages
  }

  // 需要裁剪
  if (config.enableSummarization && totalRounds >= config.summaryThreshold) {
    // 保留最近 N 轮完整对话
    const recentMessages = chatMessages.slice(-(config.maxRounds * 2))
    const result = config.preserveSystemPrompt ? [...systemMessages, ...recentMessages] : recentMessages
    return result
  }

  // 未启用摘要：直接裁剪到最近 N 轮
  const recentMessages = chatMessages.slice(-(config.maxRounds * 2))
  const result = config.preserveSystemPrompt ? [...systemMessages, ...recentMessages] : recentMessages
  return result
}

// ---- 缓存管理 ----

/** 清除所有对话缓存 */
export function clearAllConversationCache(): void {
  conversationCache.clear()
}

/** 清除指定对话的缓存 */
export function clearConversationCache(conversationId: string): void {
  conversationCache.delete(conversationId)
}

// ---- 统计 ----

/** 获取所有对话的总数 */
export function getTotalConversationCount(): number {
  const schema = loadSchema()
  const kvStore = schema.kvStore ?? {}
  return Object.keys(kvStore).filter(k => k.startsWith(MEMORY_STORAGE_PREFIX)).length
}

/** 获取对话消息数量 */
export function getConversationMessageCount(conversationId: string): number {
  return getConversationMessages(conversationId).length
}