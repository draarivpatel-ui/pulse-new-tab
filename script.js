/* ==========================================================================
   Pulse — custom new-tab page script (vanilla JS, no dependencies)
   Sections: storage, settings, clock, quick links, starfield canvas, APOD.
   ========================================================================== */

'use strict';

/* ------------------------------ helpers ------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);

/* localStorage wrapper: falls back to in-memory if storage is blocked
   (e.g. some private-browsing modes), and never throws. */
const store = (() => {
  let ok = true;
  const mem = new Map();
  try {
    localStorage.setItem('__pulse_probe', '1');
    localStorage.removeItem('__pulse_probe');
  } catch {
    ok = false;
  }
  return {
    get(key, fallback) {
      try {
        const raw = ok ? localStorage.getItem(key) : mem.get(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (ok) localStorage.setItem(key, raw);
        else mem.set(key, raw);
      } catch { /* storage full or blocked; ignore */ }
    },
  };
})();

/* Free NASA key works out of the box; get your own at https://api.nasa.gov
   and paste it here for higher rate limits. */
const NASA_API_KEY = 'DEMO_KEY';

const apodUrl = (date) => {
  const withDate = date ? `&date=${encodeURIComponent(date)}` : '';
  return `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(NASA_API_KEY)}${withDate}`;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const REMOVE_ICON =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const PLUS_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

/* ------------------------------ state ------------------------------ */

const DEFAULT_LINKS = [
  { name: 'Google', url: 'https://www.google.com' },
  { name: 'YouTube', url: 'https://www.youtube.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { name: 'Hack Club', url: 'https://hackclub.com' },
  { name: 'Stardance', url: 'https://stardance.hackclub.com' },
];

const settings = Object.assign(
  { name: 'Aariv', hour24: false, seconds: true, showApod: true },
  store.get('pulse.settings', {})
);

const storedLinks = store.get('pulse.links', null);
const links =
  Array.isArray(storedLinks) &&
  storedLinks.every((l) => l && typeof l.name === 'string' && typeof l.url === 'string')
    ? storedLinks
    : DEFAULT_LINKS.map((l) => ({ ...l }));

/* ------------------------------ elements ------------------------------ */

const greetingEl = $('#greeting');
const clockTimeEl = $('#clock-time');
const clockMeridiemEl = $('#clock-meridiem');
const clockSecondsEl = $('#clock-seconds');
const dateEl = $('#date');
const quoteTextEl = $('#quote-text');
const quoteAuthorEl = $('#quote-author');
const searchInput = $('#search-input');
const linkGrid = $('#link-grid');
const apodEl = $('#apod');
const apodThumbEl = $('#apod-thumb');
const apodTitleEl = $('#apod-title');
const apodNoteEl = $('#apod-note');
const apodDialog = $('#apod-dialog');
const settingsDialog = $('#settings-dialog');
const addDialog = $('#add-dialog');

/* ------------------------------ settings ------------------------------ */

function saveSettings() {
  store.set('pulse.settings', settings);
}

function applySettings() {
  greetingEl.textContent = `Welcome back, ${settings.name || 'friend'}`;
  clockSecondsEl.hidden = !settings.seconds;
  clockMeridiemEl.hidden = settings.hour24;
  tick();
  updateApodVisibility();
}

/* ------------------------------ clock + date ------------------------------ */

function tick() {
  const now = new Date();
  let hours = now.getHours();
  if (settings.hour24) {
    hours = String(hours).padStart(2, '0');
  } else {
    clockMeridiemEl.textContent = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
  }
  clockTimeEl.textContent = `${hours}:${String(now.getMinutes()).padStart(2, '0')}`;
  clockSecondsEl.textContent = String(now.getSeconds()).padStart(2, '0');
}

function scheduleTicks() {
  // Align to real second boundaries so the clock never drifts.
  const delay = 1000 - (Date.now() % 1000) + 5;
  setTimeout(() => {
    tick();
    scheduleTicks();
  }, delay);
}

function updateDate() {
  dateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------ focus quote ------------------------------ */

/* One quote per day, chosen from the local calendar date. No network calls. */
const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'It is not in the stars to hold our destiny but in ourselves.', author: 'William Shakespeare' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie' },
  { text: 'How wonderful it is that nobody need wait a single moment before starting to improve the world.', author: 'Anne Frank' },
  { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
];

function quoteForDate(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor(local.getTime() / 86400000);
  return QUOTES[((days % QUOTES.length) + QUOTES.length) % QUOTES.length];
}

function renderQuote() {
  const quote = quoteForDate(new Date());
  quoteTextEl.textContent = quote.text;
  quoteAuthorEl.textContent = `\u2014 ${quote.author}`;
}

function scheduleQuoteRefresh() {
  // Re-render just after local midnight so the quote turns over with the day.
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  setTimeout(() => {
    renderQuote();
    scheduleQuoteRefresh();
  }, nextMidnight - now);
}

/* ------------------------------ quick links ------------------------------ */

function saveLinks() {
  store.set('pulse.links', links);
}

function letterNode(name) {
  const span = document.createElement('span');
  span.className = 'tile-icon tile-letter';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = (name.trim()[0] || '?').toUpperCase();
  return span;
}

function faviconNode(url, name) {
  const img = document.createElement('img');
  img.className = 'tile-icon';
  img.alt = '';
  img.width = 24;
  img.height = 24;
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
  img.addEventListener('error', () => img.replaceWith(letterNode(name)), { once: true });
  return img;
}

function renderLinks() {
  linkGrid.textContent = '';

  for (const link of links) {
    const li = document.createElement('li');

    const a = document.createElement('a');
    a.className = 'tile';
    a.href = link.url;
    a.append(faviconNode(link.url, link.name));

    const label = document.createElement('span');
    label.className = 'tile-label';
    label.textContent = link.name;
    a.append(label);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tile-remove';
    remove.setAttribute('aria-label', `Remove ${link.name}`);
    remove.innerHTML = REMOVE_ICON; // static, trusted string
    remove.addEventListener('click', () => removeLink(link));

    li.append(a, remove);
    linkGrid.append(li);
  }

  const li = document.createElement('li');
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'tile tile-add';
  add.setAttribute('aria-haspopup', 'dialog');
  add.setAttribute('aria-label', 'Add quick link');
  add.innerHTML = PLUS_ICON;
  add.addEventListener('click', openAddDialog);

  const addLabel = document.createElement('span');
  addLabel.className = 'tile-label';
  addLabel.textContent = 'Add';
  add.append(addLabel);

  li.append(add);
  linkGrid.append(li);
}

function removeLink(link) {
  const index = links.indexOf(link);
  if (index === -1) return;
  links.splice(index, 1);
  saveLinks();
  renderLinks();
  // Keep keyboard focus inside the grid after removal.
  const next = linkGrid.children[Math.min(index, linkGrid.children.length - 1)];
  const focusTarget = next && (next.querySelector('a, button') || next);
  if (focusTarget) focusTarget.focus();
}

function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function openAddDialog() {
  $('#add-form').reset();
  const error = $('#add-error');
  error.hidden = true;
  addDialog.showModal();
  $('#link-name').focus();
}

function setupAddForm() {
  const form = $('#add-form');
  const error = $('#add-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#link-name').value.trim();
    const url = normalizeUrl($('#link-url').value);

    const fail = (msg) => {
      error.textContent = msg;
      error.hidden = false;
    };

    if (!name) return fail('Give the link a name.');
    if (!url) return fail('That URL does not look valid — try something like example.com.');

    if (links.some((l) => l.url.toLowerCase() === url.toLowerCase())) {
      return fail('That link is already in your grid.');
    }

    links.push({ name, url });
    saveLinks();
    renderLinks();
    addDialog.close();

    // Move focus to the freshly added link.
    const added = [...linkGrid.querySelectorAll('a.tile')].find((a) => a.href === url);
    if (added) added.focus();
  });
}

/* ------------------------------ starfield canvas ------------------------------ */

const canvas = $('#starfield');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const starfield = (() => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { start() {}, stop() {}, resize() {} };

  let stars = [];
  let meteors = [];
  let width = 0;
  let height = 0;
  let rafId = null;
  let lastT = 0;
  let nextMeteorAt = 5000;

  function seed() {
    const count = Math.min(240, Math.round((width * height) / 8000));
    stars = Array.from({ length: count }, () => {
      const depth = Math.random(); // 0 = far, 1 = near
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.3 + depth * 1.25 + Math.random() * 0.35,
        depth,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.5 + Math.random() * 1.5, // rad/s
        vy: 0.008 + depth * 0.045, // px/ms upward drift
        accent: Math.random() < 0.06,
      };
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reducedMotion.matches) draw(0, 0); // one static frame
  }

  function spawnMeteor(t) {
    if (t < nextMeteorAt) return;
    nextMeteorAt = t + 6000 + Math.random() * 9000;
    meteors.push({
      x: width * (0.15 + Math.random() * 0.7),
      y: height * (0.05 + Math.random() * 0.3),
      vx: -(0.45 + Math.random() * 0.35),
      vy: 0.22 + Math.random() * 0.18,
      life: 700 + Math.random() * 300,
    });
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, width, height);

    for (const s of stars) {
      if (dt > 0) {
        s.y -= s.vy * dt;
        if (s.y < -2) {
          s.y = height + 2;
          s.x = Math.random() * width;
        }
      }
      const twinkle = 0.55 + 0.45 * Math.sin(s.phase + (t / 1000) * s.twinkle);
      const alpha = (0.22 + 0.58 * s.depth) * twinkle;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.accent
        ? `rgba(124, 245, 200, ${alpha.toFixed(3)})`
        : `rgba(214, 226, 255, ${alpha.toFixed(3)})`;
      ctx.fill();
    }

    if (dt > 0) {
      for (const m of meteors) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
        const tailX = m.x - m.vx * 130;
        const tailY = m.y - m.vy * 130;
        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, 'rgba(230, 245, 255, 0.85)');
        grad.addColorStop(1, 'rgba(230, 245, 255, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
      meteors = meteors.filter((m) => m.life > 0 && m.y < height + 40);
    }
  }

  function loop(t) {
    const dt = Math.min(50, lastT ? t - lastT : 16);
    lastT = t;
    draw(t, dt);
    if (dt > 0) spawnMeteor(t);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (reducedMotion.matches) {
      draw(0, 0);
      return;
    }
    if (rafId === null) {
      lastT = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  reducedMotion.addEventListener('change', () => {
    stop();
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  return { start, stop, resize };
})();

/* ------------------------------ APOD ------------------------------ */

const APOD_CACHE_KEY = 'pulse.apod.cache';
const APOD_RETRY_DELAY = 90 * 1000;
let apodData = store.get(APOD_CACHE_KEY, null);
let apodStatus = null; // 'loading' | 'failed' — only used when no data is available
let apodRetryTimer = null;
let apodFetchBusy = false;

async function fetchJSON(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchApod(date) {
  // NASA's public DEMO_KEY is shared and rate-limited (HTTP 429), and the API
  // occasionally returns a transient 500, so give each request a few
  // spaced-out attempts before giving up.
  let delay = 900;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await fetchJSON(apodUrl(date));
      if (data && (data.url || data.title)) return data;
      throw new Error('Unexpected payload');
    } catch (err) {
      console.warn(`[pulse] APOD attempt ${attempt + 1}/3 failed:`, err);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 2200);
      }
    }
  }
  return null;
}

function updateApodVisibility() {
  // Card is visible whenever the panel is enabled and we have data, are
  // loading, or have a failure note to show. The View button only makes
  // sense once real data exists.
  apodEl.hidden = !(settings.showApod && ((apodData && apodData.title) || apodStatus));
  $('#apod-open').hidden = !apodData;
}

function renderApodStatus() {
  if (!apodStatus) return;
  apodThumbEl.hidden = true;
  apodThumbEl.removeAttribute('src');
  apodTitleEl.textContent = apodStatus === 'loading' ? 'Loading…' : 'APOD unavailable right now';
  apodNoteEl.textContent =
    apodStatus === 'loading'
      ? 'reaching api.nasa.gov'
      : 'offline or rate-limited — will retry automatically';
  updateApodVisibility();
}

function renderApodCard(data, { stale = false } = {}) {
  apodData = data;
  apodStatus = null;
  if (apodRetryTimer) {
    clearTimeout(apodRetryTimer);
    apodRetryTimer = null;
  }
  apodTitleEl.textContent = data.title || 'Untitled';

  const isVideo = data.media_type && data.media_type !== 'image';
  if (isVideo) {
    apodThumbEl.hidden = true;
  } else {
    apodThumbEl.hidden = false;
    apodThumbEl.src = data.url || '';
    apodThumbEl.alt = data.title || 'Astronomy Picture of the Day';
  }

  const bits = [data.date];
  if (stale) bits.push('saved for offline');
  if (isVideo) bits.push('video today');
  apodNoteEl.textContent = bits.filter(Boolean).join(' · ');

  updateApodVisibility();
}

/* NASA sometimes sends a video instead of an image, and video URLs are
   usually YouTube embeds — the guide's extra challenge. Normalize the
   watch?v= / youtu.be / embed/ shapes to a plain embed URL. */
function youtubeEmbedUrl(url) {
  const id =
    (url.match(/youtube\.com\/embed\/([\w-]+)/) ||
      url.match(/[?&]v=([\w-]+)/) ||
      url.match(/youtu\.be\/([\w-]+)/) || [])[1];
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : url;
}

function renderApodDialog(data) {
  $('#apod-heading').textContent = data.title || 'Untitled';
  $('#apod-dialog-meta').textContent =
    `${data.date || ''}${data.copyright ? ` · copyright ${data.copyright}` : ''}`.trim();

  const media = $('#apod-media');
  media.textContent = '';
  const isVideo = data.media_type && data.media_type !== 'image';

  if (isVideo && data.url && data.url.includes('youtube')) {
    const iframe = document.createElement('iframe');
    iframe.src = youtubeEmbedUrl(data.url);
    iframe.title = data.title || 'Astronomy Picture of the Day video';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    media.append(iframe);
  } else if (isVideo) {
    const video = document.createElement('video');
    video.src = data.url || '';
    video.controls = true;
    video.preload = 'metadata';
    media.append(video);
  } else {
    const img = document.createElement('img');
    img.src = data.url || '';
    img.alt = data.title || 'Astronomy Picture of the Day';
    img.loading = 'lazy';
    media.append(img);
  }

  $('#apod-explain').textContent = data.explanation || '';

  const hd = $('#apod-hd');
  const hdUrl = data.hdurl || (isVideo ? null : data.url);
  if (hdUrl) {
    hd.href = hdUrl;
    hd.hidden = false;
  } else {
    hd.hidden = true;
  }

  const dateInput = $('#apod-date');
  dateInput.max = todayISO();
  dateInput.value = data.date || todayISO();

  const err = $('#apod-error');
  err.hidden = true;
}

async function loadApod() {
  apodFetchBusy = true;
  if (!apodData || !apodData.title) {
    apodStatus = 'loading';
    renderApodStatus();
  }
  const data = await fetchApod();
  apodFetchBusy = false;
  if (data) {
    store.set(APOD_CACHE_KEY, data);
    renderApodCard(data);
  } else if (apodData && apodData.title) {
    apodNoteEl.textContent = `${apodData.date} · offline — showing last saved`;
  } else {
    apodStatus = 'failed';
    renderApodStatus();
    scheduleApodRetry();
  }
}

// DEMO_KEY rate-limit windows are hourly, so one slow retry is enough to
// catch transient errors without burning quota.
function scheduleApodRetry() {
  if (apodRetryTimer || !settings.showApod) return;
  if (apodData && apodData.title) return;
  apodRetryTimer = setTimeout(() => {
    apodRetryTimer = null;
    if (settings.showApod && (!apodData || apodData.date !== todayISO())) void loadApod();
  }, APOD_RETRY_DELAY);
}

function initApod() {
  updateApodVisibility();
  if (!settings.showApod) return;
  if (apodFetchBusy || apodRetryTimer) return; // already working on it

  if (apodData && apodData.title) {
    renderApodCard(apodData, { stale: apodData.date !== todayISO() });
  }

  // Hit the network at most once per day to stay gentle on rate limits.
  if (!apodData || apodData.date !== todayISO()) {
    void loadApod();
  }
}

window.addEventListener('online', () => {
  if (!settings.showApod) return;
  if (apodRetryTimer) {
    clearTimeout(apodRetryTimer);
    apodRetryTimer = null;
  }
  if (!apodFetchBusy && (!apodData || apodData.date !== todayISO())) void loadApod();
});

function setupApodUI() {
  $('#apod-open').addEventListener('click', () => {
    if (!apodData) return;
    renderApodDialog(apodData);
    apodDialog.showModal();
  });

  $('#apod-date-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = $('#apod-date').value;
    if (!value) return;
    const err = $('#apod-error');
    err.textContent = 'Loading…';
    err.hidden = false;
    const data = await fetchApod(value);
    if (data) {
      renderApodDialog(data);
    } else {
      err.textContent = 'Could not load that date — check your connection or try again later.';
    }
  });
}

