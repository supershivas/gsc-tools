/* Outil main : maintenir Espace (ou touche H, Échap pour en sortir) puis glisser dans l'aperçu pour le déplacer, comme dans un outil de design.
   Renvoie `on()` (outil actif), `tool()` (touche H allumée) et `toggle()` (menu Affichage). */
export function createHand(ctx) {
  const stage = ctx.stage;
  let handTool = false,
    handSpace = false,
    panning = null;
  const handOn = () => handTool || handSpace;
  const syncHand = () => {
    stage.classList.toggle('hand', handOn());
    if (handOn()) ctx.hover.hide();
  };
  const typing = (e) => {
    const tg = e.target,
      tag = tg.tagName || '';
    return /INPUT|TEXTAREA|SELECT/.test(tag) || tg.isContentEditable || document.querySelector('dialog[open], .ve, .v3d, .ce');
  };
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (!handSpace) {
        handSpace = true;
        syncHand();
      }
    } else if (e.key === 'h' || e.key === 'H') {
      handTool = !handTool;
      syncHand();
    } else if (e.key === 'Escape' && handTool) {
      handTool = false;
      syncHand();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' && handSpace) {
      handSpace = false;
      syncHand();
    }
  });
  window.addEventListener('blur', () => {
    handSpace = false;
    syncHand();
  });
  stage.addEventListener(
    'pointerdown',
    (e) => {
      if (!handOn() || e.button > 1) return;
      e.preventDefault();
      e.stopPropagation();
      panning = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moved: false };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('panning');
    },
    true,
  );
  stage.addEventListener('pointermove', (e) => {
    if (!panning) return;
    panning.moved = true;
    stage.scrollLeft = panning.sl - (e.clientX - panning.x);
    stage.scrollTop = panning.st - (e.clientY - panning.y);
  });
  const endPan = () => {
    if (panning) {
      stage.classList.remove('panning');
      setTimeout(() => {
        panning = null;
      }, 0);
    }
  };
  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);
  stage.addEventListener(
    'click',
    (e) => {
      if (handOn() || panning) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );
  return {
    on: handOn,
    tool: () => handTool,
    toggle: () => {
      handTool = !handTool;
      syncHand();
    },
  };
}
