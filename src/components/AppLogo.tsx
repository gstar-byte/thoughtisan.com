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
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#007AFF" />
          <stop offset="50%" stopColor="#5856D6" />
          <stop offset="100%" stopColor="#AF52DE" />
        </linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Outer elegant orbit ring */}
      <circle cx="50" cy="50" r="44" stroke="url(#logo-grad)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.25" />
      
      {/* Multi-faceted crystal showing Thought + Artisan craftsmanship */}
      {/* Top Facet */}
      <polygon points="50,18 78,38 50,58 22,38" fill="url(#logo-grad)" opacity="0.9" filter="url(#glow)" />
      
      {/* Bottom Left Facet */}
      <polygon points="22,38 50,58 50,82 22,62" fill="url(#logo-grad)" opacity="0.75" />
      
      {/* Bottom Right Facet */}
      <polygon points="50,58 78,38 78,62 50,82" fill="url(#logo-grad)" opacity="0.95" />
      
      {/* Radiant Thought Spark Center */}
      <circle cx="50" cy="58" r="3.5" fill="#FFFFFF" opacity="0.95" filter="url(#glow)" />
    </svg>
  );
}
