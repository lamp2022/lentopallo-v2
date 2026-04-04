import { state } from './state'
import { getPositions } from './state'
import { esc } from './utils'
import { recalcScores, calcStreaks, calcScoreView } from './scoring'
import { saveState, encodeShareUrl } from './persistence'
import { rotate as rotateCourt } from './court'
import type { CourtPosition } from './types'

// ── renderAll ────────────────────────────────────────────────────────────────

export function renderAll(): void {
  renderSetBar()
  renderRoster()
  renderCourt()
  renderScoreBtns()
  renderBench()
  renderScoreBoard()
  saveState()
  setTimeout(() => { state.lastTickPlayer = null }, 500)
}

// ── renderSetBar ─────────────────────────────────────────────────────────────

export function renderSetBar(): void {
  const el = document.getElementById('setBar')
  if (!el) return
  let html = '<span>Er&auml;:</span>'
  for (let i = 1; i <= 3; i++) {
    const active = i === state.currentSet ? ' active' : ''
    html += `<button class="btn-set${active}" onclick="setSet(${i})">${i}</button>`
  }
  el.innerHTML = html
}

// ── renderCourt ──────────────────────────────────────────────────────────────

export function renderCourt(): void {
  const el = document.getElementById('court')
  if (!el) return
  const positions = getPositions()
  el.innerHTML = positions.map((pos) => {
    const playerNr = state.court[pos as CourtPosition]
    const display = playerNr ? '#' + playerNr : '&mdash;'
    const cls = playerNr ? '' : ' empty'
    let nameHtml = '<div class="player-name">&nbsp;</div>'
    let dotHtml = ''
    if (playerNr) {
      const p = state.players.find(x => x.nr === playerNr)
      if (p) {
        const rawName = p.name.length > 12 ? p.name.substring(0, 12) : p.name
        const escapedCourtName = esc(rawName)
        if (p.name) {
          nameHtml = `<div class="player-name">${escapedCourtName}</div>`
        }
        if (p.role) dotHtml = `<span class="role-dot ${esc(p.role)}"></span>`
      }
    }
    const tickCount = playerNr ? (state.serveTicks[playerNr] || 0) : 0
    let tickDots = ''
    if (tickCount > 0) {
      const isNew = state.lastTickPlayer === playerNr
      const oldCount = isNew ? tickCount - 1 : tickCount
      if (oldCount > 0) tickDots = new Array(oldCount + 1).join('&#9679;')
      if (isNew) tickDots += '<span class="tick-new">&#9679;</span>'
    }
    const tickHtml = `<div class="serve-ticks">${tickDots}</div>`
    return `<div class="court-cell-wrap">` +
      `<div class="pos-nr">Paikka ${pos}</div>` +
      `<div class="court-cell" onclick="openPicker(${pos})">` +
      nameHtml +
      `<div class="player-nr${cls}">${display}${dotHtml}</div>` +
      tickHtml +
      `</div></div>`
  }).join('')
}

// ── renderScoreBtns ──────────────────────────────────────────────────────────

export function renderScoreBtns(): void {
  const serverEl = document.getElementById('serverInfo')
  const btnsEl = document.getElementById('scoreBtns')
  if (!serverEl || !btnsEl) return
  const serverNr = state.court[1]
  const disabled = serverNr ? '' : ' disabled'
  if (serverNr) {
    const p = state.players.find(x => x.nr === serverNr)
    const escapedServerName = p ? esc(p.name) : ''
    const nameStr = p && p.name ? ' ' + escapedServerName : ''
    serverEl.innerHTML = `Sy&ouml;tt&auml;&auml;: #${serverNr}${nameStr}`
  } else {
    serverEl.innerHTML = 'Ei sy&ouml;tt&auml;j&auml;&auml;'
  }
  btnsEl.innerHTML =
    `<button class="btn-score btn-score-plus" onclick="addScore(1,event)"${disabled}>+1</button>` +
    `<button class="btn-score btn-score-minus" onclick="addScore(-1,event)"${disabled}>-1</button>`
}

// ── renderBench ──────────────────────────────────────────────────────────────

