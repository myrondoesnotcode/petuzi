/* ---- Uzi's Tel Aviv Run --------------------------------------------------
   Flap Uzi past the White City. Collect pets and treats.
   Everything is drawn on a canvas; the only asset is Uzi's portrait.
   ------------------------------------------------------------------------ */

const cvs   = document.getElementById('game');
const ctx   = cvs.getContext('2d');
const stage = document.getElementById('stage');

const scoreEl  = document.getElementById('score');
const petEl    = document.getElementById('petCount');
const treatEl  = document.getElementById('treatCount');
const startPan = document.getElementById('startPanel');
const overPan  = document.getElementById('overPanel');
const startBtn = document.getElementById('startBtn');
const againBtn = document.getElementById('againBtn');
const sndBtn   = document.getElementById('sndBtn');

const BEST_KEY  = 'uzi.game.best';
const SOUND_KEY = 'uzi.game.sound';

/* ---- canvas sizing -------------------------------------------------------- */

let W = 0, H = 0, S = 1, GROUND = 0, HORIZON = 0;

function resize() {
  const r = stage.getBoundingClientRect();
  if (!r.width || !r.height) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = r.width;
  H = r.height;
  cvs.width = Math.round(W * dpr);
  cvs.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // One scale factor keeps the physics geometrically similar on every screen,
  // so a phone and a desktop play the same rather than one being far harder.
  S = Math.max(0.72, Math.min(1.5, H / 650));
  GROUND = H - 58 * S;
  HORIZON = GROUND - 40 * S;   // a horizon strip, not an ocean the palms wade in

  if (uzi) uzi.r = 25 * S;
}

/* ---- sound ---------------------------------------------------------------- */

let actx = null;
let muted = localStorage.getItem(SOUND_KEY) === 'off';

function paintSound() {
  sndBtn.textContent = muted ? '🔇' : '🔊';
  sndBtn.classList.toggle('off', muted);
}

function ensureAudio() {
  if (muted) return;
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
  }
  if (actx.state === 'suspended') actx.resume();
}

function tone(from, to, dur, type = 'sine', vol = 0.05, delay = 0) {
  if (muted || !actx) return;
  const t0 = actx.currentTime + delay;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(actx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

const sfx = {
  flap:  () => tone(340, 560, 0.09, 'triangle', 0.045),
  point: () => tone(880, 880, 0.07, 'square', 0.028),
  treat: () => { tone(660, 660, 0.08, 'sine', 0.05); tone(990, 990, 0.1, 'sine', 0.045, 0.07); },
  pet:   () => { [523, 659, 784].forEach((f, i) => tone(f, f, 0.12, 'sine', 0.045, i * 0.055)); },
  crash: () => tone(220, 60, 0.4, 'sawtooth', 0.06),
};

sndBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  muted = !muted;
  localStorage.setItem(SOUND_KEY, muted ? 'off' : 'on');
  paintSound();
  if (!muted) { ensureAudio(); sfx.point(); }
});

paintSound();

/* ---- world ---------------------------------------------------------------- */

// Tuned for a ~0.7s tap rhythm: a flap lifts ~90px, and falling back takes
// as long as the rise, so the cadence is comfortable rather than frantic.
const GRAV = 1500, FLAP = -520, MAXFALL = 760;

let mode = 'ready';            // ready | play | over
let uzi = { y: 0, vy: 0, r: 25, rot: 0 };
let blocks = [], puffs = [], sparks = [];
let score = 0, pets = 0, treats = 0;
let shake = 0, distance = 0;

const best = () => Number(localStorage.getItem(BEST_KEY) || 0);

const speedNow = () => (168 + Math.min(score * 2.2, 78)) * S;
const gapNow   = () => (218 - Math.min(score * 1.7, 62)) * S;
const BLOCK_W  = () => 74 * S;
const SPACING  = () => 238 * S;
const UZI_X    = () => W * 0.29;

function reset() {
  uzi = { y: H * 0.42, vy: 0, r: 25 * S, rot: 0 };
  blocks = []; puffs = []; sparks = [];
  score = 0; pets = 0; treats = 0; shake = 0; distance = 0;
  paintHud();
  spawnBlock(W + 120 * S);
}

function spawnBlock(x) {
  const gap = gapNow();
  const margin = 54 * S;
  const gapY = margin + Math.random() * Math.max(20, (GROUND - margin * 2 - gap));

  let item = null;
  if (Math.random() < 0.68) {
    const isPet = Math.random() < 0.45;
    item = {
      type: isPet ? 'pet' : 'treat',
      x: x + BLOCK_W() / 2,
      y: gapY + gap / 2 + (Math.random() - 0.5) * gap * 0.34,
      taken: false,
      bob: Math.random() * Math.PI * 2,
    };
  }

  blocks.push({ x, gapY, gap, passed: false, item, seed: Math.random() });
}

