// The museum's security: laser grids on timers, sweeping cameras, the alarm (levels 0 to 3 and the
// 30-second lockdown at 3), and the guards who patrol, grow suspicious, investigate noises and chase.
// It reports what happens as events on state.events; main.js turns them into sounds and messages.
import { TILE } from './floors.js';
import { canSee, distToSegment, findPath, turnToward, visionPolygon } from './geometry.js';

export const LOCKDOWN_SECONDS = 30;
const CAMERA_FILL_PER_SECOND = 0.55;
const CHASE_FILL_PER_SECOND = 0.3;
const GUARD_FOV = (72 * Math.PI) / 180;
const GUARD_RANGE = 6.2 * TILE;
const SHADOW_REACH_GUARD = 0.38;
const SHADOW_REACH_CAMERA = 0.45;
const CATCH_GRACE = 0.6;
const SPEED = { patrol: 58, investigate: 82, chase: 134 };

// ---------- alarm ----------

export function alarmLevel(state) {
  return Math.min(3, Math.floor(state.alarm.value + 1e-9));
}

/** Fills the alarm meter; crossing into a new level raises the level (3 starts the lockdown). */
export function raiseAlarm(state, amount) {
  const alarm = state.alarm;
  if (alarm.value >= 3) return;
  const before = alarmLevel(state);
  alarm.value = Math.min(3, alarm.value + amount);
  const after = alarmLevel(state);
  if (after > before) {
    alarm.maxLevel = Math.max(alarm.maxLevel, after);
    state.events.push({ type: 'alarm-level', level: after });
    if (after === 3) startLockdown(state);
  }
}

/** A laser trip: straight up to the next alarm level. */
export function tripAlarmLevel(state) {
  const v = state.alarm.value;
  raiseAlarm(state, Math.floor(v + 1e-9) + 1 - v);
}

function startLockdown(state) {
  state.alarm.lockdown = LOCKDOWN_SECONDS;
  spawnReinforcements(state);
}

/** Within a level the meter drains while nobody sees you; the level itself never drops. */
export function updateAlarm(state, dt, seen) {
  const alarm = state.alarm;
  if (!seen && alarm.value < 3) alarm.value = Math.max(Math.floor(alarm.value + 1e-9), alarm.value - 0.05 * dt);
  if (alarm.lockdown !== null) {
    const before = Math.ceil(alarm.lockdown);
    alarm.lockdown = Math.max(0, alarm.lockdown - dt);
    if (Math.ceil(alarm.lockdown) !== before) state.events.push({ type: 'lockdown-tick', left: Math.ceil(alarm.lockdown) });
    if (alarm.lockdown <= 0) state.events.push({ type: 'sealed' });
  }
}

// ---------- lasers ----------

const triangle = (u) => 1 - Math.abs(2 * (u - Math.floor(u)) - 1);

/** Moves each laser along its sweep and switches it on and off on its timer (off while the power is cut). */
export function updateLasers(floor, time, dt) {
  const powerOff = floor.powerCut > 0;
  for (const l of floor.lasers) {
    const s = l.sweepPeriod ? triangle((time + l.phase) / l.sweepPeriod) : 0;
    l.x1 = l.ax + l.sx * s;
    l.y1 = l.ay + l.sy * s;
    l.x2 = l.bx + l.sx * s;
    l.y2 = l.by + l.sy * s;
    const ph = (((time + l.phase) % l.period) + l.period) % l.period;
    l.active = !powerOff && ph < l.on;
    l.warn = !powerOff && !l.active && ph > l.period - 0.6;
    l.cooldown = Math.max(0, l.cooldown - dt);
  }
}

/** A live beam touching the thief trips the alarm a level and sends the nearest guard to look. */
export function checkLaserTrips(state, floor) {
  const p = state.player;
  for (const l of floor.lasers) {
    if (!l.active || l.cooldown > 0) continue;
    if (distToSegment(p.x, p.y, l.x1, l.y1, l.x2, l.y2) > p.r) continue;
    l.cooldown = 2.2;
    state.events.push({ type: 'laser', x: p.x, y: p.y });
    tripAlarmLevel(state);
    sendNearestGuard(floor, p.x, p.y);
  }
}

// ---------- cameras ----------

