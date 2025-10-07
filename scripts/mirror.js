#!/usr/bin/env node
/*
Mirror key files between top-level app and psa-source to keep them in sync.
Usage:
  node scripts/mirror.js             # default: top-level -> psa-source
  node scripts/mirror.js --to-root   # psa-source -> top-level

You can customize the file list below. Paths are relative to repo root.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PSA_SOURCE_DIR = path.join(ROOT, 'psa-source');

// Files to sync (top-level <-> psa-source)
const FILES = [
  'app/api/settings/route.ts',
  'app/api/fallback/route.ts',
  'app/settings/page.tsx',
  'components/ChatInput.tsx',
  'lib/store.ts',
  'lib/types.ts',
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log(`Copied: ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dst)}`);
}

function main() {
  const toRoot = process.argv.includes('--to-root') || process.argv.includes('--direction=to-root');
  const toSource = !toRoot; // default

  for (const rel of FILES) {
    const topPath = path.join(ROOT, rel);
    const sourcePath = path.join(PSA_SOURCE_DIR, rel);

    if (toSource) {
      if (!fs.existsSync(topPath)) {
        console.warn(`Skip (missing top-level): ${rel}`);
        continue;
      }
      copyFile(topPath, sourcePath);
    } else {
      if (!fs.existsSync(sourcePath)) {
        console.warn(`Skip (missing psa-source): ${rel}`);
        continue;
      }
      copyFile(sourcePath, topPath);
    }
  }

  console.log('\nMirror complete.');
}

if (require.main === module) {
  main();
}
