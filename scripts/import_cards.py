import sys, os, re, json, subprocess, tempfile
from PIL import Image

ROOT = "/sessions/kind-friendly-clarke/mnt/Ravenof kortų portalas/ravenof-portal"
KORTOS = os.path.join(ROOT, "kortos")
OUTIMG = os.path.join(ROOT, "public", "cards")
DATA = "/tmp/cards_data.json"

FACTION = {  # folder -> (faction_id, slug)
  "demonu orda": (9, "demonu-orda"),
  "goblinu gauja": (8, "vryhioko-gauja"),
  "inkvizicijos legionas": (10, "inkvizicijos-legionas"),
  "mirties marsas": (6, "mirties-marsas"),
  "mistikos melodija": (12, "mistikos-melodija"),
  "plesiku naktis": (7, "plesiku-naktis"),
  "sviesos pulkas": (11, "sviesos-pulkas"),
}

def parse_text(pdf):
    try:
        out = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True, timeout=20).stdout
    except Exception:
        return {"name": "", "effect": "", "number": None}
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    number = None
    footer_idx = len(lines)
    for i, l in enumerate(lines):
        m = re.search(r'(\d+)\s*/\s*(\d+)', l)
        if "Kaukas" in l or m:
            footer_idx = min(footer_idx, i)
            if m: number = f"{m.group(1)}/{m.group(2)}"
    body = lines[:footer_idx]
    # name = first line containing letters (skip pure number/symbol lines)
    name = ""
    name_idx = 0
    for i, l in enumerate(body):
        if re.search(r'[A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]', l) and len(re.sub(r'[^A-Za-zĄČĘĖĮŠŲŪŽąčęėįšųūž]','',l))>=2:
            name = l; name_idx = i; break
    effect = " ".join(body[name_idx+1:]).strip()
    effect = re.sub(r'\s+', ' ', effect)
    return {"name": name, "effect": effect, "number": number}

def process_folder(folder):
    fid, slug = FACTION[folder]
    src = os.path.join(KORTOS, folder)
    dst = os.path.join(OUTIMG, slug)
    os.makedirs(dst, exist_ok=True)
    rows = []
    cap = int(os.environ.get("RENDER_CAP","14"))
    rendered = 0
    pdfs = sorted([f for f in os.listdir(src) if f.lower().endswith(".pdf")])
    for f in pdfs:
        base = os.path.splitext(f)[0]
        webp_rel = f"/cards/{slug}/{base}.webp"
        webp_abs = os.path.join(dst, base + ".webp")
        if not os.path.exists(webp_abs) and rendered < cap:
            rendered += 1
            with tempfile.TemporaryDirectory() as td:
                pre = os.path.join(td, "p")
                subprocess.run(["pdftoppm","-png","-singlefile","-r","120",os.path.join(src,f),pre],
                               capture_output=True, timeout=30)
                png = pre + ".png"
                if os.path.exists(png):
                    im = Image.open(png).convert("RGB")
                    w,h = im.size
                    tw = 520
                    if w > tw: im = im.resize((tw, round(h*tw/w)), Image.LANCZOS)
                    im.save(webp_abs, "WEBP", quality=82, method=5)
        td_ = parse_text(os.path.join(src, f))
        is_curse = base.upper().startswith("CURSE")
        rows.append({
            "file": f, "faction_id": fid, "slug": slug,
            "card_number": base,
            "set_no": td_["number"],
            "name": td_["name"], "effect": td_["effect"],
            "image_url": webp_rel,
            "type_id": 8 if is_curse else None,  # 8=Prakeiksmas; others TBD by vision
        })
    return rows

def total_webp():
    n = 0
    for _,(fid,slug) in FACTION.items():
        d = os.path.join(OUTIMG, slug)
        if os.path.isdir(d): n += len([x for x in os.listdir(d) if x.endswith(".webp")])
    return n

if __name__ == "__main__":
    arg = sys.argv[1]
    data = {}
    if os.path.exists(DATA): data = json.load(open(DATA))
    folders = list(FACTION.keys()) if arg == "ALL" else [arg]
    for folder in folders:
        data[folder] = process_folder(folder)
        json.dump(data, open(DATA,"w"), ensure_ascii=False, indent=1)
    total_pdf = sum(len([f for f in os.listdir(os.path.join(KORTOS,fo)) if f.lower().endswith(".pdf")]) for fo in FACTION)
    print(f"rendered webp: {total_webp()} / {total_pdf}")
