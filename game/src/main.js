// Wires The Clockwork Vault together: builds a heist, runs the title / play / pause / caught / score
// screens, routes keys and clicks to the thief and their tools, turns game events into sounds and
// messages, and draws each frame. ?shot=cover|title|vault|score stages a screenshot; ?seed=N fixes the code.
import { HUD_H, VIEW_H, VIEW_W, buildFloors } from './floors.js';
import { makeRng, makeVaultCode } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, hearingRadius, updatePlayer } from './player.js';
import {
  checkLaserTrips, hearNoise, staffFloor, updateAlarm, updateCameras, updateGuards, updateLasers,
} from './security.js';
import {
  closeKeypad, cutPower, nearBreaker, nearKeypad, openKeypad, pressKeypad, throwCoin,
  updateKeypad, updatePower, updateThrownCoins,
} from './tools.js';
import { finishHeist } from './scoring.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';
import { drawCaught, drawEnd, drawKeypad, drawPause, drawTitle, keypadButtons } from './screens.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const fixedSeed = params.has('seed') ? Number(params.get('seed')) : null;

function newSeed() {
  return fixedSeed ?? Math.floor(Math.random() * 1e9);
}

/** A fresh heist: both floors staffed, the thief at the delivery dock, a new vault code. */
export function newHeist(seed) {
  const rng = makeRng(seed);
  const floors = buildFloors();
  floors.forEach(staffFloor);
  return {
    seed,
    code: makeVaultCode(rng),
    floors,
    floorIndex: 0,
    player: createPlayer(floors[0].start.x, floors[0].start.y),
    mode: 'title',
    time: 0,
    clock: 0,
    alarm: { value: 0, maxLevel: 0, lockdown: null },
    noise: 0,
    hearClock: 0,
    events: [],
    popups: [],
    toasts: [],
    thrown: [],
    keypad: null,
    timesSeen: 0,
    unseenFor: 99,
    toolsUsed: 0,
    wrongCodes: 0,
    ending: null,
    caughtTimer: 0,
    caughtBy: null,
    caughtReason: null,
    frozen: false,
  };
}

let state = newHeist(newSeed());
applyShot(params.get('shot'), state);

function toast(text, colour = '#f4ead0', life = 2.4) {
  state.toasts.push({ text, colour, life });
  if (state.toasts.length > 4) state.toasts.shift();
  statusLine.textContent = text;
}

function startHeist() {
  audio.unlock();
  state.mode = 'play';
  toast('The delivery dock door clicks shut behind you.', '#45e6c8');
}

function restart() {
  state = newHeist(newSeed());
  startHeist();
}

function endHeist(kind) {
  state.ending = finishHeist(state, kind);
  state.mode = 'end';
  state.keypad = null;
  audio.play(state.ending.escaped ? 'sting' : 'busted');
  statusLine.textContent = `${kind === 'crown' ? 'Escaped with the crown' : kind === 'lesser' ? 'Escaped without the crown' : 'Busted'}. Rank: ${state.ending.rank}.`;
}

const LOOT_SOUNDS = { coin: 'coin', gem: 'gem', sapphire: 'gem', painting: 'painting', gold: 'gold', crown: 'crown', note: 'note' };

/** Turns what happened this frame into sounds, messages and screen changes. */
function handleEvents() {
  const events = state.events;
  state.events = [];
  for (const e of events) {
    if (state.mode !== 'play') break;
    switch (e.type) {
      case 'loot':
        audio.play(LOOT_SOUNDS[e.kind]);
        if (e.kind === 'note') toast(`The vault code, scribbled on a note: ${state.code}`, '#f4ead0', 3.5);
        if (e.kind === 'crown') toast('THE CLOCKWORK CROWN! Now get to the delivery dock.', '#ffd45c', 3.5);
        break;
      case 'alarm-level':
        audio.play('whoop');
        if (e.level === 3) toast('LOCKDOWN! The museum seals in 30 seconds!', '#ff3b55', 3.5);
        else toast(`Alarm level ${e.level}: guards are ${e.level === 1 ? 'on edge' : 'sharper and faster'}.`, '#ff8a3d');
        break;
      case 'laser': audio.play('laser'); toast('Laser tripped!', '#ff3b55'); break;
      case 'camera': audio.play('camera'); break;
      case 'spotted': audio.play('spotted'); toast('Spotted! Break their line of sight.', '#ff3b55'); break;
      case 'heard': audio.play('heard'); break;
      case 'caught':
        state.mode = 'caught';
        state.caughtTimer = 1.4;
        state.caughtBy = e.guard;
        state.caughtReason = 'caught';
        state.keypad = null;
        audio.play('busted');
        break;
      case 'sealed':
        state.mode = 'caught';
        state.caughtTimer = 1.4;
        state.caughtBy = null;
        state.caughtReason = 'sealed';
        state.keypad = null;
        audio.play('busted');
        break;
      case 'escape': endHeist(state.player.hasCrown ? 'crown' : 'lesser'); break;
      case 'stairs': audio.play('stairs'); toast(state.floors[e.floor].name, '#d6be8c', 1.6); break;
      case 'power-off': audio.play('powerOff'); toast('Power cut: cameras and lasers down for 10 seconds.', '#9fc4ff'); break;
      case 'power-on': audio.play('powerOn'); if (e.floor === state.floorIndex) toast('The power hums back on.', '#e9c23c'); break;
      case 'breaker-busy': audio.play('denied'); break;
      case 'throw': audio.play('throw'); break;
      case 'coin-land': audio.play('coinLand'); break;
      case 'no-coin': audio.play('denied'); toast('Nothing to throw: steal some coins first.', '#8d97ad'); break;
      case 'keypad-key': audio.play('key'); break;
      case 'vault-open': audio.play('granted'); toast('ACCESS GRANTED. The vault door swings open.', '#3fd17a', 3); break;
      case 'keypad-fail': audio.play('denied'); toast('Wrong code! The alarm stirs.', '#ff3b55'); break;
      case 'reinforcements': toast('Reinforcements are coming in through the dock and the stairs!', '#ff3b55', 3.5); break;
      case 'lockdown-tick': audio.play('tick'); break;
      default: break;
    }
  }
}

