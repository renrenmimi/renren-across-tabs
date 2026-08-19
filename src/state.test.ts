import { describe, expect, it } from 'vitest'
import { clamp, createInitialState, electCoordinator, isNewerState, reduceState } from './state'

describe('Renren state', () => {
  it('elects the same coordinator regardless of discovery order', () => {
    expect(electCoordinator(['tab-z', 'tab-a', 'tab-m'])).toBe('tab-a')
    expect(electCoordinator(['tab-m', 'tab-z', 'tab-a'])).toBe('tab-a')
  })

  it('moves Renren and records the trip', () => {
    const state = createInitialState('one', 'Sunroom', 100)
    const moved = reduceState(state, { type: 'move', targetId: 'two', targetRoom: 'Studio', at: 200 })

    expect(moved.ownerId).toBe('two')
    expect(moved.ownerRoom).toBe('Studio')
    expect(moved.energy).toBe(81)
    expect(moved.version).toBe(2)
    expect(moved.journal[0]?.text).toContain('Studio')
  })

  it('keeps mood and energy within their meters', () => {
    expect(clamp(120)).toBe(100)
    expect(clamp(-2)).toBe(0)
  })

  it('breaks equal-version ties with the update time', () => {
    const current = createInitialState('one', 'Sunroom', 100)
    const newer = { ...current, updatedAt: 101 }
    expect(isNewerState(newer, current)).toBe(true)
  })
})
