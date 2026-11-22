// The thief: walking and sneaking with WASD or the arrows, the noise every step and every grab
// makes, picking up loot by walking over it, taking the stairs, and slipping out by the dock.
import { HUD_H } from './floors.js';
import { inShadow, moveCircle, tileAtPoint } from './geometry.js';
import { hearNoise } from './security.js';

const RUN_SPEED = 150;
const SNEAK_SPEED = 78;
const RUN_NOISE = 16;
const PICKUP_REACH = 22;

export function createPlayer(x, y) {
  return {
    x, y, r: 10, facing: 0,
    take: 0, lootCount: 0, weight: 0,
    hasNote: false, hasCrown: false,
    sneaking: false, moving: false, hidden: false,
    stepClock: 0, stairLock: false, grabFlash: 0,
  };
}

/** How far a noise of this loudness (0-100) carries, in pixels. */
export function hearingRadius(noise) {
  return 22 + noise * 2.6;
}

export function moveDirection(input) {
  let dx = 0;
  let dy = 0;
  if (input.isDown('KeyA') || input.isDown('ArrowLeft')) dx -= 1;
  if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;
  if (input.isDown('KeyW') || input.isDown('ArrowUp')) dy -= 1;
  if (input.isDown('KeyS') || input.isDown('ArrowDown')) dy += 1;
  return { dx, dy };
}

/** One frame of the thief: move, make noise, grab loot, use stairs, reach the exit. */
export function updatePlayer(state, input, dt) {
  const p = state.player;
  const floor = state.floors[state.floorIndex];
  const { dx, dy } = moveDirection(input);
  p.sneaking = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  p.moving = dx !== 0 || dy !== 0;
  if (p.moving) {
    const len = Math.hypot(dx, dy);
    const speed = (p.sneaking ? SNEAK_SPEED : RUN_SPEED) * (1 - p.weight);
    moveCircle(floor, p, (dx / len) * speed * dt, (dy / len) * speed * dt);
    p.facing = Math.atan2(dy, dx);
    if (!p.sneaking) {
      state.noise = Math.max(state.noise, RUN_NOISE);
      p.stepClock += dt;
    }
  }
  p.hidden = inShadow(floor, p.x, p.y);
  p.grabFlash = Math.max(0, p.grabFlash - dt);
  grabLoot(state, floor);
  takeStairs(state, floor);
  if (floor.hasExit && tileAtPoint(floor, p.x - p.r, p.y) === 'D') state.events.push({ type: 'escape' });
}

function grabLoot(state, floor) {
  const p = state.player;
  for (const item of floor.loot) {
    if (item.taken) continue;
    if (Math.hypot(item.x - p.x, item.y - p.y) > p.r + PICKUP_REACH) continue;
    item.taken = true;
    if (item.kind === 'note') p.hasNote = true;
    if (item.kind === 'crown') p.hasCrown = true;
    if (item.value > 0) p.lootCount += 1;
    p.take += item.value;
    p.weight = Math.min(0.3, p.weight + item.weight);
    p.grabFlash = 0.5;
    state.noise = Math.min(100, state.noise + item.noise);
    if (item.noise > 0) hearNoise(state, floor, p.x, p.y, hearingRadius(state.noise));
    state.popups.push({
      x: item.x, y: item.y - 10, life: 1.6,
      text: item.kind === 'note' ? `CODE ${state.code}` : `+$${item.value.toLocaleString('en-US')} ${item.label}`,
      colour: item.kind === 'note' ? '#f4ead0' : '#ffd45c',
    });
    state.events.push({ type: 'loot', kind: item.kind });
  }
}

function takeStairs(state, floor) {
  const p = state.player;
  const onStairs = tileAtPoint(floor, p.x, p.y) === 'S';
  if (!onStairs) {
    p.stairLock = false;
    return;
  }
  if (p.stairLock) return;
  state.floorIndex = state.floorIndex === 0 ? 1 : 0;
  const arrival = state.floors[state.floorIndex].arrival;
  p.x = arrival.x;
  p.y = arrival.y;
  p.facing = Math.PI;
  p.stairLock = true;
  state.events.push({ type: 'stairs', floor: state.floorIndex });
}

/** Screen position of the thief (the map sits under the HUD bar). */
export function playerScreen(state) {
  return { x: state.player.x, y: state.player.y + HUD_H };
}

