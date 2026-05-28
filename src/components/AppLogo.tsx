import React from 'react';

export function AppLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Lumi rainbow gradient for squircle background */}
        <linearGradient id="lumi-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="35%" stopColor="#0072FF" />
          <stop offset="70%" stopColor="#FF2D55" />
          <stop offset="100%" stopColor="#FF9500" />
        </linearGradient>

        {/* Glowing dropshadow filter for premium look */}
        <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#FF2D55" floodOpacity="0.2" />
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0072FF" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Main Squircle Body - maximal size for maximum visibility */}
      <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#lumi-rainbow)" filter="url(#premium-shadow)" />

      {/* Inner border for premium metallic/glass edge */}
      <rect x="5.5" y="5.5" width="89" height="89" rx="24.5" stroke="white" strokeWidth="2.5" opacity="0.15" />

      {/* Bold dynamic abbreviation text LN */}
      <text 
        x="50" 
        y="53" 
        fill="#FFFFFF" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        fontWeight="950" 
        fontSize="44" 
        letterSpacing="-2px"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        LN
      </text>
    </svg>
  );
}
