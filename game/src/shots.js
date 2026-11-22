// Photogenic states behind ?shot=cover|title|vault|score, for the entry's screenshots: each one
// builds a real heist with the game's own rules and objects, places the thief, guards and timers
// mid-moment, and freezes it so the frame is the same every time. Any key or click unfreezes it.
import { TILE } from './floors.js';
import { refreshGuardVision, updateCameras, updateLasers } from './security.js';
import { finishHeist } from './scoring.js';

const at = (c, r) => ({ x: c * TILE, y: r * TILE });

function place(body, c, r, facingDeg) {
  Object.assign(body, at(c, r));
  if (facingDeg !== undefined) body.facing = (facingDeg * Math.PI) / 180;
}

function take(state, floorIndex, kinds) {
  const p = state.player;
  for (const item of state.floors[floorIndex].loot) {
    if (!kinds.some(([kind, c, r]) => kind === item.kind && c === item.c && r === item.r)) continue;
    item.taken = true;
    if (item.kind === 'note') p.hasNote = true;
    if (item.kind === 'crown') p.hasCrown = true;
    if (item.value > 0) p.lootCount += 1;
    p.take += item.value;
  }
}

/** Computes lasers, camera cones and guard cones for the frozen moment without moving anyone. */
function settle(state) {
  const floor = state.floors[state.floorIndex];
  updateLasers(floor, state.time, 0);
  updateCameras(state, floor, 0);
  for (const g of floor.guards) refreshGuardVision(state, floor, g);
  state.events.length = 0;
}

function stageCover(state) {
  state.mode = 'play';
  state.floorIndex = 0;
  state.time = 156.75;
  state.clock = 3.1;
  const p = state.player;
  take(state, 0, [['coin', 3, 3], ['coin', 6, 9], ['gem', 15, 6], ['painting', 18, 1]]);
  place(p, 16.6, 3.4, 160);
  p.moving = true;
  p.grabFlash = 0.3;
  state.noise = 48;
  state.alarm.value = 1.62;
  state.alarm.maxLevel = 1;
  state.timesSeen = 1;
  state.popups.push({ x: 18.5 * TILE, y: 1.5 * TILE + 14, life: 1.3, text: '+$1,200 PAINTING', colour: '#ffd45c' });
  const [gallery, corridor, hall] = state.floors[0].guards;
  place(gallery, 22.5, 5.2, 205);
  gallery.mode = 'investigate';
  gallery.target = { ...at(17.5, 2.5) };
  gallery.suspicion = 0.55;
  place(corridor, 13.5, 14.5, 0);
  place(hall, 29.5, 17.5, 180);
  state.thrown.push({ floor: 0, x0: 10 * TILE, y0: 14 * TILE, x1: 21 * TILE, y1: 14.5 * TILE, t: 1, dur: 0.5, landed: true, ring: 0.35 });
  state.toasts.push({ text: 'A guard heard that painting come off the wall…', colour: '#ffb02e', life: 2 });
  settle(state);
}

function stageVault(state) {
  state.mode = 'play';
  state.floorIndex = 1;
  state.time = 333.4;
  state.clock = 5.2;
  const p = state.player;
  take(state, 0, [['coin', 3, 3], ['painting', 13, 1], ['gem', 20, 6], ['note', 37, 6], ['sapphire', 33, 10], ['gem', 29, 14]]);
  take(state, 1, [['coin', 25, 7], ['painting', 18, 1]]);
  place(p, 13.9, 4.9, 180);
  state.noise = 10;
  state.alarm.value = 1.3;
  state.alarm.maxLevel = 1;
  state.timesSeen = 2;
  state.keypad = { entry: state.code.slice(0, 2), status: 'idle', flash: 0 };
  const [tunnel, security, archive] = state.floors[1].guards;
  place(tunnel, 20.5, 11.5, 180);
  place(security, 29.5, 3.5, 0);
  place(archive, 9.5, 16.5, 0);
  settle(state);
}

function stageScore(state) {
  stageCover(state);
  state.toasts.length = 0;
  state.popups.length = 0;
  const p = state.player;
  take(state, 0, [['painting', 13, 1], ['sapphire', 33, 10], ['gem', 29, 14], ['note', 37, 6]]);
  take(state, 1, [['crown', 6, 4], ['gold', 2, 1], ['gold', 10, 1], ['painting', 18, 1], ['sapphire', 36, 2]]);
  place(p, 1.2, 17.5, 180);
  state.time = 431;
  state.timesSeen = 2;
  state.alarm.value = 2.2;
  state.alarm.maxLevel = 2;
  state.toolsUsed = 3;
  state.ending = finishHeist(state, 'crown');
  state.mode = 'end';
  state.clock = 2.4;
  settle(state);
}

export function applyShot(name, state) {
  if (name === 'cover') stageCover(state);
  else if (name === 'vault') stageVault(state);
  else if (name === 'score') stageScore(state);
  else if (name === 'title') state.clock = 0.52;
  else return;
  state.frozen = true;
}