function paintHud() {
  scoreEl.textContent = score;
  petEl.textContent = pets;
  treatEl.textContent = treats;
}

/* ---- input ----------------------------------------------------------------- */

function flap() {
  if (mode !== 'play') return;
  uzi.vy = FLAP * S;
  puffs.push({ x: UZI_X() - uzi.r * 0.7, y: uzi.y + uzi.r * 0.6, r: 4 * S, life: 1 });
  sfx.flap();
}

function start() {
  ensureAudio();
  reset();
  mode = 'play';
  startPan.classList.add('hidden');
  overPan.classList.add('hidden');
  flap();
}

function die() {
  if (mode !== 'play') return;
  mode = 'over';
  shake = 1;
  sfx.crash();

  const b = best();
  if (score > b) localStorage.setItem(BEST_KEY, String(score));

  document.getElementById('finalScore').textContent = score;
  document.getElementById('breakdown').textContent = `🐾 ${pets} pets · 🦴 ${treats} treats`;
  document.getElementById('verdict').textContent =
    score > b ? 'New best!' : score >= 20 ? 'Very good dog' : score >= 8 ? 'Good run' : 'Snack break';
  document.getElementById('overBest').textContent = `Best ${Math.max(b, score)}`;

  setTimeout(() => overPan.classList.remove('hidden'), 620);
}

startBtn.addEventListener('click', (e) => { e.stopPropagation(); start(); });
againBtn.addEventListener('click', (e) => { e.stopPropagation(); start(); });

stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.panel') || e.target.closest('.snd')) return;
  e.preventDefault();
  flap();
});

addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.code !== 'ArrowUp' && e.code !== 'Enter') return;
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
  e.preventDefault();
  if (mode === 'play') flap();
  else start();
});

// A backgrounded tab returns with a huge dt; drop the frame instead of
// teleporting Uzi into a building.
document.addEventListener('visibilitychange', () => { last = 0; });

/* ---- update ----------------------------------------------------------------- */

function hitsBlock(b) {
  const w = BLOCK_W();
  const x = UZI_X(), y = uzi.y, r = uzi.r * 0.88;
  if (x + r < b.x || x - r > b.x + w) return false;

  const nx = Math.max(b.x, Math.min(x, b.x + w));
  const topY = Math.max(0, Math.min(y, b.gapY));
  const botY = Math.max(b.gapY + b.gap, Math.min(y, GROUND));

  const dTop = (x - nx) ** 2 + (y - topY) ** 2;
  const dBot = (x - nx) ** 2 + (y - botY) ** 2;
  return dTop < r * r || dBot < r * r;
}

function update(dt) {
  const t = performance.now() / 1000;

  if (mode === 'play') {
    const sp = speedNow();
    distance += sp * dt;

    uzi.vy = Math.min(uzi.vy + GRAV * S * dt, MAXFALL * S);
    uzi.y += uzi.vy * dt;
    uzi.rot = Math.max(-0.55, Math.min(1.0, uzi.vy / (620 * S)));

    if (uzi.y < uzi.r) { uzi.y = uzi.r; uzi.vy = Math.max(uzi.vy, 0); }

    for (const b of blocks) {
      b.x -= sp * dt;
      if (b.item) b.item.x -= sp * dt;
    }

    const tail = blocks[blocks.length - 1];
    if (!tail || tail.x < W - SPACING()) spawnBlock(W + 30 * S);
    blocks = blocks.filter((b) => b.x + BLOCK_W() > -40 * S);

    for (const b of blocks) {
      if (!b.passed && b.x + BLOCK_W() < UZI_X()) {
        b.passed = true; score++; paintHud(); sfx.point();
      }

      const it = b.item;
      if (it && !it.taken) {
        const bobY = it.y + Math.sin(t * 3 + it.bob) * 5 * S;
        const d = Math.hypot(UZI_X() - it.x, uzi.y - bobY);
        if (d < uzi.r + 15 * S) {
          it.taken = true;
          if (it.type === 'pet') { pets++; score += 3; sfx.pet(); }
          else { treats++; score += 2; sfx.treat(); }
          paintHud();
          for (let i = 0; i < 9; i++) {
            sparks.push({
              x: it.x, y: bobY,
              vx: (Math.random() - 0.5) * 190 * S,
              vy: (Math.random() - 0.5) * 190 * S - 40 * S,
              life: 1, kind: it.type,
            });
          }
        }
      }

      if (hitsBlock(b)) die();
    }

    if (uzi.y + uzi.r >= GROUND) { uzi.y = GROUND - uzi.r; die(); }

  } else if (mode === 'over') {
    uzi.vy = Math.min(uzi.vy + GRAV * S * dt, MAXFALL * S);
    uzi.y = Math.min(uzi.y + uzi.vy * dt, GROUND - uzi.r);
    uzi.rot = Math.min(1.4, uzi.rot + dt * 3);
  } else {
    uzi.y = H * 0.42 + Math.sin(t * 2.2) * 9 * S;
    uzi.rot = Math.sin(t * 2.2) * 0.12;
  }

  for (const p of puffs) { p.life -= dt * 2.4; p.r += dt * 34 * S; p.x -= 60 * S * dt; }
  puffs = puffs.filter((p) => p.life > 0);

  for (const s of sparks) {
    s.life -= dt * 1.5;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.vy += 300 * S * dt;
  }
  sparks = sparks.filter((s) => s.life > 0);

  if (shake > 0) shake = Math.max(0, shake - dt * 3);
}

