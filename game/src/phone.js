// The in-game phone — contacts, a cab, a mechanic, and your stats.
//
// Press T and the phone slides up over the city. It is a pause for
// the player's hands, not for the city: while it is open the player
// cannot drive, but traffic, police and the clock keep moving, so
// calling a cab in the middle of a chase is a bad idea.
//
// Three tabs, switched with 1–3 while the phone is open:
//
//   CONTACTS — Mara Voss, Ilsa Crane and Dario Salas, the three
//     fixers. Calling one does not change the story; it replays
//     their last word to you, so a player who forgot what the next
//     job is can ask instead of guessing.
//   SERVICES — a cab (the taxi drives to you, $20, then works like
//     any taxi fare), and the mobile mechanic (repairs the car you
//     are sitting in to full health for $50).
//   STATS — cash earned and spent, cars owned, guns owned, jobs
//     done, races won, deliveries done, jumps landed, crates found,
//     and the best cash this device has seen.
//
// The phone never touches the network and never leaves the game: a
// call is a line of text and, for the two services, a small effect
// on the live state.
import { REPAIR_FEE, TAXI_CALL_FEE } from './config.js';
import { nearestRoadPoint } from './world.js';

export const PHONE_TABS = ['contacts', 'services', 'stats', 'inbox'];

// The three fixers, with the line each of them leaves you with.
export const PHONE_CONTACTS = [
  { name: 'Mara Voss', role: 'Harbour fixer', line: 'Mara: "The harbour pays on time. Keep it that way."' },
  { name: 'Ilsa Crane', role: 'Airfield boss', line: 'Ilsa: "The airfield is mine. The harbour is next."' },
  { name: 'Dario Salas', role: 'Boardwalk bookie', line: 'Dario: "The boardwalk never sleeps, and neither do my debts."' },
];

export const PHONE_SERVICES = [
  { name: 'Call a cab', price: TAXI_CALL_FEE, text: 'A taxi is on its way to you.' },
  { name: 'Mobile mechanic', price: REPAIR_FEE, text: 'Mechanic on the way — car repaired to full.' },
];

export function createPhone() {
  return {
    open: false,
    tab: 0,
    selected: 0,
    message: '',
    messageTimer: 0,
    moveCooldown: 0,
    // Last call, for the stats tab's flavour line.
    lastCall: '',
    // Texts from the fixers, newest last, capped at eight.
    inbox: [],
  };
}

// A fixer texts the player — after a job, usually. The inbox keeps
// the last eight, so the phone remembers what the city said.
export function pushPhoneMessage(state, from, text) {
  const inbox = state.phone.inbox;
  inbox.push(`${from}: "${text}"`);
  if (inbox.length > 8) inbox.shift();
}

// Open the phone, or close it. Closing clears the message.
export function togglePhone(phone) {
  phone.open = !phone.open;
  if (!phone.open) phone.message = '';
  else phone.message = 'Phone — 1 contacts · 2 services · 3 stats · 4 inbox · T close';
  phone.messageTimer = 4;
  return phone.open;
}

// Switch tabs with 1–3 while the phone is open.
export function phoneTab(phone, index) {
  if (index < 0 || index >= PHONE_TABS.length) return false;
  phone.tab = index;
  phone.selected = 0;
  return true;
}

// What the phone knows about the next job: the fixer's name, the
// job's name, and which part of the city it points at. Contacts
// repeat it when called, so a player who forgot the objective can
// ask instead of guessing.
export function phoneHint(state) {
  const m = state.missions;
  if (m.index >= 14) return 'No more jobs — the city is yours. Races and deliveries still pay.';
  const names = ['Mara Voss', 'Ilsa Crane', 'Dario Salas'];
  const arc = m.index < 5 ? 0 : m.index < 10 ? 1 : 2;
  const districts = ['marina', 'park', 'harbour', 'city', 'beach', 'airfield', 'port', 'city', 'beach', 'port', 'boardwalk', 'dealership', 'pier', 'boardwalk'];
  const jobNames = ['First Wheels', 'The Pickup', 'Hot Delivery', 'Lose the Tail', 'The Ledger', 'Airfield Run', 'Port Manifest', 'Interceptors', 'The Informant', 'King of the Bay', 'Beachfront Debt', 'Boardwalk Run', 'The Getaway Bike', 'King of the Boardwalk'];
  return `Next: ${jobNames[m.index]} for ${names[arc]} — head for the ${districts[m.index]}.`;
}

// The line the phone shows for the currently selected row.
export function phoneRowText(phone) {
  if (phone.tab === 0) return PHONE_CONTACTS[phone.selected % PHONE_CONTACTS.length].line;
  if (phone.tab === 1) return PHONE_SERVICES[phone.selected % PHONE_SERVICES.length].text;
  return '';
}

