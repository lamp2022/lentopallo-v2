import type { Court, CourtPosition } from './types'

export const POSITIONS_NORMAL: CourtPosition[] = [4, 3, 2, 5, 6, 1]
export const POSITIONS_FLIPPED: CourtPosition[] = [1, 6, 5, 2, 3, 4]

export function rotate(court: Court): Court {
  const next: Court = {}
  const prev = court[1]
  next[1] = court[2]
  next[2] = court[3]
  next[3] = court[4]
  next[4] = court[5]
  next[5] = court[6]
  next[6] = prev
  return next
}