/* ------------------------------ settings UI ------------------------------ */

const linksStatusEl = $('#links-status');

function setLinksStatus(msg, isError = false) {
  linksStatusEl.textContent = msg;
  linksStatusEl.hidden = !msg;
  linksStatusEl.classList.toggle('is-error', isError);
}

function exportLinks() {
  const json = JSON.stringify(links.map(({ name, url }) => ({ name, url })), null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = 'pulse-links.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setLinksStatus(`Exported ${links.length} link${links.length === 1 ? '' : 's'}.`);
}

async function importLinks(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return setLinksStatus('That file is not valid JSON.', true);
  }
  if (!Array.isArray(data)) {
    return setLinksStatus('Expected a JSON list of {"name", "url"} entries.', true);
  }

  const imported = [];
  const seen = new Set();
  for (const item of data) {
    const name = item && typeof item.name === 'string' ? item.name.trim().slice(0, 30) : '';
    const url = item && typeof item.url === 'string' ? normalizeUrl(item.url) : null;
    if (!name || !url || seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());
    imported.push({ name, url });
  }
  if (!imported.length) return setLinksStatus('No valid links found in that file.', true);

  links.length = 0;
  links.push(...imported);
  saveLinks();
  renderLinks();
  const skipped = data.length - imported.length;
  setLinksStatus(
    `Imported ${imported.length} link${imported.length === 1 ? '' : 's'}` +
      (skipped ? ` (${skipped} skipped).` : '.')
  );
}