/* ---- drawing ----------------------------------------------------------------- */

// A Vision-generated cutout: real fur edges and real ears, no circle to hide in.
const uziImg = new Image();
let uziReady = false;
const UZI_AR = 291 / 384;                 // the cutout's own aspect ratio
uziImg.onload = () => { uziReady = true; };
uziImg.src = 'assets/uzi-cut.png';

function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    const k = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  }
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 40 * S);
  g.addColorStop(0, '#ffd08a');
  g.addColorStop(0.45, '#ffb87e');
  g.addColorStop(1, '#ff9c78');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 40 * S);

  // low sun over the Mediterranean
  const sx = W * 0.72, sy = HORIZON - 44 * S, sr = 30 * S;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.4);
  sg.addColorStop(0, 'rgba(255,246,214,.95)');
  sg.addColorStop(0.3, 'rgba(255,208,120,.55)');
  sg.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(sx, sy, sr * 3.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3cf';
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
}

function drawSea() {
  ctx.fillStyle = '#6fa5bd';
  ctx.fillRect(0, HORIZON, W, GROUND - HORIZON);

  ctx.strokeStyle = 'rgba(255,255,255,.34)';
  ctx.lineWidth = 1.6 * S;
  const off = (distance * 0.25) % (46 * S);
  for (let i = 0; i < 2; i++) {
    const y = HORIZON + 11 * S + i * 13 * S;
    ctx.beginPath();
    for (let x = -off; x < W + 40 * S; x += 46 * S) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 * S, y);
    }
    ctx.stroke();
  }
}

// The Azrieli trio — circle, triangle, square — reads as Tel Aviv instantly.
function drawSkyline() {
  const off = (distance * 0.12) % (W + 300 * S);
  ctx.save();
  ctx.translate(-off, 0);
  ctx.fillStyle = 'rgba(122, 74, 74, .30)';

  for (let pass = 0; pass < 2; pass++) {
    const base = pass * (W + 300 * S);
    const b = HORIZON;

    for (let i = 0; i < 6; i++) {
      const x = base + 14 * S + i * 44 * S;
      const h = (26 + ((i * 37) % 30)) * S;
      ctx.fillRect(x, b - h, 30 * S, h);
    }

    const ax = base + W * 0.55;
    ctx.fillRect(ax, b - 96 * S, 26 * S, 96 * S);                       // square
    ctx.beginPath();                                                     // triangle
    ctx.moveTo(ax + 34 * S, b);
    ctx.lineTo(ax + 50 * S, b - 108 * S);
    ctx.lineTo(ax + 66 * S, b);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();                                                     // circle
    ctx.arc(ax + 86 * S, b - 86 * S, 13 * S, 0, 7);
    ctx.fill();
    ctx.fillRect(ax + 73 * S, b - 86 * S, 26 * S, 86 * S);
  }
  ctx.restore();
}

