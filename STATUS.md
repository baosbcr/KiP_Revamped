# Status (2026-10-28)

Pilot skeleton works: TV lobby (QR code, coloured 3D characters), phone join, colour pick, and rejoin after a reload or
dropout. Tested with simulated phones in a browser. Design: [DESIGN.md](DESIGN.md).

**Blocker for real phones:** on the home Wi-Fi (NOS router + mesh pods), the laptop can reach only the router
(192.168.1.1). It can't reach any other device, wired or wireless (no network-level replies), so the phone's page hangs.
NOS Net (nosnet.pt) shows nothing to blame: private Wi-Fi, no access rules, internet-only firewall, and **no isolation
switch**. Windows firewall is fine. IP leases last 60 min, so addresses change (the laptop was .25 and is now .106).

## Next
1. Get a real phone connected: a **Windows Mobile hotspot** on the laptop (phones join the laptop directly, which
   works on any router), *or* the laptop on an Ethernet cable to the router, *or* ask NOS to disable client isolation
   on the router/pods. Then rerun the phone test (join, lock phone, reload).
2. Next milestone (pick one): the core question loop (OpenTDB, 4 arenas, timer, speed scoring, tally) or selfie masks.
