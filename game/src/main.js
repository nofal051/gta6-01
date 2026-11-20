// Boot and the one game loop.
//
// Screens: title, play, paused, game over. The loop runs the world in
// fixed 1/60 s steps, reads each frame's actions once, and paints every
// frame. With ?shot=title|play|chase|mission the game instead stages a
// scene through shots.js and sets window.__shotReady once it is painted,
// which is how the screenshots were taken.
//
// The title screen is also where saved runs come back: slots 1–3 load
// a saved run straight into play, and G during play quick-saves into
// slot 1. The radio (R), the horn (H) and the garage digits (1–3 while
// the garage menu is open) are all handled here, because they are
// screen-level decisions, not simulation steps.
import { BEST_KEY, CLOCK_START, MISSIONS_KEY, STEP } from './config.js';
import { createRandom, deriveRandom } from './random.js';
import { createWorld } from './world.js';
import { createPlayer, tryEnterCar } from './player.js';
import { createCars } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions, createSideWork, startMission } from './missions.js';
import { firePistol, meleeAttack } from './combat.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_ENTER_CAR,
  ACTION_HORN,
  ACTION_MELEE,
  ACTION_MISSION,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RADIO,
  ACTION_SAVE,
  ACTION_SLOT1,
  ACTION_SLOT2,
  ACTION_SLOT3,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { stepGame } from './update.js';
import { createDayNight } from './daynight.js';
import { createWeather } from './weather.js';
import { createRadio, cycleStation } from './radio.js';
import { createActivities } from './activities.js';
import { buyUpgrade, createGarage } from './garage.js';
import { applySnapshot, listSlots, readSlot, writeSlot } from './savegame.js';

// A tab that was hidden for a while must not simulate a huge catch-up.
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// Build one fresh run of the game: a seeded city, the player on the
// second road crossing, traffic, pedestrians, police, missions, side
// work and the round-two systems — day and night, weather, the radio,
// the activities, the garage — each from its own slice of the seed.
export function createGameState() {
  const world = createWorld(createRandom(seed));
  const spawn = { x: world.roadsX[1], y: world.roadsY[1] };
  return {
    seed,
    rng: deriveRandom(seed, 'game'),
    world,
    player: createPlayer(spawn.x, spawn.y),
    cars: createCars(deriveRandom(seed, 'cars'), world),
    peds: createPedestrians(deriveRandom(seed, 'peds'), world),
    police: createPolice(),
    missions: createMissions(),
    side: createSideWork(deriveRandom(seed, 'side'), world),
    activities: createActivities(deriveRandom(seed, 'acts'), world),
    garage: createGarage(world),
    daynight: createDayNight(),
    weather: createWeather(deriveRandom(seed, 'sky')),
    radio: createRadio(),
    bullets: [],
    particles: [],
    events: [],
    muzzle: { x: 0, y: 0, angle: 0, life: 0 },
    time: 0,
    clock: CLOCK_START,
    aimAngle: 0,
    muted: false,
    overReason: null,
    saveNotice: '',
    saveNoticeTimer: 0,
    slotLines: [],
  };
}

const state = createGameState();
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage off: the best is kept in memory for this session only.
  }
}

function loadDoneMissions() {
  try {
    return Number.parseInt(window.localStorage.getItem(MISSIONS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

// Stage a screenshot scene and paint it twice, then signal readiness.
function runShot(name) {
  state.slotLines = listSlots();
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  state.missions.done = loadDoneMissions();
  state.slotLines = listSlots();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  // Start a fresh run, or resume a saved one when `snap` is given.
  function startGame(snap) {
    const fresh = createGameState();
    Object.assign(state, fresh);
    state.missions.done = 0;
    if (snap) {
      applySnapshot(state, snap);
      announce(`Save loaded — $${state.player.cash}, ${state.missions.done} jobs done.`);
    } else {
      announce('Playing Solmar Bay. Press Q for your first job.');
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
  }

  function endGame(reason) {
    state.overReason = reason || state.overReason || 'wasted';
    screen = SCREEN_OVER;
    state.slotLines = listSlots();
    if (state.player.cash > best) {
      best = state.player.cash;
      saveBest(best);
    }
    announce(`Game over. Cash $${state.player.cash}. Best $${best}.`);
  }

  // Digits mean different things by screen: on the title they load a
  // save slot, in the open garage they buy upgrades.
  function handleDigits(actions) {
    if (screen === SCREEN_TITLE) {
      const slot = actions & ACTION_SLOT1 ? 1 : actions & ACTION_SLOT2 ? 2 : actions & ACTION_SLOT3 ? 3 : 0;
      if (slot > 0) {
        const snap = readSlot(slot);
        if (snap) startGame(snap);
        else announce(`Save slot ${slot} is empty.`);
      }
      return;
    }
    if (screen === SCREEN_PLAY && state.garage.menuOpen) {
      let result = null;
      if (actions & ACTION_SLOT1) result = buyUpgrade(state, 'engine', 0, audio);
      else if (actions & ACTION_SLOT2) result = buyUpgrade(state, 'armor', 0, audio);
      else if (actions & ACTION_SLOT3) {
        result = buyUpgrade(state, 'paint', state.garage.paintIndex, audio);
        state.garage.paintIndex += 1;
      }
      if (result) {
        state.garage.message = result.message;
        state.garage.messageTimer = 3;
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) state.muted = audio.toggleMute();

    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      handleDigits(actions);
      if (actions & ACTION_CONFIRM) startGame(null);
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        if (state.garage.menuOpen) {
          // Esc in the shop just closes the shop; the city goes on.
          state.garage.menuOpen = false;
          state.garage.dismissed = true;
          state.player.car.speed = 0;
        } else {
          screen = SCREEN_PAUSED;
          announce('Paused.');
        }
      } else {
        if (actions & ACTION_ENTER_CAR) tryEnterCar(state.player, state.cars, state.events);
        if (actions & ACTION_MELEE) meleeAttack(state, audio);
        if (actions & ACTION_MISSION) startMission(state, state.rng);
        if (actions & ACTION_RADIO && state.player.car) cycleStation(state.radio);
        if (actions & ACTION_HORN && state.player.car) audio.horn();
        if (actions & ACTION_SAVE) {
          const ok = writeSlot(1, state);
          state.saveNotice = ok ? 'Saved to slot 1 (G).' : 'Save failed — storage off.';
          state.saveNoticeTimer = 2.5;
        }
        handleDigits(actions);
        if (input.mouse.down) firePistol(state, audio);
        while (accumulator >= STEP) {
          const over = stepGame(state, input, audio, STEP);
          accumulator -= STEP;
          if (over) {
            endGame(over);
            break;
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  // Leaving the tab pauses the run rather than letting it run on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  announce('Solmar Bay. Press Space for a new game, or 1-3 to continue a save.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
