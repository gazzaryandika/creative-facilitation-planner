#!/usr/bin/env python3
"""
Rebuilds src/data/seed/techniques.json from the Road Map technique notes in the
IDEM104 Obsidian vault ("Techniques Database" folder, one 3.x.y note per technique).

    python3 scripts/import-techniques.py "<path to Techniques Database>"

The library holds book techniques only: the JSON is rebuilt from the notes on
every run, and anything without a matching note is dropped. Ids already used are
kept, so seed templates and saved plans keep resolving. Steps in saved plans that
point at a technique no longer in the library are turned into write-your-own steps
by the app on load (see src/data/seed/retiredTechniques.json).
"""

import glob
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(REPO, "src", "data", "seed", "techniques.json")
HEADERS_DIR = os.path.join(REPO, "public", "technique-headers")
# Title-page captures are looked up in this order; the Boom Student captures are the sharpest.
SOURCE_FOLDERS = ["Boom Student screenshots", "Road Map excerpt", "Excursion screenshots"]

# Book sections that already have an app id. Everything else gets a slug.
EXISTING_IDS = {
    "3.1.2": "brainwriting-with-post-its",
    "3.1.4": "creative-confrontation",
    "3.1.9": "excursion-random-words",
    "3.1.10": "excursion-random-objects",
    "3.2.3": "spontaneous-clustering",
}

PHASES = ["Problem Finding", "Idea Finding", "Solution Finding"]
LEVELS = {"novice": "Novice", "intermediate": "Intermediate", "expert": "Expert"}

# (pattern in the book's materials text, catalog id, name, default quantity, scaling)
MATERIAL_RULES = [
    (r"a5[- ]sized post-its|large post-its", "large-post-its", "Large Post-its", 1, "perParticipant"),
    (r"post-its?", "post-it-pads", "Post-it pads", 1, "perParticipant"),
    (r"black markers?|black marker", "black-markers", "Black markers", 1, "perParticipant"),
    (r"coloured markers|markers in different colours|black and coloured", "coloured-markers", "Coloured markers (set)", 1, "perParticipant"),
    (r"flip[- ]?(over|chart)", "flip-over-sheets", "Flip-over sheets", 3, "fixed"),
    (r"tape", "masking-tape", "Masking tape (roll)", 1, "fixed"),
    (r"\ba2\b", "a2-sheets", "A2 sheets", 1, "perParticipant"),
    (r"\ba3\b", "a3-sheets", "A3 sheets", 1, "perParticipant"),
    (r"\ba4\b|plain paper", "a4-paper", "A4 paper", 2, "perParticipant"),
    (r"worksheet", "worksheets", "Printed worksheets", 1, "perParticipant"),
    (r"stickers|dots", "dot-stickers", "Dot stickers (sheets)", 1, "perParticipant"),
    (r"magazines", "magazines", "Magazines for cutting", 10, "fixed"),
    (r"scissors", "scissors", "Scissors", 2, "fixed"),
    (r"glue", "glue-sticks", "Glue sticks", 2, "fixed"),
]
GENERIC_MARKERS = (r"\bmarkers?\b", "black-markers", "Black markers", 1, "perParticipant")
# Book items that aren't in the catalog but are worth counting, and the catalog ids they stand in for.
CUSTOM_ITEMS = [
    (r"triz principles", "Preselected TRIZ principle cards (set)", 1, "fixed", ()),
    (r"morphological matrix", "Morphological matrix (printed)", 1, "fixed", ("worksheets",)),
]


def frontmatter(text):
    head = text.split("---")[1]
    return dict(re.findall(r"^(\w+): (.*)$", head, re.M))


def sections(text):
    body = text.split("---", 2)[2]
    parts = re.split(r"^## (.+)$", body, flags=re.M)
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts), 2)}


def plain(md):
    """Markdown note text to the plain text the app renders (whitespace-pre-line)."""
    md = re.sub(r"\[\[[^\]|]+\|([^\]]+)\]\]", r"\1", md)
    md = re.sub(r"\[\[([^\]]+)\]\]", r"\1", md)
    md = re.sub(r"\*\*(.+?)\*\*", r"\1", md)
    md = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", md)
    md = re.sub(r"^### (.+)$", r"\1", md, flags=re.M)
    md = re.sub(r"^- ", "• ", md, flags=re.M)
    md = re.sub(r"\\\|", "|", md)
    md = re.sub(r":\n\n• ", ":\n• ", md)
    return re.sub(r"\n{3,}", "\n\n", md).strip()


def glance(sec_text, label):
    m = re.search(r"^\| " + re.escape(label) + r" \| (.+?) \|$", sec_text, re.M)
    return m.group(1).strip() if m else None


def parse_time(s):
    nums = [int(n) for n in re.findall(r"\d+", s or "")]
    return {"minMinutes": nums[0], "maxMinutes": nums[1] if len(nums) > 1 else nums[0]} if nums else None


