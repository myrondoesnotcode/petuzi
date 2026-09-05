/* ---- Pet Uzi ------------------------------------------------------------
   A button. A dog. A number that goes up.
   ---------------------------------------------------------------------- */

const COUNTER = {
  // Free, no-signup hosted counter.
  base: 'https://abacus.jasoncameron.dev',
  // Deliberately unguessable: Abacus namespaces are public and unauthenticated,
  // so an obvious name like "pet-uzi/total" is trivial for anyone to inflate.
  ns:   'petuzi-b0ba0ed54db4',
  key:  'pets',
};

// Uzi was getting petted long before the site existed. Abacus retired its
// admin endpoints, so the head start lives here rather than in the stored
// value — which also means it survives ever repointing at a fresh key.
const BASELINE = 738;

// Ranks. Everything at or below BASELINE is already on the shelf when the
// page first loads, so there's a history to scroll through from day one.
const RANKS = [
  { at: 50,     emoji: '🐶', name: 'Certified Snack Receiver' },
  { at: 100,    emoji: '🦴', name: 'Good Boy' },
  { at: 250,    emoji: '🐾', name: 'Neighborhood Regular' },
  { at: 500,    emoji: '☕', name: 'Café Legend' },
  { at: 800,    emoji: '🏆', name: 'Street Champion' },
  { at: 1500,   emoji: '👑', name: 'Very Good Dog, Officially' },
  { at: 3000,   emoji: '🚀', name: 'Internet Famous' },
  { at: 7500,   emoji: '🌍', name: 'Worldwide Uzi' },
  { at: 15000,  emoji: '🐐', name: 'The GOAT' },
];

const LOCAL_KEY = 'uzi.localPets';

const frame   = document.getElementById('frame');
const clip    = document.getElementById('clip');
const ring    = document.getElementById('ring');
const odo     = document.getElementById('odo');
const srCount = document.getElementById('srCount');
const label   = document.getElementById('countLabel');
const rankEl  = document.getElementById('rank');
const fill    = document.getElementById('fill');
const toNext  = document.getElementById('toNext');
const shelf   = document.getElementById('shelf');
const btn     = document.getElementById('petBtn');
const burst   = document.getElementById('burst');
const toast   = document.getElementById('toast');

let shown   = BASELINE;  // number currently on screen
let live    = true;      // is the shared counter reachable?
let pending = 0;         // clicks fired but not yet confirmed

const fmt = new Intl.NumberFormat('en-US');

/* ---- odometer ----------------------------------------------------------- */

let reels = [];
let printed = '';

function buildReels(str) {
  odo.replaceChildren();
  reels = [];

  for (const ch of str) {
    if (ch === ',') {
      const comma = document.createElement('span');
      comma.className = 'comma';
      comma.textContent = ',';
      odo.appendChild(comma);
      reels.push(null);
      continue;
    }

    const slot = document.createElement('span');
    slot.className = 'digit';

    const reel = document.createElement('span');
    reel.className = 'reel';
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('span');
      d.textContent = i;
      reel.appendChild(d);
    }

    slot.appendChild(reel);
    odo.appendChild(slot);
    reels.push(reel);
  }
}

function spin(n) {
  const str = fmt.format(n);
  // Only rebuild when the shape changes (999 -> 1,000), so digits keep rolling
  // instead of snapping back to zero on every press.
  if (str.length !== printed.length) buildReels(str);

  [...str].forEach((ch, i) => {
    const reel = reels[i];
    if (reel) reel.style.setProperty('--d', ch);
  });

  printed = str;
}

/* ---- ranks --------------------------------------------------------------- */

const earnedRank = (n) => [...RANKS].reverse().find((r) => n >= r.at) || null;
const nextRank   = (n) => RANKS.find((r) => n < r.at) || null;

function buildShelf() {
  shelf.replaceChildren();
  for (const r of RANKS) {
    const b = document.createElement('span');
    b.className = 'badge locked';
    b.dataset.at = r.at;
    b.innerHTML =
      `<span>${r.emoji}</span><span>${r.name}</span>` +
      `<span class="at">${fmt.format(r.at)}</span>`;
    shelf.appendChild(b);
  }
}

function paintRanks(n, { unlocked = null } = {}) {
  const current = earnedRank(n);
  const next = nextRank(n);

  rankEl.textContent = current ? `${current.emoji} ${current.name}` : '🐕 Unranked';

  for (const b of shelf.children) {
    b.classList.toggle('locked', n < Number(b.dataset.at));
  }

  if (unlocked) {
    const b = [...shelf.children].find((el) => Number(el.dataset.at) === unlocked.at);
    if (b) {
      b.classList.add('fresh');
      b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      b.addEventListener('animationend', () => b.classList.remove('fresh'), { once: true });
    }
    rankEl.classList.add('fresh');
    rankEl.addEventListener('animationend', () => rankEl.classList.remove('fresh'), { once: true });
  }

  if (next) {
    const floor = current ? current.at : 0;
    const pct = ((n - floor) / (next.at - floor)) * 100;
    fill.style.width = `${Math.max(2, Math.min(100, pct))}%`;
    const togo = next.at - n;
    toNext.textContent =
      `${fmt.format(togo)} more pet${togo === 1 ? '' : 's'} to ${next.emoji} ${next.name}`;
  } else {
    fill.style.width = '100%';
    toNext.textContent = 'Every rank unlocked. Uzi has peaked.';
  }
}

