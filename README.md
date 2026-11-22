# makefun-heist-game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/shion8120/makefun-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/shion8120/makefun-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**The Clockwork Vault — a top-down heist game.** Break into a museum at night,
grab the Clockwork Crown, and get out before the alarm countdown ends. Walk
over loot (paintings, gems, coins) to raise your take — and your noise. Laser
grids sweep on timers, security cameras rotate with visible cones, and guards
patrol and chase if they spot you. Alarm levels run 0 to 3: at 3 the vault
seals in 30 seconds and extra guards arrive. Cut the power at a breaker box
for 10 quiet seconds, find the 4-digit code note hidden in the office, open
the keypad door to the vault room, and escape through the delivery dock with
the crown for the full ending. Two hand-designed floors (gallery and vault)
connected by stairs, a score screen with loot value, time, times seen, and a
rank (Cat Burglar / Professional / Smash and Grab). Drawn entirely in code
(canvas 2D), no external assets, no network requests, with WebAudio beeps,
alarm whoops and a success sting generated in code.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 — WASD or arrow keys to move, Shift to sneak,
P to pause, R to restart.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=rapid-harbor-82-9149&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
