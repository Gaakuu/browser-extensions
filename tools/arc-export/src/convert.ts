/**
 * Arc の StorableSidebar.json を、Chrome に取り込めるブックマーク（Netscape 形式の HTML）に変換する。
 *
 * - Favorites（上部のアイコン）→ ブックマークバーの直下
 * - 各 Space のピン留め → ブックマークバーの「Space 名」フォルダ（フォルダの入れ子はそのまま）
 * - ピン留めしていないタブ → `includeUnpinned` のときだけ「Space 名 / 開いていたタブ」
 *
 * 読むのはサイドバーの構造（タイトルと URL）だけ。履歴・Cookie・パスワードには触れない。
 */

export type BookmarkNode =
  | { type: 'folder'; title: string; children: BookmarkNode[] }
  | { type: 'link'; title: string; url: string; addDate?: number };

export interface ArcSpaceExport {
  title: string;
  pinned: BookmarkNode[];
  unpinned: BookmarkNode[];
}

export interface ArcExport {
  favorites: BookmarkNode[];
  spaces: ArcSpaceExport[];
  /** http(s) 以外で取り込めないため除いた URL の数 */
  skipped: number;
}

interface ArcItem {
  id: string;
  title?: string | null;
  childrenIds?: string[];
  createdAt?: number;
  data?: {
    tab?: { savedURL?: string; savedTitle?: string };
    list?: unknown;
    itemContainer?: unknown;
  };
}

interface ArcSpace {
  id: string;
  title?: string | null;
  containerIDs?: unknown[];
}

interface ArcContainer {
  items?: unknown[];
  spaces?: unknown[];
  topAppsContainerIDs?: unknown[];
}

/** Arc の createdAt は 2001-01-01 起点の秒。Unix 秒に直す差分 */
const APPLE_EPOCH_OFFSET = 978307200;

const UNPINNED_FOLDER_TITLE = '開いていたタブ';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Arc は `[id, obj, id, obj, ...]` の形で並べる。id → obj の Map にする */
function toMap<T extends { id: string }>(list: unknown[] | undefined): Map<string, T> {
  const map = new Map<string, T>();
  if (!list) return map;
  for (const entry of list) {
    if (isRecord(entry) && typeof entry.id === 'string') {
      map.set(entry.id, entry as unknown as T);
    }
  }
  return map;
}

/** `['pinned', id, 'unpinned', id]` のような交互の並びから、役割 → id を取る */
function rolesOf(containerIDs: unknown[] | undefined): Map<string, string> {
  const roles = new Map<string, string>();
  if (!containerIDs) return roles;
  for (let i = 0; i + 1 < containerIDs.length; i += 2) {
    const role = containerIDs[i];
    const id = containerIDs[i + 1];
    if (typeof role === 'string' && typeof id === 'string') roles.set(role, id);
  }
  return roles;
}

function isImportableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
}

function findContainer(json: unknown): ArcContainer {
  const containers = (json as { sidebar?: { containers?: unknown[] } })?.sidebar?.containers;
  if (!Array.isArray(containers)) {
    throw new Error('StorableSidebar.json の形が想定と違います（sidebar.containers がありません）');
  }
  const found = containers.find(
    (c) => isRecord(c) && Array.isArray(c.items) && Array.isArray(c.spaces),
  );
  if (!found) {
    throw new Error('StorableSidebar.json にスペースの情報が見つかりません');
  }
  return found as ArcContainer;
}

