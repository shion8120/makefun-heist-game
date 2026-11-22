// Draws a floor of the museum on the canvas: the tile map (cached per floor), loot, lasers, camera
// and guard vision cones, guards, the thief and their noise ring, tossed coins, pop-ups, the power
// cut and the lockdown. Colour code: dark hatched floor is cover, red and amber is danger, gold is loot.
import { COLS, HUD_H, ROWS, TILE, VIEW_H, VIEW_W } from './floors.js';
import { hearingRadius } from './player.js';
import { guardMood } from './security.js';
import { BREAKER_RECHARGE_SECONDS, POWER_CUT_SECONDS, coinPosition, nearBreaker, nearKeypad } from './tools.js';
import {
  COLOURS, drawCameraBody, drawCoins, drawCrown, drawGear, drawGem, drawGoldBar, drawGuard,
  drawGuardMarker, drawLootGlow, drawNote, drawPainting, drawThief,
} from './sprites.js';

const layers = new Map();

/** The unchanging part of a floor (floor, walls, shadows, furniture, room names), drawn once. */
function staticLayer(floor) {
  if (layers.has(floor.index)) return layers.get(floor.index);
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? '#' : floor.grid[r][c]);
  const isWall = (ch) => ch === '#' || ch === 'B';

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const ch = at(c, r);
      const x = c * TILE;
      const y = r * TILE;
      const odd = (c + r) % 2 === 1;
      if (ch === 'V') ctx.fillStyle = odd ? '#3a2d14' : '#45361a';
      else if (ch === ',' || ch === 'c') ctx.fillStyle = '#0b0e16';
      else if (ch === 'D') ctx.fillStyle = '#123322';
      else if (isWall(ch)) ctx.fillStyle = '#272c3a';
      else ctx.fillStyle = odd ? '#1d2535' : '#212a3c';
      ctx.fillRect(x, y, TILE, TILE);
    }
  }

  // Shadow hatching: the cover tiles read as "dark, safe" at a glance.
  ctx.save();
  ctx.beginPath();
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) if (at(c, r) === ',') ctx.rect(c * TILE, r * TILE, TILE, TILE);
  ctx.clip();
  ctx.strokeStyle = '#1b2333';
  ctx.lineWidth = 2;
  for (let k = -ROWS * TILE; k < COLS * TILE; k += 10) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + ROWS * TILE, ROWS * TILE);
    ctx.stroke();
  }
  ctx.restore();

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const ch = at(c, r);
      const x = c * TILE;
      const y = r * TILE;
      if (isWall(ch)) {
        ctx.fillStyle = '#313748';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLOURS.brass;
        ctx.lineWidth = 2;
        const edges = [[0, -1, x, y, x + TILE, y], [0, 1, x, y + TILE, x + TILE, y + TILE], [-1, 0, x, y, x, y + TILE], [1, 0, x + TILE, y, x + TILE, y + TILE]];
        for (const [dc, dr, x1, y1, x2, y2] of edges) {
          const n = at(c + dc, r + dr);
          if (isWall(n) || n === 'K') continue;
          if (c + dc < 0 || r + dr < 0 || c + dc >= COLS || r + dr >= ROWS) continue;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (ch === 'c') {
        ctx.fillStyle = '#5c4630';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = '#8f6e47';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
      } else if (ch === 'p') {
        ctx.fillStyle = '#3a4357';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#7d89a6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
        ctx.fillStyle = 'rgba(160, 205, 230, 0.18)';
        ctx.fillRect(x + 6, y + 6, TILE - 12, 6);
      } else if (ch === 'o') {
        ctx.fillStyle = '#353c4f';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#67708a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ch === 'S') {
        ctx.fillStyle = '#2b3245';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#5d6782';
        ctx.lineWidth = 2;
        for (let k = 4; k < TILE; k += 7) {
          ctx.beginPath();
          ctx.moveTo(x + k, y + 2);
          ctx.lineTo(x + k, y + TILE - 2);
          ctx.stroke();
        }
      } else if (ch === 'D') {
        ctx.strokeStyle = '#3fd17a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 8);
        ctx.lineTo(x + 10, y + 16);
        ctx.lineTo(x + 20, y + 24);
        ctx.stroke();
      } else if (ch === 'V' && (c + r) % 4 === 0) {
        ctx.strokeStyle = 'rgba(232, 185, 63, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 8, y + 8, TILE - 16, TILE - 16);
      }
    }
  }

  ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = 'rgba(214, 190, 140, 0.4)';
  for (const [text, c, r] of floor.labels) ctx.fillText(text, c * TILE, r * TILE);
  ctx.letterSpacing = '0px';
  layers.set(floor.index, canvas);
  return canvas;
}

