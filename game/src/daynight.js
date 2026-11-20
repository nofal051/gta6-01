// Day and night in Solmar Bay — the sun, the lamps, the headlights.
//
// The in-game clock (minutes since midnight, kept on the state) drives
// everything here. Daylight runs roughly 06:30 to 19:30; dusk and dawn
// blend in over an hour each side, and full night is dark enough that
// street lamps and car headlights matter. The renderer asks for the
// darkness factor (0 = noon, 1 = midnight) and paints its night layer
// from it; the lamps are drawn as pools of light, and cars get a
// headlight cone once the lamps switch on.
//
// Nothing here touches the DOM or the canvas. It is pure clock math
// plus a tiny state object, so the headless verifier can step it
// without a browser.

export function createDayNight() {
  return {
    darkness: 0,
    phase: 'day',
    lampsOn: false,
    // How far the sun sits above the horizon, -1..1. Negative at night.
    sunHeight: 1,
    // Minutes the current phase has lasted, for the HUD clock icon.
    phaseMinutes: 0,
  };
}

// Smooth blend between 0 and 1 across the [from, to] minute window.
function blend(minutes, from, to) {
  if (minutes <= from) return 0;
  if (minutes >= to) return 1;
  const t = (minutes - from) / (to - from);
  return t * t * (3 - 2 * t);
}

// Darkness for a clock reading in minutes. Day is 0, night is 1, and
// the two twilight hours ramp smoothly between them.
export function darknessAt(clockMinutes) {
  const m = ((clockMinutes % 1440) + 1440) % 1440;
  const dawn = blend(m, 330, 420);
  const dusk = blend(m, 1140, 1230);
  // Day when the dawn blend is done and the dusk blend has not begun.
  const daylight = dawn * (1 - dusk);
  // Before dawn the city is still night; after dusk it is night again.
  const night = m < 330 || m >= 1230 ? 1 : 0;
  const dark = night || 1 - daylight;
  return Math.max(0, Math.min(1, dark));
}

export function isNightAt(clockMinutes) {
  return darknessAt(clockMinutes) > 0.55;
}

// A short word for the HUD: DAY, DUSK, NIGHT or DAWN.
export function phaseNameAt(clockMinutes) {
  const m = ((clockMinutes % 1440) + 1440) % 1440;
  if (m >= 330 && m < 420) return 'DAWN';
  if (m >= 420 && m < 1140) return 'DAY';
  if (m >= 1140 && m < 1230) return 'DUSK';
  return 'NIGHT';
}

// Height of the sun above the horizon, -1 (midnight) to 1 (noon).
export function sunHeightAt(clockMinutes) {
  const m = ((clockMinutes % 1440) + 1440) % 1440;
  return Math.sin(((m - 360) / 1440) * Math.PI * 2);
}

export function updateDayNight(daynight, clockMinutes, dt) {
  const dark = darknessAt(clockMinutes);
  daynight.darkness = dark;
  daynight.sunHeight = sunHeightAt(clockMinutes);
  daynight.phase = phaseNameAt(clockMinutes);
  daynight.lampsOn = dark > 0.25;
  daynight.phaseMinutes += dt;
}

// Headlight reach in world units: longer cones the darker it gets.
export function headlightRange(darkness) {
  return 120 + darkness * 260;
}

// The radius of one street lamp's pool of light on the ground.
export function lampPoolRadius(darkness) {
  return 26 + darkness * 46;
}

// How strongly the night overlay tints the world (0 = none).
export function nightTint(darkness) {
  return darkness * 0.62;
}
