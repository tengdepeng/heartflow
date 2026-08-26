import { loadSchema, saveSchema } from './core'
import type { EmotionRecord } from '../../types'
export function getEmotions(): EmotionRecord[] { return loadSchema().emotions ?? [] }
export function setEmotions(emotions: EmotionRecord[]): void { const s = loadSchema(); s.emotions = emotions; saveSchema(s) }