import type { RoomPreset } from './types'

export const ROOMS: readonly RoomPreset[] = [
  { name: 'The Sunroom', shortName: 'Sunroom', hue: 37, icon: '☀' },
  { name: 'The Blue Studio', shortName: 'Studio', hue: 206, icon: '✦' },
  { name: 'The Rooftop', shortName: 'Rooftop', hue: 275, icon: '☾' },
  { name: 'The Greenhouse', shortName: 'Greenhouse', hue: 145, icon: '⌁' },
  { name: 'The Reading Nook', shortName: 'Nook', hue: 10, icon: '⌂' },
]

export function roomForId(id: string): RoomPreset {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return ROOMS[hash % ROOMS.length] ?? ROOMS[0]!
}

export function createTabId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