// Call the selected row. Contacts just talk back; services charge
// cash and do something in the world. Returns { ok, message }.
export function callSelected(state, audio) {
  const phone = state.phone;
  const p = state.player;
  if (phone.tab === 0) {
    const contact = PHONE_CONTACTS[phone.selected % PHONE_CONTACTS.length];
    phone.lastCall = contact.name;
    // A fixer called on the phone repeats their line, then reminds
    // the player what the next job is.
    phone.message = `${contact.line} ${phoneHint(state)}`;
    phone.messageTimer = 5;
    if (audio && audio.pickup) audio.pickup();
    return { ok: true, message: phone.message };
  }
  if (phone.tab === 1) {
    const service = PHONE_SERVICES[phone.selected % PHONE_SERVICES.length];
    if (phone.selected === 0) {
      // A cab: charge the fee, then wave a taxi fare in next to the
      // player, exactly like the street taxi in missions.js.
      if (p.cash < service.price) return { ok: false, message: `Need $${service.price} to call a cab` };
      if (state.side.taxi) return { ok: false, message: 'A cab is already on its way' };
      p.cash -= service.price;
      state.economy.spent += service.price;
      const spot = nearestRoadPoint(state.world, p.x + 200, p.y + 120);
      state.side.taxi = { x: spot.x, y: spot.y, dest: null, state: 'waiting', timer: 60 };
      state.side.taxiCooldown = 10;
      phone.lastCall = 'Cab';
      phone.message = 'Cab dispatched — look for the waving local nearby.';
      phone.messageTimer = 4;
      if (audio && audio.cash) audio.cash();
      return { ok: true, message: phone.message };
    }
    // The mechanic: repairs the car the player is sitting in.
    if (!p.car) return { ok: false, message: 'No car to repair — get in one first' };
    if (p.car.hp >= 100) return { ok: false, message: 'Your car is already in perfect shape' };
    if (p.cash < service.price) return { ok: false, message: `Need $${service.price} for the mechanic` };
    p.cash -= service.price;
    state.economy.spent += service.price;
    p.car.hp = 100;
    p.car.wrecked = false;
    phone.lastCall = 'Mechanic';
    phone.message = 'Mechanic came by — car repaired to full health.';
    phone.messageTimer = 4;
    if (audio && audio.cash) audio.cash();
    return { ok: true, message: phone.message };
  }
  return { ok: false, message: 'Nothing to call on the stats tab' };
}

// Move the selection up or down inside the current tab.
export function phoneMove(phone, dir) {
  const count = phone.tab === 0 ? PHONE_CONTACTS.length : phone.tab === 1 ? PHONE_SERVICES.length : 1;
  phone.selected = (phone.selected + dir + count) % count;
}

// The stats lines the HUD draws on the phone's stats tab.
export function phoneStatsLines(state, best) {
  const p = state.player;
  const a = state.activities;
  return [
    `Cash on hand $${p.cash} — earned $${state.economy.earned} · spent $${state.economy.spent}`,
    `Jobs done ${state.missions.done}/14 — best cash $${best}`,
    `Cars owned ${state.economy.owned.length} — guns owned ${Object.keys(state.weapons.owned).length}/4`,
    `Races won ${a.racesWon} · deliveries ${a.deliveriesDone} · jumps ${a.jumpsDone} · crates ${a.collectibles.filter((c) => c.taken).length}/${a.collectibles.length}`,
    `Fish caught ${state.fishing.caught} ($${state.fishing.earned})${state.fishing.best ? ` · best: ${state.fishing.best}` : ''}`,
    state.economy.debt > 0 ? `Owe Dario $${state.economy.debt} — settle it at Solmar Motors.` : 'No debts. Dario approves.',
    `Wanted ${p.wanted} star${p.wanted === 1 ? '' : 's'} — health ${Math.ceil(p.health)}`,
    state.phone.lastCall ? `Last call: ${state.phone.lastCall}` : 'No calls yet — try the services tab.',
  ];
}

// Tick the phone's message timer down. While it is open, the arrow
// keys move the selection inside the current tab, with a short
// cooldown so one held key does not scroll through every row.
export function updatePhone(state, dt, input) {
  if (state.phone.messageTimer > 0) state.phone.messageTimer -= dt;
  if (!state.phone.open || !input) return;
  if (state.phone.moveCooldown > 0) state.phone.moveCooldown -= dt;
  if (state.phone.moveCooldown > 0) return;
  if (input.isDown('ArrowUp')) {
    phoneMove(state.phone, -1);
    state.phone.moveCooldown = 0.22;
  } else if (input.isDown('ArrowDown')) {
    phoneMove(state.phone, 1);
    state.phone.moveCooldown = 0.22;
  }
}
