import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaptureOverlay } from './CaptureOverlay';

describe('CaptureOverlay', () => {
  it('highlightRect が null のとき暗転オーバーレイのみ表示される', () => {
    const { container } = render(
      <CaptureOverlay mode="element" highlightRect={null} cropRect={null} />,
    );

    const overlay = container.querySelector('[data-testid="capture-overlay"]');
    expect(overlay).toBeInTheDocument();
  });

  it('highlightRect を渡すとハイライト領域が表示される', () => {
    const rect = new DOMRect(10, 20, 200, 100);

    const { container } = render(
      <CaptureOverlay mode="element" highlightRect={rect} cropRect={null} />,
    );

    const highlight = container.querySelector('[data-testid="highlight-area"]');
    expect(highlight).toBeInTheDocument();
  });

  it('cropRect を渡すと選択範囲が表示される', () => {
    const cropRect = { x: 50, y: 50, width: 300, height: 200 };

    const { container } = render(
      <CaptureOverlay mode="crop" highlightRect={null} cropRect={cropRect} />,
    );

    const crop = container.querySelector('[data-testid="crop-area"]');
    expect(crop).toBeInTheDocument();
  });

  it('cropRect にサイズラベル（幅×高さ px）が表示される', () => {
    const cropRect = { x: 50, y: 50, width: 300, height: 200 };

    render(
      <CaptureOverlay mode="crop" highlightRect={null} cropRect={cropRect} />,
    );

    expect(screen.getByText('300 × 200')).toBeInTheDocument();
  });

  it('mode が element のとき highlightRect が使われる', () => {
    const rect = new DOMRect(10, 20, 200, 100);

    const { container } = render(
      <CaptureOverlay mode="element" highlightRect={rect} cropRect={null} />,
    );

    expect(container.querySelector('[data-testid="highlight-area"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="crop-area"]')).not.toBeInTheDocument();
  });

  it('mode が crop のとき cropRect が使われる', () => {
    const cropRect = { x: 50, y: 50, width: 300, height: 200 };

    const { container } = render(
      <CaptureOverlay mode="crop" highlightRect={null} cropRect={cropRect} />,
    );

    expect(container.querySelector('[data-testid="crop-area"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="highlight-area"]')).not.toBeInTheDocument();
  });
});
