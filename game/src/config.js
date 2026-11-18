// Solmar Bay — the numbers that tune the game.
//
// One place for every balance value: how big the city is, how fast the
// player walks and cars drive, how long wanted stars last, what each job
// pays. The systems in the other modules read these and never hard-code
// a balance number of their own, so retuning the game means editing
// this file and nothing else.

// The city itself: 2600 by 1900 world units, roads 96 wide, blocks of
// 300 between road centrelines, one fixed step of 1/60 s per update.
export const WORLD_W = 2600;
export const WORLD_H = 1900;
export const ROAD = 96;
export const BLOCK = 300;
export const STEP = 1 / 60;

// localStorage keys for the saved best cash and completed mission count.
export const BEST_KEY = 'solmarbay.bestCash.v1';
export const MISSIONS_KEY = 'solmarbay.missions.v1';

// Movement: on-foot speed, health, and the car's acceleration, braking
// and top speeds (forward and reverse).
export const PLAYER_SPEED = 210;
export const PLAYER_HEALTH = 100;
export const CAR_ACCEL = 420;
export const CAR_BRAKE = 620;
export const CAR_MAX_SPEED = 520;
export const CAR_REVERSE_MAX = 180;

// How many traffic cars and pedestrians the city spawns at the start.
export const TRAFFIC_COUNT = 16;
export const PED_COUNT = 34;

// The wanted system: five stars at most, one star fading every
// 14 seconds of clean behaviour.
export const MAX_WANTED = 5;
export const WANTED_DECAY_SECONDS = 14;

// Combat: bullet speed and the pistol ammo a fresh run starts with.
export const BULLET_SPEED = 900;
export const PISTOL_AMMO_START = 24;

// Money: one payout per story mission, the taxi fare and the cash
// found in a street package.
export const MISSION_REWARDS = [150, 250, 400, 600, 1000];
export const TAXI_FARE = 60;
export const PACKAGE_REWARD = 40;

// The palette. Grass and park greens, beach sand, sea blue, asphalt
// with a yellow centre line, pale sidewalks, and a set of bright
// colours the buildings are painted from.
export const COLORS = {
  grass: '#5da24a',
  park: '#4c8f3e',
  sand: '#e8d29a',
  water: '#2e7fb8',
  road: '#3a3f46',
  roadLine: '#e8c93a',
  sidewalk: '#b9b3a4',
  building: ['#c96f4a', '#4a7fc9', '#c9a44a', '#7a5ac9', '#4ac9a8', '#c94a6e', '#8a9aa8'],
};
