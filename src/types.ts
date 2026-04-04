// Player roles
export type PlayerRole = 'normaali' | 'passari' | 'libero';

// Court positions 1-6
export type CourtPosition = 1 | 2 | 3 | 4 | 5 | 6;

// Event types
export type EventType = 'serve' | 'point';

// Player in roster
export interface Player {
  nr: number;       // 1-99
  name: string;     // can be empty string
  role?: PlayerRole;
}

// Court mapping: position -> player number (0 or undefined = empty)
export type Court = Partial<Record<CourtPosition, number>>;

// Single scoring event (append-only log entry)
export interface GameEvent {
  ts: number;         // Unix timestamp ms
  set: number;        // 1-5
  player: number;     // player nr
  name: string;       // player name at event time
  delta: 1 | -1;
  type: EventType;
  court: Court;       // snapshot at event time
}

// Score entry per player
export interface ScoreEntry {
  total: number;
  serve: number;
  point: number;
}

// Score map keyed by player number
export type ScoreMap = Record<number, ScoreEntry>;

// Full game state for persistence
export interface GameState {
  players: Player[];
  court: Court;
  eventLog: GameEvent[];
  currentSet: number;
  serveTicks: Record<number, number>;
}

// Score view data
export interface ScoreView {
  serve: Record<number, number>;
  point: Record<number, number>;
  total: Record<number, number>;
}
