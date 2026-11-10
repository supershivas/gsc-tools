const { test, expect } = require('@playwright/test');

/* Un projet reçu ne doit jamais faire charger une image distante : seules les images incorporées (data:image/) ou locales (assets/…) passent à l'import. */
test('l’import d’un projet refuse les images distantes', async ({ page }) => {
  await page.goto('/factsheet/tests/blank.html');
  const r = await page.evaluate(() => {
    const { defaultDoc, migrate, safeImgSrc } = window.FSTEST;
    const ok = ['data:image/png;base64,AAAA', 'assets/abc.png', 'assets/Asset 1.svg'];
    const bad = [
      'https://evil.test/p.png',
      'http://evil.test/p.png',
      '//evil.test/p.png',
      '\\\\evil.test\\p.png',
      'javascript:alert(1)',
      'data:text/html,<b>x</b>',
      ' https://evil.test/p.png',
      'java\nscript:alert(1)',
      '\thttps://evil.test/t.png',
    ];
    const j = JSON.parse(JSON.stringify(defaultDoc()));
    j.header.images.push(
      { id: 'img-ok', name: 'ok', src: 'assets/abc.png' },
      { id: 'img-bad', name: 'bad', src: 'https://evil.test/h.png' },
    );
    j.header.logos.white = 'https://evil.test/logo.png';
    j.header.logos.mono = 'assets/abc.png';
    const col = j.sections[0].subs[0].cols[0];
    col.type = 'image';
    col.src = 'https://evil.test/c.png';
    const d = migrate(j);
    const urls = JSON.stringify(d);
    return {
      ok: ok.map(safeImgSrc),
      bad: bad.map(safeImgSrc),
      remote: /evil\.test/.test(urls),
      keptHeader: d.header.images.some((i) => i.src === 'assets/abc.png'),
      keptLogo: d.header.logos.mono === 'assets/abc.png',
      whiteDefault: d.header.logos.white,
    };
  });
  expect(r.ok).toEqual([true, true, true]);
  expect(r.bad.every((x) => x === false)).toBe(true);
  expect(r.remote).toBe(false);
  expect(r.keptHeader && r.keptLogo).toBe(true);
  expect(r.whiteDefault).toMatch(/^assets\//);
});
