// Solmar Bay — every tuning number in one place.
//
// Balance lives here and nowhere else: the city size, movement speeds,
// the wanted clock, payouts, and the new systems' prices and timers
// (garage upgrades, races, deliveries, the helicopter). A module that
// needs a number imports it from here instead of inventing its own,
// so retuning the game is a one-file edit.
//
// Values the first release shipped with are kept where the modules
// interconnect on them (world size, road width, car speeds, mission
// payouts), so a saved game or a staged screenshot still behaves the
// way it did.

export const WORLD_W = 2600;
export const WORLD_H = 1900;
export const ROAD = 96;
export const BLOCK = 300;
export const STEP = 1 / 60;

// How far ahead the camera looks, and the largest single frame step.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const MAX_FRAME_DT = 0.25;

// localStorage keys for the saved best cash and completed mission count.
export const BEST_KEY = 'solmarbay.bestCash.v1';
export const MISSIONS_KEY = 'solmarbay.missions.v1';

// On foot: walk speed, sprint multiplier, stamina, health.
export const PLAYER_SPEED = 210;
export const PLAYER_SPRINT_MUL = 1.55;
export const PLAYER_STAMINA_MAX = 100;
export const PLAYER_HEALTH = 100;

// Driving: acceleration, braking and top speeds, forward and reverse.
export const CAR_ACCEL = 420;
export const CAR_BRAKE = 620;
export const CAR_MAX_SPEED = 520;
export const CAR_REVERSE_MAX = 180;

// How many traffic cars and pedestrians the city starts with.
export const TRAFFIC_COUNT = 16;
export const PED_COUNT = 34;

// Wanted: five stars at most, one star fading every 14 clean seconds.
export const MAX_WANTED = 5;
export const WANTED_DECAY_SECONDS = 14;
// The helicopter answers at four stars; roadblocks start at three.
export const HELI_WANTED = 4;
export const BLOCK_WANTED = 3;

// Combat: bullet speed, pistol ammo on a fresh run, punch damage.
export const BULLET_SPEED = 900;
export const PISTOL_AMMO_START = 24;
export const PUNCH_DAMAGE = 34;
export const BULLET_DAMAGE = 34;

// Money: one payout per story mission — ten jobs now, two arcs of five.
// The taxi fare and the cash found in a street package stay as before.
export const MISSION_REWARDS = [150, 250, 400, 600, 1000, 350, 500, 700, 900, 1500];
export const TAXI_FARE = 60;
export const PACKAGE_REWARD = 40;
// Side activities: race wins, courier drops, hidden crates, stunt jumps.
export const RACE_REWARDS = [300, 500];
export const DELIVERY_REWARD = 120;
export const CRATE_REWARD = 25;
export const JUMP_BASE_REWARD = 50;

// Garage: engine and armor prices per level, paint prices live in garage.js.
export const ENGINE_PRICES = [200, 450, 800];
export const ARMOR_PRICES = [300, 600];

// The clock: the run opens at 08:15 and advances two minutes a second.
export const CLOCK_START = 8 * 60 + 15;
export const CLOCK_RATE = 2;

// The palette. Grass and park greens, beach sand, sea blue, asphalt
// with a yellow centre line, pale sidewalks, and the bright colours
// buildings are painted from. Night and rain tint over the top of these.
export const COLORS = {
  grass: '#5da24a',
  park: '#4c8f3e',
  sand: '#e8d29a',
  water: '#2e7fb8',
  road: '#3a3f46',
  roadLine: '#e8c93a',
  sidewalk: '#b9b3a4',
  runway: '#2b2f36',
  container: ['#c94a4a', '#4a7fc9', '#c9a44a', '#4ac9a8', '#7a5ac9'],
  building: ['#c96f4a', '#4a7fc9', '#c9a44a', '#7a5ac9', '#4ac9a8', '#c94a6e', '#8a9aa8'],
};
