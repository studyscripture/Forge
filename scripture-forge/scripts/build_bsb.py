#!/usr/bin/env python3
"""
scripts/build_bsb.py
Convert bsb.txt → data/bsb.json
Usage: python3 scripts/build_bsb.py bsb.txt
"""
import json, re, sys, os

def build(src, dst):
    verses = []
    with open(src, 'r', encoding='utf-8-sig') as f:
        for line in f:
            line = line.rstrip('\n')
            if '\t' not in line:
                continue
            parts = line.split('\t', 1)
            if len(parts) != 2:
                continue
            ref, text = parts[0].strip(), parts[1].strip()
            if not text or ref in ('Verse', ''):
                continue
            m = re.match(r'^(.+?)\s+(\d+):(\d+)$', ref)
            if not m:
                continue
            book, chapter, verse = m.group(1), int(m.group(2)), int(m.group(3))
            verses.append({"r": ref, "b": book, "c": chapter, "v": verse, "t": text})

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'w') as f:
        json.dump(verses, f, separators=(',', ':'))

    print(f"✓ {len(verses)} verses → {dst} ({os.path.getsize(dst) // 1024}KB)")

if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else 'bsb.txt'
    dst = sys.argv[2] if len(sys.argv) > 2 else 'data/bsb.json'
    build(src, dst)
