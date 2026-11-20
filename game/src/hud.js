// The HUD — everything on screen that is not the world itself.
//
// Cash, health, ammo, wanted stars, the clock, the mission objective,
// the speedometer while driving, a controls hint, and a live minimap
// drawn from the real state (player, cars, police, mission marker), so
// it always matches the world. The title screen draws no HUD.
//
// Round two adds a second row to the top bar: the radio station while
// driving, the weather and day phase, and the activity tracker (races
// won, deliveries done, jumps, crates found). The garage menu, the
// helicopter warning and the save confirmation are drawn here too,
// since they are all screen-space panels.
import { WORLD_H, WORLD_W } from './config.js';
import { activitySummary } from './activities.js';
import { garageMenuLines } from './garage.js';
import { radioLabel } from './radio.js';
import { weatherLabel } from './weather.js';

// A five-pointed star at (x, y) with outer radius `r`.
function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// One line of HUD text: trim it with an ellipsis until it fits `maxW`.
function fitLine(ctx, text, x, y, maxW) {
  let line = text;
  while (line.length > 4 && ctx.measureText(line).width > maxW) {
    line = `${line.slice(0, -5)}…`;
  }
  ctx.fillText(line, x, y);
}

// The in-game clock is minutes since midnight, shown as HH:MM.
function clockText(clock) {
  const mins = Math.floor(clock % 1440);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function drawMinimap(ctx, state) {
  const p = state.player;
  const mw = 190;
  const mh = 140;
  const mx = 1280 - mw - 14;
  const my = 56;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(8,12,28,0.7)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#22301f';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#3a3f46';
  for (const rx of state.world.roadsX) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
  for (const ry of state.world.roadsY) ctx.fillRect(mx, my + ry * sy, mw, 4);
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(mx + (WORLD_W - 110) * sx, my, 110 * sx, mh);
  // The garage and the airport get a dot of their own.
  ctx.fillStyle = '#ff8c1a';
  ctx.fillRect(mx + state.garage.x * sx - 3, my + state.garage.y * sy - 3, 6, 6);
  ctx.fillStyle = '#7ad9ff';
  ctx.fillRect(mx + state.world.airport.x * sx - 3, my + state.world.airport.y * sy - 3, 6, 6);
  if (state.missions.target) {
    ctx.fillStyle = '#2f7bff';
    ctx.beginPath();
    ctx.arc(mx + state.missions.target.x * sx, my + state.missions.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.activities.race) {
    const race = state.activities.race;
    const next = race.checkpoints[race.at];
    if (next) {
      ctx.fillStyle = '#2fd94f';
      ctx.beginPath();
      ctx.arc(mx + next.x * sx, my + next.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const car of state.cars) {
    ctx.fillStyle = car.police ? '#ff3b30' : '#e8e8e8';
    ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  if (state.police.heli) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(mx + state.police.heli.x * sx, my + state.police.heli.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

export function drawHUD(ctx, state, screen, best, camX, camY) {
  const p = state.player;
  if (screen === 'title') return;

  // Top bar: cash, missions done, wanted stars, clock, city name.
  ctx.fillStyle = 'rgba(8,12,28,0.55)';
  ctx.fillRect(0, 0, 1280, 46);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`$${p.cash}`, 18, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Missions ${state.missions.done}/10`, 150, 30);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < p.wanted ? '#ffd23d' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, 330 + i * 30, 22, 11);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(clockText(state.clock), 560, 32);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('SOLMAR BAY', 640, 30);

  // Second row: radio, weather, day phase, activity tracker.
  ctx.fillStyle = 'rgba(8,12,28,0.45)';
  ctx.fillRect(0, 46, 1060, 26);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(p.car ? radioLabel(state.radio) : 'ON FOOT', 18, 64);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${weatherLabel(state.weather)} · ${state.daynight.phase}`, 220, 64);
  ctx.fillText(activitySummary(state.activities), 420, 64);

  // Helicopter warning, flashing above the controls hint, clear of
  // the minimap and the mission banner.
  if (state.police.heli) {
    const blink = Math.sin(state.time * 6) > 0;
    ctx.fillStyle = blink ? '#ff3b30' : 'rgba(255,59,48,0.45)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HELICOPTER OVERHEAD — LOSE THE HEAT', 640, 640);
    ctx.textAlign = 'left';
  }

  // Health and stamina bars, ammo, bottom left.
  ctx.fillStyle = 'rgba(8,12,28,0.55)';
  ctx.fillRect(14, 648, 250, 58);
  ctx.fillStyle = '#ff6b5e';
  ctx.fillRect(24, 662, 180 * (p.health / 100), 12);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(24, 662, 180, 12);
  ctx.fillStyle = '#2fd94f';
  ctx.fillRect(24, 678, 180 * (p.stamina / 100), 5);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(p.health)}`, 24, 700);
  ctx.fillText(`AMMO ${p.ammo}`, 150, 700);

  // Speedometer, bottom right, only while driving.
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(8,12,28,0.55)';
    ctx.fillRect(1060, 648, 206, 58);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.22)} mph`, 1080, 688);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(`${p.car.name || 'Car'} · ${p.car.kind || ''}`, 1080, 700);
  }

  // Mission objective, top left under the bar, with the timer when
  // the active job has one.
  ctx.fillStyle = 'rgba(8,12,28,0.55)';
  ctx.fillRect(14, 82, 430, 54);
  ctx.fillStyle = '#2f7bff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(state.missions.active ? 'MISSION' : 'FREE ROAM', 24, 102);
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  fitLine(ctx, state.missions.text, 24, 122, 410);
  if (state.missions.timerMax > 0 && state.missions.active) {
    ctx.fillStyle = state.missions.timer < 15 ? '#ff6b5e' : '#ffd23d';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`⏱ ${Math.ceil(state.missions.timer)}s`, 380, 102);
  }

  // Race and delivery progress, under the mission box.
  if (state.activities.race) {
    const race = state.activities.race;
    ctx.fillStyle = 'rgba(8,12,28,0.55)';
    ctx.fillRect(14, 142, 430, 30);
    ctx.fillStyle = '#2fd94f';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`RACE ${race.name}: ring ${race.at + 1}/${race.checkpoints.length} — ${Math.ceil(race.timer)}s`, 24, 163);
  } else if (state.activities.delivery) {
    ctx.fillStyle = 'rgba(8,12,28,0.55)';
    ctx.fillRect(14, 142, 430, 30);
    ctx.fillStyle = '#ff8c1a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`DELIVERY: reach the orange ring — ${Math.ceil(state.activities.delivery.timer)}s`, 24, 163);
  }

  // A big centre banner while a mission starts, completes or fails,
  // or an activity pays out.
  const banner = state.missions.bannerTimer > 0
    ? state.missions.banner
    : state.activities.bannerTimer > 0 ? state.activities.banner : '';
  if (banner) {
    ctx.fillStyle = 'rgba(8,12,28,0.75)';
    ctx.fillRect(390, 300, 500, 64);
    ctx.fillStyle = '#ffd23d';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(banner, 640, 342);
    ctx.textAlign = 'left';
  }

  // Garage menu, centre screen while the car is parked in the shop.
  if (state.garage.menuOpen) {
    const lines = garageMenuLines(state);
    ctx.fillStyle = 'rgba(8,12,28,0.88)';
    ctx.fillRect(340, 220, 600, 150);
    ctx.strokeStyle = '#ff8c1a';
    ctx.lineWidth = 3;
    ctx.strokeRect(340, 220, 600, 150);
    ctx.fillStyle = '#ff8c1a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(lines[0], 360, 252);
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    ctx.fillText(lines[1], 360, 282);
    ctx.fillText(lines[2], 360, 312);
    if (lines[3]) {
      ctx.fillStyle = '#7dff8a';
      ctx.fillText(lines[3], 360, 342);
    }
  }

  // Save confirmation, fading under the top bar.
  if (state.saveNoticeTimer > 0) {
    ctx.globalAlpha = Math.min(1, state.saveNoticeTimer);
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(state.saveNotice || 'Saved.', 520, 100);
    ctx.globalAlpha = 1;
  }

  // Controls hint along the bottom.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD move/drive • E car • Click shoot • F punch • Q mission • R radio • G save • H horn • P pause', 640, 712);
  ctx.textAlign = 'left';

  drawMinimap(ctx, state);

  // Muted note under the minimap.
  if (state.muted) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('MUTED', 1180, 230);
  }
}
