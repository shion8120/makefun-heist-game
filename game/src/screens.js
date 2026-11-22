// The full-screen and overlay screens: the title and briefing, the pause card, the vault keypad
// (clickable), the moment of being caught, and the score screen with its rank stamp.
import { HUD_H, VIEW_H, VIEW_W } from './floors.js';
import { ENDINGS, RANKS, formatMoney, formatTime } from './scoring.js';
import { COLOURS, drawCrown, drawGear, drawGem, drawCoins } from './sprites.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Segoe UI", Arial, sans-serif';

function text(ctx, value, x, y, font, colour, align = 'center') {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 13, 22, 0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COLOURS.brass;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = COLOURS.brassDark;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
}

// ---------- title ----------

export function drawTitle(ctx, state) {
  const t = state.clock;
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawGear(ctx, 150, 170, 120, 18, t * 0.15, 'rgba(201, 160, 99, 0.35)', 3);
  drawGear(ctx, 300, 300, 70, 12, -t * 0.26, 'rgba(201, 160, 99, 0.25)', 3);
  drawGear(ctx, 1130, 640, 140, 20, -t * 0.12, 'rgba(201, 160, 99, 0.3)', 3);
  drawGear(ctx, 960, 720, 60, 10, t * 0.28, 'rgba(201, 160, 99, 0.22)', 3);

  drawCrown(ctx, VIEW_W / 2, 118, 3.2, t);
  text(ctx, 'THE CLOCKWORK VAULT', VIEW_W / 2, 215, `bold 68px ${SERIF}`, COLOURS.brass);
  text(ctx, 'One night. One museum. One crown that has never stopped ticking.', VIEW_W / 2, 262, `italic 20px ${SERIF}`, '#d6be8c');

  panel(ctx, 170, 300, 440, 300);
  text(ctx, 'THE JOB', 390, 330, `bold 16px ${SANS}`, COLOURS.brass);
  const steps = [
    '1  Find the code note in the office',
    '2  Take the stairs down to the vault floor',
    '3  Open the keypad door, lift the crown',
    '4  Get out through the delivery dock',
  ];
  steps.forEach((s, i) => text(ctx, s, 200, 370 + i * 34, `16px ${SANS}`, '#f4ead0', 'left'));
  text(ctx, 'Alarm level 3 seals the museum in 30 seconds.', 390, 520, `italic 14px ${SANS}`, '#ff8a3d');
  text(ctx, 'Every grab makes noise, and guards listen.', 390, 548, `italic 14px ${SANS}`, '#8d97ad');

  panel(ctx, 670, 300, 440, 300);
  text(ctx, 'CONTROLS', 890, 330, `bold 16px ${SANS}`, COLOURS.brass);
  const keys = [
    ['WASD / ARROWS', 'move'],
    ['SHIFT', 'sneak (silent, slow)'],
    ['E', 'breaker box / keypad'],
    ['CLICK', 'toss a coin ($50) as a lure'],
    ['P / R / M', 'pause / restart / mute'],
  ];
  keys.forEach(([k, v], i) => {
    text(ctx, k, 700, 370 + i * 34, `bold 15px ${SANS}`, COLOURS.thief, 'left');
    text(ctx, v, 860, 370 + i * 34, `15px ${SANS}`, '#f4ead0', 'left');
  });

  // Legend: what each colour means in the museum.
  const ly = 640;
  ctx.fillStyle = '#0b0e16';
  ctx.fillRect(220, ly - 12, 24, 24);
  ctx.strokeStyle = '#1b2333';
  ctx.lineWidth = 2;
  for (let k = -24; k < 24; k += 8) {
    ctx.beginPath();
    ctx.moveTo(220 + Math.max(0, k), ly - 12 + Math.max(0, -k));
    ctx.lineTo(220 + Math.min(24, k + 24), ly - 12 + Math.min(24, 24 - k));
    ctx.stroke();
  }
  text(ctx, 'SHADOW = COVER', 254, ly, `bold 14px ${SANS}`, '#8d97ad', 'left');
  ctx.fillStyle = 'rgba(255, 70, 70, 0.45)';
  ctx.beginPath();
  ctx.moveTo(470, ly);
  ctx.lineTo(500, ly - 13);
  ctx.lineTo(500, ly + 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ff3355';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(506, ly - 12);
  ctx.lineTo(506, ly + 12);
  ctx.stroke();
  text(ctx, 'CONES & LASERS = DANGER', 518, ly, `bold 14px ${SANS}`, '#ff6a6a', 'left');
  drawCoins(ctx, 770, ly);
  drawGem(ctx, 792, ly, '#ff4d6d');
  text(ctx, 'GOLD GLOW = LOOT', 808, ly, `bold 14px ${SANS}`, COLOURS.loot, 'left');
  ctx.strokeStyle = COLOURS.thief;
  ctx.fillStyle = '#161b26';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(980, ly, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'YOU', 996, ly, `bold 14px ${SANS}`, COLOURS.thief, 'left');

  const pulse = 0.6 + Math.sin(t * 3) * 0.4;
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS ENTER OR CLICK TO BEGIN THE HEIST', VIEW_W / 2, 718, `bold 22px ${SANS}`, '#f4ead0');
  ctx.globalAlpha = 1;
  text(ctx, 'Hollowell Museum of Horology · after hours', VIEW_W / 2, 762, `13px ${SANS}`, '#5d6782');
}

// ---------- pause ----------

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 220, 280, 440, 220);
  text(ctx, 'PAUSED', VIEW_W / 2, 330, `bold 44px ${SERIF}`, COLOURS.brass);
  text(ctx, 'The guards are frozen mid-step. So are you.', VIEW_W / 2, 385, `italic 16px ${SERIF}`, '#d6be8c');
  text(ctx, 'P  resume      R  restart      M  mute', VIEW_W / 2, 440, `bold 15px ${SANS}`, '#f4ead0');
}

