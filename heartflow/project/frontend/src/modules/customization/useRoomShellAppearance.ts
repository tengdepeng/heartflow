// ============================================================
// 应用空间自定义 · 统一房间壳层外观（宪法第二条 · 超级自定义）
// ------------------------------------------------------------
// 管「统一模式 UI」（RoomLayout 壳层）的全局外观：
//   - 内容内边距密度（--room-content-pad，写入 :root，所有房间即时生效）
//   - 标题对齐（left / center）
//   - 装饰菱形开关
//   - 眉标（kicker）显隐
//   - 标题尺度（default / hero）
//
// 与 useAppearance（粒子画布/琉璃通透/侧栏）和 useRoomStyle（单房间配色覆盖）
// 正交：此处只管「壳层骨架排版」，不碰配色、不碰氛围层。
//
// 设计要点（沿用 useAppearance 的模块级单例 + KV + :root 注入范式）：
// - 模块级单例 ref，所有 RoomLayout 实例共享同一份状态、互不冲突。
// - 全局优先 + 单房间可覆盖：RoomLayout 把房间 prop 与全局默认合并
//   （房间显式传 prop 即覆盖全局）；房间未传时回落到本 store 的全局默认。
// - contentPad 经 :root CSS 变量落地（.room-layout__body 消费 var(--room-content-pad)）；
//   其余四项由 RoomLayout 读本 store 计算 effective 值并实时驱动（无需 :root）。
// - 幂等重放 applyRoomShellAppearance()：App.vue onMounted 调用，确保首屏变量就位。
// ============================================================

import { ref, type Ref } from 'vue'
import { storage } from '../../engine/storage'

export type ContentPadDensity = 'compact' | 'normal' | 'spacious'
export type HeaderAlign = 'left' | 'center'
export type TitleScale = 'default' | 'hero'

/** 内容内边距密度 → :root --room-content-pad 像素值 */
export const CONTENT_PAD_PX: Record<ContentPadDensity, string> = {
  compact: '12px',
  normal: '24px',
  spacious: '40px',
}

// ---- 模块级单例状态（与 useAppearance 同源模式）----
const contentPadRef = ref<ContentPadDensity>(
  storage.getKV<ContentPadDensity>('room-shell:content-pad', 'normal'),
)
const headerAlignRef = ref<HeaderAlign>(
  storage.getKV<HeaderAlign>('room-shell:header-align', 'left'),
)
const ornamentRef = ref<boolean>(storage.getKV<boolean>('room-shell:ornament', true))
const showKickerRef = ref<boolean>(storage.getKV<boolean>('room-shell:show-kicker', true))
const titleScaleRef = ref<TitleScale>(
  storage.getKV<TitleScale>('room-shell:title-scale', 'default'),
)

/** 把当前的 contentPad 写到 :root（其余四项由 RoomLayout 读 store 实时驱动，不在此写） */
function syncRootVars(): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(
    '--room-content-pad',
    CONTENT_PAD_PX[contentPadRef.value] ?? CONTENT_PAD_PX.normal,
  )
}

function persistContentPad(v: ContentPadDensity): void {
  contentPadRef.value = v
  syncRootVars()
  storage.setKV('room-shell:content-pad', v)
}
function persistHeaderAlign(v: HeaderAlign): void {
  headerAlignRef.value = v
  storage.setKV('room-shell:header-align', v)
}
function persistOrnament(v: boolean): void {
  ornamentRef.value = v
  storage.setKV('room-shell:ornament', v)
}
function persistShowKicker(v: boolean): void {
  showKickerRef.value = v
  storage.setKV('room-shell:show-kicker', v)
}
function persistTitleScale(v: TitleScale): void {
  titleScaleRef.value = v
  storage.setKV('room-shell:title-scale', v)
}

// 模块加载即写一次 :root（首屏即生效，无需等待设置页打开）
syncRootVars()

export function useRoomShellAppearance() {
  return {
    // ---- 状态（Ref，模板自动解包）----
    contentPad: contentPadRef as Ref<ContentPadDensity>,
    headerAlign: headerAlignRef as Ref<HeaderAlign>,
    ornament: ornamentRef as Ref<boolean>,
    showKicker: showKickerRef as Ref<boolean>,
    titleScale: titleScaleRef as Ref<TitleScale>,
    // ---- 设置器（写入 :root/CSS 变量 + 持久化）----
    setContentPad: persistContentPad,
    setHeaderAlign: persistHeaderAlign,
    setOrnament: persistOrnament,
    setShowKicker: persistShowKicker,
    setTitleScale: persistTitleScale,
  }
}

/** 幂等重放：App.vue onMounted 调用，确保首屏 --room-content-pad 就位（防御性） */
export function applyRoomShellAppearance(): void {
  syncRootVars()
}
