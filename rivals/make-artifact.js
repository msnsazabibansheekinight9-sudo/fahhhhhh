#!/usr/bin/env node
// Builds artifact.html from index.html. The published-artifact host wraps the
// file in its own <!doctype>/<head>/<body> skeleton, so the publishable build
// is the same page with that skeleton stripped and the viewport-fit promise
// added. Run `node make-artifact.js` after editing index.html.
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const head = src.slice(src.indexOf('<title>'), src.indexOf('</head>'));
const body = src.slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'));

const out = `<title>Rifle Rivals</title>
<meta name="claude:viewport-fit-sides" content="cover">
${head.replace(/<title>[\s\S]*?<\/title>\s*/, '').trim()}
${body.trim()}
`;
fs.writeFileSync(path.join(__dirname, 'artifact.html'), out);
console.log('artifact.html written, ' + out.split('\n').length + ' lines');