def parse_experience(s):
    m = re.match(r"(\w+) facilitator, (\w+) RG", s or "")
    return (LEVELS[m.group(1).lower()], LEVELS[m.group(2).lower()]) if m else (None, None)


def parse_diamond(s):
    if not s or s.lower().startswith("any"):
        return PHASES[:]
    return [p for p in PHASES if p.lower().split()[0] in s.lower()]


def parse_stage(s):
    return s if s in ("Diverging", "Reverging", "Converging") else "Multiple"


def parse_steps(text):
    steps = []
    for m in re.finditer(r"^(\d+)\. (.+?)(?=^\d+\. |\Z)", text, re.M | re.S):
        steps.append({"number": int(m.group(1)), "text": plain(" ".join(m.group(2).split()))})
    intro = re.split(r"^1\. ", text, flags=re.M)[0].strip()
    return steps, plain(intro) if intro else None


def material_items(text):
    """Countable items from the book's materials text, plus a note for alternatives in brackets."""
    alternatives = re.findall(r"\(([^)]*)\)", text)
    lowered = re.sub(r"\([^)]*\)", "", text).lower()
    items, used = [], set()
    for pattern, cid, name, qty, scaling in MATERIAL_RULES:
        if cid == "post-it-pads" and "large-post-its" in used:
            continue
        if re.search(pattern, lowered) and cid not in used:
            items.append({"catalogId": cid, "name": name, "quantity": qty, "scaling": scaling})
            used.add(cid)
    if not used & {"black-markers", "coloured-markers"} and re.search(GENERIC_MARKERS[0], lowered):
        _, cid, name, qty, scaling = GENERIC_MARKERS
        items.append({"catalogId": cid, "name": name, "quantity": qty, "scaling": scaling})
    for pattern, name, qty, scaling, replaces in CUSTOM_ITEMS:
        if re.search(pattern, lowered):
            items = [i for i in items if i.get("catalogId") not in replaces]
            items.append({"name": name, "quantity": qty, "scaling": scaling})
    note = "; ".join(a[0].upper() + a[1:] for a in alternatives if a.lower().startswith("or ")) or None
    return items, note


def title_page(vault, page):
    for folder in SOURCE_FOLDERS:
        hits = glob.glob(os.path.join(vault, "_Source Pages", folder, f"RM p{page:03d} - *.png"))
        if hits:
            return hits[0]
    return None


def longest_run(flags, max_gap):
    """Longest stretch of True values, bridging gaps of up to max_gap False values."""
    best, start, last = (0, 0), None, None
    for i, f in enumerate(flags):
        if not f:
            continue
        if start is None or i - last > max_gap + 1:
            start = i
        last = i
        if last - start > best[1] - best[0]:
            best = (start, last)
    return best


