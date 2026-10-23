// Turns the module reviewer PDFs into data/modules.json.
// Usage: node tools/import-pdfs.mjs "C:\path\Module_1_Reviewer.pdf" ...
// Needs poppler's pdftohtml on PATH (winget install oschwartz10612.Poppler).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋' };
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻' };
// The PDFs draw every small piece low, even charges. Digits stay subscript (O₂, HCO₃⁻); charges go up (H⁺, Ca²⁺).
// shortcut: only knows the "2", "3–", "2+" and "+" pieces these PDFs use; check new modules' formulas.
const scriptText = (t) => [...t].map((c) => (/[+\-−–]/.test(c) || /\+$/.test(t) ? SUP : SUB)[c === '–' ? '-' : c] ?? c).join('');
const script = (raw) => raw.replace(/>([^<]*)</g, (_, t) => '>' + scriptText(t) + '<').replace(/^[^<]+/, scriptText);

// pdftohtml splits a line wherever a subscript/superscript sits (CO₂, HCO₃⁻); glue those pieces back.
function readLines(xml) {
  const sizes = {};
  for (const [, id, size] of xml.matchAll(/<fontspec id="(\d+)" size="(\d+)"/g)) sizes[id] = +size;
  const lines = [];
  for (const [, top, left, width, font, raw] of xml.matchAll(/<text top="(\d+)" left="(\d+)" width="(\d+)" height="\d+" font="(\d+)">(.*?)<\/text>/g)) {
    const el = { top: +top, left: +left, right: +left + +width, size: sizes[font], raw };
    const line = lines.at(-1);
    if (line && Math.abs(el.top - line.top) <= 6 && el.left >= line.right - 2) {
      const piece = el.size < line.size ? script(el.raw) : el.raw;
      line.raw = (line.raw + (el.left - line.right > 3 ? ' ' : '') + piece).replace(/<\/b>(\s*)<b>/g, '$1');
      line.right = el.right;
    } else lines.push(el);
  }
  return lines;
}

function parsePdf(file) {
  const xml = execFileSync('pdftohtml', ['-xml', '-i', '-q', '-enc', 'UTF-8', '-stdout', file], { encoding: 'utf8', maxBuffer: 64 << 20 });

  const mod = { title: '', course: '', topics: '', groups: [] };
  const skipped = [];
  let group = null, item = null;

  for (const { left, size, raw } of readLines(xml)) {
    const text = decode(raw);
    if (!text || size <= 14) continue; // page footer
    if (size >= 30) { mod.title = text; continue; }
    if (!mod.title) { mod.course = text; continue; }
    if (size >= 19 && /^<b>.*<\/b>$/.test(raw)) { group = { name: text, items: [] }; mod.groups.push(group); item = null; continue; }
    if (!group) { mod.topics = (mod.topics + ' ' + text).trim(); continue; }

    const m = raw.match(/^<b>(.+?)<\/b>\s*–\s*(.*)$/);
    if (m) { item = { name: decode(m[1]), description: decode(m[2]) }; group.items.push(item); continue; }
    if (item && +left >= 88) { item.description += ' ' + text; continue; }
    item = null; // group intro line, not a quiz item
    skipped.push(`${group.name}: ${text}`);
  }
  return { mod, skipped };
}

const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: node tools/import-pdfs.mjs <pdf>...'); process.exit(1); }

const modules = files.map((f) => {
  const { mod, skipped } = parsePdf(f);
  const counts = mod.groups.map((g) => `${g.items.length}`).join(' ');
  console.log(`\n${mod.title}: ${mod.groups.length} groups, ${mod.groups.reduce((n, g) => n + g.items.length, 0)} items  [${counts}]`);
  for (const g of mod.groups) {
    if (g.items.length < 2) console.log(`  ! "${g.name}" has ${g.items.length} item(s): not enough for a question`);
    const names = g.items.map((i) => i.name);
    if (new Set(names).size !== names.length) console.log(`  ! "${g.name}" has duplicate names`);
  }
  for (const s of skipped) console.log(`  intro (not a question): ${s}`);
  return mod;
}).sort((a, b) => parseInt(a.title.match(/\d+/)) - parseInt(b.title.match(/\d+/)));

writeFileSync(new URL('../data/modules.json', import.meta.url), JSON.stringify({ modules }, null, 1) + '\n');
console.log('\nWrote data/modules.json');