function keypadKeyFrom(press) {
  if (/^Digit[0-9]$/.test(press.code) || /^Numpad[0-9]$/.test(press.code)) return press.code.slice(-1);
  if (press.code === 'Backspace') return '<';
  if (press.code === 'Delete') return 'C';
  return null;
}

function handleInput() {
  const presses = input.takePressed();
  const clicks = input.takeClicks();
  if (state.frozen && (presses.length || clicks.length)) state.frozen = false;
  for (const press of presses) {
    if (press.code === 'KeyM') {
      audio.unlock();
      toast(audio.toggleMute() ? 'Sound off' : 'Sound on', '#8d97ad', 1.2);
      continue;
    }
    if (press.code === 'KeyR') {
      restart();
      continue;
    }
    if (state.mode === 'title') {
      if (press.code === 'Enter' || press.code === 'Space') startHeist();
    } else if (state.mode === 'paused') {
      if (press.code === 'KeyP' || press.code === 'Escape') state.mode = 'play';
    } else if (state.mode === 'end') {
      if (press.code === 'Enter') state = newHeist(newSeed());
    } else if (state.mode === 'play') {
      if (press.code === 'KeyP') {
        state.mode = 'paused';
        continue;
      }
      if (state.keypad) {
        const key = keypadKeyFrom(press);
        if (key) pressKeypad(state, key);
        else if (press.code === 'Escape' || press.code === 'KeyE') closeKeypad(state);
        continue;
      }
      if (press.code === 'KeyE') {
        if (nearBreaker(state)) cutPower(state);
        else if (nearKeypad(state)) openKeypad(state);
      } else if (press.code === 'KeyF') {
        const p = state.player;
        throwCoin(state, p.x + Math.cos(p.facing) * 160, p.y + Math.sin(p.facing) * 160);
      }
    }
  }
  for (const click of clicks) {
    if (state.mode === 'title') startHeist();
    else if (state.mode === 'play' && state.keypad) {
      const hit = keypadButtons().find((b) => click.x >= b.x && click.x <= b.x + b.w && click.y >= b.y && click.y <= b.y + b.h);
      if (hit) pressKeypad(state, hit.key);
    } else if (state.mode === 'play' && click.y > HUD_H) {
      throwCoin(state, click.x, click.y - HUD_H);
    }
  }
}

/** Counts each new time the thief is seen (a camera or guard picking them up after a second unseen). */
function trackSightings(seen, dt) {
  if (seen) {
    if (state.unseenFor > 1) state.timesSeen += 1;
    state.unseenFor = 0;
  } else state.unseenFor += dt;
}

function stepPlay(dt) {
  state.time += dt;
  if (!state.keypad) updatePlayer(state, input, dt);
  updateKeypad(state, dt);
  updateThrownCoins(state, dt);
  updatePower(state, dt);
  const floor = state.floors[state.floorIndex];
  updateLasers(floor, state.time, dt);
  checkLaserTrips(state, floor);
  const cameraSees = updateCameras(state, floor, dt);
  const guardSees = updateGuards(state, floor, dt);
  trackSightings(cameraSees || guardSees, dt);
  updateAlarm(state, dt, cameraSees || guardSees);
  state.noise = Math.max(0, state.noise - 14 * dt);
  state.hearClock -= dt;
  if (state.hearClock <= 0 && state.noise > 12) {
    state.hearClock = 0.4;
    hearNoise(state, floor, state.player.x, state.player.y, hearingRadius(state.noise));
  }
}

function update(dt) {
  handleInput();
  if (state.frozen) return;
  state.clock += dt;
  if (state.mode === 'play') stepPlay(dt);
  else if (state.mode === 'caught') {
    state.caughtTimer -= dt;
    if (state.caughtTimer <= 0) endHeist(state.caughtReason);
  }
  if (state.mode !== 'paused') {
    for (const pop of state.popups) pop.life -= dt;
    state.popups = state.popups.filter((pop) => pop.life > 0);
    for (const t of state.toasts) t.life -= dt;
    state.toasts = state.toasts.filter((t) => t.life > 0);
  }
  handleEvents();
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state.mode === 'title') {
    drawTitle(ctx, state);
    return;
  }
  drawWorld(ctx, state);
  drawHud(ctx, state);
  if (state.keypad && state.mode === 'play') drawKeypad(ctx, state);
  if (state.mode === 'paused') drawPause(ctx);
  if (state.mode === 'caught') drawCaught(ctx, state);
  if (state.mode === 'end') drawEnd(ctx, state);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
