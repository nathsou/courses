"""Prepare already-existing YouTube captions; never transcribe audio.

Usage: python3 prepare_sources.py /private/tmp/hublin-transcripts
The input directory contains inventory.json, symposium-inventory.json,
metadata and existing captions. Metadata may be in retrieval-metadata/;
captions may be in transcripts/, as in the handoff archive.
"""

import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parent


def captions_to_rows(source):
    """Remove markup and overlapping rolling captions, preserving timestamps.

    This is a mechanical reading copy, not a corrected or generated transcript.
    The unchanged VTT file remains the authoritative retrieved artifact.
    """
    previous = []
    rows = []
    for block in source.split("\n\n"):
        lines = block.splitlines()
        timing = next((line for line in lines if " --> " in line), None)
        if timing is None:
            continue
        raw = " ".join(lines[lines.index(timing) + 1:])
        words = html.unescape(re.sub(r"<[^>]*>", "", raw)).split()
        overlap = 0
        for count in range(min(len(previous), len(words)), 0, -1):
            if previous[-count:] == words[:count]:
                overlap = count
                break
        if words[overlap:]:
            rows.append((timing.split(" --> ")[0], " ".join(words[overlap:])))
        previous = words
    return rows


def main():
    source_dir = Path(sys.argv[1])
    output = ROOT / "transcripts"
    output.mkdir(exist_ok=True)
    entries = []
    for filename, category, language in [
        ("inventory.json", "lecture", "fr"),
        ("symposium-inventory.json", "symposium", "en"),
    ]:
        items = json.loads((source_dir / filename).read_text())
        if category == "lecture":
            items = items[:6]
        for item in items:
            entry = {
                "category": category,
                "slug": item["slug"],
                "source_page": item["url"],
                "retrieved_on": "2026-10-04",
            }
            if not item.get("video_ids"):
                entry.update(status="not_recorded", note="Official programme marks this talk Non enregistré.")
                entries.append(entry)
                continue
            video_id, = item["video_ids"]
            metadata_file = source_dir / (video_id + ".info.json")
            if not metadata_file.exists():
                metadata_file = source_dir / "retrieval-metadata" / metadata_file.name
            meta = json.loads(metadata_file.read_text())
            vtt = source_dir / (video_id + "." + language + ".vtt")
            if not vtt.exists():
                vtt = source_dir / "transcripts" / vtt.name
            if not vtt.exists():
                raise FileNotFoundError(vtt)
            manual = bool(meta.get("subtitles", {}).get(language))
            original = output / vtt.name
            if vtt.resolve() != original.resolve():
                shutil.copyfile(vtt, original)
            rows = captions_to_rows(vtt.read_text())
            reading = original.with_suffix(".txt")
            reading.write_text("\n".join(time + " " + text for time, text in rows) + "\n")
            tracks = (meta.get("subtitles") if manual else meta.get("automatic_captions", {})).get(language, [])
            track = next((track for track in tracks if track.get("ext") == "vtt"), {})
            entry.update(
                status="retrieved",
                video_id=video_id,
                video_url="https://www.youtube.com/watch?v=" + video_id,
                title=meta["title"],
                duration_seconds=meta["duration"],
                language=language,
                caption_kind="manual" if manual else "youtube_automatic",
                caption_track_name=track.get("name"),
                raw_caption_file=str(original.relative_to(ROOT)),
                reading_copy_file=str(reading.relative_to(ROOT)),
                sha256=hashlib.sha256(original.read_bytes()).hexdigest(),
                last_caption_timestamp=rows[-1][0],
                reading_word_count=sum(len(text.split()) for _, text in rows),
            )
            entries.append(entry)
    (ROOT / "sources.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n")
    print(f"Saved {sum(entry['status'] == 'retrieved' for entry in entries)} caption files; {sum(entry['status'] == 'not_recorded' for entry in entries)} unrecorded contribution.")


if __name__ == "__main__":
    main()
