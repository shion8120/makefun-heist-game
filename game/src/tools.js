// The thief's tools, each with a price: the breaker box (10 quiet seconds without cameras or lasers,
// then a long recharge), a tossed coin (costs $50 of the take, lures guards to where it lands), and
// the vault keypad (a wrong code buzzes and fills the alarm).
import { TILE } from './floors.js';
import { castRay } from './geometry.js';
import { hearNoise, raiseAlarm } from './security.js';

export const POWER_CUT_SECONDS = 10;
export const BREAKER_RECHARGE_SECONDS = 40;
export const COIN_COST = 50;
const COIN_RANGE = 8 * TILE;
const COIN_NOISE_RADIUS = 5.5 * TILE;
const REACH = 30;

const floorOf = (state) => state.floors[state.floorIndex];

// ---------- breaker box ----------

export function nearBreaker(state) {
  const b = floorOf(state).breaker;
  return Math.hypot(state.player.x - b.x, state.player.y - b.y) < REACH;
}

/** Cuts this floor's power: cameras go blind and lasers die for POWER_CUT_SECONDS. */
export function cutPower(state) {
  const floor = floorOf(state);
  if (floor.powerCut > 0 || floor.breaker.recharge > 0) {
    state.events.push({ type: 'breaker-busy' });
    return false;
  }
  floor.powerCut = POWER_CUT_SECONDS;
  floor.breaker.recharge = POWER_CUT_SECONDS + BREAKER_RECHARGE_SECONDS;
  state.toolsUsed += 1;
  state.events.push({ type: 'power-off' });
  return true;
}

export function updatePower(state, dt) {
  for (const floor of state.floors) {
    if (floor.powerCut > 0) {
      floor.powerCut = Math.max(0, floor.powerCut - dt);
      if (floor.powerCut === 0) state.events.push({ type: 'power-on', floor: floor.index });
    }
    floor.breaker.recharge = Math.max(0, floor.breaker.recharge - dt);
  }
}

// ---------- coin toss ----------

/** Throws a coin toward (tx, ty) in map pixels; it lands short of walls and makes a noise there. */
export function throwCoin(state, tx, ty) {
  const p = state.player;
  if (p.take < COIN_COST) {
    state.events.push({ type: 'no-coin' });
    return false;
  }
  const angle = Math.atan2(ty - p.y, tx - p.x);
  const want = Math.min(COIN_RANGE, Math.hypot(tx - p.x, ty - p.y));
  const dist = Math.max(0, Math.min(want, castRay(floorOf(state), p.x, p.y, angle, want + 10) - 10));
  p.take -= COIN_COST;
  state.toolsUsed += 1;
  state.thrown.push({
    floor: state.floorIndex,
    x0: p.x, y0: p.y,
    x1: p.x + Math.cos(angle) * dist, y1: p.y + Math.sin(angle) * dist,
    t: 0, dur: 0.25 + dist / 600,
  });
  state.events.push({ type: 'throw' });
  return true;
}

export function updateThrownCoins(state, dt) {
  for (const coin of state.thrown) {
    coin.t += dt;
    if (coin.t < coin.dur || coin.landed) continue;
    coin.landed = true;
    coin.ring = 0;
    hearNoise(state, state.floors[coin.floor], coin.x1, coin.y1, COIN_NOISE_RADIUS);
    state.events.push({ type: 'coin-land' });
  }
  for (const coin of state.thrown) if (coin.landed) coin.ring += dt;
  state.thrown = state.thrown.filter((coin) => !coin.landed || coin.ring < 1.2);
}

/** Where a thrown coin is now, with its little arc. */
export function coinPosition(coin) {
  const u = Math.min(1, coin.t / coin.dur);
  return {
    x: coin.x0 + (coin.x1 - coin.x0) * u,
    y: coin.y0 + (coin.y1 - coin.y0) * u - Math.sin(u * Math.PI) * 26,
  };
}

// ---------- vault keypad ----------

export function nearKeypad(state) {
  const pad = floorOf(state).keypad;
  if (!pad || pad.open) return false;
  return Math.hypot(state.player.x - pad.x, state.player.y - pad.y) < 2 * TILE && state.player.x > pad.x - 4;
}

export function openKeypad(state) {
  state.keypad = { entry: '', status: 'idle', flash: 0 };
  state.events.push({ type: 'keypad-key' });
}

export function closeKeypad(state) {
  state.keypad = null;
}

/** One key on the keypad: a digit, 'C' to clear, or '<' to delete. Four digits submit the code. */
export function pressKeypad(state, key) {
  const pad = state.keypad;
  if (!pad || pad.status === 'granted') return;
  if (key === 'C') pad.entry = '';
  else if (key === '<') pad.entry = pad.entry.slice(0, -1);
  else if (/^[0-9]$/.test(key) && pad.entry.length < 4) pad.entry += key;
  pad.status = 'idle';
  state.events.push({ type: 'keypad-key' });
  if (pad.entry.length === 4) submitCode(state);
}

function submitCode(state) {
  const pad = state.keypad;
  if (pad.entry === state.code) {
    pad.status = 'granted';
    pad.flash = 0.9;
    const floor = floorOf(state);
    floor.keypad.open = true;
    for (const [c, r] of floor.keypad.doors) floor.grid[r][c] = '.';
    state.events.push({ type: 'vault-open' });
  } else {
    pad.status = 'denied';
    pad.flash = 0.8;
    pad.entry = '';
    state.wrongCodes += 1;
    raiseAlarm(state, 0.45);
    state.events.push({ type: 'keypad-fail' });
  }
}

/** Counts down the keypad's green or red flash; a granted keypad closes itself. */
export function updateKeypad(state, dt) {
  const pad = state.keypad;
  if (!pad || pad.flash <= 0) return;
  pad.flash = Math.max(0, pad.flash - dt);
  if (pad.flash === 0 && pad.status === 'granted') state.keypad = null;
}
