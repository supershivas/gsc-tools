/* Aperçu 3D du document (three.js) — chargé à la demande, avec son propre bundle (viewer3d.js).
   Le recto et le verso sont deux faces d'une feuille A4 très mince ; léger balancement tant qu'on n'a pas touché
   à la caméra, puis caméra libre (OrbitControls). Reçoit les pages déjà dessinées : voir raster.js. */
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, BoxGeometry, PlaneGeometry, Group, Vector3, CanvasTexture, SRGBColorSpace,
  LinearMipmapLinearFilter, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const W = 210, H = 297, T = 0.8, GAP = 14;           // feuille A4 en mm ; épaisseur et écart (spread) volontairement un peu exagérés
const FOV = 30;
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e[k] = v; }
  e.append(...kids.filter(Boolean)); return e;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,.34)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
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
  const bClose = btn('x', L.close, () => close());
  root.append(el('div', { class: 'v3d-bar' }, el('strong', { textContent: L.title }), el('span', { class: 'v3d-sp' }), bFlip, bMode, bReset, bClose),
    stage, el('div', { class: 'v3d-hint', textContent: L.hint }), msg);
  document.body.append(root); document.body.classList.add('v3d-open');

  let scene, camera, controls, sheetA, sheetB, pivot, blob, textures = [];
  let mode = 'single', flipped = false, flipFrom = 0, flipTo = 0, flipT = 1, interacted = false, tween = null, spin = 0;

  function init(pages) {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.append(renderer.domElement);
    scene = new Scene();
    camera = new PerspectiveCamera(FOV, 1, 20, 4000);
    controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 120, maxDistance: 1800, screenSpacePanning: true });
    controls.addEventListener('start', () => { interacted = true; tween = null; });

    const tex = c => {
      const t = new CanvasTexture(c.canvas); t.colorSpace = SRGBColorSpace; t.minFilter = LinearMipmapLinearFilter;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); textures.push(t); return t;
    };
    const [tr, tv] = [tex(pages[0]), tex(pages[1] || pages[0])];
    const edge = new MeshStandardMaterial({ color: 0xe8e8e2, roughness: 1 });
    const face = t => new MeshBasicMaterial({ map: t });
    const box = (front, back) => new Mesh(new BoxGeometry(W, H, T), [edge, edge, edge, edge, face(front), face(back)]);
    sheetA = box(tr, tv);            // recto devant, verso derrière
    sheetB = box(tv, tv);            // seconde feuille : le verso, pour le mode « deux pages »
    pivot = new Group(); pivot.add(sheetA, sheetB); scene.add(pivot);
    blob = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = -H / 2 - 14; scene.add(blob);
    setMode('single', true);
    resize(); new ResizeObserver(resize).observe(stage);
    loop();
  }

  const viewFor = m => {
    const width = m === 'spread' ? 2 * W + GAP : W, d = Math.max(H * 1.18, width * 1.1 / (camera.aspect || 1)) / 2 / Math.tan(FOV * Math.PI / 360);
    return { target: new Vector3(0, 0, 0), pos: new Vector3(d * 0.2, d * 0.13, d * 0.97) };      // léger angle de départ (~11° à droite, ~7° en haut)
  };
  function flyTo(v, quick) {
    if (quick) { camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); return; }
    tween = { t: 0, p0: camera.position.clone(), t0: controls.target.clone(), v };
  }
  function resetView() { interacted = false; spin = 0; flyTo(viewFor(mode)); if (mode === 'single' && flipped) flip(); }
  function setMode(m, quick) {
    mode = m; bFlip.disabled = m === 'spread'; bFlip.style.opacity = m === 'spread' ? '.4' : '';
    bMode.querySelector('span').textContent = m === 'spread' ? L.single : L.spread;
    sheetB.visible = m === 'spread';
    sheetA.position.x = m === 'spread' ? -(W + GAP) / 2 : 0; sheetB.position.x = (W + GAP) / 2;
    if (m === 'spread' && flipped) { flipped = false; flipFrom = flipTo = sheetA.rotation.y = 0; flipT = 1; }
    blob.scale.set(m === 'spread' ? 2 * W + GAP + 40 : W + 40, 90, 1);
    interacted = false; flyTo(viewFor(m), quick);
  }
  function flip() { if (mode !== 'single') return; flipped = !flipped; flipFrom = sheetA.rotation.y; flipTo = flipped ? Math.PI : 0; flipT = 0; }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  let last = performance.now();
  function loop(now = performance.now()) {
    if (closed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.6); const k = ease(tween.t);
      camera.position.lerpVectors(tween.p0, tween.v.pos, k); controls.target.lerpVectors(tween.t0, tween.v.target, k);
      if (tween.t >= 1) tween = null;
    }
    if (flipT < 1) { flipT = Math.min(1, flipT + dt / 0.9); sheetA.rotation.y = flipFrom + (flipTo - flipFrom) * ease(flipT); }
    // balancement très léger tant que la caméra n'a pas été touchée ; il revient doucement à plat sinon
    spin += dt;
    const sway = interacted ? 0 : 1;
    pivot.rotation.y += ((Math.sin(spin * 0.7) * 0.07 * sway) - pivot.rotation.y) * Math.min(1, dt * 3);
    pivot.rotation.x += ((Math.sin(spin * 0.5) * 0.025 * sway) - pivot.rotation.x) * Math.min(1, dt * 3);
    controls.update();
    renderer.render(scene, camera);
  }

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    if (renderer) {
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); });
      textures.forEach(t => t.dispose()); controls.dispose(); renderer.dispose(); renderer.forceContextLoss();
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
