// The two hand-drawn floors of the Hollowell Museum of Horology, and everything placed on them:
// tile maps, loot, the code note, laser grids, cameras, guard patrol routes, breaker boxes, stairs,
// the vault's keypad door and the delivery-dock exit. Positions are in tiles; buildFloors() turns
// them into the pixel-space objects the rest of the game moves and draws.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 23;
export const HUD_H = 64;
export const VIEW_W = 1280;
export const VIEW_H = 800;

/**
 * Tile legend:
 *   #  wall            .  lit floor          ,  shadow (cover: guards and cameras see you only up close)
 *   c  crate / shelf   p  display plinth      o  pillar        V  vault floor
 *   S  stairs          K  vault keypad door   D  delivery-dock exit   B  breaker box (in a wall)
 * Walls, crates, pillars, the keypad door and the breaker block sight; plinths block only feet.
 */
const GALLERY_MAP = [
'########################################',
  '#,,,,,,,#..................#...........#',
  '#,cc,,c,#..................#...........#',
  '#,,,,,,,#.,o,..........,o,.#..ppp...ppp#',
  'B,,,,,,,#.,,,..........,,,............,#',
  '#,,c,,,,............................,,,#',
  '#,,c,,,,.......pp..pp......#c.......,,,#',
  '#,,,,,,,#..................#cc......,,,#',
  '#,cc,,c,#.,,,..........,,,.######..#####',
  '#,,,,,,,#.,o,..........,o,.#...........#',
  '#,,,,,,,#..................#.pp..p..pp.#',
  '####.####..................#...........#',
  '#,,,,,,,####..#######..#####...........#',
  '#,cc.......,,..........,,..............#',
  '#,cc.........................pp..p..pp.#',
  '#.......#,,......,,......,,#...........#',
  'D.......######..#######..#####..########',
  'D.......#..............................#',
  'D.......#..o.......o.......o.......SSS.#',
  '#,,..cc,...,.......,.......,.......SSS.#',
  '#,,..cc,...........................SSS.#',
  '#,,,,,,,#,,,,,,....................,,,,#',
  '########################################',
];

const VAULT_MAP = [
  '########################################',
  '#VVVVVVVVVVV#,,........#...............#',
  '#VVVVVVVVVVV#,.........#.ppp.......ppp.#',
  '#VVoVVVVVoVV#..........#...............#',
  '#VVVVVVVVVVVK..........#,,,..........cc#',
  '#VVVVVVVVVVVK..........#,,,..........cc#',
  '#VVoVVVVVoVV#..........................B',
  '#VVVVVVVVVVV#,........,..pp.........,,,#',
  '#VVVVVVVVVVV#,,......,,#............,,,#',
  '#################..###########..########',
  '#,,..................................,,#',
  '#.........o.................o..........#',
  '#,,..................................,,#',
  '#####..#############..###########..#####',
  '#..................#.........#.........#',
  '#.cccc..cccc..cccc.#.pp...pp.#.........#',
  '#..................#.........#,,.......#',
  '#........,,..................#,,.......#',
  '#.cccc..cccc..cccc...........#.....SSS.#',
  '#..................#.pp...pp.......SSS.#',
  '#.cccc..cccc..cccc.#...............SSS.#',
  '#,,,,,,,,,,,,,,,,,,#,,,,,,,,,#,,,,,,,,,#',
  '########################################',
];

/** What each kind of loot is worth, how loud grabbing it is (noise 0-100), and how much it slows you. */
export const LOOT_KINDS = {
  coin: { value: 60, noise: 14, weight: 0, label: 'COINS' },
  gem: { value: 350, noise: 24, weight: 0, label: 'RUBY' },
  sapphire: { value: 600, noise: 28, weight: 0, label: 'SAPPHIRE' },
  painting: { value: 1200, noise: 44, weight: 0.05, label: 'PAINTING' },
  gold: { value: 800, noise: 32, weight: 0.04, label: 'GOLD BAR' },
  crown: { value: 10000, noise: 60, weight: 0.06, label: 'CLOCKWORK CROWN' },
  note: { value: 0, noise: 0, weight: 0, label: 'CODE NOTE' },
};

