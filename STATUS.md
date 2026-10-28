# Status (2026-10-28)

Pilot skeleton works: TV lobby (QR code, coloured 3D characters), phone join, colour pick, and rejoin after a reload or
dropout. Tested with simulated phones in a browser. Design: [DESIGN.md](DESIGN.md).

**Blocker for real phones:** the home router (SBCR Wi-Fi) has client isolation on. The laptop (192.168.1.25) can't
reach the phone (192.168.1.6) even at the network level, so the phone's page hangs. Windows firewall is fine (Node.js is allowed).

## Next
1. Get a real phone connected: turn off "AP/client isolation" on the router (192.168.1.1), *or* connect the laptop
   to the phone's hotspot, *or* use Windows Mobile hotspot. Then rerun the phone test (join, lock phone, reload).
2. Next milestone (pick one): the core question loop (OpenTDB, 4 arenas, timer, speed scoring, tally) or selfie masks.
