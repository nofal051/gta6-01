// Boot and the one game loop.
//
// Screens: title, play, paused, game over. The loop runs the world in
// fixed 1/60 s steps, reads each frame's actions once, and paints every
// frame. With ?shot=title|play|chase|mission the game instead stages a
// scene through shots.js and sets window.__shotReady once it is painted,
// which is how the screenshots were taken.
import { BEST_KEY, MISSIONS_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createPlayer, tryEnterCar } from './player.js';
import { createCars } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions, createSideWork, startMission } from './missions.js';
import { firePistol, meleeAttack } from './combat.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_MELEE, ACTION_MISSION, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { stepGame } from './update.js';

// A tab that was hidden for a while must not simulate a huge catch-up.
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);

// Build one fresh run of the game: a seeded city, the player on the
// second road crossing, traffic, pedestrians, police, missions and
// side work, all from their own slices of the seed.
export function createGameState() {
  const world = createWorld(createRandom(seed));
  const spawn = { x: world.roadsX[1], y: world.roadsY[1] };
  return {
    seed,
    rng: createRandom(seed + 7),
    world,
    player: createPlayer(spawn.x, spawn.y),
    cars: createCars(createRandom(seed + 11), world),
    peds: createPedestrians(createRandom(seed + 23), world),
    police: createPolice(),
    missions: createMissions(createRandom(seed + 31)),
    side: createSideWork(createRandom(seed + 47), world),
    bullets: [],
    particles: [],
    events: [],
    time: 0,
    clock: 8 * 60 + 15,
    aimAngle: 0,
    muted: false,
    overReason: null,
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
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    const fresh = createGameState();
    Object.assign(state, fresh);
    state.missions.done = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Solmar Bay. Press Q for your first job.');
  }

  function endGame(reason) {
    state.overReason = reason || state.overReason || 'wasted';
    screen = SCREEN_OVER;
    if (state.player.cash > best) {
      best = state.player.cash;
      saveBest(best);
    }
    announce(`Game over. Cash $${state.player.cash}. Best $${best}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) state.muted = audio.toggleMute();

    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        if (actions & ACTION_ENTER_CAR) tryEnterCar(state.player, state.cars, state.events);
        if (actions & ACTION_MELEE) meleeAttack(state, audio);
        if (actions & ACTION_MISSION) startMission(state, state.rng);
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
  announce('Solmar Bay. Press Space or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