/**
 * Lasers: a beam from a to b (tile units). sweep moves it by that offset and back over sweepPeriod
 * seconds; it is live for the first `on` seconds of every `period`, and flickers a warning just before.
 * Cameras: mounted at `at`, looking `angle` degrees (0 = east, 90 = south), swinging +-arc, seeing
 * fov degrees wide and range tiles far. Guards walk their route of tiles in a loop.
 */
const FLOOR_SPECS = [
  {
    name: 'GALLERY FLOOR',
    map: GALLERY_MAP,
    start: [3, 17],
    arrival: [34, 19],
    breaker: { tile: [0, 4], stand: [1, 4] },
    loot: [
      ['coin', 3, 3], ['coin', 6, 9],
      ['painting', 13, 1], ['painting', 18, 1], ['painting', 23, 1],
      ['gem', 15, 6], ['coin', 16, 6], ['coin', 19, 6], ['gem', 20, 6],
      ['coin', 31, 3], ['note', 37, 6],
      ['coin', 30, 10], ['sapphire', 33, 10], ['coin', 36, 10],
      ['gem', 29, 14], ['gem', 33, 14], ['sapphire', 37, 14],
      ['coin', 12, 21], ['coin', 20, 17], ['gem', 28, 21],
    ],
    lasers: [
      { a: [13, 1], b: [13, 12], sweep: [9, 0], sweepPeriod: 9, period: 5, on: 3.4, phase: 0 },
      { a: [27.5, 4], b: [27.5, 6], period: 3, on: 1.8, phase: 0.5 },
      { a: [28, 11.4], b: [39, 11.4], period: 3.4, on: 2.0, phase: 0 },
      { a: [28, 12.6], b: [39, 12.6], period: 3.4, on: 2.0, phase: 0.5 },
      { a: [23, 16.5], b: [25, 16.5], period: 2.6, on: 1.5, phase: 1.1 },
    ],
    cameras: [
      { at: [26.6, 1.4], angle: 135, arc: 42, speed: 0.55, fov: 48, range: 9, phase: 0 },
      { at: [28.4, 1.4], angle: 45, arc: 32, speed: 0.7, fov: 44, range: 8, phase: 1.5 },
      { at: [23.5, 21.6], angle: -90, arc: 58, speed: 0.5, fov: 46, range: 7, phase: 0.8 },
      { at: [38.6, 9.4], angle: 135, arc: 34, speed: 0.6, fov: 48, range: 9, phase: 2.2 },
    ],
    guards: [
      [[10, 2], [25, 2], [25, 10], [10, 10]],
      [[26, 14], [9, 14]],
      [[33, 17], [10, 17], [10, 20], [33, 20]],
    ],
    reinforcements: [
      [[4, 13], [6, 20], [2, 20], [6, 13]],
      [[10, 14], [26, 14], [26, 18], [10, 18]],
    ],
    labels: [
      ['WORKSHOP', 4.5, 10.5], ['GRAND GALLERY', 18, 7.5], ['OFFICE', 33.5, 5.5], ['GEM ROOM', 33.5, 12],
      ['SERVICE CORRIDOR', 18, 14.6], ['SCULPTURE HALL', 17, 21.5], ['DELIVERY DOCK', 4.5, 21.5],
    ],
  },
  {
    name: 'VAULT FLOOR',
    map: VAULT_MAP,
    arrival: [34, 19],
    breaker: { tile: [39, 6], stand: [38, 6] },
    keypad: { doors: [[12, 4], [12, 5]], panel: [13, 3] },
    loot: [
      ['crown', 6, 4],
      ['gold', 2, 1], ['gold', 10, 1], ['gold', 2, 8], ['gold', 10, 8],
      ['painting', 18, 1], ['coin', 14, 8],
      ['coin', 26, 2], ['sapphire', 36, 2], ['coin', 25, 7],
      ['coin', 4, 14], ['gem', 10, 17], ['coin', 16, 19], ['sapphire', 9, 21],
      ['gem', 21, 15], ['sapphire', 27, 19],
    ],
    lasers: [
      { a: [1, 1.2], b: [12, 1.2], sweep: [0, 7.6], sweepPeriod: 6, period: 7, on: 5, phase: 0 },
      { a: [15.5, 1], b: [15.5, 9], period: 3.6, on: 2.2, phase: 0 },
      { a: [7.5, 10], b: [7.5, 13], period: 3, on: 1.7, phase: 0 },
      { a: [24.5, 10], b: [24.5, 13], period: 3, on: 1.7, phase: 1.5 },
    ],
    cameras: [
      { at: [22.6, 1.4], angle: 135, arc: 40, speed: 0.6, fov: 48, range: 9, phase: 0 },
      { at: [6.5, 1.3], angle: 90, arc: 65, speed: 0.5, fov: 46, range: 8, phase: 1 },
      { at: [19.5, 10.1], angle: 90, arc: 70, speed: 0.65, fov: 44, range: 5, phase: 0.4 },
      { at: [28.6, 14.4], angle: 135, arc: 36, speed: 0.6, fov: 48, range: 8, phase: 2 },
    ],
    guards: [
      [[3, 10], [36, 10], [36, 12], [3, 12]],
      [[25, 3], [35, 3], [35, 6], [25, 6]],
      [[1, 16], [18, 16], [18, 19], [1, 19]],
    ],
    reinforcements: [
      [[33, 15], [33, 11], [17, 11], [17, 4]],
      [[13, 6], [21, 6], [21, 2], [13, 2]],
    ],
    labels: [
      ['THE VAULT', 6.5, 7.6], ['ANTECHAMBER', 18, 5.5], ['SECURITY ROOM', 31, 5.6],
      ['SERVICE TUNNEL', 19, 12.6], ['ARCHIVE', 9.5, 17.6], ['CLOCK LAB', 24.5, 17.5], ['STAIR LANDING', 34, 15.4],
    ],
  },
];

