import React from 'react';

export function AppLogo({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lumi" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#6366F1" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x="1" y="1" width="98" height="98" rx="28" fill="url(#lumi)" filter="url(#shadow)" />
      <text
        x="50"
        y="55"
        fill="#FFFFFF"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="48"
        letterSpacing="-3"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        LN
      </text>
    </svg>
  );
}
