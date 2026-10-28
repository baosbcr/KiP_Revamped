# KiP Revamped — game design (living draft)

Timings are placeholders. They get tuned once the game runs.

## Pillars
1. **No waiting.** Gameplay effects apply instantly on phones. Shows play in *dead time* or in parallel,
   and nothing plays one player after another, so the game doesn't get slower with more players.
2. **One body, many faces.** One shared rig and animation set. Players differ by mask (selfie), colours and
   body sliders. See `prototypes/avatar-viewer`.
3. **Server is the referee.** Phones send *intents*, the server decides, and the TV only renders.

**Dead time** = after a player has locked in an answer, and the whole topic-wheel phase.

## Loop (draft)
Lobby → [topic wheel → stage with the answer options → debuff boxes thrown and exploded → question → reveal] × N
→ special rounds → finale. The move into the question stage has no animation for now.
**Ground portals are the transition for everything** (answer lock-in, round changes).

## Topic wheel (replaces KiP's doors + Power Play menu)
- The categories on offer (the KiP "doors") become chunks of a wheel of fortune. Each has a base size,
  and **each vote enlarges that chunk**. Chance always decides; votes only tilt the odds.
- The wheel spins for a fixed time, then **stops abruptly** at timeout. The chunk under the pointer is the next topic.
- **Wheel powers**: handed out at random at game start, one use each, playable while the wheel spins.

| Power | Effect |
|---|---|
| **Inverse** | Swaps the size of the player's picked chunk with the chunk that is largest *right now*, so inverses ping-pong. Several players can fire it until the wheel stops. If theirs is already the largest, the token isn't spent |
| **Overwrite x** | Relabels x% of a random chunk (possibly their own) with the player's category. x is rolled when the power is received. The new chunk can be targeted by Inverse. With two chunks of one category, Inverse uses the largest |
| **Bump** | Adds a last burst of spin speed (still stops at timeout) and **knocks a Wedge out** |
| **Reverse** | Reverses the spin direction. No effect on a wedged wheel |
| **Wedge** (bow / spear / knife toss) | Pins the wheel in place. Other powers still apply until timeout |

## Question stage
- When a player locks in, a portal opens under them and they jump in. The TV shows *who* has answered,
  but not *what*, so nobody can copy.
- At the reveal, everyone pops out of a portal at the answer zone they picked. The right zone lights up, and the
  characters on it celebrate while the others react.

## Special rounds
- Sorting, Linking (+ more ideas to come).
- Transition: portals, as everywhere else. Gag: one random character floats *up* instead of falling in.

## Debuffs: box delivery
Happens after the wheel stops, with the characters already standing at the answer options.
1. A player picks a debuff, and a box with it appears in front of their character. **The box front shows meme
   art that identifies the debuff**, so before the explosion you can read your own stack and see what's coming.
2. Each player throws their box onto the target's head. The target holds it overhead, later boxes
   stack on top, and the target crouches more with each box.
3. A player who is already holding boxes can't throw. A floor button appears next to them, and stepping on
   it catapults their box to the target.
4. At the end, the host explodes all boxes at once. The contents rain down, and each debuff has its own ink
   colour that stains the character (mask/body tint). The effects then apply on phones.
- Throws are staggered **1 s apart** (to be tuned).
- Box size has to keep the meme readable on the TV. The victim's phone can also show their incoming stack
  at full size, since it's their private screen.
- **Debuff cap per player**: still to tune, so one player can't be bombed with an impossible stack.
- Needs: an "arms up, holding" pose (small Blender job, or IK on the arms), and a crouch blended by box count.

## Gags (cosmetic)
- Special animations are granted at random now and then, and can be used in dead time. Example: walk up,
  cough, pull a blaster, shoot. The victim is flung off-screen, their mask stays behind, and they run back
  and pick it up. The run-back can overlap the next question.
- They play on the player's own character, in parallel. A two-character gag locks its target until it ends.

## Other ideas
- 8–16+ players, teams, and an audience mode where extra phones vote or heckle.
- More challenge types: estimation slider, ordering/timeline, picture questions.
- Power intensity setting (off / mild / chaos), following feedback on *Decades*.
- The Pyramid finale stays as the signature, with the climb shown on the TV.
- Remote play: the same room code over the internet.
- A pack editor + import (CSV/JSON), with community packs living in the repo.
- (Future) The host can also be a player.

## How simultaneous powers stay robust
- The server keeps the wheel as a simulation (angle, speed, direction, wedged, chunks) and runs on one event
  loop. Messages are handled one at a time in arrival order, so two powers can never apply "at once".
- Each power is a one-use token with an ID. The server checks the phase, that the player owns the token, that it
  hasn't been used, and that it arrived before the cutoff (by server clock). Then it marks it used and applies it.
  A duplicate tap or a late tap gets rejected ("too late!").
- Each change is broadcast with a sequence number, and the TV animates in that order. A short on-screen log
  ("Ana inverted! Rui inverted it back!") makes the chaos readable.
- A short lock (~0.3 s) before the stop lets the last effect be seen on screen.

## Open questions
- **Overwrite x**: is x% a share of the chosen chunk, or of the whole wheel?
- **Debuff cap**: is it a fixed number of boxes, or scaled to the player's lead (leaders can take more)?
- **Meme art**: real memes are copyrighted images, which is a problem for a game we publish. Original
  meme-style art, or CC-licensed images, avoids that.
