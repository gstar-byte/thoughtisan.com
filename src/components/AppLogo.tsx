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
        {/* Grad 1: Intense Cyan to Deep Blue (Note / Capture) */}
        <linearGradient id="lumi-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="100%" stopColor="#0072FF" />
        </linearGradient>
        
        {/* Grad 2: Radiant Magenta to Sunset Rose (Todo / Tasks) */}
        <linearGradient id="lumi-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF2D55" />
          <stop offset="100%" stopColor="#FF5E62" />
        </linearGradient>
        
        {/* Grad 3: Amber Orange to Warm Gold (Reminder / Time) */}
        <linearGradient id="lumi-amber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFD200" />
        </linearGradient>

        {/* Ring Grad: Premium multi-color orbit */}
        <linearGradient id="lumi-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#FF2D55" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF9500" stopOpacity="0.3" />
        </linearGradient>

        {/* Glowing filters for world-class visual wow */}
        <filter id="glow-heavy" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer luxury micro-orbit dashed ring */}
      <circle cx="50" cy="50" r="44" stroke="url(#lumi-ring)" strokeWidth="1.2" strokeDasharray="3 3" />

      {/* Outer thin orbit solid boundary */}
      <circle cx="50" cy="50" r="41" stroke="url(#lumi-ring)" strokeWidth="0.5" opacity="0.4" />

      {/* Capsule 1: Note (Angled Left, Blue) */}
      <rect x="23" y="38" width="38" height="13" rx="6.5" transform="rotate(-30 42 44.5)" fill="url(#lumi-blue)" filter="url(#glow-soft)" opacity="0.85" />

      {/* Capsule 2: Todo (Angled Right, Pink) */}
      <rect x="39" y="38" width="38" height="13" rx="6.5" transform="rotate(30 58 44.5)" fill="url(#lumi-pink)" filter="url(#glow-soft)" opacity="0.85" />

      {/* Capsule 3: Reminder (Angled horizontally across top, Amber) */}
      <rect x="29" y="44.5" width="42" height="14" rx="7" fill="url(#lumi-amber)" filter="url(#glow-heavy)" />

      {/* Inner Core light flare */}
      <circle cx="50" cy="51.5" r="2.5" fill="#FFFFFF" opacity="0.9" filter="url(#glow-soft)" />
    </svg>
  );
}
