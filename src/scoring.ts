import type { GameEvent, ScoreMap, ScoreView } from './types'

export function recalcScores(events: GameEvent[]): ScoreMap {
  const scores: ScoreMap = {}
  for (const e of events) {
    if (!scores[e.player]) {
      scores[e.player] = { total: 0, serve: 0, point: 0 }
    }
    const s = scores[e.player]
    s.total += e.delta
    if (e.type === 'point') {
      s.point += e.delta
    } else {
      s.serve += e.delta
    }
  }
  return scores
}

export function calcStreaks(playerNr: number, events: GameEvent[]): number[] {
  const streaks: number[] = []
  let cur = 0
  for (const e of events) {
    if (e.player === playerNr && e.delta === 1) {
      cur++
    } else {
      if (cur >= 2) streaks.push(cur)
      if (e.player === playerNr) cur = 0
      else cur = 0
    }
  }
  if (cur >= 2) streaks.push(cur)
  return streaks
}

export function calcScoreView(events: GameEvent[], setNr: number): ScoreView {
  const serve: Record<number, number> = {}
  const point: Record<number, number> = {}
  const total: Record<number, number> = {}
  const filtered = setNr === 0 ? events : events.filter(e => e.set === setNr)
  for (const e of filtered) {
    if (!total[e.player]) {
      total[e.player] = 0
      serve[e.player] = 0
      point[e.player] = 0
    }
    total[e.player] += e.delta
    if (e.type === 'point') point[e.player] += e.delta
    else serve[e.player] += e.delta
  }
  return { serve, point, total }
}
