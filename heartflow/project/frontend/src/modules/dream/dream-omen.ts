// ============================================================
// 梦乡小筑 · 意象之镜（dream-omen）
// ------------------------------------------------------------
// 借鉴点：第16类·周公解梦「输入梦境 → 识别意象」的交互形态。
// 但守宪法：只做「意象识别 + 温和观照」，拒绝吉凶推算与迷信解析
// （与 dream-analytics 一致，第16类「拒绝迷信推算内容」）。
// 纯函数、本地计算、零网络。供 DreamOmenPanel 渲染。
// ============================================================

import type { Dream } from '../../stores/dreamNook'

// ============================================================
// 意象词库
// ============================================================

export interface DreamOmenDef {
  id: string
  /** 意象名（如「水」「飞」） */
  name: string
  emoji: string
  /** 命中关键词 */
  keywords: string[]
  /** 温和观照的一句（中性、不预断吉凶） */
  tone: string
  /** 引导回想的追问 */
  prompt: string
}

export const DREAM_OMENS: DreamOmenDef[] = [
  { id: 'water', name: '水', emoji: '🌊', keywords: ['水', '河', '海', '湖', '雨', '游泳', '洪水'], tone: '水总在梦里流淌——情绪也常在夜里漫溢，或许正待被你安放。', prompt: '近来最起伏的心绪，是否与水有关？' },
  { id: 'flying', name: '飞', emoji: '🕊️', keywords: ['飞', '飞翔', '飞起来', '天空', '翅膀', '云端'], tone: '梦见飞起，是一种挣脱或辽阔的念想——它把你带离地面，也带离此刻的局限。', prompt: '你想飞向哪边，或逃离哪边？' },
  { id: 'falling', name: '坠落', emoji: '🪂', keywords: ['坠落', '掉下', '跌落', '坠', '悬崖', '下坠'], tone: '坠落感常是「失去支撑」的具象——梦在问你哪根锚松动了。', prompt: '生活中什么在往下沉，或让你悬着心？' },
  { id: 'chase', name: '追赶', emoji: '🏃', keywords: ['追赶', '追逐', '被人追', '逃跑', '逃', '追不上'], tone: '被人追赶的梦，追的常不是身后之物，而是尚未处理的某个念头。', prompt: '是什么在身后，又因为你没转过身？' },
  { id: 'exam', name: '考试', emoji: '📝', keywords: ['考试', '测验', '答卷', '答题', '没复习', '考场'], tone: '考场之梦多是把「被检验的紧张」带进了夜——已预备与未预备都在此显影。', prompt: '现实中最近正被什么检验着？' },
  { id: 'tooth', name: '掉牙', emoji: '🦷', keywords: ['掉牙', '牙齿', '牙掉', '牙碎'], tone: '掉牙之梦常与「流失、变化」相连——有些东西正在悄悄松动，未必是坏事。', prompt: '你正在失去、或正准备放下的，是？' },
  { id: 'home', name: '家·屋', emoji: '🏠', keywords: ['家', '房子', '屋', '居所', '老家', '搬家', '老屋'], tone: '梦见家或屋，是在寻一处安的所在——安全感在梦里也渴望有个壳。', prompt: '哪里让你觉得「回了家」？' },
  { id: 'kin', name: '亲友故人', emoji: '🕯️', keywords: ['故人', '已故', '逝去', '亡故', '去世', '奶奶', '爷爷', '父亲', '母亲'], tone: '故人入梦，未必是预兆——更像思念在夜里寻了件旧衣穿上。', prompt: '若有未说尽的心意，此刻还来得及。' },
  { id: 'lost', name: '迷路', emoji: '🧭', keywords: ['迷路', '迷失', '走失', '找不到', '丢失', '找不到路'], tone: '迷路的梦，醒来常是方向感的提醒——要不要先找回自己的坐标。', prompt: '最近在哪件事上有点「找不到路」？' },
  { id: 'death', name: '死亡', emoji: '🌑', keywords: ['死亡', '去世', '死了', '死掉', '坟墓', '葬礼', '尸体'], tone: '死亡入梦，多关乎「一段关系的结束或一种身份的转换」——旧章合拢，新篇待启。', prompt: '有什么正在结束，好让另外的发芽？' },
  { id: 'child', name: '孩子', emoji: '👶', keywords: ['孩子', '婴儿', '小孩', '孩童'], tone: '孩子入梦，常与「新生、纯真、责任」有关——心里那块柔软也在向你招手。', prompt: '你生命里正在孕育或守护的新鲜事是？' },
  { id: 'light', name: '光', emoji: '✨', keywords: ['光', '亮', '发光', '灯', '阳光', '月光', '火光'], tone: '光在梦里亮起，是愿望未被磨灭的记号——它提醒你仍看得见方向。', prompt: '最近什么照亮过你？哪怕一瞬间。' },
  { id: 'mirror', name: '镜子', emoji: '🪞', keywords: ['镜子', '照镜子', '镜', '映像'], tone: '镜子之梦是一场与自己的对望——看见的未必是脸，而是你如何看自己。', prompt: '镜中那人与你，谁更像此刻的你？' },
  { id: 'late', name: '迟到', emoji: '⏰', keywords: ['迟到', '赶不上', '来不及', '误了', '错过车', '赶车'], tone: '迟到的梦，常是「怕错过什么」的紧迫感在夜里开闸——未必是真会错过。', prompt: '你担心错过的是时间，还是某个人、某个机会？' },
]

