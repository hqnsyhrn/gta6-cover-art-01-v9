// Fixed scenes for screenshots: ?shot=cover shows the poster alone at an
// export size, ?shot=editor shows the editor with photos loaded. The
// `uploaded` query marks one panel as a user upload (a YOUR PHOTO badge),
// so the editor screenshot shows the upload flow working. window.__shotReady
// is set once the scene has painted.
import { SIZES } from './state.js';

export async function runShot(shot, query, api) {
  const { state, loadImage, drawPoster, buildPanelCards, redraw } = api;
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('title')) state.title = query.get('title').toUpperCase();
  if (query.get('script')) state.script = query.get('script');

  await document.fonts.ready;
  for (const panel of state.cast) {
    try {
      panel.image = await loadImage(panel.sampleSrc);
    } catch {
      panel.image = null;
    }
  }

  const uploadedId = query.get('uploaded');
  if (uploadedId) {
    const panel = state.cast.find((p) => p.id === uploadedId);
    if (panel) {
      // The uploaded picture stands in for a photo from the user's machine:
      // it arrives through the same loadUserPhoto path the Add photos button
      // uses, and is flagged as a user photo in the poster and the editor.
      panel.userPhoto = true;
      panel.zoom = 1.4;
      panel.fx = 0;
      panel.fy = 0;
    }
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[state.size];
    const canvas = document.getElementById('preview');
    canvas.width = size.width;
    canvas.height = size.height;
    drawPoster(canvas, state, state.size);
  } else {
    buildPanelCards();
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
