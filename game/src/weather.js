// Weather over Solmar Bay — clear skies, rain and full storms.
//
// Weather drifts on its own clock: a spell lasts a few minutes, then
// the sky rolls a new one. Rain is more than a visual: wet roads cut
// grip, so cars slide further and brake later, and a storm cuts
// visibility and throws lightning across the sky. The drops themselves
// are particles the renderer streaks across the screen; the module
// only tracks where they fall and how hard.
//
// Grip is the number the driving code cares about: 1.0 on dry roads,
// down to about 0.62 in a storm. Everything is seeded, so a staged
// screenshot with ?shot= always gets the same sky.

export const WEATHER_KINDS = ['clear', 'rain', 'storm'];

export function createWeather(rng) {
  return {
    kind: 'clear',
    // 0 = dry, 1 = full storm. Rain sits around 0.5.
    intensity: 0,
    // Seconds until the sky is allowed to roll a new spell.
    spellTimer: 150 + rng() * 120,
    // Falling drops in screen-relative offsets; the renderer places them.
    drops: [],
    // Lightning flash 0..1, decaying after a strike.
    flash: 0,
    // Set true for exactly one step when lightning strikes; the step
    // that sees it plays the thunder and clears it.
    thunder: false,
    // Seconds since the last strike, for spacing strikes apart.
    sinceStrike: 0,
    // Rolling wind that slants the rain sideways.
    wind: 0,
  };
}

// Grip multiplier for the current weather: dry 1.0, rain ~0.8, storm ~0.62.
export function gripFactor(weather) {
  return 1 - weather.intensity * 0.38;
}

// How far the player can see: storms haze the distance.
export function visibilityFactor(weather) {
  return 1 - weather.intensity * 0.35;
}

// One word for the HUD weather readout.
export function weatherLabel(weather) {
  if (weather.kind === 'storm') return 'STORM';
  if (weather.kind === 'rain') return 'RAIN';
  return 'CLEAR';
}

// Pick the next spell, weighted so clear skies are the most common.
function rollSpell(rng) {
  const roll = rng();
  if (roll < 0.55) return 'clear';
  if (roll < 0.85) return 'rain';
  return 'storm';
}

function targetIntensity(kind) {
  if (kind === 'storm') return 1;
  if (kind === 'rain') return 0.55;
  return 0;
}

// Keep the drop list full for the current intensity. Drops are just
// falling offsets; the renderer draws them as streaks.
function refillDrops(weather, rng) {
  const want = Math.floor(weather.intensity * 90);
  while (weather.drops.length < want) {
    weather.drops.push({
      x: rng() * 1280,
      y: rng() * 720,
      speed: 620 + rng() * 260,
      len: 12 + rng() * 14,
    });
  }
  if (weather.drops.length > want) weather.drops.length = want;
}

export function updateWeather(weather, rng, dt) {
  weather.spellTimer -= dt;
  weather.sinceStrike += dt;
  if (weather.spellTimer <= 0) {
    weather.kind = rollSpell(rng);
    weather.spellTimer = 120 + rng() * 180;
    weather.wind = (rng() - 0.5) * 160;
  }
  const target = targetIntensity(weather.kind);
  const rate = target > weather.intensity ? dt / 8 : dt / 20;
  weather.intensity += Math.max(-rate, Math.min(rate, target - weather.intensity));
  refillDrops(weather, rng);

  for (const drop of weather.drops) {
    drop.y += drop.speed * dt;
    drop.x += weather.wind * dt;
    if (drop.y > 720) {
      drop.y = -20;
      drop.x = rng() * 1280;
    }
    if (drop.x < -30) drop.x = 1280;
    if (drop.x > 1310) drop.x = 0;
  }

  // Lightning only in a storm, at least six seconds apart.
  weather.thunder = false;
  if (weather.kind === 'storm' && weather.sinceStrike > 6 && rng() < dt * 0.09) {
    weather.flash = 1;
    weather.thunder = true;
    weather.sinceStrike = 0;
  }
  if (weather.flash > 0) weather.flash = Math.max(0, weather.flash - dt * 2.2);
}

// Force a spell from outside (screenshot staging, or a debug hook).
// The intensity snaps at once so the staged frame shows the sky asked for.
export function setWeather(weather, kind) {
  weather.kind = kind;
  weather.intensity = targetIntensity(kind);
  weather.spellTimer = 240;
  if (kind === 'storm') weather.flash = 0.4;
  const rng = () => 0.5;
  refillDrops(weather, rng);
}
