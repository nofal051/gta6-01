// The in-car radio — four synthesized stations, no audio files.
//
// The radio only plays while the player is driving, and only once the
// player switches it on (R). Each station is a step sequencer over a
// short pattern of notes, played through the shared audio synth, so a
// station has a recognisable sound without any recorded music:
//
//   SOLMAR FM — bright major-key pop arpeggios, the daytime station.
//   NIGHT DRIVE — low synthwave pulse for driving after dark.
//   HARBOUR JAZZ — lazy swing chords for cruising the waterfront.
//   BOARDWALK FM — breezy surf-rock shuffle for the beach, added in
//     round three with the boardwalk district.

export const STATIONS = [
  { name: 'SOLMAR FM', tag: 'POP', stepMs: 170, wave: 'square', gain: 0.035 },
  { name: 'NIGHT DRIVE', tag: 'SYNTH', stepMs: 240, wave: 'sawtooth', gain: 0.03 },
  { name: 'HARBOUR JAZZ', tag: 'JAZZ', stepMs: 300, wave: 'triangle', gain: 0.04 },
  { name: 'BOARDWALK FM', tag: 'SURF', stepMs: 200, wave: 'square', gain: 0.032 },
];
//
// Switching station plays a short burst of static first, the way a
// car radio does. The module owns the schedule; audio.js owns the
// actual oscillators, through the playNote hook it exposes.

// Note patterns as semitone offsets from a root; 0 means rest.
// A2 = 110 Hz is the root for the first two stations, C3 for jazz.
const PATTERNS = [
  // SOLMAR FM: cheerful climb, rests on the off-beats.
  [0, 4, 7, 12, 7, 4, 0, 7, 9, 12, 9, 7, 4, 0, -5, 0],
  // NIGHT DRIVE: low pulsing minor line.
  [0, 0, 3, 0, 0, 5, 0, 3, 0, 0, -2, 0, 0, 7, 5, 3],
  // HARBOUR JAZZ: wandering sevenths.
  [0, 7, 10, 7, 4, 0, 10, 7, 5, 7, 10, 12, 10, 7, 4, 0],
  // BOARDWALK FM: a surf shuffle, quick up-down runs off the root.
  [0, 12, 7, 12, 0, 7, 10, 7, 12, 7, 4, 7, 5, 7, 12, 0],
];

const ROOTS = [220, 110, 130.81, 196];

export function createRadio() {
  return {
    on: false,
    station: 0,
    step: 0,
    timer: 0,
    // Seconds of static still to play after a switch.
    staticTimer: 0,
  };
}

export function radioLabel(radio) {
  if (!radio.on) return 'RADIO OFF';
  const s = STATIONS[radio.station % STATIONS.length];
  return `${s.name} · ${s.tag}`;
}

export function currentStation(radio) {
  return STATIONS[radio.station % STATIONS.length];
}

// R: switch on, then cycle stations. Returns the new label.
export function cycleStation(radio) {
  if (!radio.on) {
    radio.on = true;
    radio.station = 0;
  } else {
    radio.station = (radio.station + 1) % STATIONS.length;
  }
  radio.step = 0;
  radio.timer = 0;
  radio.staticTimer = 0.35;
  return radioLabel(radio);
}

export function toggleRadio(radio) {
  radio.on = !radio.on;
  radio.staticTimer = radio.on ? 0.35 : 0;
  radio.step = 0;
  return radioLabel(radio);
}

// Advance the sequencer. `audio` is the shared synth from audio.js;
// `driving` gates playback so the radio never plays on foot. The
// muted flag lives on the state, and the audio object honours it.
export function updateRadio(radio, audio, dt, driving, muted) {
  if (!radio.on || !driving || muted) return;
  if (radio.staticTimer > 0) {
    radio.staticTimer -= dt;
    if (Math.random() < dt * 22) audio.staticBurst();
    return;
  }
  const station = currentStation(radio);
  radio.timer += dt * 1000;
  if (radio.timer < station.stepMs) return;
  radio.timer -= station.stepMs;
  const pattern = PATTERNS[radio.station % PATTERNS.length];
  const offset = pattern[radio.step % pattern.length];
  radio.step += 1;
  if (offset === null || offset === undefined) return;
  const freq = ROOTS[radio.station % ROOTS.length] * Math.pow(2, offset / 12);
  audio.playNote(freq, station.stepMs / 1000, station.wave, station.gain);
  // Every fourth step a quiet fifth above, for a fuller chord.
  if (radio.step % 4 === 1) {
    audio.playNote(freq * 1.5, station.stepMs / 1000, 'sine', station.gain * 0.5);
  }
}
