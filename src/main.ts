import './style.css'
import { createTabId, roomForId } from './rooms'
import { RenrenSync, type SyncSnapshot } from './sync'
import type { Peer } from './types'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('App root is missing')

const tabId = resolveTabId()
const room = roomForId(tabId)
const self: Peer = { id: tabId, room, visible: !document.hidden, lastSeen: Date.now() }
const sync = new RenrenSync(self)

app.innerHTML = `
  <main class="shell" style="--room-hue:${room.hue}">
    <header class="topbar">
      <a class="brand" href="./" aria-label="Renren Across Tabs home">
        <span class="brand__mark">R</span>
        <span><strong>Renren</strong><small>across tabs</small></span>
      </a>
      <div class="room-id"><span>${room.icon}</span><div><small>YOU ARE IN</small><strong>${room.name}</strong></div></div>
      <a class="source" href="https://github.com/renrenmimi/renren-across-tabs" target="_blank" rel="noreferrer">View source ↗</a>
    </header>

    <section class="intro">
      <div>
        <p class="kicker"><span></span> ONE PERSON · MANY TABS</p>
        <h1>Renren lives<br><em>between</em> your tabs.</h1>
      </div>
      <p>Open another room. This page discovers it, elects one coordinator, and lets Renren walk across — without a server.</p>
    </section>

    <section class="status-grid" aria-label="Live status">
      <article><small>RENREN</small><strong data-owner-status>Waking up…</strong><span data-owner-detail>Finding an open room</span></article>
      <article><small>OPEN ROOMS</small><strong data-peer-count>1</strong><span>BroadcastChannel presence</span></article>
      <article><small>COORDINATOR</small><strong data-coordinator>electing…</strong><span>deterministic leader</span></article>
    </section>

    <section class="room" data-room>
      <div class="room__wash"></div>
      <div class="window" aria-hidden="true"><span class="sun"></span><i></i><i></i><i></i></div>
      <div class="shelf" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
      <div class="plant" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
      <div class="rug" aria-hidden="true"></div>
      <button class="door door--left" type="button" data-door-prev disabled aria-label="Send Renren to previous room"><span>←</span><small>NO ROOM YET</small></button>
      <button class="door door--right" type="button" data-door-next disabled aria-label="Send Renren to next room"><span>→</span><small>OPEN A TAB</small></button>

      <div class="character-wrap" data-character aria-live="polite">
        <p class="speech" data-speech>Give me a second. I’m checking the doors.</p>
        <img src="./renren-character.png" alt="Renren, standing in the current browser room" width="1024" height="1536" />
        <span class="shadow" aria-hidden="true"></span>
        <span class="sleep" aria-hidden="true">Z <i>z</i> <i>z</i></span>
      </div>

      <div class="empty-room" data-empty-room>
        <span>${room.icon}</span>
        <strong>Renren is in another tab.</strong>
        <p>Keep this room open — he can come through either door.</p>
      </div>

      <div class="room__label"><span>${room.icon}</span><p><small>ROOM ${room.shortName.toUpperCase()}</small>${room.name}</p></div>
    </section>

    <section class="control-deck">
      <div class="control-deck__main">
        <div class="section-title"><div><small>// LIVE TAB MAP</small><h2>Where should Renren go?</h2></div><a class="open-tab" href="./" target="_blank" rel="noopener" data-open-tab>＋ Open another room</a></div>
        <div class="tab-map" data-tab-map></div>
        <p class="support-note" data-support-note></p>
      </div>
      <aside class="care-panel">
        <div class="section-title"><div><small>// CURRENT STATE</small><h2>Renren check</h2></div></div>
        <div class="meter"><span><small>MOOD</small><b data-mood-label>72%</b></span><i><b data-mood-bar></b></i></div>
        <div class="meter"><span><small>ENERGY</small><b data-energy-label>84%</b></span><i><b data-energy-bar></b></i></div>
        <div class="care-actions">
          <button type="button" data-high-five>High five <span>✦</span></button>
          <button type="button" data-snack>Snack <span>＋</span></button>
        </div>
        <p class="snack-count"><span data-snack-count>0</span> snacks across all tabs</p>
      </aside>
    </section>

    <section class="journal-section">
      <div class="section-title"><div><small>// SHARED MEMORY</small><h2>Travel journal</h2></div><span class="live-pill"><i></i> LIVE</span></div>
      <ol class="journal" data-journal></ol>
    </section>

    <footer>
      <span>Built with TypeScript · BroadcastChannel · localStorage</span>
      <span>No account. No backend. Just browser tabs talking.</span>
    </footer>
  </main>
`