/** Everything on the map, drawn below the HUD bar. */
export function drawWorld(ctx, state) {
  const floor = state.floors[state.floorIndex];
  const t = state.clock;
  ctx.save();
  ctx.translate(0, HUD_H);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H - HUD_H);
  ctx.clip();
  ctx.drawImage(staticLayer(floor), 0, 0);
  drawFixtures(ctx, state, floor, t);
  drawLoot(ctx, floor, t);
  drawCones(ctx, floor);
  drawLasers(ctx, floor, t);
  for (const cam of floor.cameras) drawCameraBody(ctx, cam);
  drawNoiseRing(ctx, state);
  drawCoinsInFlight(ctx, state);
  for (const g of floor.guards) drawGuard(ctx, g);
  if (state.mode !== 'end' || state.ending?.escaped) drawThief(ctx, state.player, t);
  for (const g of floor.guards) drawGuardMarker(ctx, g, guardMood(g), t);
  drawObjective(ctx, state, floor, t);
  drawPopups(ctx, state);
  drawPrompt(ctx, state);
  if (floor.powerCut > 0) drawPowerCut(ctx, floor);
  if (state.alarm.lockdown !== null) drawLockdownEdge(ctx, t);
  ctx.restore();
}

function drawFixtures(ctx, state, floor, t) {
  const b = floor.breaker;
  const bx = b.c * TILE;
  const by = b.r * TILE;
  ctx.fillStyle = floor.powerCut > 0 ? '#4a4320' : '#e9c23c';
  ctx.fillRect(bx + 6, by + 4, TILE - 12, TILE - 8);
  ctx.strokeStyle = COLOURS.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 6, by + 4, TILE - 12, TILE - 8);
  ctx.fillStyle = COLOURS.ink;
  ctx.beginPath();
  ctx.moveTo(bx + 18, by + 7);
  ctx.lineTo(bx + 12, by + 17);
  ctx.lineTo(bx + 16, by + 17);
  ctx.lineTo(bx + 14, by + 25);
  ctx.lineTo(bx + 20, by + 14);
  ctx.lineTo(bx + 16, by + 14);
  ctx.closePath();
  ctx.fill();
  if (b.recharge > 0 && floor.powerCut === 0) {
    ctx.strokeStyle = '#e9c23c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.recharge / (POWER_CUT_SECONDS + BREAKER_RECHARGE_SECONDS)));
    ctx.stroke();
  }

  if (floor.keypad) {
    const pad = floor.keypad;
    for (const [c, r] of pad.doors) {
      const x = c * TILE;
      const y = r * TILE;
      if (pad.open) {
        ctx.fillStyle = '#2d3a2a';
        ctx.fillRect(x, y, 5, TILE);
        continue;
      }
      ctx.fillStyle = '#6d7891';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#2b3140';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      drawGear(ctx, x + TILE / 2, y + TILE / 2, 9, 8, 0.3, '#2b3140', 2);
    }
    const kx = pad.x + 4;
    const ky = pad.y - 2 * TILE + 10;
    ctx.fillStyle = '#1a1f2b';
    ctx.fillRect(kx, ky, 12, 16);
    ctx.fillStyle = pad.open ? '#3fd17a' : Math.sin(t * 4) > 0 ? '#ff3b55' : '#7a1d2b';
    ctx.fillRect(kx + 3, ky + 2, 6, 3);
    ctx.fillStyle = '#9aa3b5';
    for (let i = 0; i < 6; i += 1) ctx.fillRect(kx + 2 + (i % 3) * 3, ky + 7 + Math.floor(i / 3) * 3, 2, 2);
  }

  for (const [c, r] of stairCentres(floor)) {
    ctx.fillStyle = 'rgba(10, 13, 22, 0.75)';
    ctx.fillRect(c * TILE - 34, r * TILE - 10, 68, 20);
    ctx.fillStyle = '#d6be8c';
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(floor.index === 0 ? 'STAIRS ▼' : 'STAIRS ▲', c * TILE, r * TILE);
  }
  if (floor.hasExit) {
    ctx.fillStyle = 'rgba(10, 13, 22, 0.8)';
    ctx.fillRect(TILE + 4, 17 * TILE + 4, 62, 24);
    ctx.fillStyle = '#3fd17a';
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀ EXIT', TILE + 9, 17.5 * TILE);
  }
}

