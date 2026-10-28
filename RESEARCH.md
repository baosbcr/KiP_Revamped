# KiP Revamped — research (2026-10-28)

## 1. What the original is

*Knowledge is Power* (Wish Studios / Sony, PS4, Oct 2017), a PlayLink game: the **game runs on the
PS4**, and each player's **phone runs a companion app** that acts as the controller over local Wi-Fi.
The studio was made up of ex-*Buzz!* (Relentless) developers. Metacritic 71. Sequel: *Knowledge is Power: Decades* (Nov 2018).
Wish Studios closed in Feb 2019.

- 2–6 players. Each picks one of 8 claymation puppet avatars and adds a selfie for its face.
- Match: **3 battle rounds → 2 challenge rounds → finale**.
- **Battle round**: 3 multiple-choice questions. Players **vote on the topic**. The first vote picks
  from 4 general categories, and each later vote offers categories related to the previous question.
- **Power Plays** (picked before each question): self-buffs (e.g. remove wrong answers) or pranks on
  a rival (e.g. *Freeze*: the rival must tap their answers free of ice). Decades added *Disco Fever*,
  *Zipper*, *Lockdown* and an option to turn Power Plays down or off.
- **Challenge rounds**: *Linking* (match pairs, e.g. team → city) and *Sorting* (put answers into one of 2 buckets).
- **Finale**: the *Pyramid of Knowledge*. A fastest-finger race to the top, with each step carrying a
  Power Play, and starting heights staggered by score. The winner gets an obscure "scroll of knowledge" fact.
- Main criticism: too much waiting and choosing compared with actual quizzing. That pacing is the thing to fix.

## 2. APK / console landscape

| Fact | Detail |
|---|---|
| PS Store | Game delisted, by Nov 2023 at the latest, with no announcement |
| Dec 2023 | Sony stopped serving the KiP apps to devices **newer than Android 11** |
| Google Play | KiP app removed ~May 2025. Apple App Store also removed |
| APK | `com.playstation.knowledge` v1.4 (10400) on APKMirror, targetSdk 27 (Android 8.1) |
| PS5 | Runs via back-compat, but app connections over Wi-Fi are reported as flaky |

**Key point:** even a working APK only gives you a *controller*. You still need a PS4/PS5 with the
game installed, and the game can no longer be bought. Option A therefore only helps people who
already own it.

Likely reasons the APK fails on new phones (unverified until we inspect the APK):
1. **32-bit-only native code.** Many 2023+ phones (Pixel 7 and later, recent Snapdragon/Tensor chips)
   cannot run `armeabi-v7a`-only apps at all. Check with `unzip -l app.apk | grep lib/`.
   If this is the cause, no patch fixes it short of rebuilding the app.
2. Old-target behaviour: Wi-Fi multicast/broadcast discovery and local-network permissions changed in
   Android 12–14, which can break PS4 discovery.
3. A server-side check or an Android-version check in the app, if any.

Patch routes, best first: (a) an old Android ≤11 phone/tablet, which is zero work; (b) inspect the
APKMirror APK and, if the native code is 64-bit capable, patch with apktool/Uber-signer;
(c) reverse-engineer the PS4↔app protocol and write a web controller. (c) is the only route that
scales, and it is a substantial RE project with no prior work found.

## 3. Existing projects (nothing KiP-specific exists)

No KiP remake, fan clone, or PlayLink protocol RE project was found.

| Project | What it gives us | License |
|---|---|---|
| [mholzi/quizify](https://github.com/mholzi/quizify) | **Closest match.** TV board + phones via QR code, local WebSocket, team mode, power-ups (incl. *Freeze*, *Steal*), final wager, tested with 20+ players, JSON question packs (DE/EN/ES). Tied to Home Assistant (Python) | MIT |
| [tomalama/hackbox](https://github.com/tomalama/hackbox) | Generic Jackbox-style server+client framework (rooms, phones in a browser) | MIT |
| [InvoxiPlayGames/johnbox](https://github.com/InvoxiPlayGames/johnbox) | Private Jackbox server; a reference for room/reconnect protocol design | check |
| [marvin-wtt/BuzzMaster](https://github.com/marvin-wtt/BuzzMaster) | Quiz-show runner with PS2 *Buzz!* buzzer support (a nice extra input option) | check |
| [Open Trivia DB](https://opentdb.com) | ~4k+ categorised questions, free API | CC BY-SA 4.0 |
| Buzzin, Kwishetwel | Commercial browser-based KiP-likes (TV + phones). Proof of demand; closed source | — |

## 4. Recommendation

Build new (**Option B**) as a **browser game**: the TV/laptop opens the host page, phones join via
QR code, and there is no app store at all. That makes it immune to the obsolescence that killed the original.
Use quizify's architecture and MIT code as reference/donor, but build standalone (Node/TS or Python
server, not Home Assistant). Start questions from OpenTDB and our own JSON packs.

Ideas that go beyond the original:
- **8–16+ players, plus teams**, and an audience mode where extra phones vote or heckle.
- Pacing fix: vote and Power Play selection happen *simultaneously* with a short timer.
- More challenge types: estimation slider, ordering/timeline, picture questions.
- Power Play intensity setting (off / mild / chaos), following the Decades feedback.
- Pyramid finale kept as the signature, with the climb rendered on the TV.
- Remote play: same room code over the internet, with optional streaming of the host screen.
- Pack editor + import (CSV/JSON), with community packs living in the repo.

Option A as a side quest: if you have a PS4 and the game, grab the APK and check its `lib/` folders
first. That one check decides whether patching is viable.

## Sources
- [Wikipedia — Knowledge is Power](https://en.wikipedia.org/wiki/Knowledge_is_Power_(video_game))
- [Delisted Games — Knowledge is Power](https://delistedgames.com/knowledge-is-power/)
- [Sony PlayLink page (Dec 2023 notice)](https://www.playstation.com/en-se/accessories/playlink/)
- [APKMirror — KiP 1.4](https://www.apkmirror.com/?p=11922564)
- [Push Square review](https://pushsquare.com/reviews/ps4/knowledge_is_power), [Decades review](https://www.godisageek.com/reviews/knowledge-power-decades-review-sony-ps4-playlink/)
- [Kwishetwel — PlayLink status 2026](https://kwishetwel.com/en/blog/playlink-games), [Buzzin — games like KiP](https://playbuzzin.com/articles/games-like-knowledge-is-power)
- GitHub topics: [jackbox](https://github.com/topics/jackbox), [party-game](https://github.com/topics/party-game)