const dom = {
  room: get<HTMLElement>('[data-room]'),
  character: get<HTMLElement>('[data-character]'),
  empty: get<HTMLElement>('[data-empty-room]'),
  speech: get<HTMLElement>('[data-speech]'),
  ownerStatus: get<HTMLElement>('[data-owner-status]'),
  ownerDetail: get<HTMLElement>('[data-owner-detail]'),
  peerCount: get<HTMLElement>('[data-peer-count]'),
  coordinator: get<HTMLElement>('[data-coordinator]'),
  tabMap: get<HTMLElement>('[data-tab-map]'),
  support: get<HTMLElement>('[data-support-note]'),
  moodLabel: get<HTMLElement>('[data-mood-label]'),
  moodBar: get<HTMLElement>('[data-mood-bar]'),
  energyLabel: get<HTMLElement>('[data-energy-label]'),
  energyBar: get<HTMLElement>('[data-energy-bar]'),
  snackCount: get<HTMLElement>('[data-snack-count]'),
  journal: get<HTMLOListElement>('[data-journal]'),
  highFive: get<HTMLButtonElement>('[data-high-five]'),
  snack: get<HTMLButtonElement>('[data-snack]'),
  openTab: get<HTMLAnchorElement>('[data-open-tab]'),
  leftDoor: get<HTMLButtonElement>('[data-door-prev]'),
  rightDoor: get<HTMLButtonElement>('[data-door-next]'),
}

let latest: SyncSnapshot | undefined
let wasOwner = false
let moving = false

sync.subscribe((snapshot) => {
  latest = snapshot
  render(snapshot)
})
sync.start()

dom.openTab.addEventListener('click', () => {
  const url = new URL(location.href)
  url.searchParams.set('tab', createRoomId())
  dom.openTab.href = url.toString()
})

dom.highFive.addEventListener('click', () => {
  if (!latest || latest.state.ownerId !== tabId) return
  sync.dispatch({ type: 'high-five', room: room.name, at: Date.now() })
  dom.character.classList.remove('is-celebrating')
  void dom.character.offsetWidth
  dom.character.classList.add('is-celebrating')
  say('Perfect timing. ✦')
})

dom.snack.addEventListener('click', () => {
  if (!latest || latest.state.ownerId !== tabId) return
  sync.dispatch({ type: 'snack', room: room.name, at: Date.now() })
  say('Excellent snack logistics.')
})

function render(snapshot: SyncSnapshot): void {
  const isOwner = snapshot.state.ownerId === tabId
  const ownerPeer = snapshot.peers.find((peer) => peer.id === snapshot.state.ownerId)
  const otherPeers = snapshot.peers.filter((peer) => peer.id !== tabId)
  const coordinator = snapshot.peers.find((peer) => peer.id === snapshot.coordinatorId)

  document.title = isOwner ? `Renren is here · ${room.shortName}` : `Open room · ${room.shortName}`
  dom.room.classList.toggle('has-renren', isOwner)
  dom.room.classList.toggle('is-sleeping', isOwner && document.hidden)
  dom.character.setAttribute('aria-hidden', String(!isOwner))
  dom.empty.setAttribute('aria-hidden', String(isOwner))
  dom.highFive.disabled = !isOwner || moving
  dom.snack.disabled = !isOwner || moving

  if (isOwner && !wasOwner) enterRoom()
  wasOwner = isOwner

  dom.ownerStatus.textContent = isOwner ? 'HERE WITH YOU' : ownerPeer ? `IN ${ownerPeer.room.shortName.toUpperCase()}` : snapshot.state.ownerRoom.toUpperCase()
  dom.ownerDetail.textContent = isOwner ? (document.hidden ? 'sleeping while this tab rests' : 'awake in this tab') : ownerPeer?.visible === false ? 'sleeping in a hidden tab' : 'another room has him'
  dom.peerCount.textContent = String(snapshot.peers.length)
  dom.coordinator.textContent = coordinator?.id === tabId ? 'THIS TAB' : coordinator?.room.shortName.toUpperCase() ?? 'ELECTING…'
  dom.moodLabel.textContent = `${snapshot.state.mood}%`
  dom.moodBar.style.width = `${snapshot.state.mood}%`
  dom.energyLabel.textContent = `${snapshot.state.energy}%`
  dom.energyBar.style.width = `${snapshot.state.energy}%`
  dom.snackCount.textContent = String(snapshot.state.snacks)
  dom.support.textContent = snapshot.supported
    ? snapshot.peers.length === 1
      ? 'Open another room to see cross-tab discovery happen live.'
      : `${snapshot.peers.length} tabs are exchanging heartbeats. The lexicographically smallest tab coordinates state.`
    : 'BroadcastChannel is unavailable here, so Renren will stay in this room.'

  renderPeers(snapshot, otherPeers, isOwner)
  renderJournal(snapshot)
}

