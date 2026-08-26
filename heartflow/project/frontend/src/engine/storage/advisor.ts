import { loadSchema, saveSchema } from './core'
import type { AdvisorProfile } from '../../types'
export function getAdvisors(): AdvisorProfile[] { return loadSchema().advisors }
export function setAdvisors(advisors: AdvisorProfile[]): void { const s = loadSchema(); s.advisors = advisors; saveSchema(s) }
export function getAdvisorMessages(): { id: string; text: string; at: string; trigger: string }[] { return loadSchema().advisorMessages ?? [] }
export function setAdvisorMessages(msgs: { id: string; text: string; at: string; trigger: string }[]): void { const s = loadSchema(); s.advisorMessages = msgs; saveSchema(s) }
export function getAdvisorResetDate(): string | null { return loadSchema().config.advisorResetDate ?? null }
export function setAdvisorResetDate(date: string | null): void { const s = loadSchema(); s.config.advisorResetDate = date; saveSchema(s) }