function setupSettingsDialog() {
  $('#settings-btn').addEventListener('click', () => {
    $('#setting-name').value = settings.name;
    $('#setting-24h').checked = settings.hour24;
    $('#setting-seconds').checked = settings.seconds;
    $('#setting-apod').checked = settings.showApod;
    setLinksStatus('');
    settingsDialog.showModal();
    $('#setting-name').focus();
  });

  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    settings.name = $('#setting-name').value.trim() || 'Aariv';
    settings.hour24 = $('#setting-24h').checked;
    settings.seconds = $('#setting-seconds').checked;
    settings.showApod = $('#setting-apod').checked;
    saveSettings();
    applySettings();
    if (settings.showApod) initApod();
    settingsDialog.close();
  });

  $('#export-links').addEventListener('click', exportLinks);
  $('#import-links').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-importing the same file
    if (file) importLinks(file);
  });

  $('#reset-links').addEventListener('click', () => {
    if (!window.confirm('Reset quick links to the defaults?')) return;
    links.length = 0;
    links.push(...DEFAULT_LINKS.map((l) => ({ ...l })));
    saveLinks();
    renderLinks();
    settingsDialog.close();
  });
}

/* ------------------------------ global UI wiring ------------------------------ */

function setupGlobalUI() {
  // Any element with [data-close] closes its nearest dialog.
  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close]');
    if (closer) {
      const dlg = closer.closest('dialog');
      if (dlg) dlg.close();
    }
  });

  // Click on the backdrop (outside the dialog box) closes the dialog.
  for (const dlg of document.querySelectorAll('dialog')) {
    dlg.addEventListener('click', (e) => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
    });
  }

  // Keyboard shortcuts: "/" focuses search, "N" opens add-link, "T" toggles 12/24h clock.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing =
      /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
    const dialogOpen = document.querySelector('dialog[open]');
    if (typing || dialogOpen) return;

    if (e.key === '/') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openAddDialog();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      settings.hour24 = !settings.hour24;
      saveSettings();
      applySettings();
    }
  });
}

/* ------------------------------ init ------------------------------ */

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => starfield.resize(), 150);
});

function init() {
  applySettings();
  updateDate();
  renderQuote();
  scheduleQuoteRefresh();
  tick();
  scheduleTicks();
  if (!Array.isArray(storedLinks)) saveLinks(); // persist defaults on first run
  renderLinks();
  setupAddForm();
  setupSettingsDialog();
  setupApodUI();
  setupGlobalUI();
  starfield.resize();
  starfield.start();
  initApod();
}

init();
