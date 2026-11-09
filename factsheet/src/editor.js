/* Panneau d'édition : tout est éditable, mais jamais les tailles / espacements / layout. */
import { h, ico } from './render.js';
import { inlineMk, typoOf } from './viz/util.js';
import { t } from './i18n.js';
import { helpBtn } from './help.js';
import { colorSelect } from './colorselect.js';
import { iconSelect } from './iconselect.js';
import { PSTYLES, GROUPS, HASH_KEYS, parseLine, prefixOf, styleOf, specOf, hasAdv } from './textstyles.js';
import { advPanel } from './textadv.js';
import { FONT, TYPE } from './tokens.js';
import { GRID, THEMES, paletteKeys, sectionBgs, colorLabel } from './tokens.js';
import { COL_TYPES, IMAGE_RATIOS, LOCALES, newCol, newSub, newSection, uid, moveSection, stepSection } from './state.js';
import { VIZ_TYPES, VIZ_OPTIONS, newViz } from './viz/index.js';

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
        c.width = Math.round(im.width * k);
        c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(/png|gif|webp/.test(file.type) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/** Champ texte qui accepte les retours à la ligne (Entrée) et grandit avec son contenu : titres, légendes, textes de cartes… */
export function multiline(h2, value, onInput, placeholder = '') {
  const ta = h2('textarea', {
    class: 'ml',
    rows: 1,
    value: value ?? '',
    placeholder,
    spellcheck: true,
    oninput: (e) => {
      fit();
      onInput(e);
    },
  });
  const fit = () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 2 + 'px';
  };
  requestAnimationFrame(fit);
  new ResizeObserver(fit).observe(ta);
  return ta;
}

/* ---------- Formulaires générés depuis la définition d'une dataviz ---------- */
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => {
  const ks = p.split('.'),
    last = ks.pop();
  const t = ks.reduce((a, k) => (a[k] == null ? (a[k] = {}) : a[k]), o);
  t[last] = v;
};
const SERIES_COLORS = ['sky', 'yellow', 'blue', 'slate', 'grey'];

function parseTable(text) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => l.trim());
  if (!lines.length) return null;
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const cells = lines.map((l) => l.split(sep).map((c) => c.trim()));
  const num = (c) => {
    const n = parseFloat(String(c).replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };
  let header = null;
  if (cells[0].slice(1).some((c) => c !== '' && num(c) === null)) header = cells.shift();
  const nser = Math.max(1, ...cells.map((c) => c.length - 1));
  return { header, nser, rows: cells.map((c) => ({ label: c[0] || '', v: Array.from({ length: nser }, (_, j) => num(c[j + 1]) ?? 0) })) };
}

/* ---------- Éditeur de texte riche : l'effet est visible dans le champ, le balisage reste interne ----------
   Stockage : **gras**  ~~italique~~  __souligné__  « - » en début de ligne = puce. */