// ---------- keypad ----------

const PAD = { x: 905, y: HUD_H + 70, w: 330, h: 520 };
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'];

/** Where each keypad button is on screen, for drawing and for mouse clicks. */
export function keypadButtons() {
  return KEYS.map((key, i) => ({
    key,
    x: PAD.x + 45 + (i % 3) * 84,
    y: PAD.y + 190 + Math.floor(i / 3) * 70,
    w: 72,
    h: 58,
  }));
}

export function drawKeypad(ctx, state) {
  const pad = state.keypad;
  panel(ctx, PAD.x, PAD.y, PAD.w, PAD.h);
  text(ctx, 'VAULT DOOR', PAD.x + PAD.w / 2, PAD.y + 36, `bold 18px ${SANS}`, COLOURS.brass);
  const screen = pad.status === 'granted' ? '#123322' : pad.status === 'denied' && pad.flash > 0 ? '#3a1018' : '#0f1a14';
  ctx.fillStyle = screen;
  ctx.fillRect(PAD.x + 40, PAD.y + 64, PAD.w - 80, 70);
  ctx.strokeStyle = '#4a5368';
  ctx.strokeRect(PAD.x + 40.5, PAD.y + 64.5, PAD.w - 81, 69);
  const shown = pad.status === 'granted' ? 'OPEN' : pad.status === 'denied' && pad.flash > 0 ? 'DENIED' : (pad.entry + '____').slice(0, 4).split('').join(' ');
  text(ctx, shown, PAD.x + PAD.w / 2, PAD.y + 100, `bold 38px Consolas, "Courier New", monospace`, pad.status === 'denied' && pad.flash > 0 ? '#ff3b55' : '#3fd17a');
  text(ctx, 'wrong code = alarm', PAD.x + PAD.w / 2, PAD.y + 155, `italic 13px ${SANS}`, '#ff8a3d');
  for (const b of keypadButtons()) {
    ctx.fillStyle = '#262c3b';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = COLOURS.brassDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    text(ctx, b.key === '<' ? '⌫' : b.key, b.x + b.w / 2, b.y + b.h / 2 + 1, `bold 24px ${SANS}`, '#f4ead0');
  }
  text(ctx, 'type or click · ESC to step away', PAD.x + PAD.w / 2, PAD.y + PAD.h - 26, `13px ${SANS}`, '#8d97ad');

  // The note from the office, pinned beside the keypad once found.
  if (state.player.hasNote) {
    ctx.save();
    ctx.translate(PAD.x - 120, PAD.y + 120);
    ctx.rotate(-0.12);
    ctx.fillStyle = COLOURS.paper;
    ctx.fillRect(-80, -60, 160, 120);
    ctx.fillStyle = '#ff3b55';
    ctx.beginPath();
    ctx.arc(0, -52, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'vault — new code', 0, -26, `italic 15px ${SERIF}`, '#5a4a2a');
    text(ctx, state.code, 0, 8, `bold 36px ${SERIF}`, '#2a1d10');
    text(ctx, "don't lose this! — M.", 0, 42, `italic 13px ${SERIF}`, '#5a4a2a');
    ctx.restore();
  }
}