export function renderBench(): void {
  const el = document.getElementById('bench')
  if (!el) return
  const onCourt: Record<number, boolean> = {}
  for (const pos in state.court) {
    const nr = state.court[pos as unknown as CourtPosition]
    if (nr) onCourt[nr] = true
  }
  const benchPlayers = state.players.filter(p => !onCourt[p.nr])
  let html = `<h3>Vaihdossa (${benchPlayers.length})</h3><div class="bench-list">`
  if (benchPlayers.length === 0) {
    html += '<div class="bench-empty">&mdash;</div>'
  } else {
    benchPlayers.forEach(p => {
      const escapedBenchName = esc(p.name)
      const escapedBenchRole = esc(p.role || '')
      const nameHtml = p.name ? `<span class="bench-name">${escapedBenchName}</span>` : ''
      html += `<div class="bench-player" data-role="${escapedBenchRole}">#${p.nr}${nameHtml}</div>`
    })
  }
  html += '</div>'
  el.innerHTML = html
}

// ── renderScoreBoard ─────────────────────────────────────────────────────────

export function renderScoreBoard(): void {
  const el = document.getElementById('scoreSection')
  if (!el) return
  if (state.eventLog.length === 0) { el.innerHTML = ''; return }

  let selOpts = ''
  for (let i = 1; i <= 3; i++) {
    selOpts += `<option value="${i}"${state.scoreViewSet === i ? ' selected' : ''}>Er&auml; ${i}</option>`
  }
  selOpts += `<option value="0"${state.scoreViewSet === 0 ? ' selected' : ''}>Yhteens&auml;</option>`

  const view = calcScoreView(state.eventLog, state.scoreViewSet)

  let html = `<h3>Pisteet <select class="score-select" onchange="setScoreView(this.value)">${selOpts}</select></h3>`
  html += '<div class="score-list">'
  html += '<div class="score-row score-header"><span></span><span class="score-col-hdr">Sy&ouml;t&ouml;t</span><span class="score-col-hdr">Pelit.</span><span class="score-col-hdr">Yht</span></div>'

  state.players.forEach(p => {
    const sv = view.serve[p.nr] || 0
    const pt = view.point[p.nr] || 0
    const tot = view.total[p.nr] || 0
    const fmt = (v: number) => v > 0 ? '+' + v : '' + v
    const cls = (v: number) => v > 0 ? 'pos' : (v < 0 ? 'neg' : 'zero')
    const escapedScoreName = esc(p.name)
    const escapedScoreRole = esc(p.role || '')
    const nameHtml = p.name ? `<span class="score-name" data-role="${escapedScoreRole}">${escapedScoreName}</span>` : ''
    let streakHtml = ''
    if (state.scoreViewSet === 0) {
      const streaks = calcStreaks(p.nr, state.eventLog)
      if (streaks.length > 0) streakHtml = `<span class="streak-badge">${streaks.join(', ')}</span>`
    }
    html += `<div class="score-row">` +
      `<span><span class="score-player">#${p.nr}</span>${nameHtml}${streakHtml}</span>` +
      `<span class="score-val ${cls(sv)}">${fmt(sv)}</span>` +
      `<span class="score-val ${cls(pt)}">${fmt(pt)}</span>` +
      `<span class="score-val ${cls(tot)}" style="font-weight:700">${fmt(tot)}</span>` +
      `</div>`
  })
  html += '</div>'
  el.innerHTML = html
}

// ── renderRoster ─────────────────────────────────────────────────────────────

export function renderRoster(): void {
  const el = document.getElementById('rosterList')
  if (!el) return
  if (state.players.length === 0) {
    el.innerHTML = '<span style="color:var(--text3);font-size:12px">Ei pelaajia</span>'
    return
  }
  el.innerHTML = state.players.map(p => {
    const escapedRosterName = esc(p.name)
    const nameDisplay = p.name ? escapedRosterName : '&#9998;'
    const role = p.role || ''
    const escapedRole = esc(role)
    const selNorm = role === '' ? ' selected' : ''
    const selLib = role === 'libero' ? ' selected' : ''
    const selPas = role === 'passari' ? ' selected' : ''
    return `<span class="roster-tag">` +
      `<span class="nr" onclick="editNr(${p.nr}, this)">#${p.nr}</span> ` +
      `<span class="name" onclick="editName(${p.nr}, this)">${nameDisplay}</span> ` +
      `<select class="role-select" onchange="setRole(${p.nr}, this.value)">` +
      `<option value=""${selNorm}>Normaali</option>` +
      `<option value="libero"${selLib}>Libero</option>` +
      `<option value="passari"${selPas}>Passari</option>` +
      `</select> ` +
      `<span class="remove" onclick="removePlayer(${p.nr})" data-role="${escapedRole}">&times;</span>` +
      `</span>`
  }).join('')
}

