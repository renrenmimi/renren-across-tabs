import type { RenrenState, StateAction } from './types'

const MAX_JOURNAL = 12

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function createInitialState(ownerId: string, ownerRoom: string, at = Date.now()): RenrenState {
  return {
    version: 1,
    ownerId,
    ownerRoom,
    mood: 72,
    energy: 84,
    snacks: 0,
    updatedAt: at,
    journal: [entry(`Renren woke up in ${ownerRoom}.`, at)],
  }
}

export function reduceState(state: RenrenState, action: StateAction): RenrenState {
  switch (action.type) {
    case 'move':
      if (action.targetId === state.ownerId) return state
      return next(state, action.at, {
        ownerId: action.targetId,
        ownerRoom: action.targetRoom,
        energy: clamp(state.energy - 3),
        journal: addEntry(state, `Renren crossed into ${action.targetRoom}.`, action.at),
      })
    case 'high-five':
      return next(state, action.at, {
        mood: clamp(state.mood + 7),
        energy: clamp(state.energy - 1),
        journal: addEntry(state, `High five in ${action.room}.`, action.at),
      })
    case 'snack':
      return next(state, action.at, {
        mood: clamp(state.mood + 3),
        energy: clamp(state.energy + 12),
        snacks: state.snacks + 1,
        journal: addEntry(state, `Snack break in ${action.room}.`, action.at),
      })
    case 'recover':
      return next(state, action.at, {
        ownerId: action.targetId,
        ownerRoom: action.targetRoom,
        journal: addEntry(state, `Renren found an open tab: ${action.targetRoom}.`, action.at),
      })
  }
}

export function electCoordinator(ids: Iterable<string>): string | undefined {
  return [...ids].sort((a, b) => a.localeCompare(b))[0]
}

export function isNewerState(candidate: RenrenState, current: RenrenState): boolean {
  if (candidate.version !== current.version) return candidate.version > current.version
  return candidate.updatedAt > current.updatedAt
}

function next(
  state: RenrenState,
  at: number,
  patch: Partial<Pick<RenrenState, 'ownerId' | 'ownerRoom' | 'mood' | 'energy' | 'snacks' | 'journal'>>,
): RenrenState {
  return {
    ...state,
    ...patch,
    version: state.version + 1,
    updatedAt: at,
  }
}

function addEntry(state: RenrenState, text: string, at: number) {
  return [entry(text, at), ...state.journal].slice(0, MAX_JOURNAL)
}

function entry(text: string, at: number) {
  return { id: `${at}-${text}`, at, text }
}