/** Swings each camera and checks whether it sees the thief; returns true when any does. */
export function updateCameras(state, floor, dt) {
  const powerOff = floor.powerCut > 0;
  const p = state.player;
  let any = false;
  for (const cam of floor.cameras) {
    cam.angle = cam.base + cam.arc * Math.sin(state.time * cam.speed + cam.phase);
    cam.off = powerOff;
    if (powerOff) {
      cam.poly = null;
      cam.seeing = false;
      continue;
    }
    cam.poly = visionPolygon(floor, cam.x, cam.y, cam.angle, cam.fov, cam.range, 30);
    const sees = canSee(floor, cam.x, cam.y, cam.angle, cam.fov, cam.range, p, SHADOW_REACH_CAMERA);
    if (sees && !cam.seeing) state.events.push({ type: 'camera' });
    cam.seeing = sees;
    if (!sees) continue;
    any = true;
    raiseAlarm(state, CAMERA_FILL_PER_SECOND * dt);
    cam.alertTimer -= dt;
    if (cam.alertTimer <= 0) {
      cam.alertTimer = 1.5;
      sendNearestGuard(floor, p.x, p.y);
    }
  }
  return any;
}

// ---------- guards ----------

export function createGuard(route, reinforcement = false) {
  const [c, r] = route[0];
  return {
    x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, r: 11, facing: 0,
    route, wp: route.length > 1 ? 1 : 0, mode: 'patrol', wait: 0,
    path: [], pathGoal: null, pathTimer: 0,
    target: null, lookTimer: 0,
    suspicion: 0, chaseTime: 0, seeing: false, lastSeen: null, poly: null,
    reinforcement,
  };
}

/** Puts the floor's own guards at the start of their routes. */
export function staffFloor(floor) {
  floor.guards = floor.guardRoutes.map((route) => createGuard(route));
}

function spawnReinforcements(state) {
  for (const floor of state.floors) {
    for (const route of floor.reinforcementRoutes) floor.guards.push(createGuard(route, true));
  }
  state.events.push({ type: 'reinforcements' });
}

/** Sends a guard who is not chasing to look at (x, y). */
export function investigate(guard, x, y, lookTime = 2.5) {
  if (guard.mode === 'chase') return;
  guard.mode = 'investigate';
  guard.target = { x, y };
  guard.lookTimer = lookTime;
  guard.pathTimer = 0;
}

/** Every guard within `radius` of a noise at (x, y) comes to see what it was. */
export function hearNoise(state, floor, x, y, radius) {
  let heard = false;
  for (const g of floor.guards) {
    if (g.mode === 'chase') continue;
    if (Math.hypot(g.x - x, g.y - y) > radius) continue;
    if (g.mode !== 'investigate') heard = true;
    investigate(g, x, y);
  }
  if (heard) state.events.push({ type: 'heard', x, y });
  return heard;
}

function sendNearestGuard(floor, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const g of floor.guards) {
    if (g.mode === 'chase') continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  if (best) investigate(best, x, y, 3);
}

function guardRange(state) {
  return GUARD_RANGE * (alarmLevel(state) >= 2 ? 1.15 : 1);
}

/** Recomputes one guard's cone outline (also used to stage screenshots). */
export function refreshGuardVision(state, floor, g) {
  g.poly = visionPolygon(floor, g.x, g.y, g.facing, GUARD_FOV, guardRange(state), 32);
}