def crop_header(page_png, out_path):
    """
    Crops the photo under a technique's title block. Its top edge is where the tallest
    band of mostly-dark rows starts. From there it runs down, and out to the sides,
    as far as any ink reaches before a clear blank gap (the page edge, or the gap to
    the next page in a two-page capture), so pale areas inside the photo stay in.
    """
    from PIL import Image

    im = Image.open(page_png).convert("RGB")
    grey = im.convert("L")
    w, h = grey.size
    px = grey.load()
    step = max(1, w // 300)
    xs = range(0, w, step)

    def busy_row(y):
        return sum(1 for x in xs if px[x, y] < 238) / len(xs) > 0.45

    core_top, _ = longest_run([busy_row(y) for y in range(h)], max_gap=h // 60)

    # Pale photo edges (a light wall, a grey sky) aren't "busy" but aren't page-white either.
    def tinted_row(y):
        return sum(1 for x in xs if px[x, y] >= 250) / len(xs) < 0.5

    top = core_top
    while top > 0 and tinted_row(top - 1):
        top -= 1

    def inked_row(y):
        return any(px[x, y] < 225 for x in xs)

    # Walk down from the photo's busy core, not its pale top edge, which may have no ink at all.
    bottom, blank, y = core_top, 0, core_top
    while y < h and blank <= h // 40:
        if inked_row(y):
            bottom, blank = y, 0
        else:
            blank += 1
        y += 1

    ys = range(top, bottom + 1, step)
    inked_cols = [x for x in range(w) if any(px[x, yy] < 225 for yy in ys)]
    if not inked_cols or bottom - top < h * 0.2:
        return False
    left, right = inked_cols[0], inked_cols[-1]

    photo = im.crop((left, top, right + 1, bottom + 1))
    if photo.width > 900:
        photo = photo.resize((900, round(photo.height * 900 / photo.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    photo.save(out_path, "JPEG", quality=82, optimize=True, progressive=True)
    return True


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")


def convert(path, vault):
    text = open(path).read()
    fm = frontmatter(text)
    sec = sections(text)
    section = fm["section"]
    facilitator, rg = parse_experience(fm.get("experience"))
    steps, step_intro = parse_steps(sec["Step by step"])
    pages = re.search(r"pp?\. ([\d-]+)", fm.get("source", ""))
    excursion = fm.get("subtype") == "excursion"
    name = fm["title"]
    items, materials_note = material_items(fm.get("materials", ""))

    tech = {
        "id": EXISTING_IDS.get(section) or (("excursion-" if excursion else "") + slug(name)),
        "sectionReference": section,
        "name": f"Excursion: {name}" if excursion else name,
        "stage": parse_stage(fm.get("stage")),
        "diamond": parse_diamond(fm.get("diamond")),
        "diamondNote": fm.get("diamond"),
        "familyOfTechniques": fm.get("family"),
        "typeOfProblem": fm.get("problem_type"),
        "typeOfOptions": fm.get("options_type"),
        "numberOfOptions": fm.get("number_of_options"),
        "facilitatorLevel": facilitator,
        "rgLevel": rg,
        "time": parse_time(fm.get("time")),
        "funFactor": fm.get("fun_factor"),
        "safety": int(fm["safety"]) if fm.get("safety") else None,
        "materials": fm.get("materials"),
        "materialItems": items,
        "materialsNote": materials_note,
        "website": glance(sec["At a glance"], "Website"),
        "purpose": plain(sec["Purpose"]),
        "inShort": plain(sec["How it works"]),
        "stepByStep": steps,
        "tipsAndTricks": plain(sec["Facilitator tips"]),
        "variants": plain(sec["Variants"]),
        "background": plain(sec["Background"]),
        "custom": False,
        "source": f"Road Map for CPS Techniques (Heijne & van der Meer, 2019), §{section}"
        + (f", pp. {pages.group(1)}" if pages else "")
        + (f". {step_intro}" if step_intro else ""),
        "pendingTranscription": False,
    }
    first_page = re.search(r"pp?\. (\d+)", fm.get("source", ""))
    page_png = first_page and title_page(vault, int(first_page.group(1)))
    if page_png and crop_header(page_png, os.path.join(HEADERS_DIR, tech["id"] + ".jpg")):
        tech["headerImage"] = f"technique-headers/{tech['id']}.jpg"
    return {k: v for k, v in tech.items() if k == "materialItems" or v not in (None, "", [])}


def section_key(t):
    return tuple(int(x) for x in t["sectionReference"].split("."))


def main():
    vault = sys.argv[1]
    notes = sorted(glob.glob(os.path.join(vault, "**", "3.*.md"), recursive=True))
    book = sorted((convert(p, vault) for p in notes), key=section_key)
    book_ids = {t["id"] for t in book}
    existing = json.load(open(SEED))

    # Keep the hand-curated material items on the techniques that were in the app before the import.
    curated = {t["id"]: t for t in existing if t["id"] in EXISTING_IDS.values()}
    for t in book:
        old = curated.get(t["id"])
        if old and old.get("materialItems"):
            t["materialItems"] = old["materialItems"]
            if old.get("materialsNote"):
                t["materialsNote"] = old["materialsNote"]

    out = book
    ids = [t["id"] for t in out]
    assert len(ids) == len(set(ids)), "duplicate technique ids"

    with open(SEED, "w") as f:
        f.write(format_json(out) + "\n")
    missing = [t["name"] for t in book if "headerImage" not in t]
    print(f"{len(book) - len(missing)} header images cropped" + (f"; none for: {', '.join(missing)}" if missing else ""))
    dropped = [t["id"] for t in existing if t["id"] not in book_ids]
    print(f"{len(out)} book techniques from the vault" + (f"; dropped: {', '.join(dropped)}" if dropped else ""))


def format_json(value, indent=0):
    """Matches the seed files' style: flat objects and short flat arrays inline."""
    def inline(v):
        s = json.dumps(v, ensure_ascii=False, separators=(", ", ": "))
        return "{ " + s[1:-1] + " }" if isinstance(v, dict) and v else s

    def flat(v):
        vals = v.values() if isinstance(v, dict) else v
        return all(not isinstance(x, (dict, list)) for x in vals)

    if not isinstance(value, (dict, list)) or (
        indent > 0 and flat(value) and (isinstance(value, dict) or len(inline(value)) <= 100)
    ):
        return inline(value)
    pad, end = "  " * (indent + 1), "  " * indent
    if isinstance(value, list):
        return "[\n" + ",\n".join(pad + format_json(x, indent + 1) for x in value) + "\n" + end + "]" if value else "[]"
    return "{\n" + ",\n".join(
        pad + json.dumps(k, ensure_ascii=False) + ": " + format_json(x, indent + 1) for k, x in value.items()
    ) + "\n" + end + "}"


if __name__ == "__main__":
    main()
