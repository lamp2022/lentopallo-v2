import { loadState, saveState } from './persistence'
import { state } from './state'
import { recalcScores } from './scoring'

// Load persisted state
loadState()
if (state.eventLog.length > 0) {
  recalcScores(state.eventLog) // Verify it runs without error
}

// Placeholder: render.ts will be created in Plan 02
console.log('Lentopallo loaded. Players:', state.players.length)

// Auto-save hook (will be wired to renderAll in Plan 02)
export function afterRender(): void {
  saveState()
  setTimeout(() => { state.lastTickPlayer = null }, 500)
}