/* ---- render ---------------------------------------------------------------- */

function render(n, { pop = false, unlocked = null } = {}) {
  shown = n;
  spin(n);
  paintRanks(n, { unlocked });

  const word = n === 1 ? 'pet' : 'pets';
  srCount.textContent = `${fmt.format(n)} ${word}`;
  label.textContent = live ? `${word} and counting` : `${word} (just you, for now)`;

  if (pop) {
    odo.classList.remove('pop');
    void odo.offsetWidth;               // restart the animation
    odo.classList.add('pop');
  }
}

odo.addEventListener('animationend', () => odo.classList.remove('pop'));

/* ---- shared counter --------------------------------------------------------- */

async function ask(path) {
  const res = await fetch(`${COUNTER.base}/${path}/${COUNTER.ns}/${COUNTER.key}`, {
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 404) throw new Error(`counter ${res.status}`);

  const data = await res.json();
  // A never-hit key 404s rather than reporting zero; that's a fresh counter,
  // not an outage.
  if (typeof data.value !== 'number') {
    if (path === 'get' && /not found/i.test(data.error || '')) return 0;
    throw new Error('counter: bad payload');
  }
  return data.value;
}

const localCount = () => Number(localStorage.getItem(LOCAL_KEY) || 0);

function goOffline() {
  if (!live) return;
  live = false;
  render(Math.max(shown, BASELINE + localCount()));
}

async function loadCount() {
  try {
    render(BASELINE + await ask('get'));
  } catch {
    goOffline();
  }
}

async function sendHit() {
  pending++;
  try {
    const value = BASELINE + await ask('hit');
    pending--;
    // Only trust the server number once our own clicks have all landed,
    // otherwise a slow response would rubber-band the display backwards.
    if (pending === 0 && live) render(Math.max(value, shown));
  } catch {
    pending--;
    goOffline();
  }
}

/* ---- the clip ----------------------------------------------------------------- */

let hideTimer;

function playClip() {
  clearTimeout(hideTimer);
  frame.classList.add('playing');
  clip.currentTime = 0;

  const p = clip.play();
  if (p && p.catch) {
    p.catch(() => {
      // Autoplay blocked (rare, since this is a click) — retry muted.
      clip.muted = true;
      clip.play().catch(() => frame.classList.remove('playing'));
    });
  }
}

clip.addEventListener('ended', () => {
  // Small hold so the last frame doesn't snap away mid-blink.
  hideTimer = setTimeout(() => frame.classList.remove('playing'), 120);
});

clip.addEventListener('error', () => frame.classList.remove('playing'));

/* ---- flourishes ----------------------------------------------------------------- */

const PIPS = ['+1', '🐾', '❤️', '🐾', '+1', '✨'];

function pip(text) {
  const el = document.createElement('span');
  el.className = 'pip';
  el.textContent = text || PIPS[Math.floor(Math.random() * PIPS.length)];
  el.style.setProperty('--dx', `${(Math.random() * 70 - 35).toFixed(1)}px`);
  el.style.setProperty('--rot', `${(Math.random() * 44 - 22).toFixed(1)}deg`);
  burst.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

let toastTimer;

function celebrate(rank) {
  for (let i = 0; i < 16; i++) setTimeout(() => pip('🎉'), i * 45);

  toast.textContent = `${rank.emoji} ${rank.name} unlocked!`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);

  if (navigator.vibrate) navigator.vibrate([18, 60, 18, 60, 34]);
}

/* ---- press ------------------------------------------------------------------------ */

function pet(e) {
  // Only a real human gesture moves the shared number. Scripted clicks still
  // get the full animation, so the page stays easy to demo and test.
  const trusted = !e || e.isTrusted !== false;

  const next = shown + 1;
  const crossed = RANKS.find((r) => r.at === next) || null;

  render(next, { pop: true, unlocked: crossed });
  localStorage.setItem(LOCAL_KEY, String(localCount() + 1));

  playClip();
  pip();

  if (crossed) celebrate(crossed);
  else if (navigator.vibrate) navigator.vibrate(12);

  frame.classList.remove('bump');
  ring.classList.remove('go');
  void frame.offsetWidth;
  frame.classList.add('bump');
  ring.classList.add('go');
  setTimeout(() => frame.classList.remove('bump'), 520);

  if (live && trusted) sendHit();
}

btn.addEventListener('click', pet);

// Petting the dog himself should also count.
frame.addEventListener('click', pet);

// Keyboard activation stays scoped to the two real controls. A document-wide
// space/enter listener reads as a fun idea but fires on any stray keypress
// anywhere on the page, which quietly inflates the shared total.
frame.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pet(e); }
});

buildShelf();
render(BASELINE);
loadCount();
