import React from 'react';

export function AppLogo({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient representing three primary colors */}
      <defs>
        <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FF0000" />
          <stop offset="50%" stop-color="#00FF00" />
          <stop offset="100%" stop-color="#0000FF" />
        </linearGradient>
      </defs>
      {/* Rounded sticky‑note shape */}
      <rect x="5" y="5" width="90" height="90" rx="12" fill="url(#primaryGrad)" />
      {/* LN monogram overlay – black for contrast */}
      <text
        x="50"
        y="58"
        fill="#000000"
        fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize="48"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        LN
      </text>
    </svg>
  );
}
