import { createInitialState, electCoordinator, isNewerState, reduceState } from './state'
import type { Peer, RenrenState, StateAction, WireMessage } from './types'

const CHANNEL = 'renren-across-tabs-v1'
const STORAGE_KEY = 'renren-across-tabs.state.v1'
const HEARTBEAT_MS = 900
const PEER_TIMEOUT_MS = 3_200
const RECOVERY_GRACE_MS = 1_900

type Listener = (snapshot: SyncSnapshot) => void

export type SyncSnapshot = {
  state: RenrenState
  peers: Peer[]
  coordinatorId?: string
  supported: boolean
}

export class RenrenSync {
  readonly tabId: string
  readonly self: Peer

  private readonly channel?: BroadcastChannel
  private readonly peers = new Map<string, Peer>()
  private readonly listeners = new Set<Listener>()
  private readonly startedAt = Date.now()
  private heartbeat?: number
  private state: RenrenState

  constructor(peer: Peer) {
    this.tabId = peer.id
    this.self = peer
    this.peers.set(peer.id, peer)
    this.state = loadState() ?? createInitialState(peer.id, peer.room.name)
    saveState(this.state)

    if ('BroadcastChannel' in globalThis) {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.addEventListener('message', (event: MessageEvent<WireMessage>) => this.receive(event.data))
    }
  }

  start(): void {
    this.announce()
    this.post({ type: 'request-state', senderId: this.tabId })
    this.heartbeat = window.setInterval(() => this.tick(), HEARTBEAT_MS)
    window.addEventListener('pagehide', this.stop)
    document.addEventListener('visibilitychange', this.visibilityChanged)
    window.setTimeout(() => this.tick(), RECOVERY_GRACE_MS + 50)
    this.emit()
  }

  stop = (): void => {
    this.post({ type: 'bye', peerId: this.tabId })
    if (this.heartbeat) window.clearInterval(this.heartbeat)
    this.channel?.close()
    window.removeEventListener('pagehide', this.stop)
    document.removeEventListener('visibilitychange', this.visibilityChanged)
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  dispatch(action: StateAction): void {
    if (this.isCoordinator()) this.apply(action)
    else this.post({ type: 'action', senderId: this.tabId, action })
  }

  private visibilityChanged = (): void => {
    this.self.visible = !document.hidden
    this.self.lastSeen = Date.now()
    this.announce()
    this.emit()
  }

  private tick(): void {
    const now = Date.now()
    this.self.lastSeen = now
    this.self.visible = !document.hidden
    this.peers.set(this.tabId, { ...this.self })
    this.announce()

    for (const [id, peer] of this.peers) {
      if (id !== this.tabId && now - peer.lastSeen > PEER_TIMEOUT_MS) this.peers.delete(id)
    }

    if (
      this.isCoordinator() &&
      now - this.startedAt > RECOVERY_GRACE_MS &&
      !this.peers.has(this.state.ownerId)
    ) {
      this.apply({ type: 'recover', targetId: this.tabId, targetRoom: this.self.room.name, at: now })
      return
    }
    this.emit()
  }

  private announce(): void {
    this.post({ type: 'presence', peer: { ...this.self } })
  }

  private receive(message: WireMessage): void {
    if (!message || typeof message !== 'object') return
    switch (message.type) {
      case 'presence':
        if (message.peer.id !== this.tabId) this.peers.set(message.peer.id, message.peer)
        if (this.isCoordinator()) this.postState()
        this.emit()
        break
      case 'bye':
        this.peers.delete(message.peerId)
        this.emit()
        break
      case 'request-state':
        if (this.isCoordinator()) this.postState()
        break
      case 'state':
        if (isNewerState(message.state, this.state)) {
          this.state = message.state
          saveState(this.state)
          this.emit()
        }
        break
      case 'action':
        if (this.isCoordinator()) this.apply(message.action)
        break
    }
  }

  private apply(action: StateAction): void {
    if (action.type === 'move' && !this.peers.has(action.targetId)) return
    this.state = reduceState(this.state, action)
    saveState(this.state)
    this.postState()
    this.emit()
  }

  private postState(): void {
    this.post({ type: 'state', senderId: this.tabId, state: this.state })
  }

  private post(message: WireMessage): void {
    this.channel?.postMessage(message)
  }

  private coordinatorId(): string | undefined {
    return electCoordinator(this.peers.keys())
  }

  private isCoordinator(): boolean {
    return this.coordinatorId() === this.tabId
  }

  private snapshot(): SyncSnapshot {
    return {
      state: this.state,
      peers: [...this.peers.values()].sort((a, b) => a.room.name.localeCompare(b.room.name)),
      coordinatorId: this.coordinatorId(),
      supported: Boolean(this.channel),
    }
  }

  private emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}

function loadState(): RenrenState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const state = JSON.parse(raw) as RenrenState
    return typeof state.version === 'number' && typeof state.ownerId === 'string' ? state : undefined
  } catch {
    return undefined
  }
}

function saveState(state: RenrenState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The live experience still works when storage is unavailable.
  }
}
