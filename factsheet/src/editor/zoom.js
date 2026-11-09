/* Cmd/Ctrl + molette (ou pincement du pavé tactile) : zoom continu de l'aperçu, centré sur le curseur : le point de la page sous le curseur reste sous le curseur.
   Les rafales d'événements sont regroupées en un seul redessin par image. */
export function createZoom(ctx, preview, selection) {
  const stage = ctx.stage;
  let zoomJob = null;
  stage.addEventListener(
    'wheel',
    (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (!zoomJob) {
        const sc0 = preview.scaleValue(),
          pws = [...stage.querySelectorAll('.pwrap')],
          pw = e.target.closest && e.target.closest('.pwrap'),
          r = pw && pw.getBoundingClientRect(),
          sb = stage.getBoundingClientRect();
        zoomJob = {
          sc0,
          sc: sc0,
          anchor: pw ? { i: pws.indexOf(pw), u: (e.clientX - r.left) / sc0, v: (e.clientY - r.top) / sc0 } : null,
          cx: e.clientX - sb.left,
          cy: e.clientY - sb.top,
          x: e.clientX,
          y: e.clientY,
        };
        requestAnimationFrame(() => {
          const j = zoomJob;
          zoomJob = null;
          if (Math.abs(j.sc - j.sc0) < 1e-4) return;
          preview.setZoom(j.sc.toFixed(3));
          preview.drawNow();
          const pw2 = j.anchor && stage.querySelectorAll('.pwrap')[j.anchor.i];
          if (pw2) {
            const r2 = pw2.getBoundingClientRect();
            stage.scrollLeft += r2.left + j.anchor.u * j.sc - j.x;
            stage.scrollTop += r2.top + j.anchor.v * j.sc - j.y;
          } else {
            stage.scrollLeft = (stage.scrollLeft + j.cx) * (j.sc / j.sc0) - j.cx;
            stage.scrollTop = (stage.scrollTop + j.cy) * (j.sc / j.sc0) - j.cy;
          }
          selection.draw();
        });
      }
      zoomJob.sc = Math.min(4, Math.max(0.25, zoomJob.sc * Math.exp(-e.deltaY * 0.002)));
      zoomJob.x = e.clientX;
      zoomJob.y = e.clientY;
    },
    { passive: false },
  );
}
