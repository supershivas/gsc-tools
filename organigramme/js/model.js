/* Modèle de l’organigramme : schéma, document par défaut, migration, opérations sur l’arbre.
   doc → levels[] → boxes[] → groups[] → people[]. Tout identifiant est stable (jamais renommer une clé). */

export const SCHEMA_VERSION = 1;
export const APP_ID = 'pec-organigramme';

let seq = 0;
export const uid = (p = 'n') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newPerson = (name = '', role = '', emph = false) => ({ id: uid('p'), name, role, emph });
export const newGroup = (title = '', people = [newPerson()]) => ({ id: uid('g'), title, people });
/* link.to : 'auto' (niveau du dessus), 'none' (aucun trait) ou l'identifiant d'un cadre du niveau du dessus ; link.dash : trait en tirets. */
export const newBox = (title = '', { tone = 'mid', align = 'left', lead = null, groups = [newGroup()], link = { to: 'auto', dash: false } } = {}) => ({ id: uid('b'), title, tone, align, lead, link, groups });
/* rails : hauteur du trait horizontal des liens qui entrent dans ce niveau, par groupe (clé = id du cadre parent ou 'auto'), de 0 à 1 entre les deux niveaux. */
export const newLevel = (boxes = [newBox()]) => ({ id: uid('l'), boxes, rails: {} });

/* Cadres auxquels les cadres du niveau `li` peuvent être reliés : ceux du niveau non vide juste au-dessus. */
export function linkSource(doc, li) {
  for (let j = li - 1; j >= 0; j--) if (doc.levels[j].boxes.length) return doc.levels[j].boxes;
  return null;
}

const many = (n, f) => Array.from({ length: n }, (_, i) => f(i));

/* Gabarit de départ : la structure et les styles du PEC (3 niveaux, EU Blue, sous-sections, 3 colonnes),
   sans aucun texte : tous les champs sont vides, et rien n'est dessiné tant qu'ils le sont. */
export function defaultDoc() {
  return {
    schemaVersion: SCHEMA_VERSION,
    title: '',
    page: { orientation: 'landscape', fit: true, equalHeights: true },
    logo: null,
    image: null,
    assets: {},
    levels: [
      newLevel([newBox('', { tone: 'dark', align: 'center', lead: { name: '', role: '' } })]),
      newLevel([newBox('', { tone: 'dark', groups: [newGroup(), newGroup()] })]),
      newLevel([newBox(), newBox(), newBox()]),
    ],
  };
}

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const oneOf = (v, list) => (list.includes(v) ? v : list[0]);
const num = (v, d, min, max) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(max, Math.max(min, +v)) : d);

/* Emplacement d’une image (logo, image) : `asset` = clé dans doc.assets ; largeur en points ;
   `x`/`y` nuls = placement automatique (logo en haut à gauche, image en haut à droite). */
function cleanPlaced(p, assets) {
  if (!p || typeof p !== 'object' || !assets[p.asset]) return null;
  return {
    asset: p.asset,
    name: str(p.name),
    ratio: num(p.ratio, 1, 0.01, 100),
    w: num(p.w, 110, 10, 2000),
    x: p.x == null ? null : num(p.x, 0, -2000, 4000),
    y: p.y == null ? null : num(p.y, 0, -2000, 4000),
  };
}

