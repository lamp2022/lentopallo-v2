import { describe, it, expect } from 'vitest'
import { recalcScores, calcStreaks } from './scoring'
import type { GameEvent } from './types'

function makeEvent(overrides: Partial<GameEvent>): GameEvent {
  return {
    ts: Date.now(),
    set: 1,
    player: 1,
    name: '',
    delta: 1,
    type: 'serve',
    court: {},
    ...overrides,
  }
}

describe('recalcScores', () => {
  it('returns empty object for empty events', () => {
    expect(recalcScores([])).toEqual({})
  })

  it('counts serve points correctly', () => {
    const events: GameEvent[] = [
      makeEvent({ player: 7, delta: 1, type: 'serve' }),
      makeEvent({ player: 7, delta: 1, type: 'serve' }),
      makeEvent({ player: 3, delta: -1, type: 'serve' }),
    ]
    const scores = recalcScores(events)
    expect(scores[7]).toEqual({ total: 2, serve: 2, point: 0 })
    expect(scores[3]).toEqual({ total: -1, serve: -1, point: 0 })
  })

  it('separates serve and point types', () => {
    const events: GameEvent[] = [
      makeEvent({ player: 7, delta: 1, type: 'serve' }),
      makeEvent({ player: 7, delta: 1, type: 'point' }),
    ]
    const scores = recalcScores(events)
    expect(scores[7]).toEqual({ total: 2, serve: 1, point: 1 })
  })
})

describe('calcStreaks', () => {
  it('returns empty array for no events', () => {
    expect(calcStreaks(7, [])).toEqual([])
  })

  it('finds streak of 3 consecutive +1', () => {
    const events: GameEvent[] = [
      makeEvent({ player: 7, delta: 1 }),
      makeEvent({ player: 7, delta: 1 }),
      makeEvent({ player: 7, delta: 1 }),
    ]
    expect(calcStreaks(7, events)).toEqual([3])
  })

  it('breaks streak on -1', () => {
    const events: GameEvent[] = [
      makeEvent({ player: 7, delta: 1 }),
      makeEvent({ player: 7, delta: 1 }),
      makeEvent({ player: 7, delta: -1 }),
      makeEvent({ player: 7, delta: 1 }),
    ]
    expect(calcStreaks(7, events)).toEqual([2])
  })

  it('ignores streaks shorter than 2', () => {
    const events: GameEvent[] = [
      makeEvent({ player: 7, delta: 1 }),
      makeEvent({ player: 7, delta: -1 }),
    ]
    expect(calcStreaks(7, events)).toEqual([])
  })

  it('returns empty array for different player', () => {
    const events: GameEvent[] = [
      makeEvent({ player: 7, delta: 1 }),
      makeEvent({ player: 7, delta: 1 }),
    ]
    expect(calcStreaks(99, events)).toEqual([])
  })
})
