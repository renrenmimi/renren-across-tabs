export type RoomPreset = {
  name: string
  shortName: string
  hue: number
  icon: string
}

export type Peer = {
  id: string
  room: RoomPreset
  visible: boolean
  lastSeen: number
}

export type JournalEntry = {
  id: string
  at: number
  text: string
}

export type RenrenState = {
  version: number
  ownerId: string
  ownerRoom: string
  mood: number
  energy: number
  snacks: number
  updatedAt: number
  journal: JournalEntry[]
}

export type StateAction =
  | { type: 'move'; targetId: string; targetRoom: string; at: number }
  | { type: 'high-five'; room: string; at: number }
  | { type: 'snack'; room: string; at: number }
  | { type: 'recover'; targetId: string; targetRoom: string; at: number }

export type WireMessage =
  | { type: 'presence'; peer: Peer }
  | { type: 'bye'; peerId: string }
  | { type: 'request-state'; senderId: string }
  | { type: 'state'; senderId: string; state: RenrenState }
  | { type: 'action'; senderId: string; action: StateAction }
