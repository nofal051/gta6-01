# Solmar Bay — Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nofal051/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nofal051/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)




A complete 2D top-down open-world crime game, built from scratch in plain
JavaScript on Canvas 2D — no libraries, no network requests, no borrowed
art, music or names. Everything (city, story, characters, sounds) is
original: the sun-soaked city of **Solmar Bay**, its fixer **Mara Voss**,
and a five-mission story chain.

## How to run

```sh
cd game
python3 -m http.server 8000
# open http://localhost:8000/index.html in desktop Chrome
```

Or serve `game/` with any static file server. The game runs fully offline.

## What is in the game

- **Open city** — seeded procedural road grid, building blocks, a park, a
  beach and waterfront, trees and lamps; camera follows the player.
- **On foot and by car** — walk with WASD/arrows, press **E** to enter a
  car (stealing a traffic car is a crime), drive with acceleration and
  steering.
- **Traffic and pedestrians** — AI cars cruise the lanes and turn at
  intersections; pedestrians stroll the sidewalks and flee from danger.
- **Wanted system (0–5 stars)** — stealing cars, hitting pedestrians,
  shooting and speeding near police raise the heat; police cars chase and
  ram, foot cops chase and arrest; lay low and the heat decays.
- **Missions** — a 5-mission story chain (learn to drive, pickup, timed
  delivery, lose-the-cops chase, finale) with markers, timers and cash
  rewards, plus taxi fares and cash packages as side work.
- **Combat** — pistol (mouse aim, click to shoot) with ammo, and a melee
  punch (**F**).
- **HUD** — cash, wanted stars, health, ammo, speed, mission objective,
  game clock, and a live minimap (player, cars, police, mission marker).
- **Menus and save** — title screen, pause (**P**/Esc), game over,
  mission-complete banners; best cash and missions completed saved in
  localStorage; mute (**M**); all sound effects and the bass music loop
  are synthesized with WebAudio — no audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| E | Enter / exit car |
| Mouse + click | Aim / shoot pistol |
| F | Punch |
| Q | Start next mission |
| P / Esc | Pause |
| M | Mute |

## Screenshots

Staged deterministically with `?shot=title|play|chase|mission&seed=N` —
each shot fast-forwards the real simulation, so the frames are genuine
gameplay, not mock-ups.

## Layout

```
game/index.html        entry page
game/src/main.js       boot + game loop + screens
game/src/config.js     tuning constants
game/src/random.js     seeded RNG
game/src/world.js      city generation + collision
game/src/player.js     on-foot and driving movement
game/src/vehicles.js   parked + traffic cars
game/src/pedestrians.js pedestrians who flee
game/src/police.js     wanted system + police AI
game/src/missions.js   5-mission story + taxi/packages
game/src/combat.js     pistol + melee + bullets
game/src/render.js     canvas rendering + menus
game/src/hud.js        HUD + minimap
game/src/input.js      keyboard + mouse
game/src/audio.js      WebAudio synth SFX + music
game/src/shots.js      deterministic screenshot staging
game/src/update.js     one fixed step of the whole game
main.ts                hands the entry in (copies game/ + screenshots/,
                       writes dossier.json)
```

## License

MIT — see `LICENSE`.
