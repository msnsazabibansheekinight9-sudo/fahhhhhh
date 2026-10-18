/* Produce the Artifact build of the page: the hosted viewer wraps the file in
   its own document skeleton, so this strips our <!doctype>/<html>/<head>/<body>
   wrappers and keeps the title, fonts, styles and body content. */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

let src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const head = src.slice(src.indexOf('<head>') + 6, src.indexOf('</head>'));
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));

// keep <title>, the font <link>s and the <style> block from the head
const keep = [];
const title = head.match(/<title>[\s\S]*?<\/title>/);
if (title) keep.push(title[0]);
keep.push('<meta name="claude:viewport-fit-sides" content="cover">');
head.match(/<link[^>]*>/g)?.forEach(l => { if (l.includes('fonts.g')) keep.push(l); });
const style = head.match(/<style>[\s\S]*?<\/style>/);
if (style) keep.push(style[0]);

const out = keep.join('\n') + '\n' + body.trim() + '\n';
fs.writeFileSync(path.join(ROOT, 'artifact.html'), out);
console.log('artifact.html written,', out.length, 'bytes');
if (/<!doctype|<html|<head|<body/i.test(out)) {
  console.error('ERROR: wrapper tags survived the strip');
  process.exit(1);
}
if (!/<title>/.test(out)) { console.error('ERROR: no title'); process.exit(1); }
const scripts = (out.match(/<script src="js\/[^"]+"/g) || []).length;
console.log('script tags:', scripts + 1, '(incl. three.js CDN)');
