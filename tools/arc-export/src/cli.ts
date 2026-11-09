/**
 * 使い方:
 *   pnpm -C tools/arc-export run export -- --out ~/Downloads/arc-bookmarks.html
 *
 * オプション:
 *   --input <path>        StorableSidebar.json の場所（既定: ~/Library/Application Support/Arc/StorableSidebar.json）
 *   --out <path>          書き出す HTML（既定: ~/Downloads/arc-bookmarks.html）
 *   --include-unpinned    ピン留めしていないタブも「開いていたタブ」フォルダに入れる
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { countFolders, countLinks, parseArcSidebar, toNetscapeHtml } from './convert.ts';

function expandHome(path: string): string {
  return path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const args = process.argv.slice(2);
const input = resolve(
  expandHome(argValue(args, '--input') ?? '~/Library/Application Support/Arc/StorableSidebar.json'),
);
const out = resolve(expandHome(argValue(args, '--out') ?? '~/Downloads/arc-bookmarks.html'));
const includeUnpinned = args.includes('--include-unpinned');

const exp = parseArcSidebar(JSON.parse(readFileSync(input, 'utf-8')));
writeFileSync(out, toNetscapeHtml(exp, { includeUnpinned }), 'utf-8');

console.log(`書き出しました: ${out}`);
console.log(`  Favorites: ${countLinks(exp.favorites)} 件`);
for (const space of exp.spaces) {
  console.log(
    `  Space「${space.title}」: ピン留め ${countLinks(space.pinned)} 件 / フォルダ ${countFolders(space.pinned)} 個` +
      (includeUnpinned ? ` / 開いていたタブ ${countLinks(space.unpinned)} 件` : ''),
  );
}
if (exp.skipped > 0) {
  console.log(`  http(s) 以外のため除いた URL: ${exp.skipped} 件`);
}