// ── Interaction handlers ─────────────────────────────────────────────────────

export function toggleHelp(): void {
  document.getElementById('helpOverlay')?.classList.toggle('open')
}

export function toggleRoster(): void {
  state.rosterOpen = !state.rosterOpen
  document.getElementById('rosterBody')?.classList.toggle('collapsed', !state.rosterOpen)
  const toggle = document.getElementById('rosterToggle')
  if (toggle) toggle.innerHTML = state.rosterOpen ? '&#9660;' : '&#9654;'
}

export function addPlayer(): void {
  const nrInput = document.getElementById('playerNr') as HTMLInputElement
  const nameInput = document.getElementById('playerName') as HTMLInputElement
  const nr = parseInt(nrInput.value)
  if (!nr || nr < 1 || nr > 99) return
  if (state.players.length >= 10) return
  if (state.players.some(p => p.nr === nr)) return
  state.players.push({ nr, name: nameInput.value.trim() })
  state.players.sort((a, b) => a.nr - b.nr)
  nrInput.value = ''
  nameInput.value = ''
  nrInput.focus()
  renderAll()
}

export function removePlayer(nr: number): void {
  state.players = state.players.filter(p => p.nr !== nr)
  for (const pos in state.court) {
    if (state.court[pos as unknown as CourtPosition] === nr) {
      delete state.court[pos as unknown as CourtPosition]
    }
  }
  renderAll()
}

export function setSet(n: number): void {
  state.currentSet = n
  state.scoreViewSet = n
  state.serveTicks = {}
  state.lastTickPlayer = null
  renderAll()
}

export function flipCourt(): void {
  state.courtFlipped = !state.courtFlipped
  const netTop = document.getElementById('netTop')
  const netBottom = document.getElementById('netBottom')
  if (netTop) netTop.style.display = state.courtFlipped ? 'none' : ''
  if (netBottom) netBottom.style.display = state.courtFlipped ? '' : 'none'
  const btn = document.getElementById('flipBtn')
  if (btn) btn.textContent = state.courtFlipped ? 'Kentt\u00e4 k\u00e4\u00e4nnetty' : 'K\u00e4\u00e4nn\u00e4 kentt\u00e4'
  renderAll()
}

export function addScore(delta: 1 | -1, evt?: MouseEvent): void {
  const serverNr = state.court[1]
  if (!serverNr) return
  const p = state.players.find(x => x.nr === serverNr)
  // esc() used defensively to ensure stored name is safe for later HTML rendering
  const safeName = p ? esc(p.name) : ''
  state.eventLog.push({
    ts: Date.now(),
    set: state.currentSet,
    player: serverNr,
    name: safeName,
    delta,
    type: 'serve',
    court: JSON.parse(JSON.stringify(state.court)),
  })
  recalcScores(state.eventLog)
  renderAll()
  showScorePopup(delta, evt)
}

export function showScorePopup(delta: number, evt?: MouseEvent | null): void {
  const el = document.createElement('div')
  el.className = 'score-popup ' + (delta > 0 ? 'plus' : 'minus')
  el.textContent = delta > 0 ? '+1' : '-1'
  if (evt && typeof evt === 'object' && 'clientX' in evt) {
    el.style.left = evt.clientX - 20 + 'px'
    el.style.top = evt.clientY - 20 + 'px'
  } else {
    el.style.left = '50%'
    el.style.top = '50%'
  }
  document.body.appendChild(el)
  setTimeout(() => { el.remove() }, 650)
}

export function setScoreView(val: string): void {
  state.scoreViewSet = parseInt(val)
  renderScoreBoard()
}

