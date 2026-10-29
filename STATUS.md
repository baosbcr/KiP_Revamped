# Status (2026-10-28)

Pilot skeleton works: TV lobby (QR code, coloured 3D characters), phone join, colour pick, and rejoin after a reload or
dropout. Tested with simulated phones in a browser. Design: [DESIGN.md](DESIGN.md).

**Real phones (fixed 2026-10-29):** the phone hung because **Tailscale** was capturing the home LAN. AvoCantigas
advertises `192.168.1.0/24` as a subnet route, and LASUS-Windows accepted it (Tailscale metric 5 beat Wi-Fi 35). So
every reply to the phone went into the tunnel. The fix while physically in Portugal: `tailscale set --accept-routes=false`.
Set it back to `true` in the dorm. The router and NOS settings were never the problem.

**Selfie masks (2026-10-29):** phone takes or picks a photo, crops it to a circle (drag, pinch, zoom), sends a ~10–40 kB
JPEG. The TV shows it on a curved paper mask on the head bone. The photo stays in server memory only, goes only to the TV
and its owner, and comes back after TV or phone reloads. Tested in the browser pane; not yet on a real phone.

## Next
1. Real-phone test of masks: selfie camera, pinch zoom, lock and unlock the phone.
2. Next milestone: the core question loop (OpenTDB, 4 arenas, timer, speed scoring, tally).
2. Next milestone (pick one): the core question loop (OpenTDB, 4 arenas, timer, speed scoring, tally) or selfie masks.
