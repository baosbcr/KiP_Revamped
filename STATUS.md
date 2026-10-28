# Status (2026-10-28)

Pilot skeleton works: TV lobby (QR code, coloured 3D characters), phone join, colour pick, and rejoin after a reload or
dropout. Tested with simulated phones in a browser. Design: [DESIGN.md](DESIGN.md).

**Real phones (fixed 2026-10-29):** the phone hung because **Tailscale** was capturing the home LAN. AvoCantigas
advertises `192.168.1.0/24` as a subnet route, and LASUS-Windows accepted it (Tailscale metric 5 beat Wi-Fi 35). So
every reply to the phone went into the tunnel. The fix while physically in Portugal: `tailscale set --accept-routes=false`.
Set it back to `true` in the dorm. The router and NOS settings were never the problem.

## Next
1. Finish the real-phone test: join, lock the phone (should sit down, then stand up), reload.
2. Next milestone (pick one): the core question loop (OpenTDB, 4 arenas, timer, speed scoring, tally) or selfie masks.
