import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const IGNORED_FA_CLASSES = new Set(['fa-solid', 'fa-regular', 'fa-brands', 'fa-spin']);
const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.css']);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });
}

function iconClassesUsedByApp(): string[] {
  const files = [
    path.join(ROOT, 'index.html'),
    ...walk(path.join(ROOT, 'src')).filter((file) => !file.endsWith('fontawesomeSubset.test.ts')),
  ];
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  return Array.from(new Set(source.match(/\bfa-[a-z0-9-]+\b/g) || []))
    .filter((cls) => !IGNORED_FA_CLASSES.has(cls))
    .sort();
}

describe('local Font Awesome subset', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const subset = fs.readFileSync(path.join(ROOT, 'public', 'fontawesome-subset.css'), 'utf8');

  it('does not load the full remote Font Awesome stylesheet', () => {
    expect(index).not.toMatch(/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/i);
    expect(index).toContain('/fontawesome-subset.css');
  });

  it('covers every icon class used by the app', () => {
    const missing = iconClassesUsedByApp().filter((cls) => !subset.includes(`.${cls}::before`));
    expect(missing).toEqual([]);
  });
});
