// Every sound in the game, made in code with WebAudio oscillators and a little noise: loot chimes,
// laser buzz, alarm whoops, camera pings, keypad beeps, the power going down, and the success sting.
// Nothing plays until the first key or click (browsers keep audio locked until then).

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function unlock() {
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = 0.2;
      master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, { type = 'square', vol = 0.3, slide = 1, delay = 0 } = {}) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function hiss(dur, { vol = 0.2, freq = 1200, q = 1, delay = 0 } = {}) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const sounds = {
    coin: () => { tone(1320, 0.07, { vol: 0.12 }); tone(1760, 0.14, { vol: 0.12, delay: 0.06 }); },
    gem: () => [988, 1319, 1976].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.2, delay: i * 0.05 })),
    painting: () => { hiss(0.25, { vol: 0.25, freq: 500 }); tone(150, 0.3, { type: 'triangle', vol: 0.25, slide: 0.6 }); },
    gold: () => { tone(523, 0.2, { type: 'triangle', vol: 0.2 }); tone(784, 0.3, { type: 'triangle', vol: 0.18, delay: 0.08 }); },
    crown: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.2, delay: i * 0.07 })),
    note: () => { hiss(0.12, { vol: 0.15, freq: 3000 }); hiss(0.1, { vol: 0.12, freq: 2400, delay: 0.1 }); },
    laser: () => { tone(220, 0.35, { type: 'sawtooth', vol: 0.22, slide: 0.5 }); tone(110, 0.35, { vol: 0.12 }); },
    whoop: () => { tone(420, 0.45, { type: 'sawtooth', vol: 0.16, slide: 2.2 }); tone(420, 0.45, { type: 'sawtooth', vol: 0.16, slide: 2.2, delay: 0.5 }); },
    camera: () => tone(2200, 0.06, { type: 'sine', vol: 0.1 }),
    spotted: () => { tone(880, 0.08, { vol: 0.16 }); tone(1175, 0.18, { vol: 0.16, delay: 0.07 }); },
    heard: () => tone(520, 0.12, { type: 'triangle', vol: 0.1, slide: 1.3 }),
    key: () => tone(1250, 0.05, { vol: 0.08 }),
    granted: () => { tone(880, 0.1, { vol: 0.14 }); tone(1320, 0.25, { vol: 0.14, delay: 0.1 }); hiss(0.6, { vol: 0.1, freq: 300, delay: 0.2 }); },
    denied: () => tone(150, 0.4, { type: 'sawtooth', vol: 0.2 }),
    powerOff: () => { tone(380, 0.7, { type: 'sawtooth', vol: 0.18, slide: 0.15 }); hiss(0.3, { vol: 0.2, freq: 800 }); },
    powerOn: () => tone(90, 0.6, { type: 'sawtooth', vol: 0.14, slide: 4 }),
    stairs: () => [0, 0.12, 0.24].forEach((d) => tone(120, 0.08, { type: 'triangle', vol: 0.2, delay: d })),
    throw: () => hiss(0.18, { vol: 0.12, freq: 1800, q: 0.7 }),
    coinLand: () => { tone(2600, 0.05, { vol: 0.1 }); tone(2100, 0.09, { vol: 0.1, delay: 0.06 }); tone(2400, 0.06, { vol: 0.07, delay: 0.16 }); },
    tick: () => tone(1000, 0.04, { type: 'square', vol: 0.07 }),
    sting: () => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'square', vol: 0.1, delay: i * 0.1 }));
      [523, 659, 784].forEach((f) => tone(f * 2, 0.9, { type: 'triangle', vol: 0.12, delay: 0.45 }));
    },
    busted: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.14, delay: i * 0.16 })),
    blip: () => tone(660, 0.06, { type: 'triangle', vol: 0.1 }),
  };

  return {
    unlock,
    play(name) {
      const sound = sounds[name];
      if (sound) sound();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
