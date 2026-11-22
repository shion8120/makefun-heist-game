// Spatial maths on a floor's tile grid: which tiles stop feet or eyes, sliding a round body along
// walls, casting sight rays, the visibility polygon of a vision cone, and grid paths for guards.
import { COLS, ROWS, TILE } from './floors.js';

const SOLID = new Set(['#', 'c', 'p', 'o', 'K', 'B']);
const OPAQUE = new Set(['#', 'c', 'o', 'K', 'B']);

export function tileAt(floor, c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '#';
  return floor.grid[r][c];
}

export function tileAtPoint(floor, x, y) {
  return tileAt(floor, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function isSolidTile(floor, c, r) {
  return SOLID.has(tileAt(floor, c, r));
}

export function isOpaqueTile(floor, c, r) {
  return OPAQUE.has(tileAt(floor, c, r));
}

/** True when the point stands on a shadow tile, where the thief is hard to see. */
export function inShadow(floor, x, y) {
  return tileAtPoint(floor, x, y) === ',';
}

/** Moves a round body {x, y, r} by (dx, dy), sliding along any solid tile it meets. */
export function moveCircle(floor, body, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
  for (let i = 0; i < steps; i += 1) {
    body.x += dx / steps;
    pushOut(floor, body);
    body.y += dy / steps;
    pushOut(floor, body);
  }
}

function pushOut(floor, body) {
  const c0 = Math.floor((body.x - body.r) / TILE);
  const c1 = Math.floor((body.x + body.r) / TILE);
  const r0 = Math.floor((body.y - body.r) / TILE);
  const r1 = Math.floor((body.y + body.r) / TILE);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (!isSolidTile(floor, c, r)) continue;
      const nx = Math.max(c * TILE, Math.min(body.x, (c + 1) * TILE));
      const ny = Math.max(r * TILE, Math.min(body.y, (r + 1) * TILE));
      let ox = body.x - nx;
      let oy = body.y - ny;
      const d = Math.hypot(ox, oy);
      if (d >= body.r) continue;
      if (d < 0.001) {
        ox = body.x - (c + 0.5) * TILE;
        oy = body.y - (r + 0.5) * TILE;
        const m = Math.hypot(ox, oy) || 1;
        body.x = (c + 0.5) * TILE + (ox / m) * (TILE / 2 + body.r);
        body.y = (r + 0.5) * TILE + (oy / m) * (TILE / 2 + body.r);
      } else {
        body.x = nx + (ox / d) * body.r;
        body.y = ny + (oy / d) * body.r;
      }
    }
  }
}

/** Distance along a ray from (x, y) at `angle` to the first tile that blocks sight, at most maxDist. */
export function castRay(floor, x, y, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let c = Math.floor(x / TILE);
  let r = Math.floor(y / TILE);
  const stepC = dx > 0 ? 1 : -1;
  const stepR = dy > 0 ? 1 : -1;
  const tDeltaX = Math.abs(dx) < 1e-9 ? Infinity : Math.abs(TILE / dx);
  const tDeltaY = Math.abs(dy) < 1e-9 ? Infinity : Math.abs(TILE / dy);
  let tMaxX = Math.abs(dx) < 1e-9 ? Infinity : (dx > 0 ? (c + 1) * TILE - x : x - c * TILE) / Math.abs(dx);
  let tMaxY = Math.abs(dy) < 1e-9 ? Infinity : (dy > 0 ? (r + 1) * TILE - y : y - r * TILE) / Math.abs(dy);
  let t = 0;
  while (t < maxDist) {
    if (tMaxX < tMaxY) {
      t = tMaxX;
      tMaxX += tDeltaX;
      c += stepC;
    } else {
      t = tMaxY;
      tMaxY += tDeltaY;
      r += stepR;
    }
    if (t >= maxDist) break;
    if (isOpaqueTile(floor, c, r)) return t;
  }
  return maxDist;
}

export function lineOfSight(floor, x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 1) return true;
  return castRay(floor, x1, y1, Math.atan2(y2 - y1, x2 - x1), d) >= d - 2;
}

/** The outline of what a cone sees: its apex, then points along its far edge, cut short by walls. */
export function visionPolygon(floor, x, y, facing, fov, range, rays = 32) {
  const points = [x, y];
  for (let i = 0; i <= rays; i += 1) {
    const a = facing - fov / 2 + (fov * i) / rays;
    const d = castRay(floor, x, y, a, range);
    points.push(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  return points;
}

/** Smallest signed difference between two angles, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Turns `from` toward `to` by at most `step` radians. */
export function turnToward(from, to, step) {
  const d = angleDiff(to, from);
  if (Math.abs(d) <= step) return to;
  return from + Math.sign(d) * step;
}

export function distToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len2));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

/** Can an eye at (x, y) looking along `facing` see the thief? Shadow cuts the reach to `shadowReach`. */
export function canSee(floor, x, y, facing, fov, range, target, shadowReach) {
  const d = Math.hypot(target.x - x, target.y - y);
  const reach = inShadow(floor, target.x, target.y) ? range * shadowReach : range;
  if (d > reach + target.r) return false;
  if (d > 26 && Math.abs(angleDiff(Math.atan2(target.y - y, target.x - x), facing)) > fov / 2 + Math.atan2(target.r, d)) return false;
  return lineOfSight(floor, x, y, target.x, target.y);
}

/** Breadth-first path over walkable tiles, as tile centres from the step after `from` to `to`. */
export function findPath(floor, fromC, fromR, toC, toR) {
  if (isSolidTile(floor, toC, toR)) return [];
  const start = fromR * COLS + fromC;
  const goal = toR * COLS + toC;
  if (start === goal) return [];
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  prev[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head];
    if (cur === goal) break;
    const c = cur % COLS;
    const r = (cur - c) / COLS;
    const next = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
    for (const [nc, nr] of next) {
      if (isSolidTile(floor, nc, nr)) continue;
      const id = nr * COLS + nc;
      if (prev[id] !== -1) continue;
      prev[id] = cur;
      queue.push(id);
    }
  }
  if (prev[goal] === -1) return [];
  const path = [];
  for (let id = goal; id !== start; id = prev[id]) {
    const c = id % COLS;
    path.push({ x: (c + 0.5) * TILE, y: ((id - c) / COLS + 0.5) * TILE });
  }
  return path.reverse();
}