// ============================================================
// 匹配逻辑
// ============================================================

export interface DreamOmenHit {
  omen: DreamOmenDef
  /** 文本中出现的命中关键词（去重） */
  matched: string[]
}

/** 从一段梦境文本中提取命中的意象 */
export function extractOmens(text: string): DreamOmenHit[] {
  const found = new Map<string, DreamOmenHit>()
  for (const omen of DREAM_OMENS) {
    const matched: string[] = []
    for (const kw of omen.keywords) {
      // 排除过短的「死.」型通配符，避免误匹配（如「死」不单独命中）
      if (text.includes(kw)) matched.push(kw)
    }
    if (matched.length > 0) {
      found.set(omen.id, { omen, matched: [...new Set(matched)] })
    }
  }
  return [...found.values()]
}

/** 对一条梦境合并其内容与标签后提取意象 */
export function omensOfDream(d: Pick<Dream, 'content' | 'tags'>): DreamOmenHit[] {
  return extractOmens(`${d.content || ''} ${(d.tags || []).join(' ')}`)
}

/** 跨多条梦境统计高频意象（按命中次数降序） */
export interface OmenFrequency {
  omen: DreamOmenDef
  count: number
}

export function omenFrequency(dreams: Pick<Dream, 'content' | 'tags'>[], limit = 5): OmenFrequency[] {
  const map = new Map<string, number>()
  for (const d of dreams) {
    for (const hit of omensOfDream(d)) {
      map.set(hit.omen.id, (map.get(hit.omen.id) || 0) + 1)
    }
  }
  return [...map.entries()]
    .map(([id, count]) => ({ omen: DREAM_OMENS.find(o => o.id === id)!, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** 据情绪配一个温和的回应开头（中性、不预断） */
export function omenEchoPrefix(mood: Dream['mood'] | string): string {
  switch (mood) {
    case 'fear': return '这段梦带着不安——先把意象放下，不用急着解释它。'
    case 'sad': return '这段梦有些沉，轻轻记下，让情绪有个着落。'
    case 'curious': return '这段梦让人好奇——意象也许在邀请你多看它一眼。'
    case 'confused': return '这段梦有些缠，意象之间没有对错，只有痕迹。'
    case 'happy': return '这段梦是轻盈的，意象也在心里泛起暖意。'
    default: return '想到这里，意象自己会慢慢开口。'
  }
}

/** 观照措辞：意象名 + 温和语气的一句（拼给面板用） */
export function omenLine(hit: DreamOmenHit): string {
  return `${hit.omen.name}${hit.omen.tone}`
}