// Rendering — everything the player sees, painted on one Canvas 2D.
//
// The camera follows the player. The world is painted in layers: ground
// (grass, park, beach, water, the airfield and the port), roads with
// dashed centrelines, buildings with windows, trees and lamps, the
// garage, skid marks, then the markers, vehicles, people, bullets and
// particles. After the world comes the weather and the night: rain
// streaks, lightning, lamp pools, headlight cones and the dark overlay
// that makes night feel like night. The HUD and the menus are drawn on
// top in screen space.
//
// Particles carry a kind — spark, flame, smoke or ring — so an
// explosion reads as fire and smoke, not just dots. Wrecked cars smoke
// where they sit. The helicopter is drawn above the world, its
// searchlight sweeping the street below it.
import { COLORS, ROAD, WORLD_H, WORLD_W } from './config.js';
import { drawHUD } from './hud.js';
import { headlightRange, lampPoolRadius, nightTint } from './daynight.js';
import { HANDLING } from './vehicles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const VIEW_W = 1280;
const VIEW_H = 720;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  // One car, drawn pointing along its angle: body sized by kind, cabin,
  // windshield, police lights, a taxi sign, and a gold outline when the
  // player is driving it. A wreck is dark, tilted and smoking.
  function drawCar(c, isPlayer) {
    const size = HANDLING[c.kind || 'sedan'];
    const w = size.w;
    const h = size.h;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle + (c.wrecked ? 0.12 : 0));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-w / 2 - 2, -h / 2 + 1, w + 4, h + 4);
    ctx.fillStyle = c.wrecked ? '#3a3a3a' : c.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#20242c';
    ctx.fillRect(-w / 6, -h / 2 + 2, w / 3, h - 4);
    ctx.fillStyle = '#dfe8f2';
    ctx.fillRect(w / 2 - 6, -h / 2 + 3, 5, h - 6);
    if (c.kind === 'taxi' && !c.wrecked) {
      ctx.fillStyle = '#ffd23d';
      ctx.fillRect(-6, -h / 2 - 4, 12, 5);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 5px sans-serif';
      ctx.fillText('TAXI', -5, -h / 2 + 1);
    }
    if (c.police) {
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(-w / 3, -h / 2, 8, 5);
      ctx.fillStyle = '#2f7bff';
      ctx.fillRect(-w / 3, h / 2 - 5, 8, 5);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('POLICE', -w / 2 + 2, 3);
    }
    if (isPlayer) {
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    }
    ctx.restore();
  }

  // A person: a coloured body circle with a head, plus a facing line
  // for the player on foot. Joggers lean forward; workers wear a vest.
  function drawPerson(x, y, color, angle, kind) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'worker') {
      ctx.fillStyle = '#ffd23d';
      ctx.fillRect(x - 7, y - 3, 14, 4);
    }
    if (angle !== undefined) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16);
      ctx.stroke();
    }
  }

  function drawGround(w) {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = COLORS.park;
    ctx.fillRect(w.park.x, w.park.y, w.park.w, w.park.h);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(w.beach.x, w.beach.y, w.beach.w, w.beach.h);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(w.water.x, w.water.y, w.water.w, w.water.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let y = 40; y < WORLD_H; y += 90) {
      ctx.beginPath();
      ctx.moveTo(w.water.x, y);
      ctx.lineTo(w.water.x + 60, y + 14);
      ctx.stroke();
    }
    // The airfield: tarmac, runway with dashes, terminal and hangar.
    const a = w.airport;
    ctx.fillStyle = '#6a7078';
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.fillStyle = COLORS.runway;
    ctx.fillRect(a.runway.x, a.runway.y, a.runway.w, a.runway.h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    ctx.moveTo(a.runway.x, a.runway.y + a.runway.h / 2);
    ctx.lineTo(a.runway.x + a.runway.w, a.runway.y + a.runway.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = a.terminal.color;
    ctx.fillRect(a.terminal.x, a.terminal.y, a.terminal.w, a.terminal.h);
    ctx.fillStyle = a.hangar.color;
    ctx.fillRect(a.hangar.x, a.hangar.y, a.hangar.w, a.hangar.h);
    ctx.fillStyle = '#cfe3ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SOLMAR AIRFIELD', a.x + 16, a.y + a.h - 14);
    for (const plane of a.planes) {
      ctx.save();
      ctx.translate(plane.x, plane.y);
      ctx.rotate(plane.angle);
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-26, -4, 52, 8);
      ctx.fillRect(-6, -20, 10, 40);
      ctx.fillStyle = '#2f7bff';
      ctx.fillRect(18, -3, 8, 6);
      ctx.restore();
    }
    // The port: concrete apron, containers, cranes, dock edge.
    const port = w.port;
    ctx.fillStyle = '#7a7568';
    ctx.fillRect(port.x, port.y, port.w, port.h);
    for (const box of port.containers) {
      ctx.fillStyle = box.color;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      if (box.stacked) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(box.x + 4, box.y - 10, box.w - 8, 8);
      }
    }
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 5;
    for (const crane of port.cranes) {
      ctx.beginPath();
      ctx.moveTo(crane.x, crane.y);
      ctx.lineTo(crane.x, crane.y - 70);
      ctx.lineTo(crane.x + 60, crane.y - 70);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(crane.x + 60, crane.y - 70);
      ctx.lineTo(crane.x + 60, crane.y - 30);
      ctx.stroke();
    }
    ctx.fillStyle = '#cfe3ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('HARBOUR PORT', port.x + 12, port.y + port.h - 12);
  }

  function drawRoads(w) {
    ctx.fillStyle = COLORS.road;
    for (const rx of w.roadsX) ctx.fillRect(rx - ROAD / 2, 0, ROAD, WORLD_H);
    for (const ry of w.roadsY) ctx.fillRect(0, ry - ROAD / 2, WORLD_W, ROAD);
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 22]);
    for (const rx of w.roadsX) {
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx, WORLD_H);
      ctx.stroke();
    }
    for (const ry of w.roadsY) {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(WORLD_W, ry);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawBuildings(w) {
    for (const b of w.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      const lit = w.litWindows !== false;
      ctx.fillStyle = lit ? 'rgba(255,240,170,0.85)' : 'rgba(255,255,255,0.75)';
      const cols = Math.max(2, Math.floor(b.w / 22));
      const rows = Math.max(1, Math.min(b.floors, Math.floor(b.h / 22)));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          ctx.fillRect(b.x + 6 + cx * ((b.w - 12) / cols), b.y + 6 + cy * ((b.h - 12) / rows), 8, 10);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x, b.y, b.w, 5);
    }
  }

  function drawProps(w, darkness) {
    for (const t of w.trees) {
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(t.x - 2, t.y - 2, 4, 8);
    }
    // Lamps glow at night; by day they are just dots.
    for (const l of w.lamps) {
      if (darkness > 0.25) {
        const radius = lampPoolRadius(darkness);
        const glow = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, radius);
        glow.addColorStop(0, 'rgba(255,210,61,0.5)');
        glow.addColorStop(1, 'rgba(255,210,61,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(l.x, l.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath();
      ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGarage(state) {
    const g = state.garage;
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = '#ff8c1a';
    ctx.fillRect(g.x, g.y, g.w, 14);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('GARAGE', g.x + 44, g.y + 11);
    ctx.strokeStyle = '#ff8c1a';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(g.x - 8, g.y - 8, g.w + 16, g.h + 16);
    ctx.setLineDash([]);
  }

  function drawSkids(state) {
    ctx.fillStyle = 'rgba(20,20,20,0.4)';
    for (const car of state.cars) {
      for (const skid of car.skidTrail || []) {
        ctx.globalAlpha = Math.max(0, skid.life);
        ctx.fillRect(skid.x - 3, skid.y - 3, 6, 6);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawRing(x, y, radius, color, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (label) {
      ctx.fillStyle = color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - radius - 8);
      ctx.textAlign = 'left';
    }
  }

  function drawMarkers(state) {
    for (const pkg of state.side.packages) {
      if (pkg.taken) continue;
      ctx.fillStyle = '#ffd23d';
      ctx.fillRect(pkg.x - 8, pkg.y - 8, 16, 16);
      ctx.fillStyle = '#7a5a00';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('$', pkg.x - 4, pkg.y + 4);
    }
    for (const crate of state.activities.collectibles) {
      if (crate.taken) continue;
      ctx.fillStyle = '#ff8c1a';
      ctx.fillRect(crate.x - 9, crate.y - 9, 18, 18);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('?', crate.x - 4, crate.y + 4);
    }
    for (const jump of state.activities.jumps) {
      ctx.fillStyle = '#2f7bff';
      ctx.fillRect(jump.x - jump.w / 2, jump.y - jump.h / 2, jump.w, jump.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('JUMP', jump.x - 20, jump.y + 4);
    }
    const race = state.activities.race;
    for (const r of state.activities.races) {
      if (r.active) continue;
      drawRing(r.start.x, r.start.y, 34, '#2fd94f', `RACE ${r.name}`);
    }
    if (race) {
      const next = race.checkpoints[race.at];
      if (next) drawRing(next.x, next.y, 30, '#2fd94f', `RING ${race.at + 1}/${race.checkpoints.length}`);
    }
    drawRing(state.activities.depot.x, state.activities.depot.y, 30, '#ff8c1a', 'COURIER');
    if (state.activities.delivery) {
      drawRing(state.activities.delivery.x, state.activities.delivery.y, 28, '#ff8c1a', 'DROP-OFF');
    }
    if (state.missions.target) {
      const t = state.missions.target;
      const pulse = 26 + Math.sin(state.time * 4) * 6;
      drawRing(t.x, t.y, pulse, '#2f7bff');
      ctx.fillStyle = '#2f7bff';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - 34);
      ctx.lineTo(t.x - 10, t.y - 14);
      ctx.lineTo(t.x + 10, t.y - 14);
      ctx.closePath();
      ctx.fill();
    }
    if (state.side.taxi) {
      const t = state.side.taxi;
      ctx.fillStyle = t.state === 'riding' ? '#2f7bff' : '#ffd23d';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(t.state === 'riding' ? 'TAXI' : '?', t.x - 6, t.y - 14);
      if (t.dest) drawRing(t.dest.x, t.dest.y, 18, '#2f7bff');
    }
    for (const block of state.police.blocks) {
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 6;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(block.x - Math.cos(block.angle) * 44, block.y - Math.sin(block.angle) * 44);
      ctx.lineTo(block.x + Math.cos(block.angle) * 44, block.y + Math.sin(block.angle) * 44);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('SPIKES', block.x - 20, block.y - 30);
    }
  }

  function drawActors(state) {
    const p = state.player;
    for (const car of state.cars) drawCar(car, car === p.car);
    for (const ped of state.peds) drawPerson(ped.x, ped.y, ped.color, undefined, ped.kind);
    for (const cop of state.police.cops) {
      ctx.fillStyle = '#1d4fd9';
      ctx.beginPath();
      ctx.arc(cop.x, cop.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23d';
      ctx.fillRect(cop.x - 6, cop.y - 12, 12, 4);
    }
    if (p.onFoot) {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcf3d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
      ctx.stroke();
    }
    // Muzzle flash: a bright star at the barrel, gone in a blink.
    if (state.muzzle && state.muzzle.life > 0) {
      const mz = state.muzzle;
      ctx.fillStyle = '#fff200';
      ctx.beginPath();
      ctx.arc(mz.x, mz.y, 10 + mz.life * 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.arc(mz.x, mz.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of state.bullets) {
      ctx.strokeStyle = '#fff200';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
      if (pt.kind === 'ring') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size + (0.8 - pt.life) * 40, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.kind === 'smoke') {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (1.6 - pt.life * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // The helicopter, above the world, searchlight sweeping the street.
    const heli = state.police.heli;
    if (heli) {
      ctx.save();
      ctx.translate(heli.spotX, heli.spotY);
      ctx.fillStyle = 'rgba(255,240,170,0.16)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(heli.x, heli.y);
      ctx.rotate(heli.angle);
      ctx.fillStyle = '#1d4fd9';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe8f2';
      ctx.beginPath();
      ctx.arc(8, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      const rotor = heli.rotor % Math.PI;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(rotor) * 30, -Math.sin(rotor) * 30);
      ctx.lineTo(Math.cos(rotor) * 30, Math.sin(rotor) * 30);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('POLICE HELI', heli.x - 34, heli.y - 24);
    }
  }

  function drawHeadlights(state, darkness) {
    if (darkness <= 0.25) return;
    const rangeLen = headlightRange(darkness);
    const cars = state.player.car ? [state.player.car, ...state.police.cars] : state.police.cars;
    for (const car of cars) {
      const noseX = car.x + Math.cos(car.angle) * 22;
      const noseY = car.y + Math.sin(car.angle) * 22;
      const grad = ctx.createLinearGradient(noseX, noseY, noseX + Math.cos(car.angle) * rangeLen, noseY + Math.sin(car.angle) * rangeLen);
      grad.addColorStop(0, 'rgba(255,240,170,0.35)');
      grad.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = grad;
      ctx.save();
      ctx.translate(noseX, noseY);
      ctx.rotate(car.angle);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(rangeLen, -70);
      ctx.lineTo(rangeLen, 70);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawNightAndRain(state) {
    const darkness = state.daynight.darkness;
    if (darkness > 0.02) {
      ctx.fillStyle = `rgba(4,6,26,${nightTint(darkness)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (state.weather.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.weather.flash * 0.22})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (state.weather.drops.length > 0) {
      ctx.strokeStyle = 'rgba(200,220,255,0.5)';
      ctx.lineWidth = 1;
      for (const drop of state.weather.drops) {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - state.weather.wind * 0.03, drop.y + drop.len);
        ctx.stroke();
      }
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8,12,28,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffd23d';
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLMAR BAY', 640, 190);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.fillText('An open-world crime story — drive, steal, run, get rich.', 640, 240);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText('WASD drive / walk • Shift sprint • E enter & steal cars • Click shoot • F punch', 640, 300);
    ctx.fillText('Q mission • R radio • G save • H horn • P pause • M mute', 640, 332);
    ctx.fillStyle = '#ffd23d';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`Best cash: $${best}    •    Press SPACE for a new game`, 640, 392);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    const slots = state.slotLines || [];
    slots.forEach((line, i) => {
      ctx.fillText(line.text, 640, 436 + i * 26);
    });
    ctx.fillStyle = '#9fb4d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('10 missions, street races, deliveries, stunt jumps, a garage, day & night, rain — all original.', 640, 540);
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8,12,28,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 340);
    ctx.font = '22px sans-serif';
    ctx.fillText('Press P or Esc to keep playing', 640, 390);
    ctx.textAlign = 'left';
  }

  function drawOver(state, best) {
    const p = state.player;
    ctx.fillStyle = 'rgba(40,6,10,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.overReason === 'arrested' ? 'BUSTED' : 'WASTED', 640, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '26px sans-serif';
    ctx.fillText(`Cash: $${p.cash}   •   Missions done: ${state.missions.done}   •   Best cash: $${best}`, 640, 360);
    ctx.fillText('Press SPACE to play again', 640, 410);
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    const p = state.player;
    const camX = Math.max(640, Math.min(WORLD_W - 640, p.x));
    const camY = Math.max(360, Math.min(WORLD_H - 360, p.y));
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(640 - camX, 360 - camY);
    const w = state.world;
    const darkness = state.daynight.darkness;
    drawGround(w);
    drawRoads(w);
    drawBuildings(w);
    drawProps(w, darkness);
    drawGarage(state);
    drawSkids(state);
    drawMarkers(state);
    drawActors(state);
    drawHeadlights(state, darkness);
    ctx.restore();

    drawNightAndRain(state);
    drawHUD(ctx, state, screen, best, camX, camY);

    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw };
}