export function parseArcSidebar(json: unknown): ArcExport {
  const container = findContainer(json);
  const items = toMap<ArcItem>(container.items);
  const spaces = toMap<ArcSpace>(container.spaces);
  let skipped = 0;

  const build = (ids: string[] | undefined, seen: Set<string>): BookmarkNode[] => {
    const nodes: BookmarkNode[] = [];
    for (const id of ids ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const item = items.get(id);
      if (!item) continue;
      const tab = item.data?.tab;
      if (tab) {
        const url = tab.savedURL ?? '';
        if (!isImportableUrl(url)) {
          skipped += 1;
          continue;
        }
        nodes.push({
          type: 'link',
          // ピン留めの名前を変えていれば item.title、なければページのタイトル
          title: item.title || tab.savedTitle || url,
          url,
          addDate:
            typeof item.createdAt === 'number'
              ? Math.round(item.createdAt + APPLE_EPOCH_OFFSET)
              : undefined,
        });
      } else if (item.data && 'list' in item.data) {
        nodes.push({
          type: 'folder',
          title: item.title || 'フォルダ',
          children: build(item.childrenIds, seen),
        });
      } else {
        // 分割表示などの入れ物は、中のタブを同じ階層に並べる
        nodes.push(...build(item.childrenIds, seen));
      }
    }
    return nodes;
  };

  const favorites: BookmarkNode[] = [];
  const favoritesSeen = new Set<string>();
  const topApps = topAppRootIds(container.topAppsContainerIDs);
  for (const rootId of topApps) {
    favorites.push(...build(items.get(rootId)?.childrenIds, favoritesSeen));
  }

  const spaceExports: ArcSpaceExport[] = [];
  for (const space of spaces.values()) {
    const roles = rolesOf(space.containerIDs);
    const seen = new Set<string>();
    const pinnedId = roles.get('pinned');
    const unpinnedId = roles.get('unpinned');
    spaceExports.push({
      title: space.title || 'Space',
      pinned: pinnedId ? build(items.get(pinnedId)?.childrenIds, seen) : [],
      unpinned: unpinnedId ? build(items.get(unpinnedId)?.childrenIds, seen) : [],
    });
  }

  return { favorites, spaces: spaceExports, skipped };
}

/** topAppsContainerIDs は `[{ default: true }, id, ...]`。文字列の id だけを拾う */
function topAppRootIds(list: unknown[] | undefined): string[] {
  if (!list) return [];
  const ids: string[] = [];
  for (let i = 0; i + 1 < list.length; i += 2) {
    const id = list[i + 1];
    if (typeof id === 'string') ids.push(id);
  }
  return ids;
}

export function countLinks(nodes: BookmarkNode[]): number {
  return nodes.reduce(
    (sum, node) => sum + (node.type === 'link' ? 1 : countLinks(node.children)),
    0,
  );
}

export function countFolders(nodes: BookmarkNode[]): number {
  return nodes.reduce(
    (sum, node) => sum + (node.type === 'folder' ? 1 + countFolders(node.children) : 0),
    0,
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderNodes(nodes: BookmarkNode[], depth: number): string[] {
  const indent = '    '.repeat(depth);
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.type === 'link') {
      const addDate = node.addDate ? ` ADD_DATE="${node.addDate}"` : '';
      lines.push(
        `${indent}<DT><A HREF="${escapeHtml(node.url)}"${addDate}>${escapeHtml(node.title)}</A>`,
      );
    } else {
      lines.push(`${indent}<DT><H3>${escapeHtml(node.title)}</H3>`);
      lines.push(`${indent}<DL><p>`);
      lines.push(...renderNodes(node.children, depth + 1));
      lines.push(`${indent}</DL><p>`);
    }
  }
  return lines;
}

export interface HtmlOptions {
  includeUnpinned?: boolean;
}

/** ブックマークバーに置く形のツリーにする */
export function toBookmarkBar(exp: ArcExport, options: HtmlOptions = {}): BookmarkNode[] {
  const bar: BookmarkNode[] = [...exp.favorites];
  for (const space of exp.spaces) {
    const children = [...space.pinned];
    if (options.includeUnpinned && space.unpinned.length > 0) {
      children.push({ type: 'folder', title: UNPINNED_FOLDER_TITLE, children: space.unpinned });
    }
    if (children.length > 0) {
      bar.push({ type: 'folder', title: space.title, children });
    }
  }
  return bar;
}

export function toNetscapeHtml(exp: ArcExport, options: HtmlOptions = {}): string {
  const bar = toBookmarkBar(exp, options);
  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. Generated from Arc by arc-export. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    '    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>',
    '    <DL><p>',
    ...renderNodes(bar, 2),
    '    </DL><p>',
    '</DL><p>',
    '',
  ].join('\n');
}
