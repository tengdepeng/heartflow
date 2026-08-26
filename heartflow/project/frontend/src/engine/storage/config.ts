import { loadSchema, saveSchema } from './core'
import type { AppConfig } from '../../types'
export function getConfig(): AppConfig { return loadSchema().config }
export function setConfig(config: AppConfig): void { const s = loadSchema(); s.config = config; saveSchema(s) }
export function getActiveStylePack(): string | null { return loadSchema().config.activeStylePack ?? null }
export function setActiveStylePack(id: string): void { const s = loadSchema(); s.config.activeStylePack = id; saveSchema(s) }