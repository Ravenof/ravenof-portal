# Avataru balsu manifestas: kas realiai guli public/avatars/v2/<slug>/vo/<lt|en>/ + dialogu eiles is scenarijaus CSV.
# Paleisti po kiekvieno nauju klipu ikelimo:  python3 tools/gen-avatar-vo-manifest.py
import os, re, json, csv, io, collections
root = 'public/avatars/v2'
voices = {}
for slug in sorted(os.listdir(root)):
    for lang in ('lt', 'en'):
        d = os.path.join(root, slug, 'vo', lang)
        if not os.path.isdir(d): continue
        ev = collections.Counter()
        for f in os.listdir(d):
            m = re.match(r'^([A-Za-z]+)-(\d+)\.mp3$', f)
            if m: ev[m.group(1)] = max(ev[m.group(1)], int(m.group(2)))
        if ev: voices.setdefault(slug, {})[lang] = dict(sorted(ev.items()))
dialogs = []
src = 'store-media/avatars-src/avataru-vo-scenarijus-v2.csv'
if os.path.exists(src):
    seq = collections.OrderedDict()
    for r in csv.DictReader(io.open(src, encoding='utf-8-sig')):
        m = re.match(r'^dlg-(.+)__(.+)-(\d+)$', r['event'])
        if m: seq.setdefault((m.group(1), m.group(2), int(m.group(3))), []).append((r['avatar_slug'], os.path.basename(r['file_lt'])))
    for (a, b, n), lines in seq.items():
        langs = [l for l in ('lt', 'en') if all(os.path.exists(os.path.join(root, s, 'vo', l, f)) for s, f in lines)]
        if langs: dialogs.append({'a': a, 'b': b, 'n': n, 'langs': langs, 'lines': [[s, f] for s, f in lines]})
else:
    old = json.load(open('src/lib/game/avatarVoManifest.json')) if os.path.exists('src/lib/game/avatarVoManifest.json') else {}
    dialogs = old.get('dialogs', [])
if os.path.exists(src):
    script = {}; names = {}
    for r in csv.DictReader(io.open(src, encoding='utf-8-sig')):
        if r['event'].startswith('dlg-'): continue
        names[r['avatar_slug']] = [r['avatar_lt'], r['avatar_en']]
        script.setdefault(r['avatar_slug'], {})['%s-%s' % (r['event'], r['variant'])] = [r['text_lt'], r['text_en']]
    json.dump({'names': names, 'lines': script}, io.open('src/lib/game/avatarVoScript.json', 'w', encoding='utf-8', newline='\n'), ensure_ascii=False)
    # 823: zaidimui reikalingos tik emociju ir laikmacio frazes (kaspinas prie avataro) - mazas atskiras failas, be zymu [..]
    strip = lambda t: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', t)).strip()
    say = {}
    for slug, ls in script.items():
        for k, (lt, en) in ls.items():
            ev, n = k.rsplit('-', 1)
            if ev.startswith('emote') or ev == 'timer':
                say.setdefault(slug, {}).setdefault(ev, {})[int(n)] = [strip(lt), strip(en)]
    say = {sl: {ev: [v[i] for i in sorted(v)] for ev, v in evs.items()} for sl, evs in say.items()}
    json.dump({'names': names, 'lines': say}, io.open('src/lib/game/avatarSayLines.json', 'w', encoding='utf-8', newline='\n'), ensure_ascii=False)
json.dump({'voices': voices, 'dialogs': dialogs}, io.open('src/lib/game/avatarVoManifest.json', 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
print('voices', {k: list(v) for k, v in voices.items()}, 'dialogs', len(dialogs))
