# Solmar Bay — Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nofal051/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nofal051/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is a complete 2D top-down open-world crime game, written from
scratch in plain JavaScript on Canvas 2D — no libraries, no build step,
no network requests, no borrowed art, music or names. Everything in it
(the sun-soaked city, the two fixers, the cars, the sounds) is original,
made for make.fun's **gta6-01** bounty.

You are a driver for hire who falls in with the wrong people. Run jobs
for **Mara Voss**, who runs the harbour, then for **Ilsa Crane**, who
runs the airfield and wants the harbour for herself. Ten story missions
across two arcs, and a city that keeps paying between jobs: street
races, courier deliveries, stunt jumps, hidden crates, taxi fares.

## How to run

```sh
cd game
python3 -m http.server 8000
# open http://localhost:8000/index.html in desktop Chrome
```

Any static file server works. The game runs fully offline — every sound
is synthesized with WebAudio, every sprite is drawn in code.

## What is in the game

- **Open city** — a seeded procedural road grid with buildings, a park,
  a beach and waterfront, plus two new districts: the **Solmar Airfield**
  (runway, terminal, hangar, parked planes) and the **Harbour Port**
  (docks, stacked containers, cranes).
- **Day & night** — the clock drives a real cycle: dusk, lamps switching
  on, headlight cones cutting through the dark, lit windows after sunset.
- **Weather** — clear skies, rain and full storms with lightning. Wet
  roads cut grip: cars slide, brake later, and leave skid marks.
- **On foot and by car** — walk with WASD/arrows (hold Shift to sprint),
  press **E** to enter a car. Stealing a traffic car is a crime. Six car
  kinds drive differently: sports cars are quick, vans and trucks are
  heavy, taxis cruise the streets.
- **Traffic and pedestrians** — AI cars cruise the lanes and turn at
  intersections; pedestrians (walkers, joggers, harbour workers,
  tourists) stroll the sidewalks and flee from gunfire and speeding cars.
- **Wanted system (0–5 stars)** — stealing cars, hitting pedestrians,
  shooting and speeding near police raise the heat. Police cars chase
  and ram, foot cops chase and arrest; at 3 stars they set **roadblocks
  with spike strips**, at 4 stars a **police helicopter** circles
  overhead with a searchlight. Lay low and the heat decays.
- **Missions** — a 10-mission story in two arcs (Mara Voss, then Ilsa
  Crane), with markers, timers and cash rewards, including lose-the-tail
  jobs that end when the heat hits zero.
- **Side activities** — two street-race circuits with checkpoint rings,
  courier deliveries from the harbour depot, three stunt-jump ramps that
  pay for airtime, and 12 hidden golden crates around the city.
- **Garage** — drive into the Solmar Garage and spend earned cash on
  engine levels (faster car), armor levels (less damage taken) and paint
  jobs. Upgrades stay with you, whatever car you steal next.
- **Combat** — pistol (mouse aim, click to shoot) with muzzle flash and
  tracers, and a melee punch (**F**). Shoot a car enough and it catches
  fire and explodes.
- **Radio** — press **R** in a car for three synthesized stations:
  Solmar FM (pop), Night Drive (synthwave) and Harbour Jazz.
- **HUD** — cash, wanted stars, health, stamina, ammo, speed, mission
  objective, race/delivery progress, radio station, weather and day
  phase, activity tracker, and a live minimap (player, cars, police,
  helicopter, mission marker, garage, airfield).
- **Menus and save** — title screen, pause (**P**/Esc), game over,
  mission-complete banners; **three save slots** (press 1/2/3 on the
  title to continue, **G** in play to quick-save), best cash and missions
  completed saved in localStorage; mute (**M**); horn (**H**).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Sprint on foot |
| E | Enter / exit car |
| Mouse + click | Aim / shoot pistol |
| F | Punch |
| Q | Start next mission |
| R | Radio on / change station (in a car) |
| G | Quick-save to slot 1 |
| H | Horn (in a car) |
| 1 / 2 / 3 | Load save slot (title) · buy engine/armor/paint (garage) |
| P / Esc | Pause · close garage menu |
| M | Mute |

## Screenshots

Staged deterministically with `?shot=title|play|chase|mission&seed=N` —
each shot fast-forwards the real simulation, so the frames are genuine
gameplay, not mock-ups. The chase shot is a four-star night storm with
the helicopter overhead; the mission shot runs the airfield job.

## Layout

```
game/index.html         entry page
game/src/main.js        boot + game loop + screens + save slots
game/src/config.js      tuning constants
game/src/random.js      seeded RNG
game/src/world.js       city + airfield + port + collision
game/src/daynight.js    day/night cycle, lamps, headlights
game/src/weather.js     rain/storms, grip, lightning
game/src/radio.js       3 synth radio stations
game/src/savegame.js    3-slot save/load
game/src/activities.js  races, deliveries, jumps, crates
game/src/garage.js      car upgrades + paint shop
game/src/heli.js        police helicopter + roadblocks
game/src/player.js      on-foot and driving movement
game/src/vehicles.js    parked + traffic cars, car kinds
game/src/pedestrians.js pedestrians who flee
game/src/police.js      wanted system + police AI
game/src/missions.js    10-mission story, 2 arcs + taxi/packages
game/src/combat.js      pistol + melee + bullets + explosions
game/src/render.js      canvas rendering + night/rain + menus
game/src/hud.js         HUD + minimap + garage menu
game/src/input.js       keyboard + mouse
game/src/audio.js       WebAudio synth SFX + music + radio notes
game/src/shots.js       deterministic screenshot staging
game/src/update.js      one fixed step of the whole game
main.ts                 hands the entry in (copies game/ + screenshots/,
                        writes dossier.json)
```

## License

MIT — see `LICENSE`.
