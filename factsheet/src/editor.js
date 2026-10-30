/* Panneau d'édition : tout est éditable, mais jamais les tailles / espacements / layout. */
import { h, inline, ico } from './render.js';
import { GRID, THEMES, SECTION_BGS } from './tokens.js';
import { COL_TYPES, IMAGE_RATIOS, LOCALES, newCol, newSub, newSection, uid, moveSection, stepSection } from './state.js';
import { VIZ_TYPES, VIZ_OPTIONS, newViz } from './viz/index.js';

export const PAL_LABELS = { blue: 'Bleu', deep: 'Bleu profond', sky: 'Bleu ciel', lavender: 'Lavande', yellow: 'Jaune', slate: 'Ardoise', steel: 'Acier', white: 'Blanc', tintSky: 'Teinte ciel', tintLav: 'Teinte lavande', tintYellow: 'Teinte jaune', tintGrey: 'Teinte grise' };

/* Lecture + réduction d'une image (PNG conservé pour la transparence des logos) */
export function readImage(file, max = 1600) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      if (/svg/.test(file.type)) return res(fr.result);
      const im = new Image();
      im.onerror = rej;
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(/png|gif|webp/.test(file.type) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}


/* ---------- Formulaires générés depuis la définition d'une dataviz ---------- */
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); const t = ks.reduce((a, k) => (a[k] == null ? (a[k] = {}) : a[k]), o); t[last] = v; };
const SERIES_COLORS = ['sky', 'yellow', 'blue', 'slate', 'steel', 'lavender'];

