// Combat: a pistol (mouse aim, click to fire) and a melee punch (F).
// Bullets fly straight, spark on buildings, hurt pedestrians and cops, and
// firing in public raises the wanted level. Punching is quieter but close.
import { BULLET_SPEED } from './config.js';
import { addWanted } from './player.js';
import { scarePedestrians } from './pedestrians.js';

export function createBullets() { return []; }

export function firePistol(state, audio) {
  const p = state.player;
  if (p.ammo <= 0 || p.onFoot === false) return false;
  p.ammo -= 1;
  const aim = state.aimAngle;
  state.bullets.push({ x: p.x + Math.cos(aim) * 20, y: p.y + Math.sin(aim) * 20, vx: Math.cos(aim) * BULLET_SPEED, vy: Math.sin(aim) * BULLET_SPEED, life: 0.9 });
  audio.shot();
  scarePedestrians(state.peds, p.x, p.y, 320);
  addWanted(p, 1, state.events);
  return true;
}

export function meleeAttack(state, audio) {
  const p = state.player;
  if (!p.onFoot) return;
  audio.punch();
  const reach = 46;
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < reach) {
      ped.state = 'flee';
      const d = Math.hypot(ped.x - p.x, ped.y - p.y) || 1;
      ped.fleeX = (ped.x - p.x) / d; ped.fleeY = (ped.y - p.y) / d; ped.pause = 2.5;
      state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -30, life: 0.4, color: '#ffd23d', size: 5 });
      addWanted(p, 1, state.events);
    }
  }
  for (const cop of state.cops) {
    if (Math.hypot(cop.x - p.x, cop.y - p.y) < reach) {
      cop.health -= 34;
      addWanted(p, 1, state.events);
    }
  }
}

export function updateBullets(state, world, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    // Hit a pedestrian.
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
        ped.state = 'flee';
        const d = Math.hypot(ped.x - b.x, ped.y - b.y) || 1;
        ped.fleeX = (ped.x - b.x) / d; ped.fleeY = (ped.y - b.y) / d; ped.pause = 2.5;
        b.life = 0;
        state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -40, life: 0.5, color: '#ff5a4d', size: 6 });
        addWanted(state.player, 1, state.events);
      }
    }
    for (const cop of state.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < 14) {
        cop.health -= 34; b.life = 0;
        addWanted(state.player, 1, state.events);
      }
    }
    // Spark off a building.
    for (const bd of world.buildings) {
      if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) {
        b.life = 0;
        state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, color: '#ffd23d', size: 4 });
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}
