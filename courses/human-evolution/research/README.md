# Human evolution source research

Retrieved on 4 October 2026 using pre-existing YouTube captions. No audio or video was downloaded, listened to, or transcribed by this project.

The [six lectures](https://www.college-de-france.fr/fr/agenda/cours/traits-de-vie-et-contraintes-energetiques-au-cours-de-evolution-humaine) are Jean-Jacques Hublin's 2017 teaching series. They total 9 h 18 min 15 s in the retrieved video metadata. The associated [Energetics of the Hominins symposium](https://www.college-de-france.fr/fr/agenda/colloque/energetics-of-the-hominins), held on 11 and 12 June 2018, contains 17 programme entries: 15 scientific presentations and two opening or closing contributions. Sixteen recordings have captions and total 5 h 34 min 8 s. Wil Roebroeks's presentation is explicitly marked **Non enregistré** on the programme.

## Files and provenance

[sources.json](sources.json) records every lecture and symposium entry, official page, video ID, duration, language, caption type, local filename and SHA-256 checksum. All 22 retrieved caption files are YouTube automatic captions: French for the lectures, English for the symposium recordings. They were already available before retrieval. Availability should not be confused with editorial accuracy.

`transcripts/<video-id>.<language>.vtt` preserves the downloaded file unchanged. The matching `.txt` is a mechanical reading copy that strips caption markup and overlapping rolling text, keeping timestamps. It does not correct spelling, names, numbers or scientific claims. For example, the captions sometimes confuse *azote* with *carbone*, mangle species and researcher names, or render *hominines* as unrelated words. Consult the original publication before adopting a numerical value or technical term.

The complete captions remain locally available in `transcripts/`. Loose captions and compact metadata are ignored by Git. The tracked [hublin-transcripts.zip](hublin-transcripts.zip) contains all 22 unchanged VTTs, 22 timestamped reading copies, the plan and scientific update review, this README, the manifest, discovery inventories, preparation script and compact video metadata. It is a repository handoff artifact outside the published site. Metadata includes IDs, titles, durations and caption type/track information; authentication data and temporary caption URLs are excluded. [hublin-transcripts.zip.sha256](hublin-transcripts.zip.sha256) records the archive checksum. These two archive links refer to the repository copies; the ZIP does not recursively include itself or its checksum.

To unpack the source bundle:

```sh
unzip courses/human-evolution/research/hublin-transcripts.zip -d /private/tmp/hublin-source-bundle
```

The resulting `hublin-source-bundle/hublin-transcripts/` directory preserves the course's `docs/` and `research/` layout. `research/sources.json` contains relative paths to each caption and reading copy. One unrecorded contribution is represented in the manifest and has no invented caption file. Original full metadata and fetched HTML remain in `/private/tmp/hublin-transcripts/`; reading or reproducing the packaged sources does not depend on them.

## Retrieval procedure

The IDs were extracted from the embedded YouTube players on the official event pages. The user-supplied `aD-FSZnSchM` is lecture 1, not a recording of the entire series.

The caption retrieval command used for the lectures was:

```sh
yt-dlp --skip-download --write-subs --write-auto-subs \
  --sub-langs fr --sub-format vtt --write-info-json \
  --sleep-subtitles 3 \
  -o '/private/tmp/hublin-transcripts/%(id)s.%(ext)s' \
  'https://www.youtube.com/watch?v=aD-FSZnSchM' \
  'https://www.youtube.com/watch?v=b5vIozqS40k' \
  'https://www.youtube.com/watch?v=59iN7qmEk44' \
  'https://www.youtube.com/watch?v=0ZlU1A0OQmc' \
  'https://www.youtube.com/watch?v=XkEhFRMi3xI' \
  'https://www.youtube.com/watch?v=OCoxju1dzCE'
```

The symposium used the same flags with `--sub-langs en` and a batch file of the 16 video URLs in `sources.json`. Requesting an unnecessary English translation of the first French lecture initially returned HTTP 429; the French caption succeeded. Subsequent retrieval requested only the recording's native caption language and all 22 requested files succeeded. The log's format selection messages do not mean media was downloaded: `--skip-download` was used throughout.

`python3 prepare_sources.py /private/tmp/hublin-transcripts` reproduces the persistent manifest and reading copies from the original discovery inventories and downloaded files. The tracked inventories and compact metadata also let it read the extracted handoff bundle:

```sh
python3 courses/human-evolution/research/prepare_sources.py \
  /private/tmp/hublin-source-bundle/hublin-transcripts/research
```

It uses only Python's standard library and does not access a transcription service. The manifest's retrieval date records this source snapshot. The script does not download captions; rerunning `yt-dlp` retrieves whatever pre-existing tracks are available at that later time.

## Review method and limits

The course survey used timestamped samples throughout every recording, then closer reading of passages relevant to the proposed interactions and seminar decisions. It covers the entire series and all recorded symposium contributions; it is not a line-by-line corrected edition of the captions. Topic ranges in the plan are navigation aids, not verified sentence-level citation boundaries. No slides were inspected, so slide-dependent data must be recovered from a publication or a separately inspected source before implementation.

Checks performed: all six lecture IDs match their official pages; every recorded symposium entry has a local VTT and reading copy; each file begins with WEBVTT; the caption track type is recorded from video metadata; each caption's last timestamp is within the final 1% of its recording; checksums match the copied VTTs. Endpoint coverage establishes that the files span the recordings, not that every spoken word was captured correctly.

For implementation, build a claim ledger with exact caption intervals, primary publications, units, populations, figure provenance, uncertainty and any later revision. The [scientific update review](../docs/SCIENTIFIC-UPDATES.md) specifies targeted revisions from later primary research and explicitly lists remaining audits. It is not a completed review of every claim through 2026.
