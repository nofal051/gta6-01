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
runs the airfield and wants the harbour for herself, then for **Dario
Salas**, the boardwalk bookie who bankrolled half the city and wants
it back. Fourteen story missions across three arcs, and a city that
keeps paying between jobs: street races, courier deliveries, stunt
jumps, hidden crates, taxi fares, cash drops, bike wheelies and
fishing off the pier.

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
  a beach and waterfront, plus three districts: the **Solmar Airfield**
  (runway, terminal, hangar, parked planes), the **Harbour Port**
  (docks, stacked containers, cranes), and the **Boardwalk** (wooden
  planks, a pier out over the sea, five shop stalls, benches, beach
  umbrellas, and strollers ambling the boards).
- **Money & economy** — cash from missions, fares, packages, cash
  drops that respawn around the city, wheelie tricks and fishing.
  Spend it at **Solmar Motors**, the dealership: four cars for sale
  (one on special every run), engine/armor/paint upgrades, selling
  your oldest car back, and a $500 loan from Dario that costs $650
  to settle. Owned cars and debts survive in your save.
- **Weapons** — four guns with their own ammo, damage and fire rate:
  pistol, SMG, shotgun (five pellets a pull) and rifle. Buy them at
  **Bay Ammo** or find them in weapon crates around the city; press
  **V** to switch guns.
- **Motorcycles** — bikes park by the boardwalk, the park and street
  corners, and two riders cruise the traffic lanes. Steal one with
  **E** like any car; hold Shift over 300 speed to pop a wheelie and
  earn $2 a trickle from the crowd. Deliveries finished on a bike pay
  double.
- **Missions** — a 14-mission story in three arcs (Mara Voss, then Ilsa
  Crane, then Dario Salas), with markers, timers and cash rewards,
  including lose-the-tail jobs that end when the heat hits zero, a
  two-stage collection job, and a getaway job that only counts on a
  bike. Every completed job earns a text from the giver in your
  phone's inbox.
- **In-game phone** — press **T** for contacts (call a fixer for a
  reminder of the next job), services (call a cab for $20, call the
  mobile mechanic to repair your car for $50), stats (cash earned
  and spent, cars and guns owned, jobs, races, fish caught, debts)
  and inbox.
- **Fishing** — stand on the pier and press **J** to cast. Wait for
  the bite, press **J** again inside the window to reel in: mackerel,
  sardines, sea bass, a rare golden koi worth $150 — and, once in a
  while, an old boot.
- **Day & night** — the clock drives a real cycle: dusk, lamps switching
  on, headlight cones cutting through the dark, lit windows after sunset.
- **Weather** — clear skies, rain and full storms with lightning. Wet
  roads cut grip: cars slide, brake later, and leave skid marks.
- **On foot, by car and by bike** — walk with WASD/arrows (hold Shift to sprint),
  press **E** to enter a car or a bike. Stealing a traffic car is a crime. Six car
  kinds drive differently: sports cars are quick, vans and trucks are
  heavy, taxis cruise the streets; bikes are quicker off the line and
  faster at the top end.
- **Traffic and pedestrians** — AI cars cruise the lanes and turn at
  intersections; pedestrians (walkers, joggers, harbour workers,
  tourists, boardwalk strollers) stroll the sidewalks and flee from gunfire and speeding cars.
- **Wanted system (0–5 stars)** — stealing cars, hitting pedestrians,
  shooting and speeding near police raise the heat. Police cars chase
  and ram, foot cops chase and arrest; at 3 stars they set **roadblocks
  with spike strips**, at 4 stars a **police helicopter** circles
  overhead with a searchlight. Lay low and the heat decays.
- **Side activities** — two street-race circuits with checkpoint rings,
  courier deliveries from the harbour depot, three stunt-jump ramps that
  pay for airtime, and 12 hidden golden crates around the city.
- **Garage** — drive into the Solmar Garage and spend earned cash on
  engine levels (faster car), armor levels (less damage taken) and paint
  jobs. Upgrades stay with you, whatever car you steal next.
