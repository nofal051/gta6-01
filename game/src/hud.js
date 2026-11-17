// HUD: cash, health, ammo, wanted stars, speed, the mission objective and
// clock, plus a live minimap (player, cars, police, mission marker). The
// minimap is drawn from the real state, so it always matches the world.
import { WORLD_H, WORLD_W } from './config.js';

export function drawHUD(ctx, state, screen, best, camX, camY) {
  const p = state.player;
  if (screen === 'title') return;
  // Top bar.
  ctx.fillStyle = 'rgba(8,12,28,0.55)'; ctx.fillRect(0, 0, 1280, 46);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`$${p.cash}`, 18, 32);
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
  ctx.fillText(`Missions ${state.missions.done}/5`, 150, 30);
  // Wanted stars.
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < p.wanted ? '#ffd23d' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, 330 + i * 30, 22, 11);
  }
  // Clock (game time advances with play).
  const mins = Math.floor(state.clock % 1440);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`${hh}:${mm}`, 560, 32);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#cfe3ff';
  ctx.fillText('SOLMAR BAY', 640, 30);
  // Health + ammo, bottom left.
  ctx.fillStyle = 'rgba(8,12,28,0.55)'; ctx.fillRect(14, 648, 250, 58);
  ctx.fillStyle = '#ff6b5e'; ctx.fillRect(24, 662, 180 * (p.health / 100), 12);
  ctx.strokeStyle = '#fff'; ctx.strokeRect(24, 662, 180, 12);
  ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(p.health)}`, 24, 694);
  ctx.fillText(`AMMO ${p.ammo}`, 150, 694);
  // Speed, bottom right (when driving).
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(8,12,28,0.55)'; ctx.fillRect(1060, 648, 206, 58);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.22)} mph`, 1080, 688);
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#cfe3ff';
    ctx.fillText(p.car.name || 'Car', 1080, 700);
  }
  // Mission objective, top left under the bar.
  ctx.fillStyle = 'rgba(8,12,28,0.55)'; ctx.fillRect(14, 56, 430, 54);
  ctx.fillStyle = '#2f7bff'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText(state.missions.active ? 'MISSION' : 'FREE ROAM', 24, 76);
  ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif';
  wrapText(ctx, state.missions.text, 24, 96, 410);
  if (state.missions.timerMax > 0 && state.missions.active) {
    ctx.fillStyle = state.missions.timer < 15 ? '#ff6b5e' : '#ffd23d';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`⏱ ${Math.ceil(state.missions.timer)}s`, 380, 76);
  }
  // Banner (mission complete / failed).
  if (state.missions.bannerTimer > 0) {
    ctx.fillStyle = 'rgba(8,12,28,0.75)'; ctx.fillRect(390, 300, 500, 64);
    ctx.fillStyle = '#ffd23d'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state.missions.banner, 640, 342);
    ctx.textAlign = 'left';
  }
  // Controls hint, bottom centre.
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('WASD move/drive  •  E car  •  Click shoot  •  F punch  •  Q mission  •  P pause  •  M mute', 640, 712);
  ctx.textAlign = 'left';
  // Minimap, top right.
  const mw = 190; const mh = 140; const mx = 1280 - mw - 14; const my = 56;
  ctx.fillStyle = 'rgba(8,12,28,0.7)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#22301f'; ctx.fillRect(mx, my, mw, mh);
  const sx = mw / WORLD_W; const sy = mh / WORLD_H;
  ctx.fillStyle = '#3a3f46';
  for (const rx of state.world.roadsX) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
  for (const ry of state.world.roadsY) ctx.fillRect(mx, my + ry * sy, mw, 4);
  ctx.fillStyle = '#2e7fb8'; ctx.fillRect(mx + (WORLD_W - 110) * sx, my, 110 * sx, mh);
  if (state.missions.target) {
    ctx.fillStyle = '#2f7bff'; ctx.beginPath();
    ctx.arc(mx + state.missions.target.x * sx, my + state.missions.target.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const car of state.cars) {
    ctx.fillStyle = car.police ? '#ff3b30' : '#e8e8e8';
    ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#ffd23d'; ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.stroke();
  // Muted note.
  if (state.muted) { ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText('MUTED', 1180, 230); }
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr; const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

function wrapText(ctx, text, x, y, maxW) {
  // One HUD line: shorten with an ellipsis until it fits the panel.
  let line = text;
  while (line.length > 4 && ctx.measureText(line).width > maxW) line = `${line.slice(0, -5)}…`;
  ctx.fillText(line, x, y);
}
