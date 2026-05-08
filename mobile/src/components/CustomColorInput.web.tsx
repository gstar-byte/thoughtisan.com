import React from 'react';

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

function padHex(c: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return '#6BCB77';
}

/**
 * Web：与站点一致的 input[type=color] + 展示 hex。
 */
export function CustomColorInput({ value, onChange }: Props) {
  const v = padHex(value || '#6BCB77');

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 900,
          color: '#8E8E93',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        CUSTOM COLOR
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 10,
          background: '#F8F9FA',
          border: '1px solid #E5E5EA',
          borderRadius: 12,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #0002',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <input
            type="color"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: -8,
              width: 64,
              height: 64,
              cursor: 'pointer',
              border: 'none',
              padding: 0,
              margin: 0,
              opacity: 0,
            }}
          />
          <div style={{ width: '100%', height: '100%', background: v }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#1D1D1F' }}>Palette</div>
          <div
            style={{
              fontSize: 10,
              color: '#8E8E93',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {v}
          </div>
        </div>
      </label>
    </div>
  );
}