/** Where the thief should head next, on this floor: note, stairs, vault door, crown, then the dock. */
function currentObjective(state, floor) {
  const p = state.player;
  const stairs = stairCentres(floor)[0];
  const toStairs = (text) => stairs && { x: stairs[0] * TILE, y: stairs[1] * TILE, text };
  if (!p.hasNote) {
    const note = floor.loot.find((item) => item.kind === 'note' && !item.taken);
    return note ? { x: note.x, y: note.y, text: 'FIND THE CODE NOTE' } : toStairs('UP: CODE NOTE IN THE OFFICE');
  }
  if (!p.hasCrown) {
    if (floor.index === 0) return toStairs('DOWN TO THE VAULT');
    if (floor.keypad && !floor.keypad.open) return { x: floor.keypad.x - TILE / 2, y: floor.keypad.y, text: 'VAULT DOOR' };
    const crown = floor.loot.find((item) => item.kind === 'crown' && !item.taken);
    return crown && { x: crown.x, y: crown.y + 14, text: 'STEAL THE CROWN' };
  }
  if (floor.index === 1) return toStairs('UP AND OUT');
  return { x: TILE / 2, y: 17.5 * TILE, text: 'ESCAPE!' };
}

/** A pulsing ring and label on the current objective, so the next step is never a guess. */
function drawObjective(ctx, state, floor, t) {
  if (state.mode !== 'play') return;
  const goal = currentObjective(state, floor);
  if (!goal) return;
  const pulse = 25 + Math.sin(t * 4) * 4;
  ctx.strokeStyle = '#f4ead0';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.lineDashOffset = -t * 20;
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.font = `bold ${goal.text === 'VAULT DOOR' ? 14 : 12}px "Segoe UI", Arial, sans-serif`;
  const w = ctx.measureText(goal.text).width + 16;
  const lx = Math.max(w / 2 + 4, Math.min(VIEW_W - w / 2 - 4, goal.x));
  const ly = goal.y - pulse - 16;
  ctx.fillStyle = 'rgba(10, 13, 22, 0.88)';
  ctx.fillRect(lx - w / 2, ly - 10, w, 20);
  ctx.fillStyle = '#f4ead0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(goal.text, lx, ly + 1);

  // A small arrow beside the thief pointing at the objective while it is far away.
  const p = state.player;
  const dist = Math.hypot(goal.x - p.x, goal.y - p.y);
  if (dist < 5 * TILE) return;
  const angle = Math.atan2(goal.y - p.y, goal.x - p.x);
  ctx.save();
  ctx.translate(p.x + Math.cos(angle) * 28, p.y + Math.sin(angle) * 28);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.65 + Math.sin(t * 4) * 0.25;
  ctx.fillStyle = '#f4ead0';
  ctx.strokeStyle = 'rgba(10, 13, 22, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-5, -7);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 7);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function stairCentres(floor) {
  let sc = 0;
  let sr = 0;
  let n = 0;
  floor.grid.forEach((row, r) => row.forEach((ch, c) => {
    if (ch === 'S') {
      sc += c + 0.5;
      sr += r + 0.5;
      n += 1;
    }
  }));
  return n ? [[sc / n, sr / n]] : [];
}

function drawLoot(ctx, floor, t) {
  let variant = 0;
  for (const item of floor.loot) {
    if (item.kind === 'painting') {
      drawPainting(ctx, item.x, item.y - 17, variant, item.taken);
      variant += 1;
      if (!item.taken) drawLootGlow(ctx, item.x, item.y - 8, 15, t);
      continue;
    }
    if (item.taken) continue;
    if (item.kind === 'crown') {
      ctx.fillStyle = '#5a4520';
      ctx.beginPath();
      ctx.arc(item.x, item.y + 16, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLOURS.brass;
      ctx.lineWidth = 2;
      ctx.stroke();
      drawLootGlow(ctx, item.x, item.y + 12, 34, t, 'rgba(255, 212, 92, 0.14)');
      drawGear(ctx, item.x, item.y + 16, 27, 14, t * 0.4, 'rgba(232, 185, 63, 0.55)', 2);
      drawCrown(ctx, item.x, item.y + 14, 1.15, t);
      continue;
    }
    if (item.kind === 'note') {
      drawLootGlow(ctx, item.x, item.y, 13, t, 'rgba(244, 234, 208, 0.14)');
      drawNote(ctx, item.x, item.y, t);
      continue;
    }
    drawLootGlow(ctx, item.x, item.y, 14, t);
    if (item.kind === 'coin') drawCoins(ctx, item.x, item.y);
    else if (item.kind === 'gem') drawGem(ctx, item.x, item.y, '#ff4d6d');
    else if (item.kind === 'sapphire') drawGem(ctx, item.x, item.y, '#4f7bff');
    else if (item.kind === 'gold') drawGoldBar(ctx, item.x, item.y);
  }
}

function fillPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
}

