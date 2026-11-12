/* Point d'entrée de test : compilé par esbuild en tests/entry.bundle.js (ignoré par git, voir `npm run test:build`).
   Expose dans la page les briques qui fabriquent des documents. */
import { defaultDoc, newSection, newSub, newCol, migrate, safeImgSrc } from '../src/state.js';
import { newViz, switchKind, VIZ_TYPES } from '../src/viz/index.js';
import { DOCS, docEvilIcon } from './docs.js';
import { renderDocument, measure } from '../src/render.js';
import { groupOf, VALID_G } from '../src/vizgroups.js';
import { heatCells, heatLegend } from '../src/viz/heatmap.js';
import { logoFamilies, parseAssets } from '../src/assetlib.js';
import * as dataparse from '../src/dataparse.js';
import { tableAdapter, recordsAdapter } from '../src/vizdata.js';
import * as table from '../src/table/model.js';
import * as tablePaste from '../src/table/paste.js';
import { removeColor, colorUses } from '../src/state.js';

window.FSTEST = {
  defaultDoc,
  migrate,
  safeImgSrc,
  logoFamilies,
  parseAssets,
  newSection,
  newSub,
  newCol,
  newViz,
  switchKind,
  VIZ_TYPES,
  docs: DOCS,
  evilIcon: docEvilIcon,
  renderDocument,
  measure,
  groupOf,
  VALID_G: [...VALID_G],
  heatCells,
  heatLegend,
  dataparse,
  tableAdapter,
  recordsAdapter,
  table,
  tablePaste,
  removeColor,
  colorUses,
};
