#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve(__dirname, "..");

const NBSP = " ";

const SHORT = [
  "обо", "ото", "изо", "через", "перед", "между", "чтобы", "либо",
  "во", "со", "ко", "для", "без", "при", "над", "под", "про", "или",
  "что", "как", "чем", "если", "уже", "их",
  "в", "с", "к", "у", "о", "об", "по", "до", "от", "из", "за", "на",
  "и", "а", "но", "же", "ли", "бы", "то", "не",
];
const group = SHORT.join("|");

const reNbsp = new RegExp(`(?<![\\p{L}\\p{N}_])(${group})[ \\t]+(?=\\S)`, "giu");
const reDash = /([^\s ])[  ]+[-–—][  ]+(?=\S)/gu;

function typo(s) {
  let out = s.replace(reDash, `$1${NBSP}— `);
  let prev;
  do {
    prev = out;
    out = out.replace(reNbsp, `$1${NBSP}`);
  } while (out !== prev);
  return out;
}

function typoProtect(text, patterns) {
  const stash = [];
  let masked = text;
  for (const re of patterns) {
    masked = masked.replace(re, (m) => {
      stash.push(m);
      return `\x00${stash.length - 1}\x00`;
    });
  }
  masked = typo(masked);
  return masked.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]);
}

function processErb(text) {
  return typoProtect(text, [/<(script|style)\b[\s\S]*?<\/\1>/gi]);
}

function processMarkdown(text) {
  return typoProtect(text, [
    /```[\s\S]*?```/g,
    /~~~[\s\S]*?~~~/g,
    /`[^`\n]+`/g,
  ]);
}

function processYaml(text) {
  return typo(text);
}

function walk(dir, filterFn, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filterFn, acc);
    else if (filterFn(full)) acc.push(full);
  }
  return acc;
}

const countNbsp = (s) => (s.match(/ /g) || []).length;

const targets = [
  ...walk(path.join(ROOT, "app/views"), (f) => f.endsWith(".erb"), []).map((f) => [f, processErb]),
  ...walk(path.join(ROOT, "config/locales"), (f) => f.endsWith(".yml"), []).map((f) => [f, processYaml]),
  ...walk(path.join(ROOT, "docs/articles"), (f) => f.endsWith(".md"), []).map((f) => [f, processMarkdown]),
];

let changed = 0;
let scanned = 0;
for (const [file, fn] of targets) {
  scanned++;
  const original = fs.readFileSync(file, "utf8");
  const updated = fn(original);
  if (updated !== original) {
    changed++;
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (DRY) {
      console.log(`  would change  ${rel}  (+${countNbsp(updated) - countNbsp(original)} nbsp)`);
    } else {
      fs.writeFileSync(file, updated);
      console.log(`  updated  ${rel}`);
    }
  }
}

console.log(`\n${DRY ? "[dry] " : ""}Files scanned: ${scanned}, ${DRY ? "to change" : "changed"}: ${changed}`);
