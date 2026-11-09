/* Diagramme de Sankey : flux source → cible (d3-sankey). Les colonnes se déduisent des liens ; les flux circulaires ne sont pas pris en charge. */
import { sankey, sankeyJustify, sankeyLeft, sankeyRight, sankeyCenter } from 'd3-sankey';
import { VIZ, TYPE } from '../tokens.js';
import { s, SW, colorRef, pxOf, fmt, mw, SANS, fitText, heightOf, autoColor, inkOn } from './util.js';
import { t } from '../i18n.js';

const ALIGN = { justify: sankeyJustify, left: sankeyLeft, right: sankeyRight, center: sankeyCenter };

export default {
  label: 'Sankey',
  icon: 'chart-sankey',
  family: 'flow',
  defaults: () => ({
    ratio: '16:9',
    align: 'justify',
    nodeW: 12,
    nodePad: 9,
    showValues: true,
    decimals: 0,
    suffix: '',
    rows: [
      ['Budget', 'Research', 50, ''],
      ['Budget', 'Education', 30, ''],
      ['Budget', 'Health', 20, ''],
      ['Research', 'Universities', 35, ''],
      ['Research', 'Companies', 15, ''],
      ['Education', 'Universities', 10, ''],
      ['Education', 'Schools', 20, ''],
      ['Health', 'Hospitals', 20, ''],
    ].map(([source, target, value, color]) => ({ source, target, value, color })),
  }),
  heights: ['ratio', 'fixed', 'fill'],
  fields: [
    {
      k: 'ratio',
      t: 'select',
      label: 'Format du graphique',
      options: { '2:1': '2:1 (large)', '16:9': '16:9', '3:2': '3:2', '1:1': '1:1 (carré)' },
    },
    {
      k: 'align',
      g: 'struct',
      t: 'select',
      label: 'Alignement des nœuds',
      options: { justify: 'Justifié', left: 'À gauche', right: 'À droite', center: 'Centré' },
    },
    { k: 'nodeW', g: 'dims', t: 'number', label: 'Largeur des nœuds (px)', min: 3, max: 36 },
    { k: 'nodePad', g: 'dims', t: 'number', label: 'Espace entre les nœuds (px)', min: 0, max: 36 },
    { k: 'showValues', g: 'labels', t: 'bool', label: 'Afficher les valeurs' },
    { k: 'decimals', g: 'labels', t: 'number', label: 'Décimales des valeurs', min: 0, max: 4 },
    { k: 'suffix', g: 'labels', t: 'text', label: 'Unité après la valeur (%, M€…)' },
  ],
  data: {
    k: 'rows',
    min: 1,
    cols: [
      { k: 'source', label: 'Source', t: 'text' },
      { k: 'target', label: 'Cible', t: 'text' },
      { k: 'value', label: 'Valeur', t: 'number', def: 10 },
      { k: 'color', label: 'Couleur du flux', t: 'color', auto: true, def: '' },
    ],
    item: () => ({ source: '', target: '', value: 10, color: '' }),
  },
  dataHint:
    'Une ligne par flux. Les nœuds sont créés d’après les noms ; la couleur d’un flux est celle de sa source si elle n’est pas choisie.',
  render(o, W, env) {
    const capPx = pxOf(TYPE.caption.size),
      numPx = pxOf(TYPE.captionNum.size),
      suffix = o.suffix || '';
    const H = heightOf(o, W, env, null, '16:9');
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', overflow: 'visible' } });
    const links = (o.rows || [])
      .map((r) => ({
        source: String(r.source || '').trim(),
        target: String(r.target || '').trim(),
        value: +r.value || 0,
        color: r.color || '',
      }))
      .filter((l) => l.source && l.target && l.source !== l.target && l.value > 0);
    const note = (msg) => {
      svg.append(s('text', { x: 0, y: capPx, 'font-size': capPx }, msg));
      return { node: svg };
    };
    if (!links.length) return note(t('Aucune donnée'));
    const names = [...new Set(links.flatMap((l) => [l.source, l.target]))];
    let g;
    const lab = (name, v) => name + (o.showValues ? ` · ${fmt(v, env.locale, o.decimals)}${suffix}` : '');
    const probe = sankey()
      .nodeId((d) => d.name)
      .nodeWidth(+o.nodeW || 12)
      .nodePadding(+o.nodePad || 0)
      .nodeAlign(ALIGN[o.align] || sankeyJustify)
      .extent([
        [0, 4],
        [W, H - 4],
      ]);
    try {
      g = probe({ nodes: names.map((name) => ({ name })), links: links.map((l) => ({ ...l })) });
    } catch (e) {
      return note(t('Flux circulaires non pris en charge'));
    }
    /* marges pour les libellés des colonnes de gauche et de droite, puis calcul définitif */
    const maxLayer = Math.max(...g.nodes.map((n) => n.layer));
    const wOf = (side) =>
      Math.min(
        W * 0.28,
        Math.max(0, ...g.nodes.filter((n) => n.layer === side).map((n) => mw(lab(n.name, n.value), 400, SANS, capPx))) + 6,
      );
    const ml = wOf(0),
      mr = maxLayer ? wOf(maxLayer) : 0;
    const G = sankey()
      .nodeId((d) => d.name)
      .nodeWidth(+o.nodeW || 12)
      .nodePadding(+o.nodePad || 0)
      .nodeAlign(ALIGN[o.align] || sankeyJustify)
      .extent([
        [ml, 4],
        [Math.max(ml + 40, W - mr), H - 4],
      ])({ nodes: names.map((name) => ({ name })), links: links.map((l) => ({ ...l })) });
    const color = new Map(G.nodes.map((n, i) => [n.name, autoColor('', i)]));
    const linkG = s('g', { fill: 'none' }),
      nodeG = s('g'),
      textG = s('g');
    for (const l of G.links) {
      const x0 = l.source.x1,
        x1 = l.target.x0,
        xm = (x0 + x1) / 2,
        key = l.color || color.get(l.source.name);
      linkG.append(
        s('path', {
          d: `M${x0},${l.y0}C${xm},${l.y0} ${xm},${l.y1} ${x1},${l.y1}`,
          stroke: colorRef(key),
          'stroke-width': Math.max(1, l.width),
          'stroke-opacity': 0.4,
        }),
      );
    }
    for (const n of G.nodes) {
      const h = Math.max(1, n.y1 - n.y0);
      nodeG.append(
        s('rect', {
          x: n.x0,
          y: n.y0,
          width: n.x1 - n.x0,
          height: h,
          rx: Math.min(VIZ.barRadius, (n.x1 - n.x0) / 2),
          fill: colorRef(color.get(n.name)),
          stroke: 'currentColor',
          'stroke-width': SW,
        }),
      );
      const left = n.layer === 0 && maxLayer > 0 ? true : n.layer === maxLayer ? false : n.x0 < W / 2 ? false : true;
      const avail = left ? n.x0 - 6 : n.layer === maxLayer ? W - n.x1 - 6 : Math.max(40, (W - n.x1) * 0.9);
      const f = fitText(lab(n.name, n.value), 400, SANS, capPx, Math.max(30, avail), 0.7);
      textG.append(
        s(
          'text',
          {
            x: left ? n.x0 - 5 : n.x1 + 5,
            y: (n.y0 + n.y1) / 2 + 0.33 * f.size,
            'text-anchor': left ? 'end' : 'start',
            'font-size': f.size,
            style: { paintOrder: 'stroke', stroke: '#fff', strokeWidth: '3px', strokeLinejoin: 'round' },
          },
          f.text,
        ),
      );
    }
    svg.append(linkG, nodeG, textG);
    return { node: svg };
  },
};
