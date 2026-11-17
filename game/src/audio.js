// All sound is synthesized with WebAudio — no audio files. A tiny bass
// loop plays while driving, and short blips cover engine hum, siren,
// pickup, gunshot, punch, crash and mission jingles. Nothing is created
// until the player first interacts, so browsers never block it.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ac = ensure(); if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ac.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + dur);
  }

  function noise(dur, gain) {
    if (muted) return;
    const ac = ensure(); if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain(); g.gain.value = gain || 0.12;
    src.connect(g); g.connect(ac.destination); src.start();
  }

  const BASS = [55, 55, 65.4, 49, 55, 55, 73.4, 65.4];
  function startMusic() {
    if (musicTimer || muted) return;
    ensure(); if (!ctx) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      tone(BASS[musicStep % BASS.length], 0.42, 'triangle', 0.06);
      if (musicStep % 4 === 2) tone(BASS[musicStep % BASS.length] * 2, 0.12, 'sine', 0.03);
      musicStep += 1;
    }, 210);
  }
  function stopMusic() { if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; } }

  return {
    unlock() { ensure(); startMusic(); },
    toggleMute() { muted = !muted; if (muted) stopMusic(); else startMusic(); return muted; },
    get muted() { return muted; },
    shot() { noise(0.14, 0.2); tone(180, 0.1, 'square', 0.1, 60); },
    punch() { noise(0.08, 0.14); },
    pickup() { tone(660, 0.09, 'sine', 0.1); tone(990, 0.14, 'sine', 0.1); },
    cash() { tone(880, 0.1, 'sine', 0.1); tone(1174, 0.1, 'sine', 0.1); tone(1568, 0.22, 'sine', 0.1); },
    crash() { noise(0.25, 0.22); tone(90, 0.2, 'sawtooth', 0.12, 40); },
    siren() { tone(700, 0.35, 'sine', 0.05, 950); },
    fail() { tone(330, 0.25, 'sawtooth', 0.1, 165); },
    engine(speed01) { if (!muted && ctx) tone(50 + speed01 * 90, 0.06, 'sawtooth', 0.015); },
  };
}