function drawCones(ctx, floor) {
  for (const cam of floor.cameras) {
    if (!cam.poly) continue;
    fillPolygon(ctx, cam.poly);
    ctx.fillStyle = cam.seeing ? 'rgba(255, 40, 60, 0.36)' : 'rgba(255, 70, 70, 0.2)';
    ctx.fill();
    ctx.strokeStyle = cam.seeing ? 'rgba(255, 70, 90, 0.95)' : 'rgba(255, 90, 90, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const g of floor.guards) {
    if (!g.poly) continue;
    const mood = guardMood(g);
    fillPolygon(ctx, g.poly);
    ctx.fillStyle = mood === 'alert' ? 'rgba(255, 50, 60, 0.3)' : mood === 'suspicious' ? 'rgba(255, 176, 46, 0.26)' : 'rgba(255, 233, 160, 0.17)';
    ctx.fill();
    ctx.strokeStyle = mood === 'alert' ? 'rgba(255, 70, 90, 0.9)' : mood === 'suspicious' ? 'rgba(255, 176, 46, 0.85)' : 'rgba(255, 233, 160, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawLasers(ctx, floor, t) {
  for (const l of floor.lasers) {
    const flicker = l.warn && Math.sin(t * 40) > 0;
    if (l.active) {
      ctx.strokeStyle = 'rgba(255, 40, 70, 0.28)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ff3355';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#ffd0d8';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (flicker) {
      ctx.strokeStyle = 'rgba(255, 60, 90, 0.5)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const [x, y] of [[l.x1, l.y1], [l.x2, l.y2]]) {
      ctx.fillStyle = '#1a1f2b';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = l.active ? '#ff3355' : floor.powerCut > 0 ? '#333a48' : '#7a1d2b';
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  }
}

function drawNoiseRing(ctx, state) {
  if (state.noise < 6) return;
  const p = state.player;
  ctx.strokeStyle = `rgba(69, 230, 200, ${Math.min(0.55, state.noise / 70)})`;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, hearingRadius(state.noise), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCoinsInFlight(ctx, state) {
  for (const coin of state.thrown) {
    if (coin.floor !== state.floorIndex) continue;
    if (coin.landed) {
      ctx.strokeStyle = `rgba(255, 212, 92, ${0.8 - coin.ring * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x1, coin.y1, 10 + coin.ring * 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLOURS.loot;
      ctx.beginPath();
      ctx.arc(coin.x1, coin.y1, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const at = coinPosition(coin);
      ctx.fillStyle = COLOURS.loot;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPopups(ctx, state) {
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const pop of state.popups) {
    const rise = (1.6 - pop.life) * 24;
    ctx.globalAlpha = Math.min(1, pop.life * 1.5);
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLOURS.ink;
    ctx.strokeText(pop.text, pop.x, pop.y - rise);
    ctx.fillStyle = pop.colour;
    ctx.fillText(pop.text, pop.x, pop.y - rise);
  }
  ctx.globalAlpha = 1;
  const p = state.player;
  if (p.grabFlash > 0) {
    ctx.strokeStyle = `rgba(255, 212, 92, ${p.grabFlash * 1.6})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r0 = 14 + (0.5 - p.grabFlash) * 30;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
      ctx.lineTo(p.x + Math.cos(a) * (r0 + 7), p.y + Math.sin(a) * (r0 + 7));
      ctx.stroke();
    }
  }
}

/** The "[E] ..." hint above the thief when a tool is in reach. */
function drawPrompt(ctx, state) {
  if (state.mode !== 'play' || state.keypad) return;
  let text = null;
  if (nearBreaker(state)) {
    const floor = state.floors[state.floorIndex];
    text = floor.powerCut > 0 ? 'POWER IS CUT' : floor.breaker.recharge > 0 ? `BREAKER RESETS IN ${Math.ceil(floor.breaker.recharge)}s` : '[E] CUT THE POWER';
  } else if (nearKeypad(state)) {
    text = state.player.hasNote ? `[E] KEYPAD — CODE ${state.code}` : '[E] KEYPAD — CODE UNKNOWN';
  }
  if (!text) return;
  const p = state.player;
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(10, 13, 22, 0.88)';
  ctx.fillRect(p.x - w / 2, p.y - 46, w, 22);
  ctx.strokeStyle = COLOURS.brass;
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x - w / 2 + 0.5, p.y - 45.5, w - 1, 21);
  ctx.fillStyle = '#f4ead0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, p.x, p.y - 35);
}

function drawPowerCut(ctx, floor) {
  ctx.fillStyle = 'rgba(8, 14, 40, 0.38)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H - HUD_H);
  const text = `POWER CUT  ${floor.powerCut.toFixed(1)}s`;
  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(10, 13, 22, 0.85)';
  ctx.fillRect(VIEW_W / 2 - 110, VIEW_H - HUD_H - 40, 220, 30);
  ctx.fillStyle = '#9fc4ff';
  ctx.fillText(text, VIEW_W / 2, VIEW_H - HUD_H - 25);
}

function drawLockdownEdge(ctx, t) {
  const a = 0.25 + Math.sin(t * 6) * 0.15;
  ctx.strokeStyle = `rgba(255, 40, 60, ${a})`;
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, VIEW_W - 14, VIEW_H - HUD_H - 14);
}
