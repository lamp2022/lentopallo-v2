import { loadState } from './persistence'
import { state } from './state'
import { recalcScores } from './scoring'
import {
  renderAll,
  addPlayer,
  toggleHelp,
  toggleRoster,
  handleRotate,
  clearCourt,
  newGame,
  flipCourt,
  addScore,
  setScoreView,
  openPicker,
  selectPlayer,
  clearPos,
  closePicker,
  addPointFromPicker,
  editNr,
  editName,
  setRole,
  removePlayer,
  setSet,
  copyLink,
} from './render'

// Theme: restore from localStorage, default dark
function initTheme() {
  const saved = localStorage.getItem('lentopallo-theme')
  if (saved === 'light') {
    document.documentElement.dataset.theme = 'light'
  }
  updateThemeIcon()
}

function toggleTheme() {
  const isLight = document.documentElement.dataset.theme === 'light'
  if (isLight) {
    delete document.documentElement.dataset.theme
    localStorage.setItem('lentopallo-theme', 'dark')
  } else {
    document.documentElement.dataset.theme = 'light'
    localStorage.setItem('lentopallo-theme', 'light')
  }
  updateThemeIcon()
}

function updateThemeIcon() {
  const btn = document.getElementById('themeBtn')
  if (!btn) return
  const isLight = document.documentElement.dataset.theme === 'light'
  btn.textContent = isLight ? '\u2600' : '\u263E'
}

initTheme()

// Load persisted state
loadState()
if (state.eventLog.length > 0) {
  recalcScores(state.eventLog)
}

// Initial render
renderAll()

// Wire static event listeners
document.getElementById('themeBtn')!.addEventListener('click', toggleTheme)
document.getElementById('helpBtn')!.addEventListener('click', toggleHelp)
document.getElementById('helpClose')!.addEventListener('click', toggleHelp)
document.getElementById('helpOverlay')!.addEventListener('click', (e) => {
  if (e.target === document.getElementById('helpOverlay')) toggleHelp()
})
document.getElementById('rotateBtn')!.addEventListener('click', handleRotate)
document.getElementById('clearBtn')!.addEventListener('click', clearCourt)
document.getElementById('newGameBtn')!.addEventListener('click', newGame)
document.getElementById('flipBtn')!.addEventListener('click', flipCourt)
document.getElementById('rosterHeader')!.addEventListener('click', toggleRoster)
document.getElementById('addPlayerBtn')!.addEventListener('click', addPlayer)
document.getElementById('playerNr')!.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPlayer() })
document.getElementById('playerName')!.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPlayer() })
document.getElementById('pickerOverlay')!.addEventListener('click', (e) => {
  if (e.target === document.getElementById('pickerOverlay')) closePicker()
})
const copyBtn = document.getElementById('copyLinkBtn')
if (copyBtn) copyBtn.addEventListener('click', copyLink)

// Expose to window for inline onclick in dynamically rendered HTML
Object.assign(window, {
  openPicker,
  selectPlayer,
  clearPos,
  closePicker,
  addPointFromPicker,
  addScore,
  setScoreView,
  editNr,
  editName,
  setRole,
  removePlayer,
  setSet,
})
