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
        {/* Gradients for capsules */}
        <linearGradient id="cap1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#007AFF" />
          <stop offset="100%" stopColor="#5AC8FA" />
        </linearGradient>
        <linearGradient id="cap2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF2D55" />
          <stop offset="100%" stopColor="#FF375F" />
        </linearGradient>
        <linearGradient id="cap3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34C759" />
          <stop offset="100%" stopColor="#30D158" />
        </linearGradient>
        {/* Sticky note shadow */}
        <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.15"/>
        </filter>
        <filter id="innerShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2"/>
        </filter>
      </defs>

      {/* Sticky Note Base */}
      <path 
        d="M15 15 H85 V70 L70 85 H15 V15Z" 
        fill="#FEFBEC" 
        stroke="#EAE4C3" 
        strokeWidth="1" 
        filter="url(#shadow)"
      />
      {/* Sticky Note Folded Corner */}
      <path 
        d="M85 70 H70 V85 L85 70Z" 
        fill="#E5DFA9" 
        stroke="#EAE4C3" 
        strokeWidth="1"
      />

      {/* Capsule 1 (Blue) */}
      <rect x="28" y="28" width="44" height="12" rx="6" fill="url(#cap1)" filter="url(#innerShadow)" />
      
      {/* Capsule 2 (Red) */}
      <rect x="28" y="44" width="36" height="12" rx="6" fill="url(#cap2)" filter="url(#innerShadow)" />
      
      {/* Capsule 3 (Green) */}
      <rect x="28" y="60" width="40" height="12" rx="6" fill="url(#cap3)" filter="url(#innerShadow)" />
    </svg>
  );
}