/** Moves every guard on the floor; returns true when any of them sees the thief. */
export function updateGuards(state, floor, dt) {
  const p = state.player;
  const level = alarmLevel(state);
  const pace = 1 + 0.08 * level;
  const range = guardRange(state);
  let any = false;
  for (const g of floor.guards) {
    const sees = canSee(floor, g.x, g.y, g.facing, GUARD_FOV, range, p, SHADOW_REACH_GUARD);
    g.seeing = sees;
    if (sees) {
      any = true;
      g.lastSeen = { x: p.x, y: p.y };
      if (g.mode !== 'chase') {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        g.suspicion += (1.0 + 2.8 * Math.max(0, 1 - d / range)) * dt;
        g.facing = turnToward(g.facing, Math.atan2(p.y - g.y, p.x - g.x), 4 * dt);
        if (g.suspicion >= 1) startChase(state, floor, g);
      } else {
        raiseAlarm(state, CHASE_FILL_PER_SECOND * dt);
      }
    } else if (g.mode !== 'chase') {
      g.suspicion = Math.max(0, g.suspicion - 0.45 * dt);
    }

    if (g.mode === 'chase') {
      const goal = sees ? p : g.lastSeen;
      const arrived = walkTo(floor, g, goal.x, goal.y, SPEED.chase * pace, dt, 0.2);
      g.chaseTime += dt;
      // A short grace after the '!' so a guard who rounds a corner onto you cannot catch you that same instant.
      if (g.chaseTime > CATCH_GRACE && Math.hypot(p.x - g.x, p.y - g.y) < g.r + p.r + 2) state.events.push({ type: 'caught', guard: g });
      if (arrived && !sees) {
        g.mode = 'investigate';
        g.target = { ...g.lastSeen };
        g.lookTimer = 3.5;
        g.suspicion = 0.5;
      }
    } else if (g.suspicion > 0.08 && sees) {
      // Stops and stares: the "?" that warns the thief before a chase begins.
    } else if (g.mode === 'investigate') {
      if (walkTo(floor, g, g.target.x, g.target.y, SPEED.investigate * pace, dt, 0.5)) {
        g.lookTimer -= dt;
        g.facing += Math.sin(state.time * 2.4) * 2.2 * dt;
        if (g.lookTimer <= 0) {
          g.mode = 'patrol';
          g.suspicion = 0;
        }
      }
    } else {
      patrol(floor, g, SPEED.patrol * pace, dt);
    }
    refreshGuardVision(state, floor, g);
  }
  return any;
}

function startChase(state, floor, g) {
  g.mode = 'chase';
  g.suspicion = 1;
  g.chaseTime = 0;
  g.pathTimer = 0;
  state.events.push({ type: 'spotted', x: g.x, y: g.y });
  raiseAlarm(state, 0.4);
  for (const other of floor.guards) {
    if (other !== g && Math.hypot(other.x - g.x, other.y - g.y) < 9 * TILE) investigate(other, state.player.x, state.player.y, 3);
  }
}

function patrol(floor, g, speed, dt) {
  if (g.wait > 0) {
    g.wait -= dt;
    const [c, r] = g.route[g.wp];
    g.facing = turnToward(g.facing, Math.atan2((r + 0.5) * TILE - g.y, (c + 0.5) * TILE - g.x), 2.5 * dt);
    return;
  }
  const [c, r] = g.route[g.wp];
  if (walkTo(floor, g, (c + 0.5) * TILE, (r + 0.5) * TILE, speed, dt, 1)) {
    g.wp = (g.wp + 1) % g.route.length;
    g.wait = 0.9;
  }
}

/** Walks a guard toward (tx, ty) along a grid path; returns true on arrival. */
function walkTo(floor, g, tx, ty, speed, dt, repath) {
  const tc = Math.floor(tx / TILE);
  const tr = Math.floor(ty / TILE);
  g.pathTimer -= dt;
  const goalKey = tr * 1000 + tc;
  if (g.pathTimer <= 0 || g.pathGoal !== goalKey) {
    g.path = findPath(floor, Math.floor(g.x / TILE), Math.floor(g.y / TILE), tc, tr);
    g.pathGoal = goalKey;
    g.pathTimer = repath;
  }
  const sameTile = Math.floor(g.x / TILE) === tc && Math.floor(g.y / TILE) === tr;
  if (g.path.length === 0 && !sameTile) return true; // nowhere to go: give up rather than walk through walls
  let step = speed * dt;
  while (step > 0) {
    const next = g.path.length > 1 ? g.path[0] : { x: tx, y: ty };
    const dx = next.x - g.x;
    const dy = next.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) g.facing = turnToward(g.facing, Math.atan2(dy, dx), 7 * dt);
    if (d <= step) {
      g.x = next.x;
      g.y = next.y;
      step -= d;
      if (g.path.length > 1) g.path.shift();
      else return true;
    } else {
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
      step = 0;
    }
  }
  return Math.hypot(tx - g.x, ty - g.y) < 2;
}

/** The look of a guard's head marker: '?' while suspicious or searching, '!' while chasing. */
export function guardMood(g) {
  if (g.mode === 'chase') return 'alert';
  if (g.suspicion > 0.05 || g.mode === 'investigate') return 'suspicious';
  return 'calm';
}

