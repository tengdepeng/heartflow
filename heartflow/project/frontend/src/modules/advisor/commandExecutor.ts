// ============================================================
// 调令动作执行器（幕僚管家 · 真办事层）
// 输入一条已解析的调令任务，按 taskType 触发对应真实能力，
// 让「专注调度 / 笔记记录 / 锚点锚定 / 情绪梳理」真正落地，
// 而非只生成一句汇报文案（蓝图644–650：调令要真办事，不能只汇报）。
//
// 纯 navigate 类由调用方（AdvisorHub.sendCommand）直接 push targetRoute，
// 本执行器只接管 action 类（focus / note / anchor / emotion）；
// review / general 为纯汇报型，不在此产生副作用。
// ============================================================

import { useRouter } from 'vue-router'
import { useTimerStore } from '../../stores/timer'
import { useNoteEditor } from '../note/useNoteEditor'
import { storage } from '../../engine/storage'
import type { CommandTask } from '../../stores/advisor'

export interface CommandActionResult {
  /** 是否真正执行了动作（区别于纯汇报 / 跳转型） */
  acted: boolean
  /** 若执行过程中发生了路由跳转，记录目标路由 */
  navigated?: string
}

export function useCommandExecutor() {
  const router = useRouter()

  /**
   * 按调令类型执行对应的真实动作。
   * 返回是否真正执行了副作用，以及是否发生了路由跳转（供调用方决策）。
   */
  function runAction(task: CommandTask): CommandActionResult {
    switch (task.taskType) {
      case 'focus': {
        // 真办事：开启一段专注计时（全局 timerStore 单例，跨路由照常走时）
        const timer = useTimerStore()
        const dur = storage.getConfig().timer.defaultDuration
        timer.setMode('focus', dur)
        // setMode 在「focus:auto-start」约束关闭时会自动开始；默认约束下需手动开
        const st = timer.session.status
        if (st === 'idle' || st === 'completed' || st === 'interrupted') {
          timer.start()
        }
        return { acted: true }
      }
      case 'note': {
        // 真办事：打开笔记编辑器，写下即沉淀
        useNoteEditor().openCreate()
        return { acted: true }
      }
      case 'anchor': {
        // 真办事：把用户带到能立锚点的锚点庭院
        router.push('/anchor')
        return { acted: true, navigated: '/anchor' }
      }
      case 'emotion': {
        // 真办事：把用户带到能记录情绪的情绪花房。
        // 注意：路由是 /garden，'emotion-garden' 只是 room-resonance 的房间键，不能当路由用。
        router.push('/garden')
        return { acted: true, navigated: '/garden' }
      }
      default:
        // navigate / review / general：无额外副作用
        // （navigate 由调用方直接跳转；review 已由 store 生成真实汇总）
        return { acted: false }
    }
  }

  return { runAction }
}
