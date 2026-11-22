// Code-drawn sprites, one function per thing: brass gears, the Clockwork Crown, coins, gems, gold,
// paintings, the code note, the thief, guards and cameras. No image files anywhere.

export const COLOURS = {
  brass: '#c9a063',
  brassDark: '#7d6038',
  thief: '#45e6c8',
  loot: '#ffd45c',
  danger: '#ff3b55',
  cone: '#ffe9a0',
  ink: '#0a0d16',
  paper: '#f4ead0',
};

export function drawGear(ctx, x, y, radius, teeth, angle, colour, width = 2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  const inner = radius * 0.82;
  for (let i = 0; i < teeth * 2; i += 1) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : inner;
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  ctx.closePath();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.35, Math.sin(a) * radius * 0.35);
    ctx.lineTo(Math.cos(a) * inner * 0.9, Math.sin(a) * inner * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft ring of light marking something worth stealing. */
export function drawLootGlow(ctx, x, y, radius, t, colour = 'rgba(255, 212, 92, 0.16)') {
  const pulse = 1 + Math.sin(t * 3 + x * 0.1) * 0.12;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius * pulse * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCrown(ctx, x, y, scale, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e8b93f';
  ctx.strokeStyle = '#6b4a12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-8, -1);
  ctx.lineTo(0, -13);
  ctx.lineTo(8, -1);
  ctx.lineTo(16, -8);
  ctx.lineTo(14, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8862a';
  ctx.fillRect(-14, 4, 28, 5);
  ctx.strokeRect(-14, 4, 28, 5);
  for (const [gx, colour] of [[-16, '#ff4d6d'], [0, '#45e6c8'], [16, '#ff4d6d']]) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(gx, gx === 0 ? -13 : -8, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  drawGear(ctx, 0, 0, 5.5, 8, t * 1.5, '#fff1c4', 1.3);
  ctx.restore();
}

export function drawCoins(ctx, x, y) {
  for (const [dx, dy] of [[-4, 2], [4, 3], [0, -3]]) {
    ctx.fillStyle = '#b8862a';
    ctx.beginPath();
    ctx.arc(x + dx, y + dy + 1.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd45c';
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGem(ctx, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 7, y - 2);
  ctx.lineTo(x, y + 8);
  ctx.lineTo(x - 7, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 2);
  ctx.lineTo(x + 7, y - 2);
  ctx.stroke();
}

export function drawGoldBar(ctx, x, y) {
  ctx.fillStyle = '#e8b93f';
  ctx.strokeStyle = '#6b4a12';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 5);
  ctx.lineTo(x - 7, y - 5);
  ctx.lineTo(x + 7, y - 5);
  ctx.lineTo(x + 10, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff1c4';
  ctx.fillRect(x - 5, y - 3, 6, 2);
}

const CANVAS_TINTS = ['#3f6f8f', '#8f3f4f', '#4f8f5f', '#8f7a3f', '#5f4f8f'];

/** A framed painting hanging on the wall just above (x, y); an empty frame once stolen. */
export function drawPainting(ctx, x, y, variant, taken) {
  const w = 34;
  const h = 22;
  const left = x - w / 2;
  const top = y - h / 2;
  if (taken) {
    ctx.strokeStyle = 'rgba(244, 234, 208, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left + 2, top + 2, w - 4, h - 4);
    ctx.setLineDash([]);
    return;
  }
  ctx.fillStyle = '#c9a063';
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = CANVAS_TINTS[variant % CANVAS_TINTS.length];
  ctx.fillRect(left + 3, top + 3, w - 6, h - 6);
  ctx.fillStyle = CANVAS_TINTS[(variant + 2) % CANVAS_TINTS.length];
  ctx.beginPath();
  ctx.arc(left + 10 + (variant % 3) * 3, top + 9, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 241, 196, 0.7)';
  ctx.fillRect(left + 15, top + 10, 8, 3);
}

export function drawNote(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25 + Math.sin(t * 2) * 0.05);
  ctx.fillStyle = COLOURS.paper;
  ctx.fillRect(-8, -6, 16, 12);
  ctx.strokeStyle = '#8a7a55';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-5, -2 + i * 3);
    ctx.lineTo(5, -2 + i * 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** The thief: dark coat, teal trim, a loot sack that swells with every piece taken. */
export function drawThief(ctx, p, t) {
  const alpha = p.hidden ? 0.6 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const back = p.facing + Math.PI;
  const bag = 5 + Math.min(p.lootCount, 12) * 0.55;
  ctx.fillStyle = '#7a5a36';
  ctx.strokeStyle = '#2a1d10';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(back) * 9, p.y + Math.sin(back) * 9, bag, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const bob = p.moving ? Math.sin(t * 18) * 1.2 : 0;
  ctx.fillStyle = 'rgba(69, 230, 200, 0.28)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#161b26';
  ctx.strokeStyle = COLOURS.thief;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 2 + bob * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOURS.thief;
  const fx = Math.cos(p.facing);
  const fy = Math.sin(p.facing);
  ctx.beginPath();
  ctx.arc(p.x + fx * 4 - fy * 3, p.y + fy * 4 + fx * 3, 2, 0, Math.PI * 2);
  ctx.arc(p.x + fx * 4 + fy * 3, p.y + fy * 4 - fx * 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.hidden) {
    ctx.strokeStyle = 'rgba(69, 230, 200, 0.55)';
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** A night guard seen from above: cap, shoulders, torch; red uniforms are the lockdown squad. */
export function drawGuard(ctx, g) {
  const fx = Math.cos(g.facing);
  const fy = Math.sin(g.facing);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(g.facing);
  ctx.fillStyle = g.reinforcement ? '#c23a50' : '#3f6fd8';
  ctx.strokeStyle = '#e6eeff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, g.r * 0.8, g.r * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = g.reinforcement ? '#5a1420' : '#18295a';
  ctx.beginPath();
  ctx.arc(0, 0, g.r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(g.r * 0.35, -g.r * 0.45, g.r * 0.45, g.r * 0.9);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(g.r * 0.7, g.r * 0.55, 6, 4);
  ctx.restore();
  return { fx, fy };
}

/** The head marker over a guard: a "?" with a ring that fills as suspicion grows, or a red "!". */
export function drawGuardMarker(ctx, g, mood, t) {
  if (mood === 'calm') return;
  const x = g.x;
  const y = g.y - 26;
  const alert = mood === 'alert';
  ctx.fillStyle = alert ? COLOURS.danger : '#ffb02e';
  ctx.strokeStyle = COLOURS.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!alert && g.suspicion > 0) {
    ctx.strokeStyle = COLOURS.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, g.suspicion));
    ctx.stroke();
  }
  ctx.fillStyle = COLOURS.ink;
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(alert ? '!' : '?', x, y + 1 + (alert ? Math.sin(t * 20) : 0));
}

export function drawCameraBody(ctx, cam) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.angle);
  ctx.fillStyle = '#9aa3b5';
  ctx.strokeStyle = '#05070c';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-7, -5, 15, 10);
  ctx.strokeRect(-7, -5, 15, 10);
  ctx.fillStyle = cam.off ? '#333a48' : cam.seeing ? '#ff2040' : '#ff6a3d';
  ctx.beginPath();
  ctx.arc(8, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