// ---------- caught ----------

export function drawCaught(ctx, state) {
  const k = Math.min(1, (1.4 - state.caughtTimer) * 2);
  ctx.fillStyle = `rgba(120, 0, 20, ${0.35 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const g = state.caughtBy;
  if (g) {
    ctx.strokeStyle = `rgba(255, 233, 160, ${0.9 * k})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(g.x, g.y + HUD_H, 30 + k * 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  text(ctx, state.caughtReason === 'sealed' ? 'SEALED IN!' : 'CAUGHT!', VIEW_W / 2, VIEW_H / 2, `bold ${Math.round(60 + k * 30)}px ${SERIF}`, '#ffffff');
}

// ---------- score ----------

export function drawEnd(ctx, state) {
  const stats = state.ending;
  const ending = ENDINGS[stats.kind];
  const rank = RANKS[stats.rank];
  const t = state.clock;
  ctx.fillStyle = 'rgba(5, 7, 12, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const x = 230;
  const y = 110;
  const w = 820;
  const h = 590;
  panel(ctx, x, y, w, h);
  drawGear(ctx, x + w - 40, y + 40, 60, 14, t * 0.3, 'rgba(201, 160, 99, 0.25)', 3);
  text(ctx, ending.title, VIEW_W / 2, y + 62, `bold 52px ${SERIF}`, stats.escaped ? COLOURS.brass : '#ff3b55');
  wrap(ctx, ending.line, VIEW_W / 2, y + 112, 640, 24, `italic 17px ${SERIF}`, '#d6be8c');

  if (stats.crown) drawCrown(ctx, x + 150, y + 300, 3, t);
  else {
    ctx.strokeStyle = 'rgba(201, 160, 99, 0.4)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 90, y + 250, 120, 100);
    ctx.setLineDash([]);
    text(ctx, 'no crown', x + 150, y + 300, `italic 15px ${SERIF}`, '#8d97ad');
  }

  const rows = [
    ['LOOT VALUE', formatMoney(stats.loot), COLOURS.loot],
    ['PIECES TAKEN', String(stats.pieces), '#f4ead0'],
    ['TIME', formatTime(stats.time), '#f4ead0'],
    ['TIMES SEEN', String(stats.timesSeen), stats.timesSeen ? '#ff8a3d' : COLOURS.thief],
    ['HIGHEST ALARM', `LEVEL ${stats.maxAlarm}`, stats.maxAlarm >= 3 ? '#ff3b55' : '#f4ead0'],
    ['TOOLS USED', String(stats.toolsUsed), '#f4ead0'],
  ];
  rows.forEach(([name, value, colour], i) => {
    const ry = y + 190 + i * 40;
    text(ctx, name, x + 300, ry, `600 15px ${SANS}`, '#8d97ad', 'left');
    text(ctx, value, x + 560, ry, `bold 22px ${SANS}`, colour, 'right');
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(x + 300, ry + 18, 260, 1);
  });

  // The rank stamp.
  ctx.save();
  ctx.translate(x + 700, y + 300);
  ctx.rotate(-0.16);
  ctx.strokeStyle = rank.colour;
  ctx.lineWidth = 4;
  ctx.strokeRect(-100, -48, 200, 96);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-92, -40, 184, 80);
  text(ctx, 'RANK', 0, -22, `bold 13px ${SANS}`, rank.colour);
  text(ctx, rank.name, 0, 8, `bold ${rank.name.length > 12 ? 22 : 26}px ${SANS}`, rank.colour);
  ctx.restore();
  wrap(ctx, rank.blurb, x + 700, y + 400, 220, 20, `italic 14px ${SERIF}`, '#d6be8c');

  text(ctx, 'R  run it again        ENTER  title screen', VIEW_W / 2, y + h - 40, `bold 16px ${SANS}`, '#f4ead0');
}

function wrap(ctx, value, x, y, width, lineHeight, font, colour) {
  ctx.font = font;
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * lineHeight, font, colour));
}
