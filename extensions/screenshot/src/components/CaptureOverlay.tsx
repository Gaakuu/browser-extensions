import { useMemo } from 'react';

interface CaptureOverlayProps {
  mode: 'element' | 'crop';
  highlightRect: DOMRect | null;
  cropRect: { x: number; y: number; width: number; height: number } | null;
}

export function CaptureOverlay({ mode, highlightRect, cropRect }: CaptureOverlayProps) {
  const clipPath = useMemo(() => {
    // 穴あきポリゴン: 外側（反時計回り）と内側（時計回り）で描画方向を逆にする
    const makeHole = (x: number, y: number, width: number, height: number) =>
      `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${x}px ${y}px, ${x + width}px ${y}px, ${x + width}px ${y + height}px, ${x}px ${y + height}px, ${x}px ${y}px
      )`;

    if (mode === 'element' && highlightRect) {
      return makeHole(highlightRect.x, highlightRect.y, highlightRect.width, highlightRect.height);
    }
    if (mode === 'crop' && cropRect) {
      return makeHole(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    }
    return undefined;
  }, [mode, highlightRect, cropRect]);

  return (
    <div
      data-testid="capture-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        pointerEvents: 'none',
      }}
    >
      {/* 暗転オーバーレイ（穴あき） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          clipPath,
        }}
      />

      {/* 要素ハイライト枠 */}
      {mode === 'element' && highlightRect && (
        <div
          data-testid="highlight-area"
          style={{
            position: 'absolute',
            left: highlightRect.x,
            top: highlightRect.y,
            width: highlightRect.width,
            height: highlightRect.height,
            border: '2px solid #4fc3f7',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* トリミング選択枠 */}
      {mode === 'crop' && cropRect && (
        <>
          <div
            data-testid="crop-area"
            style={{
              position: 'absolute',
              left: cropRect.x,
              top: cropRect.y,
              width: cropRect.width,
              height: cropRect.height,
              border: '2px dashed #fff',
              borderRadius: 2,
              pointerEvents: 'none',
            }}
          />
          {/* サイズラベル */}
          <div
            style={{
              position: 'absolute',
              left: cropRect.x + cropRect.width / 2,
              top: cropRect.y + cropRect.height + 8,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {cropRect.width} × {cropRect.height}
          </div>
        </>
      )}
    </div>
  );
}
