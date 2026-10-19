import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ArchivePopup } from './ArchivePopup';

const entries = [
  {
    id: '1',
    url: 'https://github.com/a',
    title: 'GitHub PR',
    archivedAt: 0,
    lastAccessed: 0,
  },
  { id: '2', url: 'https://zenn.dev/b', title: 'Zenn 記事', archivedAt: 0, lastAccessed: 0 },
];

const setup = () => {
  const props = {
    entries,
    now: 60 * 60 * 1000,
    onOpen: vi.fn(),
    onRemove: vi.fn(),
    onArchiveNow: vi.fn(),
    onOpenSettings: vi.fn(),
  };
  render(<ArchivePopup {...props} />);
  return props;
};

describe('ArchivePopup', () => {
  it('検索で絞り込み、Enter で一番上を開く', async () => {
    const props = setup();
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'zenn{Enter}');

    expect(screen.queryByText('GitHub PR')).not.toBeInTheDocument();
    expect(props.onOpen).toHaveBeenCalledWith(entries[1]);
  });

  it('行を押すと開く', async () => {
    const props = setup();
    await userEvent.click(screen.getByText('GitHub PR'));
    expect(props.onOpen).toHaveBeenCalledWith(entries[0]);
  });

  it('記録から消すボタン', async () => {
    const props = setup();
    await userEvent.click(screen.getAllByRole('button', { name: 'removeEntry' })[0]);
    expect(props.onRemove).toHaveBeenCalledWith(entries[0]);
  });

  it('該当なしの表示', async () => {
    setup();
    await userEvent.type(screen.getByRole('textbox'), 'nothing-matches');
    expect(screen.getByText('noResults')).toBeInTheDocument();
  });
});