const ESC = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** ty : typographie automatique du document (le champ montre le texte comme l'aperçu) */
const mkToHtml = (t, ty) => {
  const inline = (x) => inlineMk(x, true, ty);
  const lines = String(t || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim());
  let html = '',
    list = ''; // list : '' | 'ul' | 'ol'
  const close = () => {
    if (list) {
      html += `</${list}>`;
      list = '';
    }
  };
  for (const l of lines) {
    const hd = parseLine(l.trim());
    if (hd.key) {
      close();
      const P = styleOf(hd.key);
      html += P.hash ? `<h${P.hash}>${inline(hd.text)}</h${P.hash}>` : `<div data-st="${P.k}">${inline(hd.text)}</div>`;
      continue;
    }
    const m = l.trim().match(/^[-•]\s+(.*)$/),
      n = l.trim().match(/^(\d{1,2})\.\s+(.*)$/),
      kind = m ? 'ul' : n ? 'ol' : '';
    if (kind !== list) {
      close();
      if (kind) {
        html += `<${kind}>`;
        list = kind;
      }
    }
    html += kind ? `<li>${inline((m || n)[kind === 'ul' ? 1 : 2])}</li>` : `<div>${inline(l.trim())}</div>`;
  }
  close();
  return html || '<div><br></div>';
};
function htmlToMk(root) {
  const lines = [];
  let cur = [];
  const keyOf = (r) => [r.b, r.i, r.u, r.sup, r.sub, r.s, r.c, r.h, r.up, r.sc, r.a].join('|');
  const emit = () => {
    const runs = [];
    for (const r of cur) {
      const l = runs[runs.length - 1];
      if (l && keyOf(l) === keyOf(r)) l.t += r.t;
      else runs.push({ ...r });
    }
    return runs
      .filter((r) => r.t !== '')
      .map((r) => {
        let t = r.t;
        if (!t.trim()) return t;
        if (r.sub) t = `,,${t},,`;
        if (r.sup) t = `^^${t}^^`;
        if (r.i) t = `~~${t}~~`;
        if (r.b) t = `**${t}**`;
        if (r.u) t = `__${t}__`;
        if (r.s) t = `{s|${t}}`;
        if (r.up) t = `{up|${t}}`;
        if (r.sc) t = `{sc|${t}}`;
        if (r.a) t = `{a:${r.a}|${t}}`;
        if (r.h) t = `{h:${r.h}|${t}}`;
        if (r.c) t = `{c:${r.c}|${t}}`;
        return t;
      })
      .join('');
  };
  const flush = (bullet, pre = '') => {
    const t = emit().trim();
    cur = [];
    if (t) lines.push((typeof bullet === 'string' ? bullet : bullet ? '- ' : pre) + t);
  };
  const walk = (n, st, bullet) => {
    if (n.nodeType === 3) {
      cur.push({ t: n.nodeValue.replace(/[ \n]/g, ' '), ...st });
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName,
      fw = n.style.fontWeight,
      s = { ...st };
    if (tag === 'BR') {
      cur.push({ t: '\u2028', ...st });
      return;
    } // retour à la ligne (Maj + Entrée) : reste dans le paragraphe
    if (tag === 'B' || tag === 'STRONG' || fw === 'bold' || +fw >= 600) s.b = true;
    if (tag === 'I' || tag === 'EM' || n.style.fontStyle === 'italic') s.i = true;
    if (tag === 'SUP') s.sup = true;
    if (tag === 'SUB') s.sub = true;
    if (tag === 'U' || /underline/.test(n.style.textDecoration)) s.u = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(n.style.textDecoration)) s.s = true;
    const f = tag === 'SPAN' && n.dataset.f; // couleur, surlignage, capitales, petites capitales, lien (voir inlineMk)
    if (f) {
      const [k, ...v] = f.split(':'),
        val = v.join(':');
      if (k === 'c' || k === 'h' || k === 'a') s[k] = val;
      else if (k === 'up' || k === 'sc') s[k] = true;
    }
    if (tag === 'UL') {
      for (const c of n.childNodes) walk(c, s, true);
      return;
    }
    if (tag === 'OL') {
      let k = 0;
      for (const c of n.childNodes) walk(c, s, c.tagName === 'LI' ? `${++k}. ` : true);
      return;
    }
    if (tag === 'DIV' && n.dataset.st) {
      if (cur.length) flush(bullet);
      for (const c of n.childNodes) walk(c, s, bullet);
      flush(bullet, prefixOf(n.dataset.st));
      return;
    }
    if (/^H[1-5]$/.test(tag)) {
      if (cur.length) flush(bullet);
      for (const c of n.childNodes) walk(c, s, bullet);
      flush(bullet, '#'.repeat(+tag[1]) + ' ');
      return;
    }
    const block = tag === 'LI' || tag === 'DIV' || tag === 'P';
    if (block && cur.length) flush(bullet);
    const b2 = bullet || tag === 'LI';
    for (const c of n.childNodes) walk(c, s, b2);
    if (block) flush(b2);
  };
  for (const c of root.childNodes)
    walk(c, { b: false, i: false, u: false, sup: false, sub: false, s: false, c: '', h: '', up: false, sc: false, a: '' }, false);
  flush(false);
  return lines.join('\n');
}
/* style d'aperçu d'une mise en forme dans le champ de saisie */
const fmtStyle = (f) => {
  const [k, ...v] = f.split(':'),
    val = v.join(':');
  return k === 'c'
    ? { color: `var(--c-${val})` }
    : k === 'h'
      ? { background: `var(--c-${val})` }
      : k === 'up'
        ? { textTransform: 'uppercase' }
        : k === 'sc'
          ? { fontVariantCaps: 'small-caps' }
          : {};
};
let galleryOpen = false,
  moreOpen = false; // la galerie de styles reste ouverte d'un éditeur à l'autre (le temps de la session)
export function richEditor(value, onChange, opts = {}) {
  const ed = h('div', { class: 're', contentEditable: 'true', spellcheck: 'true', innerHTML: mkToHtml(value, opts.typo) });
  const full = opts.bullets !== false;
  const cmd = (c) => () => {
    ed.focus();
    document.execCommand(c);
    onChange(htmlToMk(ed));
    sync();
  };
  const mk = (label, title, c, style) => {
    const b = h('button', {
      type: 'button',
      class: 'mini',
      textContent: label,
      title,
      style,
      dataset: { cmd: c },
      onmousedown: (e) => e.preventDefault(),
      onclick: cmd(c),
    });
    return b;
  };
  let saved = null;
  const keep = () => {
    const sl = window.getSelection();
    if (sl.rangeCount && ed.contains(sl.anchorNode)) saved = sl.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    ed.focus();
    if (saved) {
      const sl = window.getSelection();
      sl.removeAllRanges();
      sl.addRange(saved);
    }
  };
  /* style d'un ou plusieurs paragraphes : titres 1–5 par formatBlock (H1–H5), les autres par data-st sur une <div> */
  const applyStyle = (key) => {
    restore();
    const P = styleOf(key);
    document.execCommand('formatBlock', false, P.hash ? 'H' + P.hash : 'DIV');
    const sl = window.getSelection(),
      r = sl.rangeCount && sl.getRangeAt(0);
    if (r)
      [...ed.children]
        .filter((c) => r.intersectsNode(c))
        .forEach((c) => {
          if (P.hash || P.k === 'body') delete c.dataset.st;
          else if (c.tagName === 'DIV') c.dataset.st = P.k;
        });
    keep();
    onChange(htmlToMk(ed));
    sync();
  };
  const currentStyle = () => {
    const sl = window.getSelection();
    let n = sl.rangeCount ? sl.anchorNode : null;
    if (!n || !ed.contains(n)) return 'body';
    while (n && n.parentNode !== ed) n = n.parentNode;
    if (!n || n === ed || n.nodeType !== 1) return 'body';
    if (/^H[1-5]$/.test(n.tagName)) return HASH_KEYS[+n.tagName[1] - 1];
    return (n.dataset && n.dataset.st) || 'body';
  };
  const bar = h(
    'div',
    { class: 'row fmt' },
    mk('B', 'Gras', 'bold', { fontWeight: 800 }),
    mk('I', 'Italique', 'italic', { fontStyle: 'italic' }),
    mk('U', 'Souligné', 'underline', { textDecoration: 'underline' }),
    mk('x²', 'Exposant', 'superscript'),
    mk('x₂', 'Indice', 'subscript'),
    full
      ? (() => {
          const b = mk('', 'Liste à puces', 'insertUnorderedList');
          b.append(ico('list'));
          return b;
        })()
      : null,
  );
  /* sans galerie : une liste déroulante groupée ; avec galerie : un bouton qui l'ouvre dans la carte */
  const styleSel =
    full && !opts.gallery
      ? h(
          'select',
          {
            class: 're-style',
            title: t('Style de paragraphe'),
            'aria-label': t('Style de paragraphe'),
            onmousedown: keep,
            onchange: (e) => applyStyle(e.target.value),
          },
          GROUPS.map((g) =>
            h(
              'optgroup',
              { label: t(g) },
              PSTYLES.filter((p) => p.g === g).map((p) => h('option', { value: p.k, textContent: t(p.n) })),
            ),
          ),
        )
      : null;
  let gal = null,
    galBtn = null,
    pop = null,
    burger = null;
  const tile = (p) => {
    const ty = TYPE[p.type];
    return h(
      'button',
      {
        type: 'button',
        class: 're-tile',
        dataset: { k: p.k },
        title: `${t(p.n)} — ${specOf(p.k)}`,
        onmousedown: (e) => {
          e.preventDefault();
          keep();
        },
        onclick: () => applyStyle(p.k),
      },
      h('span', {
        class: 're-aa',
        style: {
          fontFamily: FONT[ty.family],
          fontWeight: ty.weight,
          fontStyle: p.italic ? 'italic' : 'normal',
          textTransform: p.upper ? 'uppercase' : 'none',
        },
        textContent: p.upper ? 'AB' : 'Aa',
      }),
      h('span', { class: 're-tt' }, h('b', { textContent: t(p.n) }), h('i', { textContent: specOf(p.k) })),
    );
  };
  if (full && opts.gallery) {
    galBtn = h(
      'button',
      {
        type: 'button',
        class: 're-gbtn',
        'aria-expanded': String(galleryOpen),
        title: t('Styles de paragraphe'),
        onmousedown: (e) => {
          e.preventDefault();
          keep();
        },
        onclick: () => {
          galleryOpen = !galleryOpen;
          gal.hidden = !galleryOpen;
          galBtn.setAttribute('aria-expanded', String(galleryOpen));
        },
      },
      h('span', { class: 're-gname' }),
      ico('chevron-down'),
    );
    gal = h(
      'div',
      { class: 're-gal', hidden: !galleryOpen },
      GROUPS.flatMap((g) => [h('div', { class: 're-gg', textContent: t(g) }), ...PSTYLES.filter((p) => p.g === g).map(tile)]),
    );
    bar.prepend(galBtn);
  }
  /* burger : options avancées du bloc (interlignage, tracking, kerning…) */
  if (opts.adv) {
    const rerender = () => {
      const n = advPanel(
        opts.adv,
        () => {
          burger.classList.toggle('dot', hasAdv(opts.adv));
          opts.advChange && opts.advChange();
        },
        rerender,
      );
      pop.replaceWith(n);
      pop = n;
    };
    pop = advPanel(
      opts.adv,
      () => {
        burger.classList.toggle('dot', hasAdv(opts.adv));
        opts.advChange && opts.advChange();
      },
      rerender,
    );
    pop.hidden = true;
    burger = h(
      'button',
      {
        type: 'button',
        class: 'mini re-burger' + (hasAdv(opts.adv) ? ' dot' : ''),
        title: t('Options avancées'),
        'aria-label': t('Options avancées'),
        'aria-expanded': 'false',
        onmousedown: (e) => e.preventDefault(),
        onclick: () => {
          pop.hidden = !pop.hidden;
          burger.setAttribute('aria-expanded', String(!pop.hidden));
          burger.classList.toggle('on', !pop.hidden);
        },
      },
      ico('menu-2'),
    );
    bar.append(burger);
  }
  /* mise en forme en ligne : liste numérotée, barré, couleur, surlignage, capitales, petites capitales, lien, appel de note (rangée repliable « … ») */
  let inl = null,
    pal = null,
    moreBtn = null,
    palMode = '',
    count = null;
  const textNodes = (r) => {
    const out = [],
      w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (r.intersectsNode(n) && n.nodeValue) out.push(n);
    return out;
  };
  const unwrap = (type, r) => {
    [...ed.querySelectorAll('span[data-f]')]
      .filter((e) => (e.dataset.f === type || e.dataset.f.startsWith(type + ':')) && r.intersectsNode(e))
      .forEach((e) => e.replaceWith(...e.childNodes));
  };
  const wrapSel = (type, val, toggle) => {
    restore();
    const sl = window.getSelection();
    if (!sl.rangeCount || sl.isCollapsed) return;
    const r = sl.getRangeAt(0),
      had = [...ed.querySelectorAll('span[data-f]')].some(
        (e) => (e.dataset.f === type || e.dataset.f.startsWith(type + ':')) && r.intersectsNode(e),
      );
    const nodes = textNodes(r).map((n) => ({
      n,
      a: n === r.startContainer ? r.startOffset : 0,
      b: n === r.endContainer ? r.endOffset : n.nodeValue.length,
    }));
    unwrap(type, r);
    if (!(toggle && had) && val !== null) {
      const f = val ? `${type}:${val}` : type;
      let first = null,
        last = null;
      for (const { n, a, b } of nodes) {
        if (!n.parentNode || a >= b) continue;
        const mid = n.splitText(a);
        mid.splitText(b - a);
        const sp = h('span', { dataset: { f }, class: type === 'a' ? 'lnk' : '', style: fmtStyle(f) });
        mid.replaceWith(sp);
        sp.append(mid);
        first ||= sp;
        last = sp;
      }
      if (first) {
        const nr = document.createRange();
        nr.setStartBefore(first);
        nr.setEndAfter(last);
        sl.removeAllRanges();
        sl.addRange(nr);
        keep();
      }
    }
    ed.normalize();
    onChange(htmlToMk(ed));
    sync();
  };
  if (full) {
    const ob = mk('', t('Liste numérotée'), 'insertOrderedList');
    ob.append(ico('list-numbers'));
    bar.insertBefore(ob, bar.querySelector('[data-cmd=insertUnorderedList]').nextSibling);
    const ib = (icon, title, fn, cmd) =>
      h(
        'button',
        {
          type: 'button',
          class: 'mini',
          title: t(title),
          'aria-label': t(title),
          dataset: cmd ? { cmd } : {},
          onmousedown: (e) => {
            e.preventDefault();
            keep();
          },
          onclick: fn,
        },
        typeof icon === 'string' && icon.startsWith('ti-') ? ico(icon.slice(3)) : icon,
      );
    const showPal = (mode) => {
      palMode = palMode === mode ? '' : mode;
      pal.hidden = !palMode;
      pal.dataset.mode = palMode;
    };
    const swatch = (k, label) =>
      h(
        'button',
        {
          type: 'button',
          class: 're-sw' + (k ? '' : ' none'),
          title: label,
          'aria-label': label,
          style: k ? { background: `var(--c-${k})` } : {},
          onmousedown: (e) => {
            e.preventDefault();
            keep();
          },
          onclick: () => {
            wrapSel(palMode, k || null);
            pal.hidden = true;
            palMode = '';
          },
        },
        k ? null : ico('x'),
      );
    pal = h(
      'div',
      { class: 're-pal', hidden: true },
      swatch('', t('Aucune')),
      (opts.palette || ['blue', 'sky', 'yellow', 'slate', 'grey', 'white']).map((k) => swatch(k, k)),
    );
    inl = h(
      'div',
      { class: 'row fmt re-more', hidden: !moreOpen },
      ib('ti-palette', 'Couleur du texte', () => showPal('c')),
      ib('ti-highlight', 'Surlignage', () => showPal('h')),
      ib('ti-strikethrough', 'Barré', cmd('strikeThrough'), 'strikeThrough'),
      ib(h('span', { class: 're-sc', textContent: 'Aᴀ' }), 'Petites capitales', () => wrapSel('sc', '', true)),
      ib(h('span', { textContent: 'AA' }), 'Capitales', () => wrapSel('up', '', true)),
      ib('ti-link', 'Lien', () => {
        restore();
        const cur = (window.getSelection().anchorNode || {}).parentElement;
        const have = cur && cur.closest && cur.closest('span[data-f^="a:"]');
        const url = window.prompt(t('Adresse du lien (https://…) — vide pour retirer'), have ? have.dataset.f.slice(2) : 'https://');
        if (url === null) return;
        wrapSel('a', /^(https?:\/\/|mailto:)\S+/i.test(url.trim()) && url.trim() !== 'https://' ? url.trim() : null);
      }),
      ib('ti-asterisk', 'Appel de note (le texte de la note suit entre accolades)', () => {
        restore();
        document.execCommand('insertText', false, '{n|}');
        const sl = window.getSelection();
        if (sl.modify) sl.modify('move', 'backward', 'character');
        onChange(htmlToMk(ed));
      }),
    );
    moreBtn = h(
      'button',
      {
        type: 'button',
        class: 'mini',
        title: t('Plus de mise en forme'),
        'aria-label': t('Plus de mise en forme'),
        'aria-expanded': String(moreOpen),
        onmousedown: (e) => e.preventDefault(),
        onclick: () => {
          moreOpen = !moreOpen;
          inl.hidden = !moreOpen;
          moreBtn.setAttribute('aria-expanded', String(moreOpen));
          moreBtn.classList.toggle('on', moreOpen);
        },
      },
      ico('dots'),
    );
    moreBtn.classList.toggle('on', moreOpen);
    bar.append(moreBtn);
    if (burger) bar.append(burger); // le burger reste le dernier bouton
    count = h('span', { class: 're-count' });
  }
  const sync = () => {
    [bar, inl].filter(Boolean).forEach((r) =>
      r.querySelectorAll('[data-cmd]').forEach((b) => {
        let on = false;
        try {
          on = document.queryCommandState(b.dataset.cmd);
        } catch (e) {}
        b.classList.toggle('on', on);
      }),
    );
    const k = currentStyle();
    if (styleSel) styleSel.value = k;
    if (count) {
      const tx = (ed.innerText || '').replace(/\u2028/g, ' ').trim();
      count.textContent = `${tx.length} ${t('caractères')} · ${tx ? tx.split(/\s+/).length : 0} ${t('mots')}`;
    }
    if (galBtn) {
      galBtn.querySelector('.re-gname').textContent = t(styleOf(k).n);
      gal.querySelectorAll('.re-tile').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
    }
  };
  ed.addEventListener('input', () => {
    onChange(htmlToMk(ed));
    sync();
  });
  ed.addEventListener('keyup', sync);
  ed.addEventListener('mouseup', sync);
  ed.addEventListener('focus', sync);
  ed.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand(
      'insertText',
      false,
      (e.clipboardData || window.clipboardData)
        .getData('text/plain')
        .replace(/\u000B/g, '\u2028')
        .replace(/[\u0000-\u0008\u000C\u000E-\u001F]/g, ''),
    );
  });
  if (styleSel) bar.prepend(styleSel);
  if (!full) ed.classList.add('re-line');
  if (galBtn || count) sync();
  return h(
    'div',
    { class: 're-wrap' },
    bar,
    inl,
    pal,
    gal,
    pop,
    ed,
    full ? h('div', { class: 'hint' }, t('Entrée = nouveau paragraphe · Maj + Entrée = retour à la ligne'), ' · ', count) : null,
  );
}

