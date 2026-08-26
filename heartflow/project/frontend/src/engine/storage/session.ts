import { loadSchema, saveSchema } from './core'
import type { FocusSession } from '../../types'
export function getSessions(): FocusSession[] { return loadSchema().sessions }
export function addSession(session: FocusSession): void { const s = loadSchema(); s.sessions.push(session); saveSchema(s) }
export function updateSession(id: string, updates: Partial<FocusSession>): void { const s = loadSchema(); const idx = s.sessions.findIndex(x => x.id === id); if (idx !== -1) { s.sessions[idx] = { ...s.sessions[idx], ...updates }; saveSchema(s) } }
export function setSessions(sessions: FocusSession[]): void { const s = loadSchema(); s.sessions = sessions; saveSchema(s) }