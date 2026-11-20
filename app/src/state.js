// Velvet Coast — poster state: the six cast panels, the title, the grade and the
// export sizes. Every panel starts from a bundled sample photo, but each panel
// also accepts the user's own photo (see loadUserPhoto in main.js): the sample
// is only a starting point, never the only source of pictures.
// A panel's crop is a zoom plus a focus point: zoom 1 shows the whole photo
// fitted to the panel, zoom 2.5 is a tight close-up; fx/fy (-0.5..0.5) slide
// the framed window left/right and up/down. userPhoto marks a panel whose
// picture came from the user's machine (shown as a YOUR PHOTO badge).

export const SIZES = {
  portrait: { key: 'portrait', label: '1080 x 1350 Portrait', width: 1080, height: 1350 },
  square: { key: 'square', label: '1080 x 1080 Square', width: 1080, height: 1080 },
  wide: { key: 'wide', label: '1920 x 1080 Widescreen', width: 1920, height: 1080 },
};

export const LAYOUTS = {
  grid: { key: 'grid', label: 'Six-panel grid' },
  hero: { key: 'hero', label: 'Single hero + strip' },
};

export const GRADES = {
  velvet: { key: 'velvet', label: 'Velvet Purple', sky: '#7B2FBE', glow: '#FF4D8D', warm: '#FF9A3D' },
  sunset: { key: 'sunset', label: 'Sunset Gold', sky: '#E85D04', glow: '#FF7A3D', warm: '#FFD34D' },
  neon: { key: 'neon', label: 'Neon Night', sky: '#2A0A3D', glow: '#FF6EC7', warm: '#FF4D8D' },
};

// One cast member per panel. sampleSrc is the bundled starting photo for the
// panel; image is the loaded HTMLImageElement (a sample or a user upload),
// set by main.js. role and caption are editable in the editor.
export function createDefaultCast() {
  return [
    {
      id: 'driver', role: 'THE DRIVER', sampleSrc: 'samples/driver.jpg',
      caption: 'VELVET PIER · 6:58 PM · WAITS FOR NO ONE',
      zoom: 1.15, fx: 0.25, fy: -0.5, image: null, userPhoto: false,
    },
    {
      id: 'angler', role: 'THE ANGLER', sampleSrc: 'samples/angler.jpg',
      caption: 'MAGENTA BAY · 5:47 PM · NEVER MISSES',
      zoom: 1.1, fx: 0, fy: -0.3, image: null, userPhoto: false,
    },
    {
      id: 'boss', role: 'THE BOSS', sampleSrc: 'samples/boss.jpg',
      caption: 'CROWN MOTEL · 8:12 PM · OWNS THE NIGHT',
      zoom: 2.0, fx: 0, fy: -0.14, image: null, userPhoto: false,
    },
    {
      id: 'fixer', role: 'THE FIXER', sampleSrc: 'samples/fixer.jpg',
      caption: 'NEON ROW · 9:03 PM · CASH ONLY',
      zoom: 1.8, fx: 0, fy: -0.3, image: null, userPhoto: false,
    },
    {
      id: 'lookout', role: 'THE LOOKOUT', sampleSrc: 'samples/lookout.jpg',
      caption: 'VIOLET DOCK · 6:15 PM · SEES EVERYTHING',
      zoom: 1.8, fx: 0.05, fy: -0.3, image: null, userPhoto: false,
    },
    {
      id: 'insider', role: 'THE INSIDER', sampleSrc: 'samples/insider.jpg',
      caption: 'PALM COURT · 7:21 PM · KNOWS EVERYTHING',
      zoom: 1.8, fx: 0, fy: -0.15, image: null, userPhoto: false,
    },
  ];
}

/** A fresh poster state: the cast, the title lines, the grade and the layout. */
export function createPosterState() {
  return {
    title: 'VELVET COAST',
    script: 'one last golden hour',
    quote: 'PURE VELVET MAYHEM',
    quoteSource: 'THE COAST GAZETTE',
    ribbon: 'SIX LIVES · ONE COAST · NO WAY BACK',
    credit: 'A VELVET COAST PICTURE · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
    grade: 'velvet',
    layout: 'grid',
    size: 'portrait',
    cast: createDefaultCast(),
  };
}

/** The panel the next dropped or picked photo goes to (first panel the user
 *  has not replaced yet, else the selected panel, else the driver). */
export function nextOpenPanelId(state, selectedId) {
  const untouched = state.cast.find((p) => !p.userPhoto);
  if (untouched) return untouched.id;
  return selectedId || state.cast[0].id;
}
