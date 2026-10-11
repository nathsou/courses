# Slims the kaikki.org German dictionary (English Wiktionary extract, CC BY-SA 4.0 / GFDL) to what the course
# needs. Usage:
#   curl -sS https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl \
#     | python3 scripts/slim-wiktionary.py | gzip > build/wiktionary-de.jsonl.gz
import sys, json
keep_pos = {"noun","verb","adj","adv","prep","conj","pron","det","article","num","intj","particle","name","phrase","prep_phrase","contraction","postp"}
for line in sys.stdin:
    try:
        e = json.loads(line)
    except Exception:
        continue
    if e.get("lang_code") != "de": continue
    pos = e.get("pos")
    if pos not in keep_pos: continue
    glosses = []
    form_of = []
    tags = set()
    for s in e.get("senses", [])[:6]:
        g = s.get("glosses") or s.get("raw_glosses")
        if g: glosses.append(g[-1])
        for f in s.get("form_of", []) or []:
            if f.get("word"): form_of.append(f["word"])
        for t in s.get("tags", []) or []: tags.add(t)
    forms = [{"f": f.get("form"), "t": f.get("tags", [])} for f in e.get("forms", []) or [] if f.get("form")]
    ht = [h.get("expansion","") for h in e.get("head_templates", []) or []]
    out = {"w": e.get("word"), "p": pos, "g": glosses, "fo": form_of, "tg": sorted(tags), "f": forms, "h": ht}
    snd = [s.get("ipa") for s in e.get("sounds", []) or [] if s.get("ipa")]
    if snd: out["ipa"] = snd[0]
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
