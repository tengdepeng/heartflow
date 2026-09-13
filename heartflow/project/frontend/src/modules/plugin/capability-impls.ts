// ============================================================
// 核心插件能力实现 · 把能力接到真实引擎（零假数据）
//
// 这里只放「实现」，能力的「声明」在 types.CORE_PLUGINS。
// 注册是幂等的，由 modules/plugin/index.ts 在模块初始化时调用一次。
// ============================================================

import { useTimer } from '../../resonance/bridges/timer'
import { storage } from '../../engine/storage'
import { registerPluginCapability } from './capability-registry'

let registered = false

/** 注册内置核心插件的能力实现（幂等） */
export function registerCorePluginCapabilities(): void {
  if (registered) return
  registered = true

  // ---- core-timer · start-focus：启动一段专注计时 ----
  // 原实现在 modules/mirror/useMirrorDialogue.ts 的 start-focus handler 内，
  // 现移交核心插件提供，使「插件禁用 → 能力消失」真实可验证。
  registerPluginCapability('core-timer', 'start-focus', (args) => {
    const timer = useTimer()
    const duration = (args.duration as number) || 25
    const taskName = (args.taskName as string) || ''

    // 如果当前正在专注，先中断
    if (timer.isFocusing || timer.isPaused) {
      timer.interrupt()
    }

    timer.setMode('focus', duration)
    timer.start()

    return { duration, taskName }
  })

  // ---- core-timer · start-rest：进入休息 / 安全岛 ----
  registerPluginCapability('core-timer', 'start-rest', (args) => {
    const timer = useTimer()
    const duration = (args.duration as number) || 5

    if (timer.isFocusing || timer.isPaused) {
      timer.pauseForSanctuary()
    }

    return { duration }
  })

  // ---- core-crystal · crystal-stats：结晶数量与近况（读真实存储） ----
  registerPluginCapability('core-crystal', 'crystal-stats', () => {
    const crystals = storage.getCrystals()
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const thisWeek = crystals.filter(c => new Date(c.createdAt).getTime() >= weekAgo).length

    const tagCount = new Map<string, number>()
    for (const c of crystals) {
      const tags = Array.isArray(c.tags) ? c.tags : []
      for (const t of tags) tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)

    const summary =
      crystals.length === 0
        ? '你的结晶架还空着——完成一次专注，它就会凝结出第一颗。'
        : `你一共凝结了 ${crystals.length} 颗时间结晶，最近七天 ${thisWeek} 颗${
            topTags.length ? `，多出现在「${topTags.join('」「')}」` : ''
          }。`

    return { total: crystals.length, thisWeek, topTags, summary }
  })

  // ---- core-constitution · lookup-article：按编号查条款（读真实宪法） ----
  registerPluginCapability('core-constitution', 'lookup-article', (args) => {
    const constitution = storage.getConstitution()
    if (!constitution) {
      return { found: false, summary: '这部宪法还没有生成。' }
    }

    const raw = String(args.query ?? '')
    const numbered = raw.match(/(\d{1,3})\s*条/)

    if (numbered) {
      const n = Number(numbered[1])
      if (n >= 1 && n <= constitution.immutableRules.length) {
        const rule = constitution.immutableRules[n - 1]
        return {
          found: true,
          articleNumber: n,
          title: rule.title,
          summary: `宪法第 ${n} 条「${rule.title}」：${rule.description}`,
        }
      }
      const rule = constitution.mutableRules.find(r => r.articleNumber === n)
      if (rule) {
        return {
          found: true,
          articleNumber: n,
          title: rule.title,
          summary: `宪法第 ${n} 条「${rule.title}」：${rule.description}`,
        }
      }
      return { found: false, summary: `宪法里没有第 ${n} 条。` }
    }

    const elasticCount = constitution.mutableRules.filter(r => r.articleNumber).length
    return {
      found: true,
      total: constitution.immutableRules.length + elasticCount,
      summary: `《${constitution.name}》共 ${
        constitution.immutableRules.length + elasticCount
      } 条：不可变 ${constitution.immutableRules.length} 条，弹性 ${elasticCount} 条。想查具体条款，可以说「宪法第 3 条」。`,
    }
  })
}

/** 重置注册标记（仅用于测试） */
export function __resetCorePluginCapabilities(): void {
  registered = false
}