function drawPalms() {
  const step = 132 * S;
  const off = (distance * 0.45) % step;
  ctx.save();
  ctx.translate(-off, 0);
  for (let x = 0; x < W + step; x += step) {
    const bx = x + 30 * S, by = GROUND;
    ctx.strokeStyle = 'rgba(96, 58, 42, .42)';
    ctx.lineWidth = 4.5 * S;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - 5 * S, by - 34 * S, bx + 3 * S, by - 62 * S);
    ctx.stroke();

    ctx.fillStyle = 'rgba(72, 104, 62, .5)';
    for (let f = 0; f < 5; f++) {
      const a = -Math.PI / 2 + (f - 2) * 0.55;
      ctx.beginPath();
      ctx.ellipse(bx + 3 * S + Math.cos(a) * 17 * S, by - 62 * S + Math.sin(a) * 13 * S,
                  18 * S, 5.5 * S, a, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBlock(b) {
  const w = BLOCK_W();
  const lip = 13 * S;

  const paint = (y, h, capTop) => {
    if (h <= 0) return;
    ctx.fillStyle = '#fdf4e6';
    rr(b.x, y, w, h, 7 * S); ctx.fill();

    ctx.fillStyle = 'rgba(158, 116, 74, .17)';           // shaded right face
    rr(b.x + w - 9 * S, y, 9 * S, h, 7 * S); ctx.fill();

    ctx.fillStyle = 'rgba(150, 108, 70, .2)';            // balcony bands
    const first = capTop ? y + h - 30 * S : y + 22 * S;
    const dir = capTop ? -1 : 1;
    for (let i = 0; i < 5; i++) {
      const yy = first + dir * i * 30 * S;
      if (yy < y + 6 * S || yy > y + h - 10 * S) continue;
      ctx.fillRect(b.x + 8 * S, yy, w - 22 * S, 4 * S);
    }

    ctx.fillStyle = 'rgba(90, 120, 140, .34)';           // windows
    for (let i = 0; i < 6; i++) {
      const yy = (capTop ? y + h - 44 * S - i * 30 * S : y + 34 * S + i * 30 * S);
      if (yy < y + 8 * S || yy > y + h - 16 * S) continue;
      ctx.fillRect(b.x + 13 * S, yy, 15 * S, 11 * S);
      ctx.fillRect(b.x + 36 * S, yy, 15 * S, 11 * S);
    }

    // rounded cap facing the gap, the Bauhaus balcony curve
    ctx.fillStyle = '#fffaf1';
    const capY = capTop ? y + h - lip : y;
    rr(b.x - 4 * S, capY, w + 8 * S, lip, 6 * S); ctx.fill();
    ctx.fillStyle = 'rgba(150, 108, 70, .16)';
    rr(b.x - 4 * S, capY + lip - 3 * S, w + 8 * S, 3 * S, 2 * S); ctx.fill();
  };

  paint(0, b.gapY, true);
  paint(b.gapY + b.gap, GROUND - (b.gapY + b.gap), false);
}

function drawItem(it, t) {
  if (!it || it.taken) return;
  const y = it.y + Math.sin(t * 3 + it.bob) * 5 * S;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath(); ctx.arc(it.x, y, 15 * S, 0, 7); ctx.fill();
  ctx.restore();

  ctx.font = `${20 * S}px system-ui, "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(it.type === 'pet' ? '🐾' : '🦴', it.x, y + 1 * S);
}

function drawGround() {
  ctx.fillStyle = '#f0d9b4';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = 'rgba(150, 108, 70, .28)';
  ctx.fillRect(0, GROUND, W, 3 * S);

  ctx.fillStyle = 'rgba(150, 108, 70, .14)';
  const step = 26 * S;
  const off = distance % step;
  for (let x = -off; x < W; x += step) ctx.fillRect(x, GROUND + 8 * S, 12 * S, 4 * S);
}

function drawUzi() {
  const x = UZI_X(), y = uzi.y, r = uzi.r;
  const h = r * 2.35, w = h * UZI_AR;

  // ground shadow, so he reads as flying over the promenade
  const drop = Math.max(0, Math.min(1, (GROUND - y) / (330 * S)));
  ctx.save();
  ctx.globalAlpha = 0.2 * (1 - drop) + 0.06;
  ctx.fillStyle = '#6b3f1a';
  ctx.beginPath();
  ctx.ellipse(x, GROUND + 6 * S, w * 0.42 * (1 - drop * 0.45), 4.5 * S, 0, 0, 7);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(uzi.rot);

  if (uziReady) {
    ctx.shadowColor = 'rgba(110, 55, 15, .34)';
    ctx.shadowBlur = 12 * S;
    ctx.shadowOffsetY = 4 * S;
    ctx.drawImage(uziImg, -w / 2, -h * 0.46, w, h);
  } else {
    ctx.fillStyle = '#c98a3f';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }

  ctx.restore();
}

function draw() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * 11 * S * shake,
                  (Math.random() - 0.5) * 11 * S * shake);
  }

  drawSky();
  drawSkyline();
  drawSea();
  drawPalms();

  const t = performance.now() / 1000;
  for (const b of blocks) { drawBlock(b); drawItem(b.item, t); }

  drawGround();

  for (const p of puffs) {
    ctx.fillStyle = `rgba(255,255,255,${0.5 * p.life})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }

  drawUzi();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const s of sparks) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.font = `${13 * S}px system-ui, "Apple Color Emoji", sans-serif`;
    ctx.fillText(s.kind === 'pet' ? '🐾' : '✨', s.x, s.y);
    ctx.restore();
  }

  ctx.restore();
}

/* ---- loop --------------------------------------------------------------------- */

let last = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (!W || !H) return;

  if (!last) { last = now; return; }
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  update(dt);
  draw();
}

/* ---- boot ---------------------------------------------------------------------- */

new ResizeObserver(resize).observe(stage);
resize();
reset();
mode = 'ready';
document.getElementById('startBest').textContent = best() ? `Best ${best()}` : '';
requestAnimationFrame(frame);
