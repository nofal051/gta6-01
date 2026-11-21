// Save and load — three slots in localStorage, plus continue.
//
// The title screen lists the slots and their contents; pressing 1, 2
// or 3 there resumes that slot, and G during play saves the current
// run into slot 1 (the quick slot). A snapshot holds everything that
// makes a run yours: cash, health, ammo, wanted level, where the
// story stands, where the player stands, the clock, the garage
// upgrades, and which cash packages and hidden crates are already
// taken. Traffic and police are not saved — they respawn fresh around
// the player, which is how the city always feels alive on load.
//
// All storage access is wrapped: a browser with storage off, or a
// headless verifier with a stub, simply gets empty slots.

export const SAVE_PREFIX = 'solmarbay.save.v2.slot';
export const SAVE_SLOT_COUNT = 3;

function slotKey(n) {
  return `${SAVE_PREFIX}.${n}`;
}

function storageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// A plain snapshot of the run, safe to stringify.
export function snapshotFrom(state) {
  const p = state.player;
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    cash: p.cash,
    health: Math.round(p.health),
    ammo: p.ammo,
    wanted: p.wanted,
    x: Math.round(p.x),
    y: Math.round(p.y),
    clock: Math.round(state.clock),
    missionsDone: state.missions.done,
    missionIndex: state.missions.index,
    engine: p.upgrades.engine,
    armor: p.upgrades.armor,
    paint: p.upgrades.paint,
    packagesTaken: state.side.packages.map((pkg) => pkg.taken),
    cratesTaken: state.activities.collectibles.map((c) => c.taken),
    racesWon: state.activities.racesWon,
    deliveriesDone: state.activities.deliveriesDone,
    jumpsDone: state.activities.jumpsDone,
    // Round three: the economy and the armoury. Old saves (without
    // these fields) load with an empty garage and a pistol, so a
    // saved run never loses its progress to a new field.
    ownedCars: state.economy.owned,
    earned: state.economy.earned,
    spent: state.economy.spent,
    debt: state.economy.debt,
    fishingCaught: state.fishing.caught,
    fishingEarned: state.fishing.earned,
    dropsTaken: state.economy.drops.map((d) => d.taken),
    weaponsOwned: state.weapons.owned,
    weaponCurrent: state.weapons.current,
    weaponPickupsTaken: state.weapons.pickups.map((pk) => pk.taken),
  };
}

// Write a snapshot into slot n (1-based). Returns true on success.
export function writeSlot(n, state) {
  if (n < 1 || n > SAVE_SLOT_COUNT) return false;
  return storageSet(slotKey(n), JSON.stringify(snapshotFrom(state)));
}

// Read slot n, or null when it is empty or unreadable.
export function readSlot(n) {
  if (n < 1 || n > SAVE_SLOT_COUNT) return null;
  const raw = storageGet(slotKey(n));
  if (!raw) return null;
  try {
    const snap = JSON.parse(raw);
    if (!snap || snap.version !== 2) return null;
    return snap;
  } catch {
    return null;
  }
}

export function hasSave(n) {
  return readSlot(n) !== null;
}

// One line per slot for the title screen, e.g. "1 — $850 · 3 jobs · 14:20".
export function listSlots() {
  const lines = [];
  for (let n = 1; n <= SAVE_SLOT_COUNT; n += 1) {
    const snap = readSlot(n);
    if (!snap) {
      lines.push({ slot: n, empty: true, text: `${n} — empty slot` });
    } else {
      const hh = String(Math.floor((snap.clock % 1440) / 60)).padStart(2, '0');
      const mm = String(snap.clock % 60).padStart(2, '0');
      lines.push({
        slot: n,
        empty: false,
        text: `${n} — $${snap.cash} · ${snap.missionsDone} jobs done · ${hh}:${mm}`,
        snap,
      });
    }
  }
  return lines;
}

// Apply a snapshot onto a live state. The player is put back on foot
// at the saved spot, with a fresh car nearby to steal, and the story
// resumes at the saved job. Returns false when the snapshot is bad.
export function applySnapshot(state, snap) {
  if (!snap || snap.version !== 2) return false;
  const p = state.player;
  p.cash = snap.cash;
  p.health = snap.health;
  p.ammo = snap.ammo;
  p.wanted = 0;
  p.wantedTimer = 0;
  p.x = snap.x;
  p.y = snap.y;
  p.onFoot = true;
  p.car = null;
  p.angle = -Math.PI / 2;
  state.clock = snap.clock;
  state.missions.done = snap.missionsDone;
  state.missions.index = snap.missionIndex;
  state.missions.active = false;
  state.missions.target = null;
  state.missions.text = 'Press Q to start the next job.';
  p.upgrades.engine = snap.engine || 0;
  p.upgrades.armor = snap.armor || 0;
  p.upgrades.paint = snap.paint || null;
  snap.packagesTaken.forEach((taken, i) => {
    if (state.side.packages[i]) state.side.packages[i].taken = !!taken;
  });
  snap.cratesTaken.forEach((taken, i) => {
    if (state.activities.collectibles[i]) state.activities.collectibles[i].taken = !!taken;
  });
  state.activities.racesWon = snap.racesWon || 0;
  state.activities.deliveriesDone = snap.deliveriesDone || 0;
  state.activities.jumpsDone = snap.jumpsDone || 0;
  // Round three fields, all optional for old saves.
  state.economy.owned = snap.ownedCars || [];
  state.economy.earned = snap.earned || 0;
  state.economy.spent = snap.spent || 0;
  state.economy.debt = snap.debt || 0;
  state.fishing.caught = snap.fishingCaught || 0;
  state.fishing.earned = snap.fishingEarned || 0;
  if (snap.dropsTaken) {
    snap.dropsTaken.forEach((taken, i) => {
      if (state.economy.drops[i]) state.economy.drops[i].taken = !!taken;
    });
  }
  if (snap.weaponsOwned) {
    state.weapons.owned = snap.weaponsOwned;
    state.weapons.current = snap.weaponCurrent || 'pistol';
    p.ammo = (state.weapons.owned[state.weapons.current] || { ammo: 24 }).ammo;
  }
  if (snap.weaponPickupsTaken) {
    snap.weaponPickupsTaken.forEach((taken, i) => {
      if (state.weapons.pickups[i]) state.weapons.pickups[i].taken = !!taken;
    });
  }
  // Bought cars come back: park each owned car on the dealership
  // forecourt so the player can drive it away after loading.
  const d = state.economy.dealer;
  state.economy.owned.forEach((owned, i) => {
    const car = state.cars.find((c) => c.id === owned.id);
    if (car) return;
    const restored = {
      id: owned.id,
      x: d.x + 30 + (i % 3) * 60,
      y: d.y + d.h + 34,
      angle: 0,
      speed: 0,
      color: owned.color,
      name: owned.name,
      kind: owned.kind,
      hp: 100,
      wrecked: false,
      traffic: false,
      parked: true,
      police: false,
      axis: 'x',
      dir: 1,
      lane: 0,
      driver: 'none',
      skidTrail: [],
    };
    state.cars.push(restored);
  });
  state.overReason = null;
  return true;
}
