/* Point d'entrée de test : compilé par esbuild en tests/entry.bundle.js (ignoré par git, voir `npm run test:build`).
   Expose dans la page les briques qui fabriquent des documents. */
import { defaultDoc, newSection, newSub, newCol } from '../src/state.js';
import { newViz, VIZ_TYPES } from '../src/viz/index.js';
import { DOCS, docEvilIcon } from './docs.js';
import { renderDocument, measure } from '../src/render.js';

window.FSTEST = {
  defaultDoc, newSection, newSub, newCol, newViz, VIZ_TYPES,
  docs: DOCS,
  evilIcon: docEvilIcon,
  renderDocument, measure,
};