export function openPicker(pos: number): void {
  state.pickerPos = pos as CourtPosition
  const isFrontRow = [2, 3, 4].includes(pos)
  const isBackRow = !isFrontRow
  const currentPlayerNr = state.court[pos as CourtPosition]
  const currentPlayer = currentPlayerNr ? state.players.find(x => x.nr === currentPlayerNr) : null

  const onOtherPos: Record<number, boolean> = {}
  for (const p in state.court) {
    if (parseInt(p) !== pos) {
      const nr = state.court[p as unknown as CourtPosition]
      if (nr) onOtherPos[nr] = true
    }
  }

  const available = state.players.filter(p => {
    if (p.nr === currentPlayerNr) return false
    if (isFrontRow && p.role === 'libero') return false
    if (onOtherPos[p.nr]) {
      if (p.role === 'libero' && isBackRow && currentPlayer && currentPlayer.role !== 'passari') {
        return true
      }
      return false
    }
    return true
  })

  let html = `<h3>Paikka ${pos}</h3>`

  if (currentPlayer) {
    const escapedCurrentName = esc(currentPlayer.name)
    const escapedCurrentRole = esc(currentPlayer.role || '')
    html += `<div class="picker-point" onclick="addPointFromPicker(${currentPlayer.nr})">` +
      `<span style="font-size:26px;font-weight:900">+1</span>` +
      `<span style="font-size:16px;font-weight:600">Pelitilannepiste</span></div>` +
      `<div style="text-align:center;font-size:15px;color:var(--text2);margin:-4px 0 14px;font-family:var(--mono);font-weight:400" data-role="${escapedCurrentRole}">#${currentPlayer.nr}${currentPlayer.name ? ' ' + escapedCurrentName : ''} &middot; Paikka ${pos}</div>`
  }

  if (available.length > 0) {
    html += '<div class="picker-section-title">Vaihda pelaajaa</div>'
    available.forEach(p => {
      const escapedPickerName = esc(p.name)
      const nameStr = p.name ? ` <span style="font-size:14px;font-weight:400;color:var(--text2)">${escapedPickerName}</span>` : ''
      html += `<div class="picker-item" onclick="selectPlayer(${p.nr})">#${p.nr}${nameStr}</div>`
    })
  } else if (!currentPlayer) {
    html += '<div style="color:var(--text3);font-size:12px;padding:8px">Ei vapaita pelaajia</div>'
  }
  if (state.court[pos as CourtPosition]) {
    html += '<div class="picker-clear" onclick="clearPos()">Tyhjenj&auml;</div>'
  }
  html += '<div class="picker-cancel" onclick="closePicker()">Peruuta</div>'

  const pickerEl = document.getElementById('picker')
  if (pickerEl) pickerEl.innerHTML = html
  document.getElementById('pickerOverlay')?.classList.add('open')
}

export function selectPlayer(nr: number): void {
  if (state.pickerPos !== null) {
    const selectedPlayer = state.players.find(x => x.nr === nr)
    if (selectedPlayer && selectedPlayer.role === 'libero') {
      for (const p in state.court) {
        const pos = p as unknown as CourtPosition
        if (state.court[pos] === nr && parseInt(p) !== state.pickerPos) {
          delete state.court[pos]
        }
      }
    }
    state.court[state.pickerPos] = nr
    renderAll()
  }
  closePicker()
}

export function clearPos(): void {
  if (state.pickerPos !== null) {
    delete state.court[state.pickerPos]
    renderAll()
  }
  closePicker()
}

export function closePicker(e?: Event): void {
  if (e && e.target !== document.getElementById('pickerOverlay')) return
  document.getElementById('pickerOverlay')?.classList.remove('open')
  state.pickerPos = null
}

export function addPointFromPicker(nr: number): void {
  const p = state.players.find(x => x.nr === nr)
  const safePointName = p ? esc(p.name) : ''
  state.eventLog.push({
    ts: Date.now(),
    set: state.currentSet,
    player: nr,
    name: safePointName,
    delta: 1,
    type: 'point',
    court: JSON.parse(JSON.stringify(state.court)),
  })
  closePicker()
  showScorePopup(1)
  recalcScores(state.eventLog)
  renderAll()
}

export function setRole(nr: number, role: string): void {
  const p = state.players.find(x => x.nr === nr)
  if (!p) return
  if (role) {
    state.players.forEach(x => {
      if (x.nr !== nr && x.role === role) x.role = undefined
    })
  }
  p.role = role as import('./types').PlayerRole | undefined
  renderAll()
}

