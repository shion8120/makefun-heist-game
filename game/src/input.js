// Keyboard and mouse: which keys are held, which were pressed since the last frame, where the mouse
// points and where it clicked, all in the game's own 1280x800 coordinates.
import { VIEW_H, VIEW_W } from './floors.js';

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

export function createInput(canvas) {
  const held = new Set();
  let pressed = [];
  let clicks = [];
  const mouse = { x: VIEW_W / 2, y: VIEW_H / 2 };

  const toView = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
  };

  window.addEventListener('keydown', (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    if (!event.repeat) pressed.push({ code: event.code, key: event.key });
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (event) => Object.assign(mouse, toView(event)));
  canvas.addEventListener('pointerdown', (event) => {
    const at = toView(event);
    Object.assign(mouse, at);
    clicks.push({ ...at, button: event.button });
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    isDown: (code) => held.has(code),
    takePressed() {
      const out = pressed;
      pressed = [];
      return out;
    },
    takeClicks() {
      const out = clicks;
      clicks = [];
      return out;
    },
  };
}
