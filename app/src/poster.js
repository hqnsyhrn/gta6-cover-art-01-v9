// Velvet Coast — draws the poster onto a canvas at any of the export sizes.
// Layout is computed from the canvas size, so the same drawing code renders
// the live preview, every export size and both layouts. Fonts come from the
// app's own files (Anton for the title and role labels, Pacifico for the
// neon script), loaded through @font-face in style.css.

import { GRADES, SIZES } from './state.js';

const FRAME = '#1A0B2E'; // deep violet frame, never plain black
const INK = '#12061F';
const GOLD = '#FFD34D';
const PINK = '#FF6EC7';

/** Panel rectangles for a canvas of w x h in the given layout. Returns
 *  { panels, gridTop, gridBottom, gridLeft, gridRight, gutter }. */
export function posterLayout(w, h, layout) {
  const frame = Math.round(w * 0.02);
  const gutter = Math.max(6, Math.round(w * 0.009));
  const topH = Math.round(h * 0.048);
  const bottomH = Math.round(h * 0.05);
  const left = frame;
  const right = w - frame;
  const gridTop = frame + topH + gutter;
  const gridBottom = h - frame - bottomH;
  const gridW = right - left;
  const gridH = gridBottom - gridTop;
  const panels = [];
  if (layout === 'hero') {
    const heroW = Math.round(gridW * 0.42);
    const stripH = Math.round(gridH * 0.28);
    const sideX = left + heroW + gutter;
    const sideW = right - sideX;
    const sideH = gridH - stripH - gutter;
    const halfH = Math.round((sideH - gutter) / 2);
    const halfW = Math.round((sideW - gutter) / 2);
    panels.push({ x: left, y: gridTop, w: heroW, h: gridH }); // driver, tall
    panels.push({ x: sideX, y: gridTop, w: halfW, h: halfH }); // angler
    panels.push({ x: sideX + halfW + gutter, y: gridTop, w: sideW - halfW - gutter, h: halfH }); // boss
    panels.push({ x: sideX, y: gridTop + halfH + gutter, w: halfW, h: sideH - halfH - gutter }); // fixer
    panels.push({ x: sideX + halfW + gutter, y: gridTop + halfH + gutter, w: sideW - halfW - gutter, h: sideH - halfH - gutter }); // lookout
    panels.push({ x: sideX, y: gridTop + sideH + gutter, w: sideW, h: stripH }); // insider strip
  } else {
    const row1H = Math.round(gridH * 0.47);
    const row2Y = gridTop + row1H + gutter;
    const row2H = gridBottom - row2Y;
    const heroW = Math.round(gridW * 0.48);
    const midW = Math.round(gridW * 0.25);
    const third = Math.round((gridW - gutter * 2) / 3);
    panels.push({ x: left, y: gridTop, w: heroW, h: row1H }); // driver, largest
    panels.push({ x: left + heroW + gutter, y: gridTop, w: midW, h: row1H }); // angler
    panels.push({ x: left + heroW + gutter + midW + gutter, y: gridTop, w: gridW - heroW - midW - gutter * 2, h: row1H }); // boss
    panels.push({ x: left, y: row2Y, w: third, h: row2H }); // fixer
    panels.push({ x: left + third + gutter, y: row2Y, w: third, h: row2H }); // lookout
    panels.push({ x: left + third * 2 + gutter * 2, y: row2Y, w: gridW - third * 2 - gutter * 2, h: row2H }); // insider
  }
  return { panels, gridTop, gridBottom, gridLeft: left, gridRight: right, gutter, frame, topH, bottomH };
}

