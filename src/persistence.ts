import type { GameState } from './types'
import { state } from './state'

const STORAGE_KEY = 'lentopallo'

export function saveState(): void {
  try {
    const data: GameState = {
      players: state.players,
      court: state.court,
      eventLog: state.eventLog,
      currentSet: state.currentSet,
      serveTicks: state.serveTicks,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (_e) { /* silent fail per original */ }
}

export function loadState(): void {
  if (tryLoadFromHash()) return
  if (tryLoadFromStorage()) return
  loadDefaults()
}

function tryLoadFromHash(): boolean {
  try {
    if (location.hash.length > 1) {
      const hash = location.hash.substring(1)
      const json = decodeURIComponent(escape(atob(hash)))
      const data = JSON.parse(json) as GameState
      if (data?.players?.length > 0) {
        applyState(data)
        return true
      }
    }
  } catch (_e) { /* silent */ }
  return false
}

function tryLoadFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as GameState
    if (data?.players?.length > 0) {
      applyState(data)
      return true
    }
  } catch (_e) { /* silent */ }
  return false
}

function applyState(data: GameState): void {
  state.players = data.players || []
  state.court = data.court || {}
  state.eventLog = data.eventLog || []
  state.currentSet = data.currentSet || 1
  state.serveTicks = data.serveTicks || {}
}

function loadDefaults(): void {
  state.players = [
    { nr: 3, name: 'Pihla' }, { nr: 7, name: 'Malla' }, { nr: 17, name: 'Viivi' },
    { nr: 23, name: 'Sanni' }, { nr: 25, name: 'Kia' }, { nr: 27, name: 'Victoria' },
    { nr: 29, name: 'Lera' }, { nr: 35, name: 'Enni' },
  ]
  state.court = { 4: 17, 3: 35, 2: 3, 5: 23, 6: 25, 1: 29 }
}

export function encodeShareUrl(): string {
  const data: GameState = {
    players: state.players,
    court: state.court,
    eventLog: state.eventLog,
    currentSet: state.currentSet,
    serveTicks: state.serveTicks,
  }
  const json = JSON.stringify(data)
  const hash = btoa(unescape(encodeURIComponent(json)))
  return location.origin + location.pathname + '#' + hash
}

export function decodeShareUrl(url: string): GameState | null {
  try {
    const hashIndex = url.indexOf('#')
    if (hashIndex === -1) return null
    const hash = url.substring(hashIndex + 1)
    const json = decodeURIComponent(escape(atob(hash)))
    return JSON.parse(json) as GameState
  } catch (_e) {
    return null
  }
}
