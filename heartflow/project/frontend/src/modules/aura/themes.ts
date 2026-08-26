// ============================================================
// AuraLayer · 主题注册表
// 六类氛围主题：星图 / 呼吸球 / 流体壁纸 / 时钟名言 / 节气 / 极简留白。
// 用户可切换 + 调参（accent / density / speed / 时钟 / 名言）。
// ============================================================

import type { Component } from 'vue'
import type { AuraThemeId, AuraThemeMeta } from './types'
import StarmapTheme from './themes/StarmapTheme.vue'
import BreathTheme from './themes/BreathTheme.vue'
import FluidTheme from './themes/FluidTheme.vue'
import ClockQuoteTheme from './themes/ClockQuoteTheme.vue'
import SolarTheme from './themes/SolarTheme.vue'
import MinimalTheme from './themes/MinimalTheme.vue'

export const THEME_META: Record<AuraThemeId, AuraThemeMeta> = {
  starmap: {
    id: 'starmap',
    name: '星图',
    description: '复用星盘视觉的呼吸星海',
    defaults: { accent: '#d4a574', density: 60, speed: 1, showClock: false, showQuote: false },
  },
  breath: {
    id: 'breath',
    name: '呼吸球',
    description: '镜我静息态的呼吸光球',
    defaults: { accent: '#d4a574', density: 50, speed: 1, showClock: false, showQuote: false },
  },
  fluid: {
    id: 'fluid',
    name: '流体壁纸',
    description: '渐变流光实时壁纸',
    defaults: { accent: '#5ab8a0', density: 60, speed: 1, showClock: false, showQuote: false },
  },
  'clock-quote': {
    id: 'clock-quote',
    name: '时钟名言',
    description: '时钟 + 每日一言',
    defaults: { accent: '#d4a574', density: 40, speed: 1, showClock: true, showQuote: true },
  },
  solar: {
    id: 'solar',
    name: '节气',
    description: '时光胶囊 · 节气 ambient',
    defaults: { accent: '#cf9640', density: 50, speed: 1, showClock: false, showQuote: false },
  },
  minimal: {
    id: 'minimal',
    name: '极简留白',
    description: '仅一缕微光',
    defaults: { accent: '#d4a574', density: 20, speed: 1, showClock: false, showQuote: false },
  },
}

/** 主题切换顺序（面板展示） */
export const THEME_ORDER: AuraThemeId[] = [
  'starmap',
  'breath',
  'fluid',
  'clock-quote',
  'solar',
  'minimal',
]

/** 主题 id → 渲染组件 */
export const THEME_COMPONENTS: Record<AuraThemeId, Component> = {
  starmap: StarmapTheme,
  breath: BreathTheme,
  fluid: FluidTheme,
  'clock-quote': ClockQuoteTheme,
  solar: SolarTheme,
  minimal: MinimalTheme,
}