export function editNr(nr: number, el: HTMLElement): void {
  const p = state.players.find(x => x.nr === nr)
  if (!p) return
  const input = document.createElement('input')
  input.className = 'edit-input nr-input'
  input.type = 'number'
  input.min = '1'
  input.max = '99'
  input.value = String(p.nr)
  el.replaceWith(input)
  input.focus()
  input.select()
  const save = () => {
    const newNr = parseInt(input.value)
    if (!newNr || newNr < 1 || newNr > 99) { renderAll(); return }
    if (newNr !== p.nr && state.players.some(x => x.nr === newNr)) { renderAll(); return }
    for (const pos in state.court) {
      if (state.court[pos as unknown as CourtPosition] === p.nr) {
        state.court[pos as unknown as CourtPosition] = newNr
      }
    }
    p.nr = newNr
    state.players.sort((a, b) => a.nr - b.nr)
    renderAll()
  }
  input.addEventListener('blur', save)
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { save() }
    if (e.key === 'Escape') { renderAll() }
  })
}

export function editName(nr: number, el: HTMLElement): void {
  const p = state.players.find(x => x.nr === nr)
  if (!p) return
  const input = document.createElement('input')
  input.className = 'edit-input name-input'
  input.value = p.name
  input.placeholder = 'Nimi'
  el.replaceWith(input)
  input.focus()
  input.select()
  const save = () => {
    p.name = input.value.trim()
    renderAll()
  }
  input.addEventListener('blur', save)
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { save() }
    if (e.key === 'Escape') { renderAll() }
  })
}

export function clearCourt(): void {
  if (!state.confirmingClear) {
    state.confirmingClear = true
    const btn = document.getElementById('clearBtn') as HTMLButtonElement
    if (btn) {
      btn.textContent = 'Vahvista tyhjennyss?'
      btn.style.borderColor = 'var(--red)'
      btn.style.color = 'var(--red)'
    }
    setTimeout(() => {
      state.confirmingClear = false
      if (btn) {
        btn.textContent = 'Tyhjenj\u00e4 kentt\u00e4'
        btn.style.borderColor = ''
        btn.style.color = ''
      }
    }, 3000)
    return
  }
  state.confirmingClear = false
  state.court = {}
  renderAll()
  const btn = document.getElementById('clearBtn') as HTMLButtonElement
  if (btn) {
    btn.textContent = 'Tyhjenj\u00e4 kentt\u00e4'
    btn.style.borderColor = ''
    btn.style.color = ''
  }
}

export function newGame(): void {
  if (!state.confirmingNewGame) {
    state.confirmingNewGame = true
    const btn = document.getElementById('newGameBtn') as HTMLButtonElement
    if (btn) {
      btn.textContent = 'Vahvista uusi peli?'
      btn.style.borderColor = 'var(--red)'
      btn.style.color = 'var(--red)'
    }
    setTimeout(() => {
      state.confirmingNewGame = false
      if (btn) {
        btn.textContent = 'Uusi peli'
        btn.style.borderColor = ''
        btn.style.color = ''
      }
    }, 3000)
    return
  }
  state.confirmingNewGame = false
  state.court = {}
  state.eventLog = []
  state.serveTicks = {}
  state.currentSet = 1
  state.scoreViewSet = 0
  renderAll()
  const btn = document.getElementById('newGameBtn') as HTMLButtonElement
  if (btn) {
    btn.textContent = 'Uusi peli'
    btn.style.borderColor = ''
    btn.style.color = ''
  }
}

export function handleRotate(): void {
  state.lastTickPlayer = null
  const pos1Player = state.court[1]
  if (pos1Player) {
    if (!state.serveTicks[pos1Player]) state.serveTicks[pos1Player] = 0
    state.serveTicks[pos1Player]++
    state.lastTickPlayer = pos1Player
  }
  state.court = rotateCourt(state.court)
  renderAll()
}

export function copyLink(): void {
  const url = encodeShareUrl()
  navigator.clipboard.writeText(url).then(() => {
    const msg = document.getElementById('copyMsg')
    if (msg) {
      msg.style.display = 'inline'
      setTimeout(() => { msg.style.display = 'none' }, 2000)
    }
  })
}