- **Combat** — four guns (mouse aim, click to shoot) with muzzle flash and
  tracers, and a melee punch (**F**). Shoot a car enough and it catches
  fire and explodes.
- **Radio** — press **R** in a car for four synthesized stations:
  Solmar FM (pop), Night Drive (synthwave), Harbour Jazz, and
  Boardwalk FM (surf).
- **HUD** — cash, wanted stars, health, stamina, weapon and ammo, speed, mission
  objective, race/delivery/fishing progress, radio station, weather and day
  phase, current district, activity tracker, and a live minimap (player, cars, police,
  helicopter, mission marker, garage, dealership, ammo shop, airfield).
- **Menus and save** — title screen, pause (**P**/Esc), game over,
  mission-complete banners; **three save slots** (press 1/2/3 on the
  title to continue, **G** in play to quick-save), best cash and missions
  completed saved in localStorage; mute (**M**); horn (**H**).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Sprint on foot · wheelie on a bike (over 300 speed) |
| E | Enter / exit car or bike |
| Mouse + click | Aim / shoot current gun |
| F | Punch |
| Q | Start next mission |
| T | Open / close phone (1 contacts · 2 services · 3 stats · 4 inbox) |
| V | Switch weapon |
| B | Open dealership (near Solmar Motors) |
| N | Open ammo shop (near Bay Ammo) |
| J | Cast / reel in while fishing on the pier |
| R | Radio on / change station (in a car) |
| G | Quick-save to slot 1 |
| H | Horn (in a car) |
| 1 / 2 / 3 | Load save slot (title) · buy engine/armor/paint (garage) · phone tabs |
| 1–9 | Buy cars/upgrades (dealership) · buy guns/ammo (ammo shop) |
| P / Esc | Pause · close garage / shop / phone |
| M | Mute |

## Screenshots

Staged deterministically with `?shot=title|play|chase|mission&seed=N` —
each shot fast-forwards the real simulation, so the frames are genuine
gameplay, not mock-ups. The chase shot is a four-star night storm with
the helicopter overhead; the mission shot runs Dario Salas' boardwalk
job, past the stalls and the pier.

## Layout

```
game/index.html         entry page
game/src/main.js        boot + game loop + screens + save slots
game/src/config.js      tuning constants
game/src/random.js      seeded RNG
game/src/world.js       city + airfield + port + boardwalk + collision
game/src/daynight.js    day/night cycle, lamps, headlights
game/src/weather.js     rain/storms, grip, lightning
game/src/radio.js       4 synth radio stations
game/src/savegame.js    3-slot save/load (owned cars, guns, debt, fish)
game/src/activities.js  races, deliveries, jumps, crates + bike bonus
game/src/garage.js      car upgrades + paint shop
game/src/economy.js     cash drops, dealership, loans, sell-back
game/src/weapons.js     4 guns, ammo, pickups, ammo shop
game/src/bikes.js       motorcycles, handling, wheelies
game/src/phone.js       contacts, services, stats, inbox
game/src/fishing.js     pier fishing mini-game
game/src/heli.js        police helicopter + roadblocks
game/src/player.js      on-foot and driving movement
game/src/vehicles.js    parked + traffic cars, car kinds + bike handling
game/src/pedestrians.js pedestrians who flee + boardwalk strollers
game/src/police.js      wanted system + police AI
game/src/missions.js    14-mission story, 3 arcs + taxi/packages
game/src/combat.js      pistol + melee + bullets + explosions
game/src/render.js      canvas rendering + night/rain + menus
game/src/hud.js         HUD + minimap + shops + phone panel
game/src/input.js       keyboard + mouse
game/src/audio.js       WebAudio synth SFX + music + radio notes
game/src/shots.js       deterministic screenshot staging
game/src/update.js      one fixed step of the whole game
main.ts                 hands the entry in (copies game/ + screenshots/,
                        writes dossier.json)
```

## License

MIT — see `LICENSE`.
