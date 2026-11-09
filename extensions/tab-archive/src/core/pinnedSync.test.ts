import { describe, expect, it } from 'vitest';
import { assignSlots, insertIndex, insertSlot, reorderSlots, sameOrder } from './pinnedSync';

const tab = (id: number, index: number, url: string): chrome.tabs.Tab =>
  ({ id, index, url, pinned: true, windowId: 1 }) as chrome.tabs.Tab;

const MAIL = 'https://mail.google.com/mail/u/0/';
const CAL = 'https://calendar.google.com/';
const JIRA = 'https://example.atlassian.net/jira';

describe('assignSlots', () => {
  it('表にあるタブはそのまま、無いタブは URL → ホストの順で空いている slot に当てる', () => {
    const tabs = [
      tab(3, 2, 'https://example.atlassian.net/browse/X-1'),
      tab(1, 0, MAIL),
      tab(2, 1, 'https://calendar.google.com/r/week'),
    ];
    const entries = assignSlots(tabs, { '1': MAIL }, [MAIL, CAL, JIRA]);
    expect(entries.map((e) => [e.tab.id, e.slot])).toEqual([
      [1, MAIL],
      [2, CAL],
      [3, JIRA],
    ]);
  });

  it('同じ slot を2つのタブに当てない。skipTabId のタブには当てない', () => {
    const tabs = [tab(1, 0, MAIL), tab(2, 1, `${MAIL}#inbox`)];
    expect(assignSlots(tabs, {}, [MAIL]).map((e) => e.slot)).toEqual([MAIL, undefined]);
    expect(assignSlots(tabs, {}, [MAIL], 1).map((e) => e.slot)).toEqual([undefined, MAIL]);
  });

  it('一覧から外れた slot は表にあっても使わない', () => {
    expect(assignSlots([tab(1, 0, MAIL)], { '1': 'https://old/' }, [MAIL])[0].slot).toBe(MAIL);
  });
});

describe('insertSlot', () => {
  it('左隣の slot の後ろ、左隣が無ければ先頭に入れる', () => {
    expect(insertSlot([MAIL, CAL], JIRA, MAIL)).toEqual([MAIL, JIRA, CAL]);
    expect(insertSlot([MAIL, CAL], JIRA, undefined)).toEqual([JIRA, MAIL, CAL]);
    expect(insertSlot([MAIL, CAL], MAIL, CAL)).toEqual([MAIL, CAL]);
  });
});

describe('reorderSlots', () => {
  it('ウィンドウの並びに合わせ、そのウィンドウに無い slot の位置は動かさない', () => {
    expect(reorderSlots([MAIL, CAL, JIRA], [JIRA, MAIL, CAL])).toEqual([JIRA, MAIL, CAL]);
    // CAL はこのウィンドウで閉じられている
    expect(reorderSlots([MAIL, CAL, JIRA], [JIRA, MAIL])).toEqual([JIRA, CAL, MAIL]);
  });
});

describe('insertIndex', () => {
  it('そのウィンドウの固定タブのうち、一覧で前にあるものの数', () => {
    expect(insertIndex([MAIL, CAL, JIRA], [MAIL, JIRA], CAL)).toBe(1);
    expect(insertIndex([MAIL, CAL, JIRA], [CAL, JIRA], MAIL)).toBe(0);
    expect(insertIndex([MAIL, CAL, JIRA], [MAIL, CAL], JIRA)).toBe(2);
  });
});

describe('sameOrder', () => {
  it('並びまで同じときだけ true', () => {
    expect(sameOrder([MAIL, CAL], [MAIL, CAL])).toBe(true);
    expect(sameOrder([MAIL, CAL], [CAL, MAIL])).toBe(false);
  });
});