function parseTable(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return null;
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const cells = lines.map(l => l.split(sep).map(c => c.trim()));
  const num = c => { const n = parseFloat(String(c).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
  let header = null;
  if (cells[0].slice(1).some(c => c !== '' && num(c) === null)) header = cells.shift();
  const nser = Math.max(1, ...cells.map(c => c.length - 1));
  return { header, nser, rows: cells.map(c => ({ label: c[0] || '', v: Array.from({ length: nser }, (_, j) => num(c[j + 1]) ?? 0) })) };
}

/* ---------- Éditeur de texte riche : l'effet est visible dans le champ, le balisage reste interne ----------
   Stockage : **gras**  ~~italique~~  __souligné__  « - » en début de ligne = puce. */
const ESC = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mkToHtml = t => {
  const lines = String(t || '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim());
  let html = '', ul = false;
  for (const l of lines) {
    const m = l.trim().match(/^[-•]\s+(.*)$/);
    if (m && !ul) { html += '<ul>'; ul = true; } else if (!m && ul) { html += '</ul>'; ul = false; }
    html += m ? `<li>${inline(m[1])}</li>` : `<div>${inline(l.trim())}</div>`;
  }
  return (html + (ul ? '</ul>' : '')) || '<div><br></div>';
};
function htmlToMk(root) {
  const lines = []; let cur = [];
  const emit = () => {
    const runs = []; for (const r of cur) { const l = runs[runs.length - 1]; if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += r.t; else runs.push({ ...r }); }
    return runs.filter(r => r.t !== '').map(r => { let t = r.t; if (!t.trim()) return t; if (r.i) t = `~~${t}~~`; if (r.b) t = `**${t}**`; if (r.u) t = `__${t}__`; return t; }).join('');
  };
  const flush = bullet => { const t = emit().trim(); cur = []; if (t) lines.push((bullet ? '- ' : '') + t); };
  const walk = (n, st, bullet) => {
    if (n.nodeType === 3) { cur.push({ t: n.nodeValue.replace(/[ \n]/g, ' '), ...st }); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName, fw = n.style.fontWeight, s = { ...st };
    if (tag === 'BR') { flush(bullet); return; }
    if (tag === 'B' || tag === 'STRONG' || fw === 'bold' || +fw >= 600) s.b = true;
    if (tag === 'I' || tag === 'EM' || n.style.fontStyle === 'italic') s.i = true;
    if (tag === 'U' || /underline/.test(n.style.textDecoration)) s.u = true;
    if (tag === 'UL' || tag === 'OL') { for (const c of n.childNodes) walk(c, s, true); return; }
    const block = tag === 'LI' || tag === 'DIV' || tag === 'P';
    if (block && cur.length) flush(bullet);
    const b2 = bullet || tag === 'LI';
    for (const c of n.childNodes) walk(c, s, b2);
    if (block) flush(b2);
  };
  for (const c of root.childNodes) walk(c, { b: false, i: false, u: false }, false);
  flush(false);
  return lines.join('\n');
}
export function richEditor(value, onChange) {
  const ed = h('div', { class: 're', contentEditable: 'true', spellcheck: 'true', innerHTML: mkToHtml(value) });
  const cmd = c => () => { ed.focus(); document.execCommand(c); onChange(htmlToMk(ed)); sync(); };
  const mk = (label, title, c, style) => { const b = h('button', { type: 'button', class: 'mini', textContent: label, title, style, dataset: { cmd: c }, onmousedown: e => e.preventDefault(), onclick: cmd(c) }); return b; };
  const bar = h('div', { class: 'row fmt' }, mk('B', 'Gras', 'bold', { fontWeight: 800 }), mk('I', 'Italique', 'italic', { fontStyle: 'italic' }), mk('U', 'Souligné', 'underline', { textDecoration: 'underline' }), (() => { const b = mk('', 'Liste à puces', 'insertUnorderedList'); b.append(ico('list')); return b; })());
  const sync = () => bar.querySelectorAll('[data-cmd]').forEach(b => { let on = false; try { on = document.queryCommandState(b.dataset.cmd); } catch (e) {} b.classList.toggle('on', on); });
  ed.addEventListener('input', () => onChange(htmlToMk(ed)));
  ed.addEventListener('keyup', sync); ed.addEventListener('mouseup', sync); ed.addEventListener('focus', sync);
  ed.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
  return h('div', { class: 're-wrap' }, bar, ed);
}

export function buildFields(spec, obj, ctx, palOpts, h2) {
  const out = [];
  const live = fn => e => { fn(e.target); ctx.changed(); };
  for (const f of spec) {
    if (f.t === 'text') out.push(h2('label', { class: 'f' }, f.label, h2('input', { type: 'text', value: getP(obj, f.k) ?? '', oninput: live(t => setP(obj, f.k, t.value)) })));
    else if (f.t === 'area') out.push(h2('div', { class: 'f' }, h2('div', { class: 'hint', textContent: f.label }), richEditor(getP(obj, f.k) ?? '', v => { setP(obj, f.k, v); ctx.changed(); })));
    else if (f.t === 'number') out.push(h2('label', { class: 'f' }, f.label, h2('input', { type: 'number', value: getP(obj, f.k) ?? 0, min: f.min, max: f.max, step: f.step || 1, oninput: live(t => { const v = parseFloat(t.value); if (!isNaN(v)) setP(obj, f.k, v); }) })));
    else if (f.t === 'bool') out.push(h2('label', { class: 'row', style: { marginBottom: '8px' } }, h2('input', { type: 'checkbox', checked: !!getP(obj, f.k), onchange: live(t => setP(obj, f.k, t.checked)) }), f.label));
    else if (f.t === 'select' || f.t === 'color') {
      const opts = f.t === 'color' ? palOpts : f.options;
      const sel = h2('select', { onchange: live(t => setP(obj, f.k, t.value)) }, Object.entries(opts).map(([v, l]) => h2('option', { value: v, textContent: l })));
      sel.value = getP(obj, f.k) ?? Object.keys(opts)[0];
      out.push(h2('label', { class: 'f' }, f.label, sel));
    } else if (f.t === 'list') {
      const arr = obj[f.k] || (obj[f.k] = []);
      const box = h2('div', {}, h2('div', { class: 'hint', textContent: f.label }));
      arr.forEach((it, i) => {
        const mv = d => () => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; ctx.restructure(); };
        box.append(h2('div', { class: 'col-card', dataset: { path: `${f.k}.${i}` } },
          h2('div', { class: 'chd' }, h2('span', { textContent: `#${i + 1}` }), h2('span', { class: 'row' },
            h2('button', { type: 'button', class: 'mini', onclick: mv(-1) }, ico('arrow-up')), h2('button', { type: 'button', class: 'mini', onclick: mv(1) }, ico('arrow-down')),
            arr.length > (f.min || 1) ? h2('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: () => { arr.splice(i, 1); ctx.restructure(); } }, ico('x')) : null)),
          buildFields(f.fields, it, ctx, palOpts, h2)));
      });
      if (arr.length < (f.max || 12)) box.append(h2('button', { type: 'button', textContent: '+ Ajouter', onclick: () => { arr.push(f.item(arr.length)); ctx.restructure(); } }));
      out.push(box);
    } else if (f.t === 'table') out.push(tableField(f, obj, ctx, palOpts, h2));
  }
  return out;
}

function tableField(f, obj, ctx, palOpts, h2) {
  const rows = obj[f.k], series = obj[f.series];
  const fix = () => rows.forEach(r => { r.v = Array.from({ length: series.length }, (_, j) => +(r.v || [])[j] || 0); });
  const box = h2('div', {}, h2('div', { class: 'hint', textContent: f.label }));
  series.forEach((sr, j) => {
    const cs = h2('select', { onchange: e => { sr.color = e.target.value; ctx.changed(); } }, Object.entries(palOpts).map(([v, l]) => h2('option', { value: v, textContent: l })));
    cs.value = sr.color;
    box.append(h2('div', { class: 'row', style: { marginBottom: '6px' } }, cs,
      h2('input', { type: 'text', value: sr.name || '', placeholder: `Série ${j + 1}`, oninput: e => { sr.name = e.target.value; ctx.changed(); } }),
      series.length > 1 ? h2('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: () => { series.splice(j, 1); fix(); ctx.restructure(); } }, ico('x')) : null));
  });
  if (series.length < (f.maxSeries || 4)) box.append(h2('button', { type: 'button', textContent: '+ Série', onclick: () => { series.push({ name: `Série ${series.length + 1}`, color: SERIES_COLORS[series.length % SERIES_COLORS.length] }); fix(); ctx.restructure(); } }));
  const grid = h2('div', { class: 'tgrid', style: { gridTemplateColumns: `1fr ${series.map(() => '58px').join(' ')} 24px` } });
  grid.append(h2('span', { class: 'hint', textContent: 'Libellé' }), ...series.map(sr => h2('span', { class: 'hint', textContent: sr.name || '—' })), h2('span'));
  rows.forEach((r, i) => {
    grid.append(h2('input', { type: 'text', value: r.label || '', oninput: e => { r.label = e.target.value; ctx.changed(); } }),
      ...series.map((_, j) => h2('input', { type: 'text', inputMode: 'decimal', value: (r.v || [])[j] ?? 0, oninput: e => { const n = parseFloat(String(e.target.value).replace(',', '.')); (r.v || (r.v = []))[j] = isNaN(n) ? 0 : n; ctx.changed(); } })),
      rows.length > 1 ? h2('button', { type: 'button', class: 'mini danger', title: 'Supprimer', onclick: () => { rows.splice(i, 1); ctx.restructure(); } }, ico('x')) : h2('span'));
  });
  box.append(grid, h2('button', { type: 'button', textContent: '+ Ligne', onclick: () => { rows.push({ label: '', v: series.map(() => 0) }); ctx.restructure(); } }));
  const ta = h2('textarea', { placeholder: 'Collez un tableau depuis Excel ou un CSV : libellé ⇥ série 1 ⇥ série 2…  (la 1re ligne peut contenir les noms de séries)', style: { minHeight: '56px' } });
  box.append(h2('details', { open: false }, h2('summary', { textContent: 'Coller un tableau' }), h2('div', { class: 'body' }, ta,
    h2('button', { type: 'button', textContent: 'Remplacer les données', onclick: () => {
      const p = parseTable(ta.value); if (!p) return;
      const max = f.maxSeries || 4, n = Math.min(p.nser, max);
      const ns = Array.from({ length: n }, (_, j) => ({ name: (p.header && p.header[j + 1]) || (series[j] && series[j].name) || `Série ${j + 1}`, color: (series[j] && series[j].color) || SERIES_COLORS[j % SERIES_COLORS.length] }));
      series.splice(0, series.length, ...ns);
      rows.splice(0, rows.length, ...p.rows.map(r => ({ label: r.label, v: r.v.slice(0, n) })));
      ctx.restructure();
    } }))));
  return box;
}

export const paletteOptions = doc => { const th = THEMES[doc.theme] || Object.values(THEMES)[0]; return Object.fromEntries(Object.keys(th.colors).map(k => [k, PAL_LABELS[k] || k])); };

