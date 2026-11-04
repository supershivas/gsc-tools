/* Aperçu 3D du document (three.js) — chargé à la demande, avec son propre bundle (viewer3d.js).
   Le recto et le verso sont deux faces d'une feuille A4 très mince ; léger balancement tant qu'on n'a pas touché
   à l'objet. On déplace la feuille, pas la caméra : la lumière reste fixe par rapport à l'écran, la feuille y est toujours. Reçoit les pages déjà dessinées : voir raster.js. */
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, PlaneGeometry, Group, Vector3, CanvasTexture, SRGBColorSpace, RepeatWrapping,
  LinearMipmapLinearFilter, MeshStandardMaterial, ShadowMaterial, BufferGeometry, BufferAttribute, DoubleSide, VSMShadowMap,
  HemisphereLight, DirectionalLight } from 'three';

const W = 210, H = 297, T = 0.3, GAP = 14;           // feuille A4 en mm ; épaisseur à peine exagérée (un vrai papier fait ~0,1 mm)
const NX = 36, NY = 52, CURL = 0.0016;               // maillage de la feuille et courbure de repos (1/rayon, en 1/mm)
const FOV = 30;
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e[k] = v; }
  e.append(...kids.filter(Boolean)); return e;
}

/* Grain de papier : bruit fin + quelques fibres (sert de relief, et de léger voile sur les pages) */
function grainCanvas(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), im = g.createImageData(size, size);
  for (let i = 0; i < im.data.length; i += 4) { const v = 232 + Math.random() * 23; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
  g.lineWidth = 0.6;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size, y = Math.random() * size, a = Math.random() * Math.PI, l = 3 + Math.random() * 9;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '120,115,105'},${0.05 + Math.random() * 0.09})`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}
/** la page dessinée + un voile de grain très léger (multiplié) */
function paperPage(src, grain) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.55; g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Une feuille mince et légèrement courbe : face avant, face arrière et tranche, sur le même maillage (z = courbure ± demi-épaisseur) */
function makeSheet(matFront, matBack, matEdge) {
  const n = (NX + 1) * (NY + 1), idx = [], uvF = new Float32Array(n * 2), uvB = new Float32Array(n * 2);
  for (let i = 0; i <= NY; i++) for (let j = 0; j <= NX; j++) { const k = i * (NX + 1) + j; uvF[k * 2] = j / NX; uvF[k * 2 + 1] = 1 - i / NY; uvB[k * 2] = 1 - j / NX; uvB[k * 2 + 1] = 1 - i / NY; }
  for (let i = 0; i < NY; i++) for (let j = 0; j < NX; j++) { const a = i * (NX + 1) + j, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const mk = (uv, rev) => {
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('uv', new BufferAttribute(uv, 2));
    g.setIndex(rev ? idx.slice().reverse() : idx); return g;
  };
  const gF = mk(uvF, false), gB = mk(uvB, true);
  /* tranche : le pourtour, une bande entre l'avant et l'arrière */
  const ring = []; for (let j = 0; j < NX; j++) ring.push([0, j, 0, j + 1]); for (let i = 0; i < NY; i++) ring.push([i, NX, i + 1, NX]);
  for (let j = NX; j > 0; j--) ring.push([NY, j, NY, j - 1]); for (let i = NY; i > 0; i--) ring.push([i, 0, i - 1, 0]);
  const gE = new BufferGeometry(); gE.setAttribute('position', new BufferAttribute(new Float32Array(ring.length * 4 * 3), 3));
  const eIdx = []; ring.forEach((_, r) => { const o = r * 4; eIdx.push(o, o + 1, o + 2, o, o + 2, o + 3); }); gE.setIndex(eIdx);
  const front = new Mesh(gF, matFront), back = new Mesh(gB, matBack), edge = new Mesh(gE, matEdge), group = new Group();
  [front, back, edge].forEach(m => { m.castShadow = true; group.add(m); });
  // la feuille ne reçoit pas d'ombre (pas d'auto-ombrage : ses plis sinon se couvrent de zébrures) ; seul le mur la reçoit
  /* courbure : cylindre autour de l'axe vertical + léger gauchissement (les bords se détachent un peu vers l'arrière) */
  const bend = (x, y, c, d, tw) => -c * x * x / 2 + (0.22 * c + d) * y * y / 2 + c * 0.6 * x * y / 120 + tw * (2 * x / W) * (2 * y / H);
  /* curl : courbure autour de l'axe vertical ; dy : courbure haut/bas ; tw : gauchissement (mm aux coins) — le mouvement les fait varier */
  function update(curl = CURL, dy = 0, tw = 0) {
    const pf = gF.attributes.position.array, pb = gB.attributes.position.array;
    for (let i = 0; i <= NY; i++) for (let j = 0; j <= NX; j++) {
      const k = (i * (NX + 1) + j) * 3, x = (j / NX - 0.5) * W, y = (0.5 - i / NY) * H, z = bend(x, y, curl, dy, tw);
      pf[k] = pb[k] = x; pf[k + 1] = pb[k + 1] = y; pf[k + 2] = z + T / 2; pb[k + 2] = z - T / 2;
    }
    const pe = gE.attributes.position.array;
    ring.forEach(([i0, j0, i1, j1], r) => {
      const a = (i0 * (NX + 1) + j0) * 3, b = (i1 * (NX + 1) + j1) * 3, o = r * 12;
      pe.set([pf[a], pf[a + 1], pf[a + 2], pf[b], pf[b + 1], pf[b + 2], pb[b], pb[b + 1], pb[b + 2], pb[a], pb[a + 1], pb[a + 2]], o);
    });
    [gF, gB, gE].forEach(g => { g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); });
  }
  update();
  return { group, update };
}

/** opts : { labels, load(): Promise<[{key, canvas}]> } — labels déjà traduits */
function open(opts) {
  const L = opts.labels;
  let renderer, raf = 0, closed = false;
  const root = el('div', { class: 'v3d', role: 'dialog', 'aria-label': L.title });
  const stage = el('div', { class: 'v3d-stage' });
  const msg = el('div', { class: 'v3d-msg', textContent: L.loading });
  const btn = (icon, label, fn) => el('button', { type: 'button', class: 'v3d-btn', title: label, onclick: fn }, el('i', { class: 'ti ti-' + icon }), el('span', { textContent: label }));
  const bFlip = btn('rotate-2', L.flip, () => flip());
  const bMode = btn('layout-columns', L.spread, () => setMode(mode === 'single' ? 'spread' : 'single'));
  const bReset = btn('focus-2', L.reset, () => resetView());
  const bPng = btn('photo-down', L.png, () => savePng(true)), bPngT = btn('photo-off', L.pngT, () => savePng(false));
  const bClose = btn('x', L.close, () => close());
  root.append(el('div', { class: 'v3d-bar' }, el('strong', { textContent: L.title }), el('span', { class: 'v3d-sp' }), bFlip, bMode, bReset, bPng, bPngT, bClose),
    stage, el('div', { class: 'v3d-hint', textContent: L.hint }), msg);
  document.body.append(root); document.body.classList.add('v3d-open');

  let scene, camera, sheetA, sheetB, shA, shB, wall, pivot, textures = [];
  let mode = 'single', flipped = false, flipFrom = 0, flipTo = 0, flipT = 1, interacted = false, spin = 0;
  /* l'objet : cible (pointeur) et valeur lissée (suit avec un léger retard) ; la souplesse de la feuille est un ressort alimenté par la vitesse */
  const tgt = { yaw: 0, pitch: 0, x: 0, y: 0, dist: 800 }, cur = { yaw: 0, pitch: 0, x: 0, y: 0, dist: 800 }, flex = { b: 0, bv: 0, p: 0, pv: 0, t: 0, tv: 0 };
  const DIR = new Vector3(0.2, 0.13, 0.97).normalize();

  function init(pages) {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.append(renderer.domElement);
    scene = new Scene();
    camera = new PerspectiveCamera(FOV, 1, 20, 4000);
    bindPointer(renderer.domElement);

    /* rendu « papier » : lumière diffuse (ciel + une lumière principale douce), ombre portée sur un mur invisible, grain léger */
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = VSMShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // l'ombre n'est recalculée que si quelque chose bouge
    scene.add(new HemisphereLight(0xffffff, 0xe3e8f2, 1.75));
    const key = new DirectionalLight(0xfff5ea, 1.3); key.position.set(-170, 200, 480); key.castShadow = true;
    Object.assign(key.shadow, { radius: 10, blurSamples: 16, bias: -0.0004, normalBias: 0.2 });
    key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -330, right: 330, top: 330, bottom: -330, near: 100, far: 1600 });
    scene.add(key, key.target);
    const rim = new DirectionalLight(0xdfe7ff, 0.3); rim.position.set(400, 120, 200); scene.add(rim);
    const head = new DirectionalLight(0xffffff, 0.6); head.position.set(60, 40, 500); scene.add(head);   // lumière « de la caméra » : une face tournée vers l'écran est toujours éclairée
    wall = new Mesh(new PlaneGeometry(2600, 2000), new ShadowMaterial({ opacity: 0.15 }));
    wall.position.z = -200;   // plus loin que la demi-diagonale ne la fait osciller : la feuille ne traverse jamais le mur wall.receiveShadow = true; scene.add(wall);

    const grain = grainCanvas(), bump = new CanvasTexture(grain);
    bump.wrapS = bump.wrapT = RepeatWrapping; bump.repeat.set(W / 18, H / 18); textures.push(bump);
    const tex = c => {
      const t = new CanvasTexture(paperPage(c.canvas, grain)); t.colorSpace = SRGBColorSpace; t.minFilter = LinearMipmapLinearFilter;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); textures.push(t); return t;
    };
    const [tr, tv] = [tex(pages[0]), tex(pages[1] || pages[0])];
    const edge = new MeshStandardMaterial({ color: 0xe9e7e0, roughness: 1, side: DoubleSide });
    const face = t => new MeshStandardMaterial({ map: t, roughness: 0.93, metalness: 0, bumpMap: bump, bumpScale: 0.35, shadowSide: DoubleSide });
    shA = makeSheet(face(tr), face(tv), edge);   // recto devant, verso derrière
    shB = makeSheet(face(tv), face(tv), edge);   // seconde feuille : le verso, pour le mode « deux pages »
    sheetA = shA.group; sheetB = shB.group;
    pivot = new Group(); pivot.add(sheetA, sheetB); scene.add(pivot);
    setMode('single', true);
    resize(); cur.dist = tgt.dist; new ResizeObserver(resize).observe(stage);
    loop();
  }

  const distFor = m => {
    const width = m === 'spread' ? 2 * W + GAP : W;
    return Math.max(H * 1.18, width * 1.1 / (camera.aspect || 1)) / 2 / Math.tan(FOV * Math.PI / 360);
  };
  function resetView() { interacted = false; spin = 0; Object.assign(tgt, { yaw: 0, pitch: 0, x: 0, y: 0, dist: distFor(mode) }); if (mode === 'single' && flipped) flip(); }
  /* glisser = tourner la feuille ; clic droit, Maj ou Ctrl = la déplacer ; molette = rapprocher / éloigner */
  function bindPointer(cv) {
    let drag = null;
    const upp = () => 2 * cur.dist * Math.tan(FOV * Math.PI / 360) / (stage.clientHeight || 1);   // unités du monde par pixel
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey }; interacted = true; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (drag.pan) { tgt.x += dx * upp(); tgt.y -= dy * upp(); }
      else { tgt.yaw += dx * 0.0085; tgt.pitch = Math.max(-1.2, Math.min(1.2, tgt.pitch + dy * 0.0065)); }
    });
    const up = () => { drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); interacted = true; tgt.dist = Math.max(120, Math.min(1800, tgt.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  }
  function setMode(m, quick) {
    mode = m; bFlip.disabled = m === 'spread'; bFlip.style.opacity = m === 'spread' ? '.4' : '';
    bMode.querySelector('span').textContent = m === 'spread' ? L.single : L.spread;
    sheetB.visible = m === 'spread';
    sheetA.position.x = m === 'spread' ? -(W + GAP) / 2 : 0; sheetB.position.x = (W + GAP) / 2;
    if (m === 'spread' && flipped) { flipped = false; flipFrom = flipTo = sheetA.rotation.y = 0; flipT = 1; }
    interacted = false; tgt.dist = distFor(m); tgt.x = tgt.y = 0; if (quick) cur.dist = tgt.dist;
  }
  /* PNG : rendu de la scène telle qu'on la voit (feuille, courbure, ombre), en 2× la taille affichée, fond transparent */
  function savePng(withBg) {
    if (!renderer) return;
    const pr = renderer.getPixelRatio(), cv = renderer.domElement;
    renderer.setPixelRatio(Math.min(pr * 2, 4096 / Math.max(stage.clientWidth, stage.clientHeight)));
    renderer.render(scene, camera);
    /* fond clair du visualiseur (dégradé) derrière la feuille, ou fond transparent */
    const out = el('canvas'); out.width = cv.width; out.height = cv.height; const g = out.getContext('2d');
    if (withBg) { const r = g.createRadialGradient(out.width / 2, out.height * 0.35, 0, out.width / 2, out.height * 0.35, Math.hypot(out.width, out.height) * 0.6); r.addColorStop(0, '#f4f6fb'); r.addColorStop(1, '#dfe3ee'); g.fillStyle = r; g.fillRect(0, 0, out.width, out.height); }
    g.drawImage(cv, 0, 0);
    renderer.setPixelRatio(pr); renderer.render(scene, camera);
    out.toBlob(blob => {
      if (!blob) return;
      const a = el('a', { href: URL.createObjectURL(blob), download: (L.filename || 'factsheet') + (withBg ? '' : '-transparent') + '-3d.png' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }
  function flip() { if (mode !== 'single') return; flipped = !flipped; flipFrom = sheetA.rotation.y; flipTo = flipped ? Math.PI : 0; flipT = 0; }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!interacted) tgt.dist = distFor(mode);
  }
  let last = performance.now(), lastCurl = CURL, lastDy = 0, lastTw = 0;
  function loop(now = performance.now()) {
    if (closed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.max(0.001, Math.min(0.05, (now - last) / 1000)); last = now;
    let flipBend = 0, flipSpin = 0;
    if (flipT < 1) {
      const before = sheetA.rotation.y; flipT = Math.min(1, flipT + dt / 0.9); const k = ease(flipT); sheetA.rotation.y = flipFrom + (flipTo - flipFrom) * k;
      flipBend = 0.0042 * Math.sin(Math.PI * k); flipSpin = (sheetA.rotation.y - before) / dt;      // la feuille se courbe pendant qu'elle tourne
    }
    // balancement très léger tant qu'on n'a pas touché à la feuille
    spin += dt;
    const sway = interacted ? 0 : 1, ty = tgt.yaw + Math.sin(spin * 0.7) * 0.07 * sway, tp = tgt.pitch + Math.sin(spin * 0.5) * 0.025 * sway;
    const py = cur.yaw, pp = cur.pitch, px = cur.x, pyy = cur.y, f = 1 - Math.exp(-dt * 9);
    cur.yaw += (ty - cur.yaw) * f; cur.pitch += (tp - cur.pitch) * f;
    cur.x += (tgt.x - cur.x) * f; cur.y += (tgt.y - cur.y) * f; cur.dist += (tgt.dist - cur.dist) * (1 - Math.exp(-dt * 10));
    pivot.rotation.set(cur.pitch, cur.yaw, 0, 'YXZ'); pivot.position.set(cur.x, cur.y, 0);
    camera.position.copy(DIR).multiplyScalar(cur.dist); camera.lookAt(0, 0, 0);
    /* souplesse : la vitesse de rotation pousse un ressort un peu mou ; la feuille se courbe, se gauchit, puis revient en oscillant */
    const vy = (cur.yaw - py) / dt + flipSpin * 0.5, vp = (cur.pitch - pp) / dt, clamp = (v, m) => Math.max(-m, Math.min(m, v));
    const step = (k, v, target) => { v.v += ((target - v.x) * 80 - v.v * 6.5) * dt; v.x += v.v * dt; return v; };
    const sb = { x: flex.b, v: flex.bv }, sp = { x: flex.p, v: flex.pv }, st = { x: flex.t, v: flex.tv };
    step(0, sb, clamp(vy * 0.3, 1)); step(0, sp, clamp(vp * 0.3, 1)); step(0, st, clamp(vy * 0.2, 1) * clamp(vp * 0.2, 1) + clamp(vy * 0.08, 0.4));
    flex.b = sb.x; flex.bv = sb.v; flex.p = sp.x; flex.pv = sp.v; flex.t = st.x; flex.tv = st.v;
    const curl = CURL + flipBend + 0.0017 * flex.b, dy = 0.0015 * flex.p, tw = 3.5 * flex.t;
    let moved = false;
    if (Math.abs(curl - lastCurl) + Math.abs(dy - lastDy) + Math.abs(tw - lastTw) * 0.0005 > 1.5e-5) { shA.update(curl, dy, tw); if (sheetB.visible) shB.update(curl, dy, tw); lastCurl = curl; lastDy = dy; lastTw = tw; moved = true; }
    if (moved || flipT < 1 || Math.abs(cur.yaw - py) + Math.abs(cur.pitch - pp) + Math.abs(cur.x - px) + Math.abs(cur.y - pyy) > 1e-5) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    if (renderer) {
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => x.dispose()); });
      textures.forEach(t => t.dispose()); renderer.dispose(); renderer.forceContextLoss();
    }
    root.remove(); document.body.classList.remove('v3d-open');
  }
  const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === 'f' || e.key === 'F') flip(); };
  window.addEventListener('keydown', onKey);

  Promise.resolve().then(opts.load).then(pages => {
    if (closed) return;
    try { init(pages); msg.remove(); } catch (e) { msg.textContent = L.noWebgl; }
  }).catch(() => { if (!closed) msg.textContent = L.error; });
  return { close };
}

window.FS3D = { open };
