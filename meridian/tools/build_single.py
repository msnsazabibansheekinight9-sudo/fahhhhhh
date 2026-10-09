#!/usr/bin/env python3
"""Bundle meridian/index.html and its js/ files into one HTML page.

Usage: build_single.py OUT.html [--fragment] [--url URL]
  --fragment  omit <!doctype>/<html>/<head>/<body> wrappers (for hosts that add their own skeleton)
  --url       value substituted for %%ARTIFACT_URL%% (the "Open in Chrome" link)
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
out = pathlib.Path(args[0])
fragment = '--fragment' in args
url = args[args.index('--url') + 1] if '--url' in args else None
html = (root / 'index.html').read_text()

def inline(m):
    src = m.group(1)
    code = (root / src).read_text()
    assert '</script' not in code, src
    return '<script>\n' + code + '\n</script>'

html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
if url:
    html = html.replace('%%ARTIFACT_URL%%', url)
if fragment:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    head = re.sub(r'<meta[^>]*>\n?', '', head)
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    html = head.strip() + '\n' + body.strip() + '\n'
out.write_text(html)
print(out, len(html))