/* Lit n’importe quelle version stockée ou importée et rend un document au format courant.
   Tolérant : un champ manquant ou faux prend sa valeur par défaut au lieu de casser. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.levels)) throw new Error('format');
  const v = +raw.schemaVersion || 1;
  if (v > SCHEMA_VERSION) throw new Error('newer');
  // (v1 est le premier format : les migrations futures s’enchaînent ici, `if (v < 2) { … }`.)
  const assets = {};
  for (const [k, val] of Object.entries(raw.assets || {})) if (typeof val === 'string' && val.startsWith('data:image/')) assets[k] = val;
  const page = raw.page || {};
  const doc = {
    schemaVersion: SCHEMA_VERSION,
    title: str(raw.title),
    page: { orientation: oneOf(page.orientation, ['landscape', 'portrait']), fit: page.fit !== false, equalHeights: page.equalHeights !== false },
    logo: cleanPlaced(raw.logo, assets),
    image: cleanPlaced(raw.image, assets),
    assets,
    levels: raw.levels
      .filter((l) => l && Array.isArray(l.boxes))
      .map((l) => ({
        id: str(l.id) || uid('l'),
        rails: Object.fromEntries(
          Object.entries(l.rails && typeof l.rails === 'object' ? l.rails : {})
            .filter(([, v]) => Number.isFinite(+v))
            .map(([k, v]) => [k, num(v, 0.505, 0.15, 0.85)]),
        ),
        boxes: l.boxes
          .filter((b) => b && typeof b === 'object')
          .map((b) => ({
            id: str(b.id) || uid('b'),
            title: str(b.title),
            tone: oneOf(b.tone, ['dark', 'mid']),
            align: oneOf(b.align, ['left', 'center']),
            lead: b.lead && typeof b.lead === 'object' ? { name: str(b.lead.name), role: str(b.lead.role) } : null,
            link: { to: (b.link && str(b.link.to)) || 'auto', dash: !!(b.link && b.link.dash) },
            groups: (Array.isArray(b.groups) ? b.groups : [])
              .filter((g) => g && typeof g === 'object')
              .map((g) => ({
                id: str(g.id) || uid('g'),
                title: str(g.title),
                people: (Array.isArray(g.people) ? g.people : [])
                  .filter((p) => p && typeof p === 'object')
                  .map((p) => ({ id: str(p.id) || uid('p'), name: str(p.name), role: str(p.role), emph: !!p.emph })),
              })),
          })),
      })),
  };
  // Les identifiants doivent être uniques (un fichier édité à la main peut en dupliquer).
  const seen = new Set();
  const fix = (o, p) => {
    if (seen.has(o.id)) o.id = uid(p);
    seen.add(o.id);
  };
  for (const l of doc.levels) {
    fix(l, 'l');
    for (const b of l.boxes) {
      fix(b, 'b');
      for (const g of b.groups) {
        fix(g, 'g');
        g.people.forEach((p) => fix(p, 'p'));
      }
    }
  }
  // Un lien vers un cadre qui n'est plus au niveau du dessus redevient automatique.
  doc.levels.forEach((l, li) => {
    const ids = new Set((linkSource(doc, li) || []).map((b) => b.id));
    for (const b of l.boxes) if (b.link.to !== 'auto' && b.link.to !== 'none' && !ids.has(b.link.to)) b.link.to = 'auto';
  });
  return doc;
}

/* Copie profonde avec de nouveaux identifiants (duplication d’un cadre). */
export function cloneBox(box) {
  const c = JSON.parse(JSON.stringify(box));
  c.id = uid('b');
  for (const g of c.groups) {
    g.id = uid('g');
    for (const p of g.people) p.id = uid('p');
  }
  return c;
}

/* Retrouve un nœud et son tableau parent par identifiant. */
export function find(doc, id) {
  for (const [li, level] of doc.levels.entries()) {
    if (level.id === id) return { kind: 'level', node: level, list: doc.levels, index: li };
    for (const [bi, box] of level.boxes.entries()) {
      if (box.id === id) return { kind: 'box', node: box, list: level.boxes, index: bi, level };
      for (const [gi, group] of box.groups.entries()) {
        if (group.id === id) return { kind: 'group', node: group, list: box.groups, index: gi, box, level };
        for (const [pi, person] of group.people.entries()) {
          if (person.id === id) return { kind: 'person', node: person, list: group.people, index: pi, group, box, level };
        }
      }
    }
  }
  return null;
}

/* Nom de fichier commun à GSC tools : titre_AAMMJJ. */
export function fileStem(title, date = new Date()) {
  const slug =
    String(title || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'organigramme';
  const p = (n) => String(n).padStart(2, '0');
  return `${slug}_${p(date.getFullYear() % 100)}${p(date.getMonth() + 1)}${p(date.getDate())}`;
}