/** typographie du document d'un ctx (les panneaux de l'éditeur) ; aucune hors de l'éditeur (Labo) */
const ctxTypo = (ctx) => (ctx && ctx.getDoc ? typoOf(ctx.getDoc()) : undefined);
export function buildFields(spec, obj, ctx, palOpts, h2, root = obj) {
  const out = [];
  const live = (fn) => (e) => {
    fn(e.target);
    ctx.changed();
  };
  for (const f of spec) {
    if (f.t === 'node') out.push(f.build(root, ctx));
    else if ((f.t === 'text' || f.t === 'lines') && f.rich)
      out.push(
        h2(
          'div',
          { class: 'f' },
          h2('div', { class: 'hint' }, f.label, helpBtn(f.label)),
          richEditor(
            getP(obj, f.k) ?? '',
            (v) => {
              setP(obj, f.k, v);
              ctx.changed();
            },
            { bullets: false, typo: ctxTypo(ctx) },
          ),
        ),
      );
    else if (f.t === 'text')
      out.push(
        h2(
          'label',
          { class: 'f' },
          f.label,
          helpBtn(f.label),
          f.k === 'suffix' || f.single
            ? h2('input', { type: 'text', value: getP(obj, f.k) ?? '', oninput: live((t) => setP(obj, f.k, t.value)) })
            : multiline(h2, getP(obj, f.k), (e) => {
                setP(obj, f.k, e.target.value);
                ctx.changed();
              }),
        ),
      );
    else if (f.t === 'area')
      out.push(
        h2(
          'div',
          { class: 'f' },
          h2('div', { class: 'hint', textContent: f.label }),
          richEditor(
            getP(obj, f.k) ?? '',
            (v) => {
              setP(obj, f.k, v);
              ctx.changed();
            },
            { typo: ctxTypo(ctx) },
          ),
        ),
      );
    else if (f.t === 'lines')
      out.push(
        h2(
          'label',
          { class: 'f' },
          f.label,
          h2('textarea', { value: getP(obj, f.k) ?? '', style: { minHeight: '64px' }, oninput: live((t) => setP(obj, f.k, t.value)) }),
        ),
      );
    else if (f.t === 'number')
      out.push(
        h2(
          'label',
          { class: 'f' },
          f.label,
          helpBtn(f.label),
          h2('input', {
            type: 'number',
            value: getP(obj, f.k) ?? 0,
            min: f.min,
            max: f.max,
            step: f.step || 1,
            oninput: live((t) => {
              const v = parseFloat(t.value);
              if (!isNaN(v)) setP(obj, f.k, v);
            }),
          }),
        ),
      );
    else if (f.t === 'ctext') {
      /* petit éditeur de texte à niveaux : H1 (sans préfixe), H2 (« ## »), Texte (« ### ») appliqués aux lignes sélectionnées */
      const ta = h2('textarea', {
        value: getP(obj, f.k) ?? '',
        style: { minHeight: '84px' },
        oninput: live((t) => setP(obj, f.k, t.value)),
      });
      const level = (n) => () => {
        const v = ta.value,
          a = ta.selectionStart,
          b = ta.selectionEnd,
          s0 = v.lastIndexOf('\n', a - 1) + 1;
        let e0 = v.indexOf('\n', b);
        if (e0 < 0) e0 = v.length;
        const out = v
          .slice(s0, e0)
          .split('\n')
          .map((l) => l.replace(/^#{1,3} ?/, ''))
          .map((l) => (n === 1 ? l : '#'.repeat(n) + ' ' + l))
          .join('\n');
        ta.value = v.slice(0, s0) + out + v.slice(e0);
        setP(obj, f.k, ta.value);
        ctx.changed();
        ta.focus();
        ta.setSelectionRange(s0, s0 + out.length);
      };
      const tb = (label, title, n) =>
        h2('button', {
          type: 'button',
          class: 'mini',
          textContent: label,
          title,
          onmousedown: (e) => e.preventDefault(),
          onclick: level(n),
        });
      out.push(
        h2(
          'div',
          { class: 'f' },
          h2('div', { class: 'hint' }, f.label, helpBtn(f.label)),
          h2(
            'div',
            { class: 'row fmt' },
            tb('H1', t('Titre 1 (grand)'), 1),
            tb('H2', t('Titre 2 (moyen)'), 2),
            tb('Aa', t('Texte courant'), 3),
          ),
          ta,
          h2('div', {
            class: 'hint',
            textContent: t(
              'Une ligne par paragraphe. {total} = somme des valeurs. Le texte passe à la ligne et ne dépasse jamais l’anneau.',
            ),
          }),
        ),
      );
    } else if (f.t === 'bool')
      out.push(
        h2(
          'label',
          { class: 'row', style: { marginBottom: '8px' } },
          h2('input', { type: 'checkbox', checked: !!getP(obj, f.k), onchange: live((t) => setP(obj, f.k, t.checked)) }),
          f.label,
          helpBtn(f.label),
        ),
      );
    else if (f.t === 'color')
      out.push(
        h2(
          'div',
          { class: 'f' },
          h2('div', { class: 'hint' }, f.label, helpBtn(f.label)),
          colorSelect({
            value: getP(obj, f.k) ?? 'blue',
            options: palOpts,
            text: true,
            onChange: (v) => {
              setP(obj, f.k, v);
              ctx.changed();
            },
          }),
        ),
      );
    else if (f.t === 'select' && f.icons) {
      const opts = typeof f.options === 'function' ? f.options(root) : f.options;
      out.push(
        h2(
          'div',
          { class: 'f' },
          h2('div', { class: 'hint' }, f.label, helpBtn(f.label)),
          iconSelect({
            value: getP(obj, f.k) ?? Object.keys(opts)[0],
            options: opts,
            text: true,
            root,
            refresh: () => ctx.restructure(),
            onChange: (v) => {
              setP(obj, f.k, v);
              ctx.changed();
            },
          }),
        ),
      );
    } else if (f.t === 'select') {
      const opts = typeof f.options === 'function' ? f.options(root) : f.options;
      const sel = h2(
        'select',
        { onchange: live((t) => setP(obj, f.k, t.value)) },
        Object.entries(opts).map(([v, l]) => h2('option', { value: v, textContent: l })),
      );
      sel.value = getP(obj, f.k) ?? Object.keys(opts)[0];
      out.push(h2('label', { class: 'f' }, f.label, helpBtn(f.label), sel));
    } else if (f.t === 'list') {
      const arr = obj[f.k] || (obj[f.k] = []);
      const box = h2('div', {}, h2('div', { class: 'hint', textContent: f.label }));
      arr.forEach((it, i) => {
        const mv = (d) => () => {
          const j = i + d;
          if (j < 0 || j >= arr.length) return;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          ctx.restructure();
        };
        box.append(
          h2(
            'div',
            { class: 'col-card', dataset: { path: `${f.k}.${i}` } },
            h2(
              'div',
              { class: 'chd' },
              h2('span', { textContent: `#${i + 1}` }),
              h2(
                'span',
                { class: 'row' },
                h2('button', { type: 'button', class: 'mini', onclick: mv(-1) }, ico('arrow-up')),
                h2('button', { type: 'button', class: 'mini', onclick: mv(1) }, ico('arrow-down')),
                arr.length > (f.min ?? 1)
                  ? h2(
                      'button',
                      {
                        type: 'button',
                        class: 'mini danger',
                        title: 'Supprimer',
                        onclick: () => {
                          arr.splice(i, 1);
                          ctx.restructure();
                        },
                      },
                      ico('x'),
                    )
                  : null,
              ),
            ),
            buildFields(f.fields, it, ctx, palOpts, h2, root),
          ),
        );
      });
      if (arr.length < (f.max || 12))
        box.append(
          h2('button', {
            type: 'button',
            textContent: '+ Ajouter',
            onclick: () => {
              arr.push(f.item(arr.length));
              ctx.restructure();
            },
          }),
        );
      out.push(box);
    } else if (f.t === 'table') out.push(tableField(f, obj, ctx, palOpts, h2));
  }
  return out;
}

function tableField(f, obj, ctx, palOpts, h2) {
  const rows = obj[f.k],
    series = obj[f.series];
  const fix = () =>
    rows.forEach((r) => {
      r.v = Array.from({ length: series.length }, (_, j) => +(r.v || [])[j] || 0);
    });
  const box = h2('div', {}, h2('div', { class: 'hint', textContent: f.label }));
  series.forEach((sr, j) => {
    const cs = h2(
      'select',
      {
        onchange: (e) => {
          sr.color = e.target.value;
          ctx.changed();
        },
      },
      Object.entries(palOpts).map(([v, l]) => h2('option', { value: v, textContent: l })),
    );
    cs.value = sr.color;
    box.append(
      h2(
        'div',
        { class: 'row', style: { marginBottom: '6px' } },
        cs,
        h2('input', {
          type: 'text',
          value: sr.name || '',
          placeholder: `${t('Série')} ${j + 1}`,
          oninput: (e) => {
            sr.name = e.target.value;
            ctx.changed();
          },
        }),
        series.length > 1
          ? h2(
              'button',
              {
                type: 'button',
                class: 'mini danger',
                title: 'Supprimer',
                onclick: () => {
                  series.splice(j, 1);
                  fix();
                  ctx.restructure();
                },
              },
              ico('x'),
            )
          : null,
      ),
    );
  });
  if (series.length < (f.maxSeries || 4))
    box.append(
      h2('button', {
        type: 'button',
        textContent: '+ Série',
        onclick: () => {
          series.push({ name: `${t('Série')} ${series.length + 1}`, color: SERIES_COLORS[series.length % SERIES_COLORS.length] });
          fix();
          ctx.restructure();
        },
      }),
    );
  const grid = h2('div', { class: 'tgrid', style: { gridTemplateColumns: `1fr ${series.map(() => '58px').join(' ')} 24px` } });
  grid.append(
    h2('span', { class: 'hint', textContent: 'Libellé' }),
    ...series.map((sr) => h2('span', { class: 'hint', textContent: sr.name || '—' })),
    h2('span'),
  );
  rows.forEach((r, i) => {
    grid.append(
      h2('input', {
        type: 'text',
        value: r.label || '',
        oninput: (e) => {
          r.label = e.target.value;
          ctx.changed();
        },
      }),
      ...series.map((_, j) =>
        h2('input', {
          type: 'text',
          inputMode: 'decimal',
          value: (r.v || [])[j] ?? 0,
          oninput: (e) => {
            const n = parseFloat(String(e.target.value).replace(',', '.'));
            (r.v || (r.v = []))[j] = isNaN(n) ? 0 : n;
            ctx.changed();
          },
        }),
      ),
      rows.length > 1
        ? h2(
            'button',
            {
              type: 'button',
              class: 'mini danger',
              title: 'Supprimer',
              onclick: () => {
                rows.splice(i, 1);
                ctx.restructure();
              },
            },
            ico('x'),
          )
        : h2('span'),
    );
  });
  box.append(
    grid,
    h2('button', {
      type: 'button',
      textContent: '+ Ligne',
      onclick: () => {
        rows.push({ label: '', v: series.map(() => 0) });
        ctx.restructure();
      },
    }),
  );
  const ta = h2('textarea', {
    placeholder: 'Collez un tableau depuis Excel ou un CSV : libellé ⇥ série 1 ⇥ série 2…  (la 1re ligne peut contenir les noms de séries)',
    style: { minHeight: '56px' },
  });
  box.append(
    h2(
      'details',
      { open: false },
      h2('summary', { textContent: 'Coller un tableau' }),
      h2(
        'div',
        { class: 'body' },
        ta,
        h2('button', {
          type: 'button',
          textContent: 'Remplacer les données',
          onclick: () => {
            const p = parseTable(ta.value);
            if (!p) return;
            const max = f.maxSeries || 4,
              n = Math.min(p.nser, max);
            const ns = Array.from({ length: n }, (_, j) => ({
              name: (p.header && p.header[j + 1]) || (series[j] && series[j].name) || `${t('Série')} ${j + 1}`,
              color: (series[j] && series[j].color) || SERIES_COLORS[j % SERIES_COLORS.length],
            }));
            series.splice(0, series.length, ...ns);
            rows.splice(0, rows.length, ...p.rows.map((r) => ({ label: r.label, v: r.v.slice(0, n) })));
            ctx.restructure();
          },
        }),
      ),
    ),
  );
  return box;
}

export const paletteOptions = (doc) => Object.fromEntries([...paletteKeys(doc), ...sectionBgs(doc)].map((k) => [k, t(colorLabel(doc, k))]));
