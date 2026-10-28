# KiP Revamped

A browser party quiz inspired by *Knowledge is Power* (PS4, 2017). The TV shows the game and phones are
the controllers, with no app store involved. Design: [DESIGN.md](DESIGN.md). Background research: [RESEARCH.md](RESEARCH.md).

## Run it
Needs [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

1. On the laptop connected to the TV, open **http://localhost:3000/tv**.
2. Players scan the QR code, or type the address shown, on phones that are on the **same Wi-Fi**.
3. The first time, Windows asks whether Node.js may use the network. Allow it on **private networks**,
   or phones won't be able to connect.

If the TV shows the wrong address (VPNs and virtual adapters can confuse it), set it yourself:
`PUBLIC_HOST=192.168.1.25 npm run dev`.

### Phone page stuck loading?
Each of these has caused it on a real phone:
- **Android 16+:** the browser needs the **Nearby devices** (local network) permission. Allow the prompt, or go to
  Settings → Apps → *browser* → Permissions.
- **Laptop on Tailscale with subnet routes:** if a tailnet node advertises the LAN you're on, run
  `tailscale set --accept-routes=false` while you're there.
- **Phone on a static IP inside the router's DHCP pool:** another device can get the same address. Use DHCP,
  or a static address outside the pool.

## Scripts
| | |
|---|---|
| `npm run dev` | Server with live client compilation (one port, LAN-accessible) |
| `npm test` | Room logic tests |
| `npm run typecheck` | TypeScript check |
| `npm run build` then `npm start` | Production build |

## Layout
- `server/`: Express + Socket.IO. The server is the referee: phones send intents and the server broadcasts state.
- `shared/protocol.ts`: message types shared by server and clients.
- `client/index.html` + `client/phone/`: the phone controller.
- `client/tv.html` + `client/tv/`: the TV screen (three.js).
- `prototypes/avatar-viewer/`: standalone animation and avatar playground.

## Credits
Character: [KayKit Character Pack: Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0)
by Kay Lousberg (CC0).