/** Cover-fits img into rect, honouring the panel crop (zoom + focus point). */
export function drawCroppedPhoto(ctx, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 - panel.fx * (dw - rect.w);
  const dy = rect.y + (rect.h - dh) / 2 - panel.fy * (dh - rect.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The violet/magenta sunset grade over one panel, plus a bottom shade so
 *  the role label stays readable. */
function gradePanel(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, hexA(grade.sky, 0.26));
  g.addColorStop(0.55, hexA(grade.glow, 0.09));
  g.addColorStop(1, hexA(grade.warm, 0.17));
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.62, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(18,6,31,0)');
  shade.addColorStop(1, 'rgba(18,6,31,0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y + rect.h * 0.62, rect.w, rect.h * 0.38);
}

function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Role label bar (big, black) with the small caption line beneath it.
 *  Both lines shrink until they fit inside the panel, so a caption can
 *  never spill under the next panel. reserveRight keeps text clear of the
 *  gold seal, which overlaps the last panel's bottom-right corner. */
function drawRoleLabel(ctx, rect, panel, h, reserveRight = 0, atTop = false) {
  let roleSize = Math.max(13, Math.round(h * 0.021));
  let capSize = Math.max(9, Math.round(h * 0.0115));
  const pad = Math.round(h * 0.008);
  const maxTextW = rect.w - pad * 2 - 4 - reserveRight;
  ctx.font = `${roleSize}px Anton, sans-serif`;
  while (ctx.measureText(panel.role).width > maxTextW && roleSize > 9) {
    roleSize -= 1;
    ctx.font = `${roleSize}px Anton, sans-serif`;
  }
  ctx.font = `${capSize}px system-ui, sans-serif`;
  while (ctx.measureText(panel.caption).width > maxTextW && capSize > 7) {
    capSize -= 0.5;
    ctx.font = `${capSize}px system-ui, sans-serif`;
  }
  ctx.font = `${roleSize}px Anton, sans-serif`;
  const roleW = ctx.measureText(panel.role).width;
  ctx.font = `${capSize}px system-ui, sans-serif`;
  const capW = ctx.measureText(panel.caption).width;
  const barW = Math.min(rect.w - reserveRight, Math.ceil(Math.max(roleW, capW)) + pad * 2);
  const barH = roleSize + capSize + pad * 3;
  const bx = rect.x;
  const by = atTop ? rect.y : rect.y + rect.h - barH;
  ctx.fillStyle = 'rgba(10,4,18,0.92)';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = '#FF4D8D';
  ctx.fillRect(bx, by, Math.max(3, Math.round(h * 0.004)), barH);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${roleSize}px Anton, sans-serif`;
  ctx.fillText(panel.role, bx + pad, by + pad + roleSize * 0.82);
  ctx.fillStyle = '#E8D9F5';
  ctx.font = `${capSize}px system-ui, sans-serif`;
  ctx.fillText(panel.caption, bx + pad, by + pad + roleSize + capSize * 0.95);
}

/** Chrome title: horizontal colour stripes with a thick black outline. */
function drawChromeTitle(ctx, text, cx, baselineY, maxW, maxH) {
  let size = Math.round(maxH);
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 24) {
    size -= 4;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const grad = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.12);
  grad.addColorStop(0, '#FFD34D');
  grad.addColorStop(0.28, '#FF7A3D');
  grad.addColorStop(0.52, '#FF4D8D');
  grad.addColorStop(0.78, '#B44DFF');
  grad.addColorStop(1, '#8B3DFF');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0D0318';
  ctx.lineWidth = Math.max(5, Math.round(size * 0.075));
  ctx.strokeText(text, cx, baselineY);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, baselineY);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, Math.round(size * 0.012));
  ctx.strokeText(text, cx, baselineY);
  return size;
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 16);
  ctx.fillStyle = '#111111';
  let bx = x;
  let seed = 20261120;
  const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  while (bx < x + w - 2) {
    const bw = 1 + Math.floor(next() * 4);
    if (next() > 0.42) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(next() * 2);
  }
  ctx.fillStyle = '#111111';
  ctx.font = `${Math.max(8, Math.round(h * 0.28))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('002113 122820', x + w / 2, y + h + 11);
}

function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.86;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7A5200';
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.stroke();
  ctx.fillStyle = '#7A2E00';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(9, Math.round(r * 0.24))}px Anton, sans-serif`;
  ctx.fillText('ORIGINAL', 0, -r * 0.2);
  ctx.fillText('COVER ART', 0, r * 0.12);
  ctx.font = `${Math.max(8, Math.round(r * 0.16))}px system-ui, sans-serif`;
  ctx.fillText('★ ★ ★', 0, r * 0.42);
  ctx.restore();
}

function drawGrain(ctx, w, h) {
  let seed = 987654321;
  const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#FFFFFF';
  const n = Math.round((w * h) / 900);
  for (let i = 0; i < n; i++) {
    const s = next() > 0.5 ? 1 : 2;
    ctx.fillRect(next() * w, next() * h, s, s);
  }
  ctx.restore();
}

/**
 * Draws the whole poster for `state` onto `canvas` (sized to the chosen
 * export size first). Panels with no loaded image draw a violet placeholder
 * with their role, so the poster never renders empty.
 */
export function drawPoster(canvas, state, sizeKey) {
  const size = SIZES[sizeKey || state.size];
  const w = size.width;
  const h = size.height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.velvet;
  const layout = posterLayout(w, h, state.layout);

  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, w, h);

  // Press quote across the top bar, VOL. 01 pill at the right.
  const topY = layout.frame + layout.topH * 0.62;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const starSize = Math.round(h * 0.02);
  ctx.font = `${starSize}px system-ui, sans-serif`;
  ctx.fillStyle = GOLD;
  const quote = `★★★★★  “${state.quote}” — ${state.quoteSource}`;
  ctx.fillText(quote, layout.frame + 4, topY);
  const volText = 'VOL. 01';
  ctx.font = `${Math.round(h * 0.018)}px Anton, sans-serif`;
  const volW = ctx.measureText(volText).width + h * 0.02;
  const volH = layout.topH * 0.72;
  const volX = w - layout.frame - volW;
  const volY = layout.frame + (layout.topH - volH) / 2;
  ctx.fillStyle = GOLD;
  ctx.fillRect(volX, volY, volW, volH);
  ctx.fillStyle = '#1A0B2E';
  ctx.textAlign = 'center';
  ctx.fillText(volText, volX + volW / 2, volY + volH * 0.68);

  // The six panels: photo, grade, role label.
  state.cast.forEach((panel, i) => {
    const rect = layout.panels[i];
    if (!rect) return;
    if (panel.image) {
      drawCroppedPhoto(ctx, panel.image, rect, panel);
    } else {
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      ph.addColorStop(0, '#3D1A5E');
      ph.addColorStop(1, '#7B2FBE');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradePanel(ctx, rect, grade);
    ctx.strokeStyle = 'rgba(26,11,46,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    // The seal overlaps the last panel's bottom-right corner, so its label
    // text stops short of it. In the hero layout the title crosses the
    // top-row side panels, so their labels sit at the top instead.
    const sealReserve = i === state.cast.length - 1
      ? Math.round(Math.min(w, h) * 0.048) * 2 + 16 : 0;
    const labelAtTop = state.layout === 'hero' && (i === 1 || i === 2);
    drawRoleLabel(ctx, rect, panel, h, sealReserve, labelAtTop);
    if (panel.userPhoto) {
      const badge = 'YOUR PHOTO';
      ctx.font = `${Math.max(9, Math.round(h * 0.012))}px Anton, sans-serif`;
      const bw = ctx.measureText(badge).width + 12;
      const bh = Math.max(16, Math.round(h * 0.02));
      ctx.fillStyle = PINK;
      ctx.fillRect(rect.x + rect.w - bw - 6, rect.y + 6, bw, bh);
      ctx.fillStyle = '#1A0B2E';
      ctx.textAlign = 'center';
      ctx.fillText(badge, rect.x + rect.w - bw / 2 - 6, rect.y + 6 + bh * 0.68);
    }
  });

  // WANTED pill on the boss panel (top right of the third panel).
  const bossRect = layout.panels[2];
  if (bossRect) {
    const pill = 'WANTED ★★★★★';
    ctx.font = `${Math.max(10, Math.round(h * 0.014))}px Anton, sans-serif`;
    const pw = ctx.measureText(pill).width + 16;
    const ph = Math.max(18, Math.round(h * 0.024));
    ctx.fillStyle = 'rgba(10,4,18,0.92)';
    ctx.fillRect(bossRect.x + bossRect.w - pw - 6, bossRect.y + 6, pw, ph);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bossRect.x + bossRect.w - pw - 6, bossRect.y + 6, pw, ph);
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.fillText(pill, bossRect.x + bossRect.w - pw / 2 - 6, bossRect.y + 6 + ph * 0.7);
  }

  // The giant chrome title over the photos, the pink script under it, the ribbon.
  // In the hero layout the side panels' labels sit higher, so the title
  // block rides higher too and never covers a role label.
  const titleFrac = state.layout === 'hero' ? 0.46 : 0.66;
  const titleBaseline = layout.gridTop + (layout.gridBottom - layout.gridTop) * titleFrac;
  const titleSize = drawChromeTitle(
    ctx, state.title, w / 2,
    titleBaseline,
    w * 0.96, h * 0.2,
  );
  const scriptY = titleBaseline + titleSize * 0.48;
  ctx.font = `${Math.round(titleSize * 0.34)}px Pacifico, cursive`;
  ctx.textAlign = 'center';
  ctx.shadowColor = PINK;
  ctx.shadowBlur = titleSize * 0.18;
  ctx.fillStyle = PINK;
  ctx.fillText(state.script, w / 2, scriptY);
  ctx.shadowBlur = 0;

  const ribbonH = Math.round(h * 0.028);
  const ribbonY = scriptY + titleSize * 0.14;
  ctx.fillStyle = 'rgba(10,4,18,0.94)';
  ctx.fillRect(layout.gridLeft, ribbonY, layout.gridRight - layout.gridLeft, ribbonH);
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.moveTo(layout.gridLeft + 6, ribbonY + ribbonH / 2);
  ctx.lineTo(layout.gridLeft + 16, ribbonY + 4);
  ctx.lineTo(layout.gridLeft + 16, ribbonY + ribbonH - 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(layout.gridRight - 6, ribbonY + ribbonH / 2);
  ctx.lineTo(layout.gridRight - 16, ribbonY + 4);
  ctx.lineTo(layout.gridRight - 16, ribbonY + ribbonH - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.round(ribbonH * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(state.ribbon, w / 2, ribbonY + ribbonH * 0.72);

  // Gold seal, bottom right over the last panel.
  drawSeal(ctx, w * 0.93, layout.gridBottom - h * 0.028, Math.round(Math.min(w, h) * 0.048));

  // Bottom bar: COMING SOON, one credit line, barcode. The credit is
  // measured and shrunk to fit the gap between COMING SOON and the barcode.
  const barY = h - layout.frame - layout.bottomH * 0.55;
  const comingFont = Math.round(h * 0.02);
  ctx.font = `${comingFont}px Pacifico, cursive`;
  const comingW = ctx.measureText('COMING SOON').width;
  const barcodeW = Math.round(w * 0.075);
  const barcodeX = w - layout.frame - barcodeW;
  let creditSize = Math.max(10, Math.round(h * 0.012));
  ctx.font = `${creditSize}px system-ui, sans-serif`;
  const creditGap = barcodeX - 12 - (layout.frame + 4 + comingW + 24);
  while (ctx.measureText(state.credit).width > creditGap && creditSize > 8) {
    creditSize -= 0.5;
    ctx.font = `${creditSize}px system-ui, sans-serif`;
  }
  const creditCx = layout.frame + 4 + comingW + 24 + creditGap / 2;
  ctx.textAlign = 'left';
  ctx.font = `${comingFont}px Pacifico, cursive`;
  ctx.fillStyle = PINK;
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 8;
  ctx.fillText('COMING SOON', layout.frame + 4, barY);
  ctx.shadowBlur = 0;
  ctx.font = `${creditSize}px system-ui, sans-serif`;
  ctx.fillStyle = '#D9C8EC';
  ctx.textAlign = 'center';
  ctx.fillText(state.credit, creditCx, barY);
  drawBarcode(ctx, barcodeX, barY - Math.round(h * 0.02), barcodeW, Math.round(h * 0.016));

  drawGrain(ctx, w, h);
  return layout;
}
