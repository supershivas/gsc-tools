"""Polices statiques de l'export PDF CMJN (fonts/pdf/*.ttf).

Les woff2 variables de l'écran (fonts/*.woff2, découpés par alphabet) sont figés à chaque graisse utile,
puis les alphabets sont fusionnés en un seul TTF par graisse : latin, latin étendu, grec, cyrillique, vietnamien,
comme à l'écran, pour les 8 graisses (200 à 900) en romain et en italique des deux familles. Sans cela, l'export supprimait les lettres absentes (ł, č, ő, grec, cyrillique, ≥, ‰…).
Chaque graisse reçoit un nom PostScript distinct (les préflights d'imprimeur refusent deux polices de même nom).

Usage (depuis factsheet/) : pip install fonttools brotli && python3 scripts/pdf-fonts.py
"""
import glob, io, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.merge import Merger, Options

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS, OUT = os.path.join(HERE, 'fonts'), os.path.join(HERE, 'fonts', 'pdf')
SUBSETS = ['latin', 'latin-ext', 'greek', 'greek-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese']
NAMES = {200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black'}
ALL = sorted(NAMES)   # toutes les graisses des deux familles, en romain et en italique
# (fichier de sortie, préfixe woff2, style, graisses, famille, nom PostScript de base)
JOBS = [('SourceSans3', 'source-sans-3', 'normal', ALL, 'Source Sans 3', 'SourceSans3'),
        ('SourceSans3', 'source-sans-3', 'italic', ALL, 'Source Sans 3', 'SourceSans3'),
        ('SourceSerif4', 'source-serif-4', 'normal', ALL, 'Source Serif 4', 'SourceSerif4'),
        ('SourceSerif4', 'source-serif-4', 'italic', ALL, 'Source Serif 4', 'SourceSerif4')]
DROP = ['GSUB', 'GPOS', 'GDEF', 'BASE', 'STAT', 'gasp', 'prep', 'HVAR', 'MVAR']   # mise en page faite par le navigateur : seuls les dessins comptent


def instance(path, wght):
    f = TTFont(path)
    f = instantiateVariableFont(f, {'wght': wght}, updateFontNames=False)
    for t in DROP:
        if t in f: del f[t]
    buf = io.BytesIO(); f.flavor = None; f.save(buf); buf.seek(0)
    return buf


for out, prefix, style, weights, family, ps in JOBS:
    for w in weights:
        parts = [instance(p, w) for s in SUBSETS for p in glob.glob(os.path.join(FONTS, f'{prefix}-{s}-wght-{style}.woff2'))]
        font = Merger(options=Options(drop_tables=DROP)).merge(parts)
        sub = NAMES[w] + ('Italic' if style == 'italic' else '')
        sub = 'Italic' if sub == 'RegularItalic' else sub
        name = font['name']
        for rec in list(name.names):
            if rec.nameID in (1, 2, 3, 4, 6, 16, 17): name.removeNames(nameID=rec.nameID)
        name.setName(family, 1, 3, 1, 0x409); name.setName(sub, 2, 3, 1, 0x409)
        name.setName(f'{family} {sub}', 4, 3, 1, 0x409); name.setName(f'{ps}-{sub}', 6, 3, 1, 0x409); name.setName(f'{ps}-{sub};pdf', 3, 3, 1, 0x409)
        font['OS/2'].usWeightClass = w
        dest = os.path.join(OUT, f"{out}-{w}{'-italic' if style == 'italic' else ''}.ttf")
        font.save(dest)
        print(os.path.basename(dest), f'{ps}-{sub}', len(font.getBestCmap()), 'caractères', os.path.getsize(dest) // 1024, 'Ko')
