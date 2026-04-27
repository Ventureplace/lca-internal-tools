// One-shot extractor: docs/Remedy-Product-Requirements.docx → data/prd.json
// Walks the Word XML, groups paragraphs under each Title heading, and emits
// a structured JSON suitable for tabbed rendering on requirements.html.
//
// Run: `node scripts/extract-prd.js`
// Re-run whenever the .docx is replaced. The .docx mirrors the live Google Doc.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const DOCX = path.join(__dirname, '..', 'docs', 'Remedy-Product-Requirements.docx');
const OUT = path.join(__dirname, '..', 'data', 'prd.json');

// docx is a zip — extract document.xml in pure JS so we don't depend on
// `unzip` being on PATH (Windows boxes don't have it by default).
const buf = fs.readFileSync(DOCX);

function readDocumentXml(zip) {
  // Walk the central directory, find document.xml, inflate it.
  const eocd = findEOCD(zip);
  const cdOffset = zip.readUInt32LE(eocd + 16);
  const cdSize = zip.readUInt32LE(eocd + 12);
  const cdEnd = cdOffset + cdSize;
  let p = cdOffset;
  while (p < cdEnd) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central dir');
    const compMethod = zip.readUInt16LE(p + 10);
    const compSize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.slice(p + 46, p + 46 + nameLen).toString('utf-8');
    if (name === 'word/document.xml') {
      // Local file header
      if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('bad local header');
      const lNameLen = zip.readUInt16LE(localOffset + 26);
      const lExtraLen = zip.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const data = zip.slice(dataStart, dataStart + compSize);
      if (compMethod === 0) return data.toString('utf-8');
      if (compMethod === 8) return require('zlib').inflateRawSync(data).toString('utf-8');
      throw new Error(`unsupported method ${compMethod}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('document.xml not found');
}

function findEOCD(zip) {
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('eocd not found');
}

const xml = readDocumentXml(buf);

const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
const styleRe = /<w:pStyle w:val="([^"]+)"/;
const numIdRe = /<w:numId w:val="(\d+)"/;
const textRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
const breakRe = /<w:br[^/]*\/>/g;

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function paraText(body) {
  let out = body.replace(breakRe, '\n');
  let parts = [];
  let m;
  textRe.lastIndex = 0;
  while ((m = textRe.exec(out))) parts.push(decode(m[1]));
  return parts.join('').trim();
}

const tabs = [];
let current = null;
let lastH1 = null;

function pushTab(title) {
  current = { title, slug: slugify(title), blocks: [] };
  tabs.push(current);
  lastH1 = null;
}

function slugify(s) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

let m;
while ((m = paraRe.exec(xml))) {
  const body = m[1];
  const sm = body.match(styleRe);
  const style = sm ? sm[1] : '';
  const text = paraText(body);
  if (!text) continue;

  if (style === 'Title') {
    pushTab(text);
    continue;
  }

  if (!current) {
    // Anything before the first Title goes into a synthetic "Overview" tab.
    pushTab('Overview');
  }

  if (style === 'Heading1') {
    current.blocks.push({ type: 'h1', text });
    lastH1 = text;
    continue;
  }
  if (style === 'Heading2') { current.blocks.push({ type: 'h2', text }); continue; }
  if (style === 'Heading3') { current.blocks.push({ type: 'h3', text }); continue; }
  if (style === 'Heading4') { current.blocks.push({ type: 'h4', text }); continue; }

  // Bullets — Word stores list paragraphs with a numId. Treat them as list items.
  if (numIdRe.test(body)) {
    const last = current.blocks[current.blocks.length - 1];
    if (last && last.type === 'ul') last.items.push(text);
    else current.blocks.push({ type: 'ul', items: [text] });
    continue;
  }

  // Plain paragraph
  current.blocks.push({ type: 'p', text });
}

// Coalesce consecutive identical Title entries (some tabs have a Title + matching H1).
for (const tab of tabs) {
  // If the first block is an h1 with the same text as the title, drop it.
  if (tab.blocks[0] && tab.blocks[0].type === 'h1' && tab.blocks[0].text === tab.title) {
    tab.blocks.shift();
  }
}

// Skip tabs with effectively no content.
const filtered = tabs.filter(t => t.blocks.length > 0);

// Add ordering metadata + emoji aware display labels.
const result = {
  source: 'docs/Remedy-Product-Requirements.docx',
  liveUrl: 'https://docs.google.com/document/d/1HdfdZtL0KOb18bckkjuoeCI2cCYwgHTrs_-keUR7B3k/edit',
  generatedAt: new Date().toISOString(),
  tabs: filtered.map((t, i) => ({ ...t, order: i })),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`Wrote ${result.tabs.length} tabs to ${OUT}`);
console.log('Tabs:');
for (const t of result.tabs) console.log(`  - ${t.title} (${t.blocks.length} blocks)`);
