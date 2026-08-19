# Renren Across Tabs

Renren lives between browser tabs. Open a second room, watch both pages discover each other, then send him through a door. He leaves one tab and appears in the other — no account and no application server.

## What it demonstrates

- Cross-tab presence and messaging with `BroadcastChannel`
- Deterministic coordinator election from a changing peer set
- Versioned shared state with stale-update rejection
- Owner recovery when the tab holding Renren closes
- Page Visibility-aware sleep state
- Persistent mood, energy, snacks, and travel history
- Responsive, accessible UI with reduced-motion support

## Run it

```bash
npm install
npm run dev
```

Open the local URL, click **Open another room**, then move Renren using a room card or either door.

## Verify it

```bash
npm test
npm run build
```

## How synchronization works

Every tab announces a heartbeat on one shared channel. Live tab IDs are sorted; the smallest ID becomes the coordinator and is the only tab allowed to reduce actions into new shared state. State carries a monotonically increasing version and update time, so receivers can reject stale snapshots. If the owner disappears, the coordinator waits through a short grace window, claims Renren, and records the recovery in the shared journal.

The last accepted state is also written to `localStorage`, so Renren's mood and travel history survive after every tab closes.

## Character asset

The full-body Renren character was generated from the project owner's supplied illustrated portrait using OpenAI's built-in image generation tool, then extracted to a true-alpha PNG for use over dynamic room backgrounds.

## License

Code is available under the MIT License. The Renren character artwork is excluded from the code license and remains © Weiren Feng.
