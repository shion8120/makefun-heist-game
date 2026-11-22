// The HUD bar across the top of the screen: floor, alarm meter (levels 0-3 and the lockdown clock),
// the take, the noise meter, the code note and crown, the tools, the clock, and the message toasts.
import { HUD_H, VIEW_H, VIEW_W } from './floors.js';
import { alarmLevel } from './security.js';
import { formatMoney, formatTime } from './scoring.js';
import { COIN_COST } from './tools.js';
import { COLOURS, drawCrown, drawNote } from './sprites.js';

const SEGMENT_COLOURS = ['#ffd45c', '#ff8a3d', '#ff3b55'];
const LEVEL_NAMES = ['QUIET', 'ALERT', 'ALARM', 'LOCKDOWN'];

function label(ctx, text, x, y, colour = '#8d97ad') {
  ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
}

export function drawHud(ctx, state) {
  const floor = state.floors[state.floorIndex];
  const p = state.player;
  const t = state.clock;
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLOURS.brass;
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  // Title and floor.
  ctx.font = 'bold 17px Georgia, "Times New Roman", serif';
  ctx.fillStyle = COLOURS.brass;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('THE CLOCKWORK VAULT', 16, 27);
  label(ctx, `${floor.name}  ${state.floorIndex + 1}/2`, 16, 47, '#d6be8c');

  // Alarm meter: three segments that fill in turn.
  const level = alarmLevel(state);
  const ax = 270;
  label(ctx, 'ALARM', ax, 19);
  const lockdown = state.alarm.lockdown !== null;
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = level === 0 ? '#8fe3b0' : SEGMENT_COLOURS[Math.min(2, level - 1)];
  ctx.fillText(`LV ${level} · ${LEVEL_NAMES[level]}`, ax + 62, 19);
  for (let i = 0; i < 3; i += 1) {
    const x = ax + i * 76;
    const fill = Math.max(0, Math.min(1, state.alarm.value - i));
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(x, 26, 70, 22);
    ctx.fillStyle = SEGMENT_COLOURS[i];
    if (lockdown && Math.sin(t * 10) > 0) ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, 26, 70 * fill, 22);
    ctx.strokeStyle = '#4a5368';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 26.5, 69, 21);
  }
  if (lockdown) {
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = COLOURS.ink;
    ctx.textAlign = 'center';
    ctx.fillText(`SEALING IN ${Math.ceil(state.alarm.lockdown)}s`, ax + 111, 43);
    ctx.textAlign = 'left';
  }

  // Take.
  const tx = 500;
  label(ctx, 'TAKE', tx, 19);
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = COLOURS.loot;
  ctx.fillText(formatMoney(p.take), tx, 50);

  // Noise.
  const nx = 662;
  label(ctx, 'NOISE', nx, 19);
  ctx.fillStyle = '#1c2230';
  ctx.fillRect(nx, 30, 110, 14);
  ctx.fillStyle = state.noise > 60 ? '#ff8a3d' : COLOURS.thief;
  ctx.fillRect(nx, 30, 110 * Math.min(1, state.noise / 100), 14);
  ctx.strokeStyle = '#4a5368';
  ctx.strokeRect(nx + 0.5, 30.5, 109, 13);
  label(ctx, p.sneaking ? 'SNEAKING' : p.hidden ? 'IN SHADOW' : '', nx, 58, COLOURS.thief);

  // Code note and crown.
  const ix = 796;
  label(ctx, 'VAULT CODE', ix, 19);
  drawNote(ctx, ix + 10, 39, 0);
  ctx.font = 'bold 18px Consolas, "Courier New", monospace';
  ctx.fillStyle = p.hasNote ? '#f4ead0' : '#4a5368';
  ctx.fillText(p.hasNote ? state.code : '????', ix + 26, 46);
  label(ctx, 'CROWN', ix + 96, 19);
  ctx.globalAlpha = p.hasCrown ? 1 : 0.28;
  drawCrown(ctx, ix + 118, 40, 0.8, t);
  ctx.globalAlpha = 1;

  // Tools.
  const kx = 960;
  label(ctx, 'TOOLS', kx, 19);
  ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = p.take >= COIN_COST ? '#f4ead0' : '#4a5368';
  ctx.fillText(`CLICK  toss coin (−$${COIN_COST})`, kx, 37);
  const b = floor.breaker;
  ctx.fillStyle = floor.powerCut > 0 ? '#9fc4ff' : b.recharge > 0 ? '#4a5368' : '#e9c23c';
  ctx.fillText(floor.powerCut > 0 ? `POWER CUT ${Math.ceil(floor.powerCut)}s` : b.recharge > 0 ? `BREAKER ${Math.ceil(b.recharge)}s` : 'E  breaker box ready', kx, 54);

  // Clock and sightings.
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px Consolas, "Courier New", monospace';
  ctx.fillStyle = '#f4ead0';
  ctx.fillText(formatTime(state.time), VIEW_W - 16, 32);
  ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = state.timesSeen ? '#ff8a3d' : '#8d97ad';
  ctx.fillText(`SEEN ×${state.timesSeen}`, VIEW_W - 16, 52);
  ctx.textAlign = 'left';

  drawToasts(ctx, state);
}

function drawToasts(ctx, state) {
  let y = VIEW_H - 30 - (Math.min(3, state.toasts.length) - 1) * 32;
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const toast of state.toasts.slice(-3)) {
    const w = ctx.measureText(toast.text).width + 28;
    ctx.globalAlpha = Math.min(1, toast.life * 2);
    ctx.fillStyle = 'rgba(10, 13, 22, 0.9)';
    ctx.fillRect(VIEW_W / 2 - w / 2, y - 13, w, 26);
    ctx.fillStyle = toast.colour;
    ctx.fillRect(VIEW_W / 2 - w / 2, y - 13, 4, 26);
    ctx.fillText(toast.text, VIEW_W / 2, y + 1);
    y += 32;
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}