function renderPeers(snapshot: SyncSnapshot, others: Peer[], isOwner: boolean): void {
  dom.tabMap.replaceChildren()
  for (const peer of snapshot.peers) {
    const card = document.createElement('button')
    const containsRenren = snapshot.state.ownerId === peer.id
    card.type = 'button'
    card.className = `tab-card${peer.id === tabId ? ' is-you' : ''}${containsRenren ? ' has-renren' : ''}`
    card.style.setProperty('--peer-hue', String(peer.room.hue))
    card.disabled = peer.id === tabId || !isOwner || moving
    card.innerHTML = `
      <span class="tab-card__icon">${peer.room.icon}</span>
      <span><small>${peer.id === tabId ? 'THIS TAB' : peer.visible ? 'OPEN TAB' : 'HIDDEN TAB'}</small><strong>${peer.room.shortName}</strong></span>
      <i>${containsRenren ? 'RENREN IS HERE' : peer.id === tabId ? 'YOU ARE HERE' : isOwner ? 'SEND HERE →' : 'WAITING'}</i>
    `
    if (peer.id !== tabId) card.addEventListener('click', () => moveTo(peer))
    dom.tabMap.append(card)
  }

  const prev = others.at(0)
  const next = others.at(-1)
  configureDoor(dom.leftDoor, prev, '←')
  configureDoor(dom.rightDoor, next, '→')
}

function configureDoor(button: HTMLButtonElement, peer: Peer | undefined, arrow: string): void {
  button.disabled = !peer || latest?.state.ownerId !== tabId || moving
  button.replaceChildren()
  const span = document.createElement('span')
  span.textContent = arrow
  const small = document.createElement('small')
  small.textContent = peer ? peer.room.shortName.toUpperCase() : 'NO ROOM YET'
  button.append(span, small)
  button.onclick = peer ? () => moveTo(peer) : null
}

function moveTo(peer: Peer): void {
  if (!latest || latest.state.ownerId !== tabId || moving) return
  moving = true
  dom.character.classList.add('is-leaving')
  say(`On my way to ${peer.room.shortName}.`)
  window.setTimeout(() => {
    sync.dispatch({ type: 'move', targetId: peer.id, targetRoom: peer.room.name, at: Date.now() })
    dom.character.classList.remove('is-leaving')
    moving = false
  }, 640)
}

function enterRoom(): void {
  dom.character.classList.remove('is-entering')
  void dom.character.offsetWidth
  dom.character.classList.add('is-entering')
  say(document.hidden ? 'Quiet room. Perfect for a nap.' : `Made it to ${room.shortName}.`)
}

function say(text: string): void {
  dom.speech.textContent = text
  dom.speech.classList.remove('is-speaking')
  void dom.speech.offsetWidth
  dom.speech.classList.add('is-speaking')
}

function renderJournal(snapshot: SyncSnapshot): void {
  dom.journal.replaceChildren(...snapshot.state.journal.slice(0, 6).map((item, index) => {
    const li = document.createElement('li')
    const time = new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    li.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(item.text)}<small>${time} · state v${snapshot.state.version - index}</small></p>`
    return li
  }))
}

function resolveTabId(): string {
  const url = new URL(location.href)
  const requested = url.searchParams.get('tab')
  let id = requested
  try {
    id ||= sessionStorage.getItem('renren-across-tabs.tab-id')
    id ||= createTabId()
    sessionStorage.setItem('renren-across-tabs.tab-id', id)
  } catch {
    id ||= createTabId()
  }
  if (requested) {
    url.searchParams.delete('tab')
    history.replaceState(null, '', url)
  }
  return id
}

function createRoomId(): string {
  const occupied = new Set(latest?.peers.map((peer) => peer.room.name) ?? [room.name])
  let candidate = createTabId()

  for (let attempt = 0; attempt < 20 && occupied.has(roomForId(candidate).name); attempt += 1) {
    candidate = createTabId()
  }

  return candidate
}

function get<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
