import React from 'react';

export function AppLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Three primary color blocks */}
      <rect x="5" y="5" width="30" height="90" fill="#FF0000" />
      <rect x="35" y="5" width="30" height="90" fill="#00FF00" />
      <rect x="65" y="5" width="30" height="90" fill="#0000FF" />
      {/* LN monogram overlay */
      <text
        x="50"
        y="55"
        fill="#FFFFFF"
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
