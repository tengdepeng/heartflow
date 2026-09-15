// ============================================================
// 安全导航封装
// 吞掉导航被拒（NavigationDuplicated / 守卫拦截 / 重复跳转）产生的
// unhandled promise rejection，避免生产环境噪声与偶发崩溃。
// 用法：safePush(router, '/path') 代替 router.push('/path')
// ============================================================

import type { RouteLocationRaw, Router } from 'vue-router'

/** 安全 push：导航被拒时静默忽略。router 未注入（如测试环境）时安全降级。 */
export function safePush(router: Router | undefined, to: RouteLocationRaw): void {
  router?.push(to)?.catch(() => {})
}

/** 安全 replace：导航被拒时静默忽略。router 未注入（如测试环境）时安全降级。 */
export function safeReplace(router: Router | undefined, to: RouteLocationRaw): void {
  router?.replace(to)?.catch(() => {})
}
