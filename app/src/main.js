// Velvet Coast — wires the editor: Add photos / drag-and-drop uploads, one
// crop panel per cast member, title and grade editing, live preview and
// PNG export in the three post sizes. A `?shot=` query instead sets up a
// fixed scene for a screenshot (see shots.js).
import { drawPoster, posterLayout } from './poster.js';
import { createPosterState, nextOpenPanelId, SIZES, GRADES, LAYOUTS } from './state.js';
import { runShot } from './shots.js';

const state = createPosterState();
let selectedId = state.cast[0].id;

const canvas = document.getElementById('preview');
const statusEl = document.getElementById('status');
const panelList = document.getElementById('panelList');
const addPhotosBtn = document.getElementById('addPhotos');
const photoInput = document.getElementById('photoInput');
const titleInput = document.getElementById('titleInput');
const scriptInput = document.getElementById('scriptInput');
const gradeSelect = document.getElementById('gradeSelect');
const layoutSelect = document.getElementById('layoutSelect');
const sizeSelect = document.getElementById('sizeSelect');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

let redrawQueued = false;
function redraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    const size = SIZES[state.size];
    const scale = Math.min(1, 540 / size.width, 675 / size.height);
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
    // drawPoster renders at the export size; the preview canvas is a
    // half-scale stand-in, so draw at export size offscreen then scale down.
    const off = document.createElement('canvas');
    drawPoster(off, state, state.size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    canvas.dataset.size = state.size;
  });
}

/** Replaces a panel's picture with the user's own file, keeping its crop. */
export async function loadUserPhoto(panelId, file) {
  const panel = state.cast.find((p) => p.id === panelId);
  if (!panel || !file || !file.type.startsWith('image/')) return false;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    panel.image = img;
    panel.userPhoto = true;
    panel.zoom = 1.4;
    panel.fx = 0;
    panel.fy = 0;
    selectedId = panelId;
    buildPanelCards();
    redraw();
    setStatus(`Your photo is now ${panel.role} — drag the sliders to crop it.`);
    return true;
  } catch {
    URL.revokeObjectURL(url);
    setStatus('That file could not be read as a picture.');
    return false;
  }
}

/** One editor card per cast panel: thumbnail, role + caption fields, crop
 *  sliders, a Replace photo button and a drop zone. */
function buildPanelCards() {
  panelList.innerHTML = '';
  state.cast.forEach((panel) => {
    const card = document.createElement('div');
    card.className = 'panel-card' + (panel.id === selectedId ? ' selected' : '');
    card.dataset.panel = panel.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (panel.image) {
      const img = document.createElement('img');
      img.src = panel.image.src;
      img.alt = panel.role;
      thumb.appendChild(img);
    } else {
      thumb.textContent = panel.role;
    }
    if (panel.userPhoto) {
      const badge = document.createElement('span');
      badge.className = 'your-photo';
      badge.textContent = 'YOUR PHOTO';
      thumb.appendChild(badge);
    }
    card.appendChild(thumb);

    const role = document.createElement('input');
    role.type = 'text';
    role.value = panel.role;
    role.maxLength = 14;
    role.setAttribute('aria-label', `Role label for ${panel.id}`);
    role.addEventListener('input', () => { panel.role = role.value.toUpperCase(); redraw(); });
    card.appendChild(role);

    const caption = document.createElement('input');
    caption.type = 'text';
    caption.value = panel.caption;
    caption.maxLength = 60;
    caption.setAttribute('aria-label', `Caption for ${panel.id}`);
    caption.addEventListener('input', () => { panel.caption = caption.value.toUpperCase(); redraw(); });
    card.appendChild(caption);

    const sliders = [
      ['Zoom', 'zoom', 1, 2.5, 0.05, panel.zoom],
      ['Left / right', 'fx', -0.5, 0.5, 0.01, panel.fx],
      ['Up / down', 'fy', -0.5, 0.5, 0.01, panel.fy],
    ];
    sliders.forEach(([label, key, min, max, step, value]) => {
      const row = document.createElement('label');
      row.className = 'slider-row';
      row.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(value);
      input.setAttribute('aria-label', `${label} crop for ${panel.id}`);
      input.addEventListener('input', () => {
        panel[key] = Number(input.value);
        selectedId = panel.id;
        redraw();
      });
      row.appendChild(input);
      card.appendChild(row);
    });

    const replace = document.createElement('button');
    replace.type = 'button';
    replace.className = 'replace';
    replace.textContent = 'Replace photo';
    replace.addEventListener('click', () => {
      selectedId = panel.id;
      photoInput.dataset.target = panel.id;
      photoInput.click();
    });
    card.appendChild(replace);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'reset-crop';
    reset.textContent = 'Reset crop';
    reset.addEventListener('click', () => {
      panel.zoom = 1.4; panel.fx = 0; panel.fy = 0;
      buildPanelCards();
      redraw();
    });
    card.appendChild(reset);

    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      selectedId = panel.id;
      buildPanelCards();
      redraw();
    });
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drop'); });
    card.addEventListener('dragleave', () => card.classList.remove('drop'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drop');
      const file = e.dataTransfer.files[0];
      if (file) loadUserPhoto(panel.id, file);
    });
    panelList.appendChild(card);
  });
}

