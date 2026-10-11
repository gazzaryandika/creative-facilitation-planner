#!/usr/bin/env python3
"""
Rebuilds src/data/seed/techniques.json from the Road Map technique notes in the
IDEM104 Obsidian vault ("Techniques Database" folder, one 3.x.y note per technique).

    python3 scripts/import-techniques.py "<path to Techniques Database>"

Book techniques are regenerated from the notes on every run. Team-authored and
derived techniques (anything without a matching note, e.g. Ice breaker, C-Box,
Wrap up) are kept exactly as they are in the current JSON. Ids already used in
the JSON are kept, so seed templates and saved plans keep resolving.
"""

import glob
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(REPO, "src", "data", "seed", "techniques.json")

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


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")


def convert(path):
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
    return {k: v for k, v in tech.items() if k == "materialItems" or v not in (None, "", [])}


def section_key(t):
    return tuple(int(x) for x in t["sectionReference"].split("."))


def main():
    vault = sys.argv[1]
    notes = sorted(glob.glob(os.path.join(vault, "**", "3.*.md"), recursive=True))
    book = sorted((convert(p) for p in notes), key=section_key)
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

    kept = [t for t in existing if t["id"] not in book_ids]
    out = book + kept
    ids = [t["id"] for t in out]
    assert len(ids) == len(set(ids)), "duplicate technique ids"

    with open(SEED, "w") as f:
        f.write(format_json(out) + "\n")
    print(f"{len(book)} book techniques from the vault, {len(kept)} team/derived techniques kept, {len(out)} total")


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
