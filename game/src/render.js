// Rendering: everything the player sees, painted on one Canvas 2D. The
// camera follows the player; the world is drawn in layers (ground, roads,
// park and beach, buildings, props, markers, vehicles, people, effects)
// and the HUD and menus are drawn on top in screen space.
import { COLORS, ROAD, WORLD_H, WORLD_W } from './config.js';
import { drawHUD } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = 1280; canvas.height = 720;
  }
  resize();

  function drawCar(c, isPlayer) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-24, -12, 48, 26);
    ctx.fillStyle = c.color; ctx.fillRect(-22, -11, 44, 22);
    ctx.fillStyle = '#20242c'; ctx.fillRect(-8, -9, 14, 18);
    ctx.fillStyle = '#dfe8f2'; ctx.fillRect(14, -8, 5, 16);
    if (c.police) {
      ctx.fillStyle = '#ff3b30'; ctx.fillRect(-14, -11, 8, 5);
      ctx.fillStyle = '#2f7bff'; ctx.fillRect(-14, 6, 8, 5);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('POLICE', -20, 4);
    }
    if (isPlayer) { ctx.strokeStyle = '#ffd23d'; ctx.lineWidth = 2; ctx.strokeRect(-24, -13, 48, 26); }
    ctx.restore();
  }

  function draw(state, screen, best) {
    const p = state.player;
    const camX = Math.max(640, Math.min(WORLD_W - 640, p.x));
    const camY = Math.max(360, Math.min(WORLD_H - 360, p.y));
    ctx.clearRect(0, 0, 1280, 720);
    ctx.save();
    ctx.translate(640 - camX, 360 - camY);
    const w = state.world;
    // Ground.
    ctx.fillStyle = COLORS.grass; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = COLORS.park; ctx.fillRect(w.park.x, w.park.y, w.park.w, w.park.h);
    ctx.fillStyle = COLORS.sand; ctx.fillRect(w.beach.x, w.beach.y, w.beach.w, w.beach.h);
    ctx.fillStyle = COLORS.water; ctx.fillRect(w.water.x, w.water.y, w.water.w, w.water.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    for (let y = 40; y < WORLD_H; y += 90) { ctx.beginPath(); ctx.moveTo(w.water.x, y); ctx.lineTo(w.water.x + 60, y + 14); ctx.stroke(); }
    // Roads.
    ctx.fillStyle = COLORS.road;
    for (const rx of w.roadsX) ctx.fillRect(rx - ROAD / 2, 0, ROAD, WORLD_H);
    for (const ry of w.roadsY) ctx.fillRect(0, ry - ROAD / 2, WORLD_W, ROAD);
    // Lane dashes.
    ctx.strokeStyle = COLORS.roadLine; ctx.lineWidth = 3; ctx.setLineDash([18, 22]);
    for (const rx of w.roadsX) { ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); ctx.stroke(); }
    for (const ry of w.roadsY) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD_W, ry); ctx.stroke(); }
    ctx.setLineDash([]);
    // Buildings with windows.
    for (const b of w.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const cols = Math.max(2, Math.floor(b.w / 22)); const rows = Math.max(1, Math.min(b.floors, Math.floor(b.h / 22)));
      for (let cx = 0; cx < cols; cx += 1) for (let cy = 0; cy < rows; cy += 1) ctx.fillRect(b.x + 6 + cx * ((b.w - 12) / cols), b.y + 6 + cy * ((b.h - 12) / rows), 8, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x, b.y, b.w, 5);
    }
    // Trees and lamps.
    for (const t of w.trees) {
      ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d4c41'; ctx.fillRect(t.x - 2, t.y - 2, 4, 8);
    }
    ctx.fillStyle = '#ffd23d';
    for (const l of w.lamps) { ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill(); }
    // Cash packages.
    for (const pkg of state.side.packages) {
      if (pkg.taken) continue;
      ctx.fillStyle = '#ffd23d'; ctx.fillRect(pkg.x - 8, pkg.y - 8, 16, 16);
      ctx.fillStyle = '#7a5a00'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('$', pkg.x - 4, pkg.y + 4);
    }
    // Mission marker.
    if (state.missions.target) {
      const t = state.missions.target;
      const pulse = 26 + Math.sin(state.time * 4) * 6;
      ctx.strokeStyle = '#2f7bff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#2f7bff'; ctx.beginPath(); ctx.moveTo(t.x, t.y - 34); ctx.lineTo(t.x - 10, t.y - 14); ctx.lineTo(t.x + 10, t.y - 14); ctx.closePath(); ctx.fill();
    }
    // Taxi customer.
    if (state.side.taxi) {
      const t = state.side.taxi;
      ctx.fillStyle = t.state === 'riding' ? '#2f7bff' : '#ffd23d';
      ctx.beginPath(); ctx.arc(t.x, t.y - 18, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(t.state === 'riding' ? 'TAXI' : '?', t.x - 6, t.y - 14);
      if (t.dest) { ctx.strokeStyle = '#2f7bff'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(t.dest.x, t.dest.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    // Vehicles, people, bullets, particles.
    for (const car of state.cars) drawCar(car, car === p.car);
    for (const ped of state.peds) {
      ctx.fillStyle = ped.color; ctx.beginPath(); ctx.arc(ped.x, ped.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(ped.x, ped.y - 2, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const cop of state.police.cops) {
      ctx.fillStyle = '#1d4fd9'; ctx.beginPath(); ctx.arc(cop.x, cop.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23d'; ctx.fillRect(cop.x - 6, cop.y - 12, 12, 4);
    }
    if (p.onFoot) {
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16); ctx.stroke();
    }
    for (const b of state.bullets) { ctx.fillStyle = '#fff200'; ctx.fillRect(b.x - 3, b.y - 2, 6, 4); }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    drawHUD(ctx, state, screen, best, camX, camY);

    // Menus on top.
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(8,12,28,0.72)'; ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#ffd23d'; ctx.font = 'bold 84px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SOLMAR BAY', 640, 220);
      ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif';
      ctx.fillText('An open-world crime story — drive, steal, run, get rich.', 640, 272);
      ctx.font = '20px sans-serif'; ctx.fillStyle = '#cfe3ff';
      ctx.fillText('WASD drive / walk   •   E enter & steal cars   •   Click shoot   •   F punch', 640, 340);
      ctx.fillText('Q start a mission   •   P pause   •   M mute   •   Best cash saved', 640, 374);
      ctx.fillStyle = '#ffd23d'; ctx.font = 'bold 26px sans-serif';
      ctx.fillText(`Best cash: $${best}    •    Press SPACE or click to play`, 640, 440);
      ctx.fillStyle = '#9fb4d8'; ctx.font = '16px sans-serif';
      ctx.fillText('Original game — city, story and characters invented for this entry.', 640, 500);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8,12,28,0.6)'; ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PAUSED', 640, 340);
      ctx.font = '22px sans-serif'; ctx.fillText('Press P or Esc to keep playing', 640, 390);
      ctx.textAlign = 'left';
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(40,6,10,0.72)'; ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#ff6b5e'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(state.overReason === 'arrested' ? 'BUSTED' : 'WASTED', 640, 300);
      ctx.fillStyle = '#fff'; ctx.font = '26px sans-serif';
      ctx.fillText(`Cash: $${p.cash}   •   Missions done: ${state.missions.done}   •   Best cash: $${best}`, 640, 360);
      ctx.fillText('Press SPACE to play again', 640, 410);
      ctx.textAlign = 'left';
    }
  }
  return { draw };
}