addPhotosBtn.addEventListener('click', () => {
  photoInput.dataset.target = '';
  photoInput.click();
});
photoInput.addEventListener('change', async () => {
  const files = [...photoInput.files];
  photoInput.value = '';
  for (const file of files) {
    const target = photoInput.dataset.target || nextOpenPanelId(state, selectedId);
    photoInput.dataset.target = '';
    await loadUserPhoto(target, file);
  }
});

// Drop straight onto the preview: the photo lands in the panel under the cursor.
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drop'); });
canvas.addEventListener('dragleave', () => canvas.classList.remove('drop'));
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  canvas.classList.remove('drop');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;
  const size = SIZES[state.size];
  const layout = posterLayout(size.width, size.height, state.layout);
  const hit = layout.panels.findIndex((p) =>
    px * size.width >= p.x && px * size.width <= p.x + p.w &&
    py * size.height >= p.y && py * size.height <= p.y + p.h);
  const target = hit >= 0 ? state.cast[hit].id : nextOpenPanelId(state, selectedId);
  loadUserPhoto(target, file);
});

titleInput.addEventListener('input', () => { state.title = titleInput.value.toUpperCase(); redraw(); });
scriptInput.addEventListener('input', () => { state.script = scriptInput.value; redraw(); });
gradeSelect.addEventListener('change', () => { state.grade = gradeSelect.value; redraw(); });
layoutSelect.addEventListener('change', () => { state.layout = layoutSelect.value; redraw(); });
sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; redraw(); });

Object.values(GRADES).forEach((g) => {
  const opt = document.createElement('option');
  opt.value = g.key;
  opt.textContent = g.label;
  gradeSelect.appendChild(opt);
});
Object.values(LAYOUTS).forEach((l) => {
  const opt = document.createElement('option');
  opt.value = l.key;
  opt.textContent = l.label;
  layoutSelect.appendChild(opt);
});
Object.values(SIZES).forEach((s) => {
  const opt = document.createElement('option');
  opt.value = s.key;
  opt.textContent = s.label;
  sizeSelect.appendChild(opt);
});
gradeSelect.value = state.grade;
layoutSelect.value = state.layout;
sizeSelect.value = state.size;

/** Renders the poster at full export size and downloads it as a PNG. */
export function exportPoster(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  drawPoster(off, state, sizeKey);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — the canvas was empty.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `velvet-coast-${size.width}x${size.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved velvet-coast-${size.width}x${size.height}.png`);
  }, 'image/png');
}

document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => exportPoster(btn.dataset.export));
});

/** Loads every panel's starting sample photo, then paints the preview. */
export async function loadSamples() {
  await document.fonts.ready;
  for (const panel of state.cast) {
    try {
      panel.image = await loadImage(panel.sampleSrc);
    } catch {
      panel.image = null;
    }
  }
  buildPanelCards();
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, loadImage, drawPoster, setStatus, buildPanelCards, redraw,
  });
} else {
  loadSamples();
}