const px = (tiles) => tiles * TILE;
const centre = (tile) => (tile + 0.5) * TILE;

/** Fresh, untouched copies of both floors for a new heist. */
export function buildFloors() {
  return FLOOR_SPECS.map((spec, index) => buildFloor(spec, index));
}

function buildFloor(spec, index) {
  const grid = spec.map.map((row) => row.split(''));
  return {
    index,
    name: spec.name,
    grid,
    start: spec.start ? { x: centre(spec.start[0]), y: centre(spec.start[1]) } : null,
    arrival: { x: centre(spec.arrival[0]), y: centre(spec.arrival[1]) },
    loot: spec.loot.map(([kind, c, r]) => ({ kind, ...LOOT_KINDS[kind], x: centre(c), y: centre(r), c, r, taken: false })),
    lasers: spec.lasers.map((l) => ({
      ax: px(l.a[0]), ay: px(l.a[1]), bx: px(l.b[0]), by: px(l.b[1]),
      sx: l.sweep ? px(l.sweep[0]) : 0, sy: l.sweep ? px(l.sweep[1]) : 0,
      sweepPeriod: l.sweepPeriod ?? 0, period: l.period, on: l.on, phase: l.phase,
      x1: 0, y1: 0, x2: 0, y2: 0, active: false, warn: false, cooldown: 0,
    })),
    cameras: spec.cameras.map((c) => ({
      x: px(c.at[0]), y: px(c.at[1]), base: (c.angle * Math.PI) / 180, arc: (c.arc * Math.PI) / 180,
      speed: c.speed, fov: (c.fov * Math.PI) / 180, range: px(c.range), phase: c.phase,
      angle: (c.angle * Math.PI) / 180, poly: null, seeing: false, alertTimer: 0,
    })),
    guardRoutes: spec.guards,
    reinforcementRoutes: spec.reinforcements,
    guards: [],
    breaker: { c: spec.breaker.tile[0], r: spec.breaker.tile[1], x: centre(spec.breaker.stand[0]), y: centre(spec.breaker.stand[1]), recharge: 0 },
    powerCut: 0,
    keypad: spec.keypad
      ? { doors: spec.keypad.doors, x: px(spec.keypad.panel[0]), y: px(spec.keypad.panel[1] + 2), open: false }
      : null,
    labels: spec.labels,
    hasExit: spec.map.some((row) => row.includes('D')),
  };
}

/** Floor index and tile of the stairs arrival; used when the thief changes floors. */
export function otherFloor(index) {
  return index === 0 ? 1 : 0;
}
